/* ==========================================
   HIMS Fleet - Route Planning Store

   Purpose:
   - Laravel/MySQL is the source of truth
   - routePlanningRecords is temporary UI state only
   - Route templates may remain in localStorage
   - Route coordinates are persisted by Laravel/MySQL
========================================== */

/* ==========================================
   API CONFIGURATION
========================================== */
const ROUTE_API_BASE = "/route-planning";
const HIMS_FLEET_ROUTE_TEMPLATES_KEY = "himsFleetRouteTemplates";
const ROUTE_TEMPLATES_MAX = 30;

/*
|--------------------------------------------------------------------------
| Route Planning Options
|--------------------------------------------------------------------------
| Vehicle and Driver are NOT independently selected anymore.
| They come from the selected Reservation.
| Department remains Route Planning-specific for now.
|
*/
const ROUTE_DEPARTMENTS = [
    "Emergency",
    "Outpatient",
    "Laboratory",
    "Facilities",
    "Admin",
    "Logistics",
];

/* ==========================================
   ROUTE PLANNING STATE
========================================== */

/**
 * Temporary browser-side representation
 * of the Route Plans returned by Laravel.
 *
 * MySQL remains the source of truth.
 *
 * @type {Array<Object>}
 */
let routePlanningRecords = [];
/**
 * Approved Reservations currently available
 * for Route Planning.
 *
 * @type {Array<Object>}
 */
let routeAvailableReservations = [];
/* ==========================================
   CSRF + API HELPERS
========================================== */
/**
 * Get Laravel CSRF token from the page layout.
 */
function getRouteCsrfToken() {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
}
/**
 * Generic Laravel API request helper.
 */
async function routeApiRequest(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };
    /*
  |--------------------------------------------------------------------------
  | JSON Request
  |--------------------------------------------------------------------------
  */
    if (
        options.body !== undefined &&
        options.body !== null &&
        !(options.body instanceof FormData)
    ) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
    /*
  |--------------------------------------------------------------------------
  | Laravel CSRF Protection
  |--------------------------------------------------------------------------
  */
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrfToken = getRouteCsrfToken();

        if (csrfToken) {
            headers["X-CSRF-TOKEN"] = csrfToken;
        }
    }

    const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: "same-origin",
    });

    let data = {};

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }
    } else {
        /*
    |--------------------------------------------------------------------------
    | Helpful fallback for unexpected Laravel HTML errors.
    |--------------------------------------------------------------------------
    */
        try {
            const text = await response.text();

            data = {
                message: text || "Unexpected server response.",
            };
        } catch (error) {
            data = {};
        }
    }

    if (!response.ok) {
        const error = new Error(
            data.message || "Route Planning request failed.",
        );
        error.status = response.status;
        error.errors = data.errors || {};
        error.data = data;

        throw error;
    }

    return data;
}

/* ==========================================
   FORMAT HELPERS
========================================== */
/**
 * Convert estimated minutes to a readable
 * frontend label.
 * Example:
 * 30  -> "30 min"
 * 90  -> "1h 30m"
 */
function formatRouteMinutes(minutes) {
    if (minutes === null || minutes === undefined || minutes === "") {
        return "";
    }
    const total = Number(minutes);
    if (!Number.isFinite(total) || total < 0) {
        return "";
    }
    if (total === 0) {
        return "0 min";
    }

    const hours = Math.floor(total / 60);
    const remainingMinutes = Math.round(total % 60);
    if (hours > 0) {
        return hours + "h " + String(remainingMinutes).padStart(2, "0") + "m";
    }

    return Math.round(total) + " min";
}
/**
 * Build readable vehicle label
 * from Reservation relationship.
 */
function getRouteVehicleLabel(vehicle) {
    if (!vehicle) {
        return "";
    }

    const brandModel = [vehicle.brand, vehicle.model]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ")
        .trim();

    const vehicleType = String(
        vehicle.vehicle_type || vehicle.type || "",
    ).trim();

    if (brandModel && vehicleType) {
        return `${brandModel} - ${vehicleType}`;
    }

    if (brandModel) {
        return brandModel;
    }

    if (vehicleType) {
        return vehicleType;
    }

    return String(
        vehicle.vehicle_name || vehicle.name || vehicle.plate_number || "",
    ).trim();
}

/**
 * Build readable Driver name.
 */
function getRouteDriverLabel(driver) {
    if (!driver) {
        return "";
    }

    const fullName = [driver.first_name, driver.last_name]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ")
        .trim();

    if (fullName) {
        return fullName;
    }

    return String(driver.name || "").trim();
}

/* ==========================================
   NORMALIZATION
========================================== */

/**
 * Convert Laravel RoutePlan JSON
 * to the frontend object shape used by
 * route-pipeline.js and route-modal.js.
 */
function normalizeRouteApiRecord(raw, index = 0) {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const reservation = raw.reservation || null;
    const vehicle = reservation?.vehicle || null;
    const driver = reservation?.driver || null;
    const estimatedMinutes =
        raw.estimated_time === null || raw.estimated_time === undefined
            ? null
            : Number(raw.estimated_time);
    const estimatedDistance =
        raw.estimated_distance === null || raw.estimated_distance === undefined
            ? null
            : Number(raw.estimated_distance);
    const optimizationScore =
        raw.optimization_score === null || raw.optimization_score === undefined
            ? null
            : Number(raw.optimization_score);
    const orderedStops = Array.isArray(raw.stops)
        ? raw.stops
              .slice()
              .sort(
                  (a, b) =>
                      Number(a.stop_order || 0) - Number(b.stop_order || 0),
              )
              .filter((stop) => String(stop?.location || "").trim())
        : [];
    const stops = orderedStops.map((stop) =>
        String(stop.location || "").trim(),
    );
    const stopCoordinates = orderedStops.map((stop) => ({
        location: String(stop.location || "").trim(),
        latitude:
            stop.latitude === null ||
            stop.latitude === undefined ||
            stop.latitude === ""
                ? null
                : Number(stop.latitude),

        longitude:
            stop.longitude === null ||
            stop.longitude === undefined ||
            stop.longitude === ""
                ? null
                : Number(stop.longitude),
    }));

    return {
        /*
    |--------------------------------------------------------------------------
    | Database IDs
    |--------------------------------------------------------------------------
    */

        id: raw.id === null || raw.id === undefined ? "" : String(raw.id),
        reservationId:
            raw.reservation_id === null || raw.reservation_id === undefined
                ? ""
                : String(raw.reservation_id),
        reservationNumber: String(reservation?.reservation_number || "").trim(),

        /*
    |--------------------------------------------------------------------------
    | Route Identification
    |--------------------------------------------------------------------------
    */

        routeNumber: String(raw.route_number || "").trim(),

        /*
    |--------------------------------------------------------------------------
    | Route Information
    |--------------------------------------------------------------------------
    */
        origin: String(raw.origin || "").trim(),
        originLatitude:
            raw.origin_latitude === null ||
            raw.origin_latitude === undefined ||
            raw.origin_latitude === ""
                ? null
                : Number(raw.origin_latitude),
        originLongitude:
            raw.origin_longitude === null ||
            raw.origin_longitude === undefined ||
            raw.origin_longitude === ""
                ? null
                : Number(raw.origin_longitude),
        destination: String(raw.destination || "").trim(),
        destinationLatitude:
            raw.destination_latitude === null ||
            raw.destination_latitude === undefined ||
            raw.destination_latitude === ""
                ? null
                : Number(raw.destination_latitude),
        destinationLongitude:
            raw.destination_longitude === null ||
            raw.destination_longitude === undefined ||
            raw.destination_longitude === ""
                ? null
                : Number(raw.destination_longitude),
        stops,
        stopCoordinates,
        /*
    |--------------------------------------------------------------------------
    | Reservation Resources
    |--------------------------------------------------------------------------
    |
    | These are DISPLAY values only.
    | RoutePlan does not store vehicle_id
    | or driver_id.
    |
    */
        vehicle: getRouteVehicleLabel(vehicle),
        driver: getRouteDriverLabel(driver),
        vehicleId:
            vehicle?.id === null || vehicle?.id === undefined
                ? ""
                : String(vehicle.id),
        driverId:
            driver?.id === null || driver?.id === undefined
                ? ""
                : String(driver.id),

        /*
    |--------------------------------------------------------------------------
    | Planning Information
    |--------------------------------------------------------------------------
    */
        priority: String(raw.priority || "Normal").trim(),
        department: String(raw.department || "").trim(),
        status: String(raw.status || "Draft").trim(),
        purpose: String(raw.purpose || "").trim(),
        notes: String(raw.notes || "").trim(),
        /*
    |--------------------------------------------------------------------------
    | Departure Schedule
    |--------------------------------------------------------------------------
    */
        departureDate: String(raw.departure_date || "").slice(0, 10),
        departureTime: String(raw.departure_time || "").slice(0, 5),
        /*
    |--------------------------------------------------------------------------
    | Optimization
    |--------------------------------------------------------------------------
    */
        estimatedDistance,
        estimatedTravelTimeMinutes: Number.isFinite(estimatedMinutes)
            ? estimatedMinutes
            : null,
        estimatedTravelTime: formatRouteMinutes(estimatedMinutes),
        optimizationStrategy: String(raw.optimization_strategy || "").trim(),
        optimizationScore: Number.isFinite(optimizationScore)
            ? optimizationScore
            : null,
        /*
    |--------------------------------------------------------------------------
    | Reservation Information
    |--------------------------------------------------------------------------
    */
        patientName: String(reservation?.patient_name || "").trim(),
        requestType: String(reservation?.request_type || "").trim(),
        /*
    |--------------------------------------------------------------------------
    | Timestamps
    |--------------------------------------------------------------------------
    */
        createdAt: raw.created_at || "",
        updatedAt: raw.updated_at || "",
        /*
    |--------------------------------------------------------------------------
    | Status History
    |--------------------------------------------------------------------------
    |
    | There is no persistent status-history
    | table yet, so this remains frontend-only.
    |
    */

        statusHistory: [],

        /*
    |--------------------------------------------------------------------------
    | Stable frontend order
    |--------------------------------------------------------------------------
    */

        _order: index,
    };
}

/**
 * Clone frontend RoutePlan object.
 */
function cloneRouteRecord(record) {
    if (!record) {
        return null;
    }

    return {
        ...record,

        stops: Array.isArray(record.stops) ? record.stops.slice() : [],
        stopCoordinates: Array.isArray(record.stopCoordinates)
            ? record.stopCoordinates.map((stop) => ({
                  ...stop,
              }))
            : [],
        statusHistory: Array.isArray(record.statusHistory)
            ? record.statusHistory.map((history) => ({
                  ...history,
              }))
            : [],
    };
}

/**
 * Normalize a frontend Route object.
 *
 * This is retained because other
 * Route Planning JS files may still
 * pass frontend-shaped objects.
 */
function normalizeRouteRecord(raw, index = 0) {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const now = new Date().toISOString();
    const status = String(raw.status || "Draft").trim() || "Draft";
    const createdAt = raw.createdAt || now;
    const updatedAt = raw.updatedAt || createdAt;
    return {
        id: String(raw.id || "").trim(),
        reservationId: String(raw.reservationId || "").trim(),
        reservationNumber: String(raw.reservationNumber || "").trim(),
        routeNumber: String(raw.routeNumber || "").trim(),
        origin: String(raw.origin || "").trim(),
        originLatitude:
            raw.originLatitude === null ||
            raw.originLatitude === undefined ||
            raw.originLatitude === ""
                ? null
                : Number(raw.originLatitude),
        originLongitude:
            raw.originLongitude === null ||
            raw.originLongitude === undefined ||
            raw.originLongitude === ""
                ? null
                : Number(raw.originLongitude),
        destination: String(raw.destination || "").trim(),
        destinationLatitude:
            raw.destinationLatitude === null ||
            raw.destinationLatitude === undefined ||
            raw.destinationLatitude === ""
                ? null
                : Number(raw.destinationLatitude),
        destinationLongitude:
            raw.destinationLongitude === null ||
            raw.destinationLongitude === undefined ||
            raw.destinationLongitude === ""
                ? null
                : Number(raw.destinationLongitude),
        stops: Array.isArray(raw.stops)
            ? raw.stops.map((stop) => String(stop || "").trim()).filter(Boolean)
            : [],
        stopCoordinates: Array.isArray(raw.stopCoordinates)
            ? raw.stopCoordinates.map((stop) => ({
                  location: String(stop?.location || "").trim(),
                  latitude:
                      stop?.latitude === null ||
                      stop?.latitude === undefined ||
                      stop?.latitude === ""
                          ? null
                          : Number(stop.latitude),
                  longitude:
                      stop?.longitude === null ||
                      stop?.longitude === undefined ||
                      stop?.longitude === ""
                          ? null
                          : Number(stop.longitude),
              }))
            : [],
        vehicle: String(raw.vehicle || "").trim(),
        driver: String(raw.driver || "").trim(),
        vehicleId: String(raw.vehicleId || "").trim(),
        driverId: String(raw.driverId || "").trim(),
        priority: String(raw.priority || "Normal").trim(),
        department: String(raw.department || "").trim(),
        purpose: String(raw.purpose || "").trim(),
        estimatedDistance:
            raw.estimatedDistance === null ||
            raw.estimatedDistance === undefined ||
            raw.estimatedDistance === ""
                ? null
                : Number(raw.estimatedDistance),
        estimatedTravelTimeMinutes:
            raw.estimatedTravelTimeMinutes === null ||
            raw.estimatedTravelTimeMinutes === undefined ||
            raw.estimatedTravelTimeMinutes === ""
                ? null
                : Number(raw.estimatedTravelTimeMinutes),
        estimatedTravelTime: String(raw.estimatedTravelTime || "").trim(),
        optimizationStrategy: String(raw.optimizationStrategy || "").trim(),
        optimizationScore:
            raw.optimizationScore === null ||
            raw.optimizationScore === undefined ||
            raw.optimizationScore === ""
                ? null
                : Number(raw.optimizationScore),
        status,
        departureDate: String(raw.departureDate || "").trim(),
        departureTime: String(raw.departureTime || "").trim(),
        notes: String(raw.notes || "").trim(),
        patientName: String(raw.patientName || "").trim(),
        requestType: String(raw.requestType || "").trim(),
        createdAt,
        updatedAt,
        statusHistory: Array.isArray(raw.statusHistory)
            ? raw.statusHistory.map((history) => ({
                  ...history,
              }))
            : [],
        _order:
            raw._order !== undefined && raw._order !== null
                ? Number(raw._order)
                : index,
    };
}

/* ==========================================
   LOCAL FRONTEND STATE HELPERS
========================================== */

/**
 * Replace the current browser state with
 * Route Plans returned by Laravel.
 */
function setRoutePlanningRecords(records) {
    routePlanningRecords = Array.isArray(records)
        ? records
              .map((record, index) => normalizeRouteRecord(record, index))
              .filter(Boolean)
        : [];

    return getAllRouteRecords({
        includeArchived: true,
    });
}

/**
 * Get all Route Plans currently loaded
 * into browser memory.
 */
function getAllRouteRecords(options = {}) {
    const includeArchived = options.includeArchived === true;

    return routePlanningRecords
        .filter((record) => includeArchived || record.status !== "Archived")
        .map(cloneRouteRecord);
}

/**
 * Find RoutePlan in browser state.
 */
function getRouteRecordById(id) {
    const key = String(id || "").trim();

    const found = routePlanningRecords.find(
        (record) => String(record.id) === key,
    );

    return found ? cloneRouteRecord(found) : null;
}

/**
 * Insert/update frontend cache.
 *
 * IMPORTANT:
 * This does NOT save to MySQL.
 *
 * Laravel API calls must happen first.
 */
function upsertRouteRecord(record) {
    if (!record) {
        return null;
    }

    const normalized = normalizeRouteRecord(
        record,
        routePlanningRecords.length,
    );

    if (!normalized) {
        return null;
    }

    const index = routePlanningRecords.findIndex(
        (existing) => String(existing.id) === String(normalized.id),
    );

    if (index >= 0) {
        normalized._order = routePlanningRecords[index]._order ?? index;

        routePlanningRecords[index] = normalized;
    } else {
        normalized._order = routePlanningRecords.length;

        routePlanningRecords.unshift(normalized);
    }

    return cloneRouteRecord(normalized);
}

/**
 * Remove one RoutePlan from frontend cache.
 *
 * IMPORTANT:
 * This does NOT delete from MySQL.
 */
function removeRouteRecord(id) {
    const key = String(id || "").trim();

    const before = routePlanningRecords.length;

    routePlanningRecords = routePlanningRecords.filter(
        (record) => String(record.id) !== key,
    );

    return routePlanningRecords.length < before;
}

/* ==========================================
   ROUTE PLAN API
========================================== */

/**
 * Load Route Plans from Laravel.
 */
async function loadRoutePlansFromApi() {
    const data = await routeApiRequest(`${ROUTE_API_BASE}?show_archived=1`, {
        method: "GET",
    });

    const routes = Array.isArray(data.routePlans) ? data.routePlans : [];

    routePlanningRecords = routes
        .map((route, index) => normalizeRouteApiRecord(route, index))
        .filter(Boolean);

    return getAllRouteRecords({
        includeArchived: true,
    });
}

/**
 * Load one Route Plan.
 */
async function fetchRoutePlanById(id) {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/${encodeURIComponent(id)}`,
        {
            method: "GET",
        },
    );

    if (!data.routePlan) {
        return null;
    }

    const record = normalizeRouteApiRecord(data.routePlan, 0);

    if (record) {
        upsertRouteRecord(record);
    }

    return record;
}

/**
 * Get Approved Reservations that do not
 * yet have a Route Plan.
 */
async function fetchAvailableRouteReservations() {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/available-reservations`,
        {
            method: "GET",
        },
    );

    routeAvailableReservations = Array.isArray(data.reservations)
        ? data.reservations
        : [];

    return routeAvailableReservations.slice();
}

/**
 * Get backend-generated next Route Number.
 */
async function fetchNextRouteNumber() {
    const data = await routeApiRequest(`${ROUTE_API_BASE}/next-number`, {
        method: "GET",
    });

    return String(data.route_number || "");
}

/**
 * Create Route Plan.
 *
 * New RoutePlan is always Draft
 * according to RoutePlanController.
 */
async function createRoutePlanApi(payload) {
    const data = await routeApiRequest(ROUTE_API_BASE, {
        method: "POST",

        body: JSON.stringify(payload),
    });

    const routePlan = data.routePlan
        ? normalizeRouteApiRecord(data.routePlan, 0)
        : null;

    if (routePlan) {
        upsertRouteRecord(routePlan);
    }

    return {
        ...data,
        routePlan,
    };
}

/**
 * Update Route Plan.
 */
async function updateRoutePlanApi(id, payload) {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/${encodeURIComponent(id)}`,
        {
            method: "PUT",

            body: JSON.stringify(payload),
        },
    );

    const routePlan = data.routePlan
        ? normalizeRouteApiRecord(data.routePlan, 0)
        : null;

    if (routePlan) {
        upsertRouteRecord(routePlan);
    }

    return {
        ...data,
        routePlan,
    };
}

/**
 * Archive Route Plan.
 */
async function archiveRoutePlanApi(id) {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/${encodeURIComponent(id)}/archive`,
        {
            method: "POST",

            body: JSON.stringify({}),
        },
    );

    /*
  |--------------------------------------------------------------------------
  | Reload the server record if it is included.
  |--------------------------------------------------------------------------
  */

    if (data.routePlan) {
        const routePlan = normalizeRouteApiRecord(data.routePlan, 0);

        upsertRouteRecord(routePlan);

        return {
            ...data,
            routePlan,
        };
    }

    /*
  |--------------------------------------------------------------------------
  | Some controller responses may only return success/message.
  | Reload the entire RoutePlan list later in the caller.
  |--------------------------------------------------------------------------
  */

    return data;
}

/**
 * Restore archived Route Plan.
 */
async function restoreRoutePlanApi(id) {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/${encodeURIComponent(id)}/restore`,
        {
            method: "POST",

            body: JSON.stringify({}),
        },
    );

    if (data.routePlan) {
        const routePlan = normalizeRouteApiRecord(data.routePlan, 0);

        upsertRouteRecord(routePlan);

        return {
            ...data,
            routePlan,
        };
    }

    return data;
}

/**
 * Delete Route Plan.
 */
async function deleteRoutePlanApi(id) {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/${encodeURIComponent(id)}`,
        {
            method: "DELETE",

            body: JSON.stringify({}),
        },
    );

    removeRouteRecord(id);

    return data;
}

/**
 * Duplicate Route Plan using a specific
 * target Approved Reservation.
 */
async function duplicateRoutePlanApi(routePlanId, reservationId) {
    const data = await routeApiRequest(
        `${ROUTE_API_BASE}/${encodeURIComponent(routePlanId)}/duplicate`,
        {
            method: "POST",

            body: JSON.stringify({
                reservation_id: reservationId,
            }),
        },
    );

    const routePlan = data.routePlan
        ? normalizeRouteApiRecord(data.routePlan, 0)
        : null;

    if (routePlan) {
        upsertRouteRecord(routePlan);
    }

    return {
        ...data,
        routePlan,
    };
}

/**
 * Fetch Route Planning statistics.
 */
async function fetchRoutePlanningStats() {
    return routeApiRequest(`${ROUTE_API_BASE}/stats`, {
        method: "GET",
    });
}

/* ==========================================
   TRAFFIC-AWARE ROUTING
========================================== */

/**
 * Build ordered coordinates for route calculation.
 *
 * Order:
 * Origin → Stops → Destination
 */
function buildRouteCoordinates(input) {
    const coordinates = [];

    const originLatitude = Number(input.originLatitude);
    const originLongitude = Number(input.originLongitude);

    if (
        Number.isFinite(originLatitude) &&
        Number.isFinite(originLongitude)
    ) {
        coordinates.push({
            latitude: originLatitude,
            longitude: originLongitude,
        });
    }

    const stopCoordinates = Array.isArray(input.stopCoordinates)
        ? input.stopCoordinates
        : [];

    stopCoordinates.forEach((stop) => {
        const latitude = Number(stop?.latitude);
        const longitude = Number(stop?.longitude);

        if (
            Number.isFinite(latitude) &&
            Number.isFinite(longitude)
        ) {
            coordinates.push({
                latitude,
                longitude,
            });
        }
    });

    const destinationLatitude = Number(
        input.destinationLatitude,
    );

    const destinationLongitude = Number(
        input.destinationLongitude,
    );

    if (
        Number.isFinite(destinationLatitude) &&
        Number.isFinite(destinationLongitude)
    ) {
        coordinates.push({
            latitude: destinationLatitude,
            longitude: destinationLongitude,
        });
    }

    return coordinates;
}

/**
 * Calculate a traffic-aware route through Laravel.
 *
 * Laravel remains responsible for communicating
 * with the TomTom API.
 */
async function calculateTrafficRouteApi(
    coordinates,
    departAt = null,
) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error(
            "At least an origin and destination are required.",
        );
    }
    const payload = {
        coordinates,
    };
    if (departAt) {
        payload.depart_at = departAt;
    }
    return routeApiRequest(
        `${ROUTE_API_BASE}/traffic-route`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

/**
 * Calculate the best available route.
 *
 * Primary:
 * TomTom traffic-aware routing
 *
 * Fallback:
 * Existing OSRM routing
 */
async function calculateRouteWithTrafficFallback(
    input,
) {
    const coordinates =
        buildRouteCoordinates(input);
    if (coordinates.length < 2) {
        throw new Error(
            "Route coordinates are incomplete.",
        );
    }
    try {
        const result =
            await calculateTrafficRouteApi(
                coordinates,
                input.departAt || null,
            );
        return {
            ...result,
            fallback: false,
            provider:
                result.provider || "TomTom",
        };
    } catch (tomTomError) {
        console.warn(
            "TomTom traffic routing failed. Existing OSRM fallback should be used by the pipeline.",
            tomTomError,
        );

        throw tomTomError;
    }
}

/* ==========================================
   LEGACY COMPATIBILITY HELPERS
========================================== */

/*
|--------------------------------------------------------------------------
| These functions remain temporarily so the
| currently existing JS files do not immediately
| crash while we replace them one by one.
|--------------------------------------------------------------------------
|
| They DO NOT persist Route Plans to localStorage.
|
*/

/**
 * No longer seeds fake Route Plans.
 */
function seedRoutePlanningSampleData() {
    /*
     * Intentionally empty.
     *
     * Actual records are now loaded
     * from Laravel/MySQL.
     */
}

/**
 * Deprecated frontend-only archive helper.
 *
 * Final route-modal.js will use
 * archiveRoutePlanApi().
 */
function archiveRouteRecord(id) {
    const existing = getRouteRecordById(id);

    if (!existing) {
        return null;
    }

    return upsertRouteRecord({
        ...existing,

        status: "Archived",

        updatedAt: new Date().toISOString(),
    });
}

/**
 * Deprecated frontend-only restore helper.
 *
 * Backend restore lifecycle:
 *
 * Archived → Draft
 */
function restoreRouteRecord(id) {
    const existing = getRouteRecordById(id);

    if (!existing || existing.status !== "Archived") {
        return null;
    }

    return upsertRouteRecord({
        ...existing,

        status: "Draft",

        updatedAt: new Date().toISOString(),
    });
}

/**
 * Deprecated local duplicate helper.
 *
 * Returns null intentionally because
 * duplication now requires selecting a
 * target Reservation.
 */
function duplicateRouteRecord() {
    console.warn(
        "duplicateRouteRecord() is deprecated. Use duplicateRoutePlanApi(routePlanId, reservationId).",
    );

    return null;
}

/**
 * Deprecated frontend Route Number generator.
 *
 * Backend is now authoritative.
 *
 * Kept temporarily so older JS does not throw
 * a ReferenceError before route-modal.js is
 * replaced.
 */
function generateRouteNumber() {
    return "";
}

/**
 * Deprecated local ID helper.
 */
function generateRouteInternalId() {
    return (
        "route-temp-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 7)
    );
}

/* ==========================================
   SIMULATED ROUTE OPTIMIZATION
========================================== */

/**
 * Temporary simulated optimization.
 *
 * This is NOT Google Maps yet.
 * It can remain during current capstone
 * backend integration.
 */
function simulateRouteOptimization(input) {
    const stops = Array.isArray(input.stops)
        ? input.stops.filter((stop) => String(stop || "").trim())
        : [];
    const stopCount = stops.length;
    const priority = String(input.priority || "Normal");
    const seed =
        String(input.origin || "").length * 7 +
        String(input.destination || "").length * 11 +
        stopCount * 13 +
        priority.length * 3;
    let distance = 4 + (seed % 28) + stopCount * 2.4;
    distance = Math.round(distance * 10) / 10;
    let strategy = "Balanced";
    let score = 78;
    let speedKmh = 28;
    if (priority === "Emergency") {
        strategy = "Fastest";
        speedKmh = 42;
        score = 94;
        distance = Math.round(distance * 0.92 * 10) / 10;
    } else if (priority === "High") {
        strategy = "Shortest";
        speedKmh = 34;
        score = 88;
        distance = Math.round(distance * 0.96 * 10) / 10;
    } else if (priority === "Low") {
        strategy = "Economy";
        speedKmh = 24;
        score = 72;
        distance = Math.round(distance * 1.05 * 10) / 10;
    }

    const hours = distance / speedKmh;
    const totalMinutes = Math.max(8, Math.round(hours * 60) + stopCount * 4);
    const travelLabel = formatRouteMinutes(totalMinutes);

    /*
  |--------------------------------------------------------------------------
  | Vehicle / Driver Recommendation
  |--------------------------------------------------------------------------
  |
  | Reservation-assigned resources remain
  | authoritative.
  |
  | This recommendation is only displayed
  | by the optimization summary.
  |
  */
    const recommendedVehicle = input.vehicle || "Assigned Reservation Vehicle";
    const recommendedDriver = input.driver || "Assigned Reservation Driver";
    return {
        estimatedDistance: distance,
        estimatedTravelTimeMinutes: totalMinutes,
        estimatedTravelTime: travelLabel,
        optimizationStrategy: strategy,
        optimizationScore: score,
        recommendedVehicle,
        recommendedDriver,
        stopCount,
        isSimulated: true,
    };
}
/* ==========================================
   ROUTE TEMPLATES
========================================== */
/*
|--------------------------------------------------------------------------
| Route Templates may remain in localStorage.
|--------------------------------------------------------------------------
|
| They are UI convenience data, not operational
| RoutePlan records.
|
*/

function readRouteTemplates() {
    try {
        const raw = localStorage.getItem(HIMS_FLEET_ROUTE_TEMPLATES_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter(
                (template) =>
                    template &&
                    typeof template === "object" &&
                    template.id &&
                    template.name,
            )
            .map((template) => ({
                id: String(template.id),
                name: String(template.name),
                origin: String(template.origin || ""),
                destination: String(template.destination || ""),
                stops: Array.isArray(template.stops)
                    ? template.stops.map(String)
                    : [],
                priority: String(template.priority || "Normal"),
                department: String(template.department || ""),
                purpose: String(template.purpose || ""),
                recommendedVehicle: String(template.recommendedVehicle || ""),
                optimizationStrategy: String(
                    template.optimizationStrategy || "",
                ),
                createdAt: template.createdAt || new Date().toISOString(),
                updatedAt:
                    template.updatedAt ||
                    template.createdAt ||
                    new Date().toISOString(),
            }));
    } catch (error) {
        console.error("Malformed route templates storage:", error);

        return [];
    }
}

function writeRouteTemplates(list) {
    try {
        const templates = Array.isArray(list) ? list : [];

        localStorage.setItem(
            HIMS_FLEET_ROUTE_TEMPLATES_KEY,

            JSON.stringify(templates.slice(0, ROUTE_TEMPLATES_MAX)),
        );

        return true;
    } catch (error) {
        console.error("Unable to save route templates:", error);

        return false;
    }
}
