/* ==========================================
   HIMS Fleet - Route Planning Table Pipeline

   Purpose:
   - Render Route Plans loaded from Laravel/MySQL
   - Frontend filtering, sorting and pagination
   - Dynamic Vehicle/Driver filters
   - Route Planning statistics
   - Map/optimization summary display
========================================== */

const ROUTE_TABLE_COLUMN_COUNT = 12;
const ROUTE_ROWS_PER_PAGE = 5;

let isRefreshingRoutes = false;
let isLoadingRouteData = false;

let routeLiveUpdateInterval = null;
let routeLiveUpdateRunning = false;

/* ==========================================
   LEAFLET / ROUTING STATE
========================================== */
let routeLeafletMap = null;
let routeLeafletRouteLayer = null;
let routeLeafletMarkerLayer = null;
let routeLeafletMapInitialized = false;
let routeRoutingRequestToken = 0;
let routeNextOriginalOrder = 0;
const ROUTE_GEOCODE_CACHE_KEY =
    "himsFleetRoutePlanningGeocodeCache";

let routeLastGeocodeRequestAt = 0;

let routeSortState = {
    field: null,
    direction: null,
};

let routePaginationState = {
    page: 1,
    pageSize: ROUTE_ROWS_PER_PAGE,
};


function formatRouteDistance(km) {
    if (km === null || km === undefined || km === "") {
        return "—";
    }

    const n = Number(km);

    if (!Number.isFinite(n)) {
        return "—";
    }

    return (
        n.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }) + " km"
    );
}

function priorityRank(priority) {
    const map = {
        Low: 1,
        Normal: 2,
        High: 3,
        Emergency: 4,
    };

    return map[priority] || 0;
}

function statusBadgeClass(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("ready") || value.includes("completed")) {
        return "completed";
    }
    if (value.includes("planned")) {
        return "trip";
    }
    if (value.includes("draft")) {
        return "scheduled";
    }
    if (value.includes("archiv")) {
        return "cancelled";
    }

    return "cancelled";
}

function escapeRouteHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatRouteDeparture(date, time) {
    if (!date) {
        return "—";
    }
    const d = new Date(date + "T00:00:00");
    const dateLabel = Number.isNaN(d.getTime())
        ? date
        : d.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          });
    return time ? dateLabel + " " + time : dateLabel;
}

function formatRouteCreated(iso) {
    if (!iso) {
        return "—";
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return "—";
    }
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatRouteDateTime(iso) {
    if (!iso) {
        return "—";
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function startRoutePlanningLiveUpdates() {
    if (routeLiveUpdateInterval) {
        return;
    }
    routeLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (
            routeLiveUpdateRunning ||
            isLoadingRouteData ||
            isRefreshingRoutes
        ) {
            return;
        }
        routeLiveUpdateRunning = true;
        try {
            await reloadRoutePlanningData({
                resetPage: false,
                refreshMap: false,
                reason: "live-update",
            });
        } catch (error) {
            console.error("Route Planning live update failed:", error);
        } finally {
            routeLiveUpdateRunning = false;
        }
    }, 10000);
}
/**
 * Rebuild Vehicle and Driver filters
 * from actual Reservation relationships
 * currently loaded from Laravel.
 */
function rebuildRouteResourceFilters(records) {
    const list = Array.isArray(records) ? records : [];
    const vehicleSelect = document.getElementById("routeVehicleFilter");
    const driverSelect = document.getElementById("routeDriverFilter");
    const currentVehicle = vehicleSelect?.value || "all";
    const currentDriver = driverSelect?.value || "all";
    const vehicles = [
        ...new Set(
            list
                .map((record) => String(record.vehicle || "").trim())
                .filter(Boolean),
        ),
    ].sort((a, b) =>
        a.localeCompare(b, undefined, {
            numeric: true,
        }),
    );
    const drivers = [
        ...new Set(
            list
                .map((record) => String(record.driver || "").trim())
                .filter(Boolean),
        ),
    ].sort((a, b) =>
        a.localeCompare(b, undefined, {
            numeric: true,
        }),
    );

    if (vehicleSelect) {
        vehicleSelect.innerHTML = '<option value="all">All Vehicles</option>';
        vehicles.forEach((vehicle) => {
            const option = document.createElement("option");
            option.value = vehicle;
            option.textContent = vehicle;
            vehicleSelect.appendChild(option);
        });
        if (
            [...vehicleSelect.options].some(
                (option) => option.value === currentVehicle,
            )
        ) {
            vehicleSelect.value = currentVehicle;
        } else {
            vehicleSelect.value = "all";
        }
    }

    if (driverSelect) {
        driverSelect.innerHTML = '<option value="all">All Drivers</option>';
        drivers.forEach((driver) => {
            const option = document.createElement("option");
            option.value = driver;
            option.textContent = driver;
            driverSelect.appendChild(option);
        });
        if (
            [...driverSelect.options].some(
                (option) => option.value === currentDriver,
            )
        ) {
            driverSelect.value = currentDriver;
        } else {
            driverSelect.value = "all";
        }
    }
}


function setRouteStatisticText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

/**
 * Use backend-calculated statistics.
 */
function applyRouteStatistics(stats) {
    if (!stats) {
        return;
    }

    setRouteStatisticText("routeStatTotal", String(stats.total ?? 0));
    setRouteStatisticText("routeStatReady", String(stats.ready ?? 0));
    setRouteStatisticText(
        "routeStatHighPriority",
        String(stats.high_priority ?? 0),
    );
    setRouteStatisticText(
        "routeStatAvgDistance",
        formatRouteDistance(stats.average_distance ?? null),
    );

    const averageTime = Number(stats.average_time || 0);

    let timeLabel = "—";

    if (Number.isFinite(averageTime) && averageTime > 0) {
        timeLabel = formatRouteMinutes(averageTime);
    }

    setRouteStatisticText("routeStatAvgTime", timeLabel);
    setRouteStatisticText(
        "routeStatVehicles",
        String(stats.assigned_vehicles ?? 0),
    );
}

/**
 * Fallback statistics calculation.
 *
 * Used if the stats endpoint temporarily
 * fails while RoutePlan list still loaded.
 */
function updateRouteStatistics(records) {
    const list = Array.isArray(records)
        ? records.filter((record) => record.status !== "Archived")
        : getAllRouteRecords({
              includeArchived: false,
          });

    const total = list.length;
    const ready = list.filter(
        (record) => record.status === "Ready For Dispatch",
    ).length;

    const high = list.filter(
        (record) =>
            record.priority === "High" || record.priority === "Emergency",
    ).length;

    const distanceValues = list
        .map((record) => record.estimatedDistance)
        .filter(
            (value) =>
                value !== null &&
                value !== undefined &&
                value !== "" &&
                Number.isFinite(Number(value)),
        )
        .map(Number);

    const timeValues = list
        .map((record) => record.estimatedTravelTimeMinutes)
        .filter(
            (value) =>
                value !== null &&
                value !== undefined &&
                value !== "" &&
                Number.isFinite(Number(value)),
        )
        .map(Number);

    const averageDistance =
        distanceValues.length > 0
            ? distanceValues.reduce((sum, value) => sum + value, 0) /
              distanceValues.length
            : null;
    const averageTime =
        timeValues.length > 0
            ? timeValues.reduce((sum, value) => sum + value, 0) /
              timeValues.length
            : null;
    const vehicles = new Set(
        list.map((record) => record.vehicle).filter(Boolean),
    );

    setRouteStatisticText("routeStatTotal", String(total));
    setRouteStatisticText("routeStatReady", String(ready));
    setRouteStatisticText("routeStatHighPriority", String(high));
    setRouteStatisticText(
        "routeStatAvgDistance",
        averageDistance === null ? "—" : formatRouteDistance(averageDistance),
    );

    setRouteStatisticText(
        "routeStatAvgTime",
        averageTime === null
            ? "—"
            : formatRouteMinutes(Math.round(averageTime)),
    );

    setRouteStatisticText("routeStatVehicles", String(vehicles.size));
}

/**
 * Refresh stats from Laravel.
 */
async function refreshRouteStatistics() {
    try {
        const stats = await fetchRoutePlanningStats();

        applyRouteStatistics(stats);

        return stats;
    } catch (error) {
        console.warn(
            "Unable to load Route Planning statistics from API:",
            error,
        );

        updateRouteStatistics(
            getAllRouteRecords({
                includeArchived: false,
            }),
        );

        return null;
    }
}

function getRouteFilterValues() {
    return {
        search: (document.getElementById("routeSearch")?.value || "")
            .trim()
            .toLowerCase(),
        priority:
            document.getElementById("routePriorityFilter")?.value || "all",
        status: document.getElementById("routeStatusFilter")?.value || "all",
        vehicle: document.getElementById("routeVehicleFilter")?.value || "all",
        driver: document.getElementById("routeDriverFilter")?.value || "all",
        department:
            document.getElementById("routeDepartmentFilter")?.value || "all",
        date: document.getElementById("routeDateFilter")?.value || "",
        showArchived:
            document.getElementById("routeShowArchived")?.checked === true,
    };
}

/**
 * Processed records for
 * Print / PDF / Excel.
 */
function getProcessedRouteRecords() {
    const filters = getRouteFilterValues();

    const all = getAllRouteRecords({
        includeArchived: true,
    });

    let matched = all.filter((record) => routeMatchesFilters(record, filters));

    matched = sortRouteRecords(
        matched.map((record) => {
            const live = routePlanningRecords.find(
                (candidate) => String(candidate.id) === String(record.id),
            );

            return {
                ...record,

                _order: live?._order ?? 0,
            };
        }),
    );

    return matched;
}

function getRouteFilterSummaryLines() {
    const filters = getRouteFilterValues();
    const parts = [];

    if (filters.priority !== "all") {
        parts.push("Priority: " + filters.priority);
    }
    if (filters.status !== "all") {
        parts.push("Status: " + filters.status);
    }
    if (filters.vehicle !== "all") {
        parts.push("Vehicle: " + filters.vehicle);
    }
    if (filters.driver !== "all") {
        parts.push("Driver: " + filters.driver);
    }
    if (filters.department !== "all") {
        parts.push("Department: " + filters.department);
    }
    if (filters.date) {
        parts.push("Departure Date: " + filters.date);
    }
    if (filters.search) {
        parts.push("Search: " + filters.search);
    }
    if (filters.showArchived) {
        parts.push("Including Archived");
    }

    return parts;
}

function routeMatchesFilters(record, filters) {
    if (!filters.showArchived && record.status === "Archived") {
        return false;
    }
    if (filters.priority !== "all" && record.priority !== filters.priority) {
        return false;
    }
    if (filters.status !== "all" && record.status !== filters.status) {
        return false;
    }
    if (filters.vehicle !== "all" && record.vehicle !== filters.vehicle) {
        return false;
    }
    if (filters.driver !== "all" && record.driver !== filters.driver) {
        return false;
    }
    if (
        filters.department !== "all" &&
        record.department !== filters.department
    ) {
        return false;
    }
    if (filters.date && record.departureDate !== filters.date) {
        return false;
    }

    if (filters.search) {
        const haystack = [
            record.routeNumber,
            record.reservationNumber,
            record.patientName,
            record.requestType,
            record.origin,
            record.destination,
            record.vehicle,
            record.driver,
            record.priority,
            record.department,
            record.status,
            record.purpose,
            record.notes,
            ...(record.stops || []),
        ]
            .join(" ")
            .toLowerCase();

        if (!haystack.includes(filters.search)) {
            return false;
        }
    }

    return true;
}

function sortRouteRecords(list) {
    const field = routeSortState.field;
    const direction = routeSortState.direction === "desc" ? -1 : 1;
    /*
  |--------------------------------------------------------------------------
  | No Active Sort
  |--------------------------------------------------------------------------
  */
    if (!field || !routeSortState.direction) {
        return list
            .slice()
            .sort((a, b) => Number(a._order || 0) - Number(b._order || 0));
    }

    return list.slice().sort((a, b) => {
        let av = a[field];
        let bv = b[field];

        /*
        |--------------------------------------------------------------------------
        | Priority Sort
        |--------------------------------------------------------------------------
        */
        if (field === "priority") {
            av = priorityRank(a.priority);
            bv = priorityRank(b.priority);
        } else if (field === "estimatedDistance") {

        /*
        |--------------------------------------------------------------------------
        | Distance Sort
        |--------------------------------------------------------------------------
        */
            av = a.estimatedDistance == null ? -1 : Number(a.estimatedDistance);
            bv = b.estimatedDistance == null ? -1 : Number(b.estimatedDistance);
        } else if (field === "departureDate") {

        /*
        |--------------------------------------------------------------------------
        | Departure Date/Time Sort
        |--------------------------------------------------------------------------
        */
            av = Date.parse(
                (a.departureDate || "") + "T" + (a.departureTime || "00:00"),
            );
            bv = Date.parse(
                (b.departureDate || "") + "T" + (b.departureTime || "00:00"),
            );
            if (Number.isNaN(av)) {
                av = 0;
            }
            if (Number.isNaN(bv)) {
                bv = 0;
            }
        } else {

        /*
        |--------------------------------------------------------------------------
        | Text Sort
        |--------------------------------------------------------------------------
        */
            av = String(av || "").toLowerCase();
            bv = String(bv || "").toLowerCase();
            return (
                av.localeCompare(bv, undefined, {
                    numeric: true,
                }) * direction
            );
        }

        if (av === bv) {
            return 0;
        }

        return av < bv ? -direction : direction;
    });
}

function updateRouteEmptyState(show) {
    const empty = document.getElementById("routeEmptyState");
    const tableWrap = document.getElementById("routeTableWrap");

    if (empty) {
        empty.hidden = !show;
    }

    if (tableWrap) {
        tableWrap.hidden = show;
    }
}

/* ==========================================
   TABLE ROW
========================================== */
function buildRouteTableRow(record) {
    const tr = document.createElement("tr");

    tr.dataset.routeId = record.id;

    /*
  |--------------------------------------------------------------------------
  | Delete Button
  |--------------------------------------------------------------------------
  | Backend allows delete only for
  | Draft / Planned Route Plans.
  |--------------------------------------------------------------------------
  | Edit Button
  |--------------------------------------------------------------------------
  | Completed/Archived operational records
  | should not normally be edited.
  */
    const hasUpdatePermission =
        window.FleetRBAC?.hasPermission?.("route_planning", "canUpdate") ===
        true;
    const hasDeletePermission =
        window.FleetRBAC?.hasPermission?.("route_planning", "canDelete") ===
        true;
    /*
    |--------------------------------------------------------------------------
    | Lifecycle + RBAC
    |--------------------------------------------------------------------------
    */
    const canEdit =
        hasUpdatePermission &&
        !["Completed", "Archived"].includes(record.status);

    const canDelete =
        hasDeletePermission && ["Draft", "Planned"].includes(record.status);

    tr.innerHTML = `
    <td>
      <span class="route-number">
        ${escapeRouteHtml(record.routeNumber)}
      </span>
    </td>

    <td>
      <span class="route-origin">
        ${escapeRouteHtml(record.origin)}
      </span>
    </td>

    <td>
      <span class="route-destination">
        ${escapeRouteHtml(record.destination)}
      </span>
    </td>

    <td>
      <span class="route-vehicle">
        ${escapeRouteHtml(record.vehicle || "—")}
      </span>
    </td>

    <td>
      <span class="route-driver">
        ${escapeRouteHtml(record.driver || "—")}
      </span>
    </td>

    <td>
      <span class="route-priority">
        ${escapeRouteHtml(record.priority)}
      </span>
    </td>

    <td>
      <span class="route-distance">
        ${escapeRouteHtml(formatRouteDistance(record.estimatedDistance))}
      </span>
    </td>

    <td>
      <span class="route-time">
        ${escapeRouteHtml(record.estimatedTravelTime || "—")}
      </span>
    </td>

    <td>
      <span class="status-badge ${statusBadgeClass(record.status)}">
        ${escapeRouteHtml(record.status)}
      </span>
    </td>

    <td>
      <span class="route-departure">
        ${escapeRouteHtml(
            formatRouteDeparture(record.departureDate, record.departureTime),
        )}
      </span>
    </td>

    <td>
      <span class="route-created">
        ${escapeRouteHtml(formatRouteCreated(record.createdAt))}
      </span>
    </td>

    <td>
        <div class="action-buttons">
            <button
            type="button"
            class="action-btn view-route"
            aria-label="View ${escapeRouteHtml(record.routeNumber)}"
            title="View Route"
            >
            <i class="ph ph-eye"></i>
            </button>

            ${
                hasUpdatePermission
                    ? `
                        <button
                        type="button"
                        class="action-btn edit-route"
                        aria-label="Edit ${escapeRouteHtml(record.routeNumber)}"
                        title="${
                            canEdit
                                ? "Edit Route"
                                : "This route can no longer be edited"
                        }"
                        ${canEdit ? "" : "disabled"}
                        >
                        <i class="ph ph-pencil-simple"></i>
                        </button>
                    `
                    : ""
            }

            ${
                hasDeletePermission
                    ? `
                        <button
                        type="button"
                        class="action-btn delete-route"
                        aria-label="Delete ${escapeRouteHtml(record.routeNumber)}"
                        title="${
                            canDelete
                                ? "Delete Route"
                                : "Only Draft or Planned routes can be deleted"
                        }"
                        ${canDelete ? "" : "disabled"}
                        >
                        <i class="ph ph-trash"></i>
                        </button>
                    `
                    : ""
            }
        </div>
    </td>
  `;

    return tr;
}

function renderRoutePagination(total) {
    const info = document.getElementById("routePaginationInfo");
    const pagination = document.getElementById("routePagination");
    if (!info || !pagination) {
        return;
    }
    const pageSize = routePaginationState.pageSize;
    const totalPages = Math.ceil(total / pageSize) || 0;
    if (totalPages === 0) {
        routePaginationState.page = 1;
    } else {
        routePaginationState.page = Math.min(
            Math.max(routePaginationState.page, 1),
            totalPages,
        );
    }
    const page = routePaginationState.page;
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    /*
    |--------------------------------------------------------------------------
    | Pagination Info
    |--------------------------------------------------------------------------
    */
    const range = document.createElement("strong");
    const totalElement = document.createElement("strong");
    range.textContent = `${start}–${end}`;
    totalElement.textContent = String(total);
    info.replaceChildren(
        document.createTextNode("Showing "),
        range,
        document.createTextNode(" of "),
        totalElement,
        document.createTextNode(" routes"),
    );
    /*
    |--------------------------------------------------------------------------
    | Pagination Buttons
    |--------------------------------------------------------------------------
    */
    const fragment = document.createDocumentFragment();
    const createButton = ({
        label = "",
        ariaLabel,
        iconClass = null,
        disabled = false,
        active = false,
        action,
        pageNumber = null,
    }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", ariaLabel);
        button.disabled = disabled;

        if (action) {
            button.dataset.routePage = action;
        }
        if (pageNumber !== null && pageNumber !== undefined) {
            button.dataset.pageNumber = String(pageNumber);
        }
        if (active) {
            button.classList.add("active");
            button.setAttribute("aria-current", "page");
        }

        if (iconClass) {
            const icon = document.createElement("i");
            icon.className = iconClass;
            icon.setAttribute("aria-hidden", "true");
            button.appendChild(icon);
        } else {
            button.textContent = label;
        }
        return button;
    };

    fragment.appendChild(
        createButton({
            ariaLabel: "Previous page",
            iconClass: "ph ph-caret-left",
            disabled: page <= 1 || totalPages === 0,
            action: "prev",
        }),
    );

    for (let p = 1; p <= Math.max(1, totalPages); p += 1) {
        fragment.appendChild(
            createButton({
                label: String(p),
                ariaLabel: `Page ${p}`,
                active: totalPages > 0 && p === page,
                action: "page",
                pageNumber: p,
                disabled: totalPages === 0,
            }),
        );
    }

    fragment.appendChild(
        createButton({
            ariaLabel: "Next page",
            iconClass: "ph ph-caret-right",
            disabled: totalPages === 0 || page >= totalPages,
            action: "next",
        }),
    );

    pagination.replaceChildren(fragment);
}

/* ==========================================
   LEAFLET + NOMINATIM + OSRM
========================================== */
function routeSleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function readRouteGeocodeCache() {
    try {
        return JSON.parse(
            sessionStorage.getItem(
                ROUTE_GEOCODE_CACHE_KEY
            ) || "{}"
        );
    } catch {
        return {};
    }
}

function writeRouteGeocodeCache(cache) {
    try {
        sessionStorage.setItem(
            ROUTE_GEOCODE_CACHE_KEY,
            JSON.stringify(cache)
        );
    } catch {
        // Ignore storage failure.
    }
}

/**
 * Public Nominatim should not be requested rapidly.
 * Cached addresses do not trigger another network request.
 */
async function waitForRouteGeocoderSlot() {
    const minimumGap = 1100;
    const elapsed =
        Date.now() -
        routeLastGeocodeRequestAt;
    if (elapsed < minimumGap) {
        await routeSleep(
            minimumGap - elapsed
        );
    }
    routeLastGeocodeRequestAt =
        Date.now();
}

async function geocodeRouteLocation(address) {
    const normalized =
        String(address || "").trim();
    if (!normalized) {
        return null;
    }
    const cache =
        readRouteGeocodeCache();
    const cacheKey =
        normalized.toLowerCase();
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }
    await waitForRouteGeocoderSlot();
    /*
    |--------------------------------------------------------------------------
    | Add Philippines to improve local matching
    |--------------------------------------------------------------------------
    */
    const query =
        encodeURIComponent(
            `${normalized}, Philippines`
        );
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&q=${query}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        },
    );
    if (!response.ok) {
        throw new Error(
            "Unable to search the route location."
        );
    }
    const results =
        await response.json();
    if (
        !Array.isArray(results) ||
        results.length === 0
    ) {
        throw new Error(
            `Location not found: ${normalized}`
        );
    }
    const result = {
        lat:
            Number(results[0].lat),
        lng:
            Number(results[0].lon),
        displayName:
            results[0].display_name ||
            normalized,
    };
    if (
        !Number.isFinite(result.lat) ||
        !Number.isFinite(result.lng)
    ) {
        throw new Error(
            `Invalid coordinates returned for: ${normalized}`
        );
    }
    cache[cacheKey] =
        result;
    writeRouteGeocodeCache(
        cache
    );
    return result;
}

async function initRouteLeafletMap() {
    if (
        routeLeafletMapInitialized &&
        routeLeafletMap
    ) {
        return routeLeafletMap;
    }
    const mapElement =
        document.getElementById(
            "routeLeafletMap"
        );
    if (!mapElement) {
        return null;
    }
    if (typeof L === "undefined") {
        console.warn(
            "Leaflet is not available."
        );
        return null;
    }
    /*
    |--------------------------------------------------------------------------
    | Tala Hospital / DJNRMHS
    |--------------------------------------------------------------------------
    */
    const hospitalLocation = [
        14.7707,
        121.0659,
    ];
    routeLeafletMap =
        L.map(
            mapElement,
            {
                zoomControl: true,
                scrollWheelZoom: false,
            }
        ).setView(
            hospitalLocation,
            13
        );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(routeLeafletMap);
    routeLeafletMarkerLayer =
        L.layerGroup().addTo(
            routeLeafletMap
        );
    routeLeafletMapInitialized =
        true;
    window.setTimeout(
        () => {
            routeLeafletMap
                ?.invalidateSize();
        },
        150
    );
    return routeLeafletMap;
}

function clearRouteLeafletMap() {
    if (routeLeafletRouteLayer) {
        try {
            routeLeafletMap
                ?.removeLayer(
                    routeLeafletRouteLayer
                );
        } catch (error) {
            console.warn(
                "Unable to remove route layer:",
                error
            );
        }

        routeLeafletRouteLayer =
            null;
    }
    if (routeLeafletMarkerLayer) {
        routeLeafletMarkerLayer
            .clearLayers();
    }
}

function createRouteMarkerIcon(type, label = "") {
    let markerClass = "route-map-marker";
    let content = "";
    if (type === "origin") {
        markerClass += " route-map-marker-origin";
        content = `
            <i
                class="ph ph-hospital"
                aria-hidden="true"
            ></i>
        `;
    } else if (type === "destination") {
        markerClass += " route-map-marker-destination";
        content = `
            <i
                class="ph ph-map-pin"
                aria-hidden="true"
            ></i>
        `;
    } else {
        markerClass += " route-map-marker-stop";
        content = escapeRouteHtml(label);
    }
    return L.divIcon({
        className: "hims-route-marker-icon",
        html: `
            <div class="${markerClass}">
                ${content}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -22],
    });
}

function addRouteLeafletMarker(
    coordinate,
    title,
    description,
    type = "stop",
    label = "",
) {
    if (!routeLeafletMarkerLayer || !coordinate) {
        return null;
    }
    const marker = L.marker([coordinate.lat, coordinate.lng], {
        icon: createRouteMarkerIcon(type, label),
    }).addTo(routeLeafletMarkerLayer).bindPopup(`
            <strong>${escapeRouteHtml(title)}</strong><br>
            ${escapeRouteHtml(description || "")}
        `);

    return marker;
}

function hasValidRouteCoordinate(lat, lng) {
    if (
        lat === null ||
        lat === undefined ||
        lat === "" ||
        lng === null ||
        lng === undefined ||
        lng === ""
    ) {
        return false;
    }
    const latitude = Number(lat);
    const longitude = Number(lng);
    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function makeRouteCoordinate(lat, lng, displayName = "") {
    if (!hasValidRouteCoordinate(lat, lng)) {
        return null;
    }
    return {
        lat: Number(lat),
        lng: Number(lng),
        displayName: String(displayName || "").trim(),
    };
}
/**
 * Convert route addresses into coordinates.
 *
 * Order:
 * Origin → Stop 1 → Stop 2 → ... → Destination
 */
async function geocodeRouteRecord(record) {
    if (!record || !record.origin || !record.destination) {
        throw new Error("Origin and destination are required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Origin
    |--------------------------------------------------------------------------
    | Prefer saved MySQL coordinates.
    | Fall back to Nominatim only when coordinates are missing.
    |--------------------------------------------------------------------------
    */
    let origin = makeRouteCoordinate(
        record.originLatitude,
        record.originLongitude,
        record.origin,
    );
    if (!origin) {
        origin = await geocodeRouteLocation(record.origin);
    }
    /*
    |--------------------------------------------------------------------------
    | Stops
    |--------------------------------------------------------------------------
    */
    const stops = Array.isArray(record.stops)
        ? record.stops.map((stop) => String(stop || "").trim()).filter(Boolean)
        : [];
    const persistedStopCoordinates = Array.isArray(record.stopCoordinates)
        ? record.stopCoordinates
        : [];
    const stopCoordinates = [];
    for (let index = 0; index < stops.length; index++) {
        const location = stops[index];
        const persisted = persistedStopCoordinates[index] || null;
        /*
        |--------------------------------------------------------------------------
        | Only reuse a coordinate when it belongs to the same stop.
        |--------------------------------------------------------------------------
        */
        const sameLocation =
            persisted &&
            String(persisted.location || "")
                .trim()
                .toLowerCase() === location.toLowerCase();
        let coordinate = null;
        if (
            sameLocation &&
            hasValidRouteCoordinate(persisted.latitude, persisted.longitude)
        ) {
            coordinate = makeRouteCoordinate(
                persisted.latitude,
                persisted.longitude,
                location,
            );
        }
        /*
        |--------------------------------------------------------------------------
        | Missing coordinate → Nominatim fallback
        |--------------------------------------------------------------------------
        */
        if (!coordinate) {
            coordinate = await geocodeRouteLocation(location);
        }
        stopCoordinates.push({
            location,
            coordinate,
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Destination
    |--------------------------------------------------------------------------
    */
    let destination = makeRouteCoordinate(
        record.destinationLatitude,
        record.destinationLongitude,
        record.destination,
    );
    if (!destination) {
        destination = await geocodeRouteLocation(record.destination);
    }
    return {
        origin,
        stops: stopCoordinates,
        destination,
    };
}

async function requestOsrmOptimizedTrip(routeCoordinates) {
    const coordinates = [
        routeCoordinates.origin,
        ...routeCoordinates.stops.map((stop) => stop.coordinate),
        routeCoordinates.destination,
    ];
    const coordinateString = coordinates
        .map((point) => `${point.lng},${point.lat}`)
        .join(";");
    const url =
        `https://router.project-osrm.org/trip/v1/driving/${coordinateString}` +
        "?source=first" +
        "&destination=last" +
        "&roundtrip=false" +
        "&overview=full" +
        "&geometries=geojson" +
        "&steps=false";
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(
            `OSRM Trip request failed with status ${response.status}.`,
        );
    }
    const data = await response.json();
    if (
        data?.code !== "Ok" ||
        !Array.isArray(data.trips) ||
        data.trips.length === 0
    ) {
        throw new Error(
            data?.message || "No optimized driving route was found.",
        );
    }
    return {
        trip: data.trips[0],
        waypoints: Array.isArray(data.waypoints) ? data.waypoints : [],
    };
}

function getOptimizedRouteStops(originalStops, waypoints) {
    if (
        !Array.isArray(originalStops) ||
        originalStops.length === 0 ||
        !Array.isArray(waypoints)
    ) {
        return originalStops || [];
    }
    const entries = [];
    for (
        let originalIndex = 0;
        originalIndex < originalStops.length;
        originalIndex++
    ) {
        const waypoint = waypoints[originalIndex + 1];
        if (!waypoint) {
            continue;
        }

        entries.push({
            location: originalStops[originalIndex],
            originalStopIndex: originalIndex,
            optimizedPosition: Number(waypoint.waypoint_index),
        });
    }
    entries.sort((a, b) => a.optimizedPosition - b.optimizedPosition);
    return entries;
}
/**
 * Request an actual driving route from OSRM.
 *
 * IMPORTANT:
 * OSRM coordinate format:
 * longitude,latitude
 */
async function requestOsrmRoute(
    routeCoordinates
) {
    const coordinates = [
        routeCoordinates.origin,
        ...routeCoordinates.stops.map(
            (stop) =>
                stop.coordinate
        ),
        routeCoordinates.destination,
    ];
    const coordinateString =
        coordinates
            .map(
                (point) =>
                    `${point.lng},${point.lat}`
            )
            .join(";");
   const url =
       `https://router.project-osrm.org/route/v1/driving/${coordinateString}` +
       "?overview=full&geometries=geojson&steps=false";

    const response =
        await fetch(
            url,
            {
                headers: {
                    Accept:
                        "application/json",
                },
            }
        );
    if (!response.ok) {
        throw new Error(
            "Unable to calculate the driving route."
        );
    }
    const data =
        await response.json();
    if (
        data?.code !== "Ok" ||
        !Array.isArray(
            data.routes
        ) ||
        data.routes.length === 0
    ) {
        throw new Error(
            "No driving route was found between the selected locations."
        );
    }
    return data.routes[0];
}
/**
 * Draw an OSRM GeoJSON route onto Leaflet.
 */
function drawRouteOnLeaflet(route, routeCoordinates, record) {
    if (!routeLeafletMap || !route?.geometry) {
        return;
    }

    clearRouteLeafletMap();
    routeLeafletRouteLayer = L.geoJSON(route.geometry, {
        style: {
            weight: 6,
            opacity: 0.85,
        },
    }).addTo(routeLeafletMap);
    addRouteLeafletMarker(
        routeCoordinates.origin,
        "Origin",
        record.origin,
        "origin"
    );
    routeCoordinates.stops.forEach((stop, index) => {
        addRouteLeafletMarker(
            stop.coordinate,
            `Stop ${index + 1}`,
            stop.location,
            "stop",
            String(index + 1)
        );
    });
    addRouteLeafletMarker(
        routeCoordinates.destination,
        "Destination",
        record.destination,
        "destination"
    );
    const bounds = routeLeafletRouteLayer.getBounds();
    if (bounds && bounds.isValid()) {
        routeLeafletMap.fitBounds(bounds, {
            padding: [40, 40],
        });
    }
    window.setTimeout(() => {
        routeLeafletMap?.invalidateSize();
    }, 100);
}
/**
 * Main routing function.
 *
 * This is reusable by:
 * - Route map preview
 * - Optimize Route button
 *
 * options.draw = false
 * can calculate a route without drawing it.
 */
async function calculateRouteWithOsrm(
    record,
    options = {}
) {
    const map =
        await initRouteLeafletMap();
    if (
        options.draw !== false &&
        !map
    ) {
        return null;
    }
    if (
        !record ||
        !record.origin ||
        !record.destination
    ) {
        return null;
    }
    const requestToken =
        ++routeRoutingRequestToken;
    try {
        const routeCoordinates = await geocodeRouteRecord(record);
        if (requestToken !== routeRoutingRequestToken) {
            return null;
        }
        const route = await requestOsrmRoute(routeCoordinates);
        if (requestToken !== routeRoutingRequestToken) {
            return null;
        }
        /*
        |--------------------------------------------------------------------------
        | OSRM result
        |--------------------------------------------------------------------------
        */
        const distanceMeters = Number(route.distance || 0);
        const durationSeconds = Number(route.duration || 0);
        const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : null;
        const durationMinutes =
            durationSeconds > 0 ? Math.ceil(durationSeconds / 60) : null;
        if (options.draw !== false) {
            drawRouteOnLeaflet(route, routeCoordinates, record);
        }
        return {
            distanceKm:
                distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
            durationMinutes,
            route,
            routeCoordinates,
        };
    } catch (error) {
        /*
        |--------------------------------------------------------------------------
        | Silent preview failures should not create red console noise.
        |--------------------------------------------------------------------------
        */
        if (options.silent !== true) {
            console.error("Route calculation failed:", error);
        }
        if (options.silent !== true && typeof showToast === "function") {
            showToast(
                error.message || "Unable to calculate the route.",
                "error",
            );
        }
        throw error;
    }
}

/* ==========================================
   MAP PANEL
========================================== */
async function updateRouteMapPanel(record) {
    const distanceEl = document.getElementById("mapDistanceLabel");
    const etaEl = document.getElementById("mapEtaLabel");
    const statusEl = document.getElementById("mapStatusLabel");
    const strategyEl = document.getElementById("mapStrategyLabel");
    /*
    |--------------------------------------------------------------------------
    | No selected RoutePlan
    |--------------------------------------------------------------------------
    */
    if (!record) {
        clearRouteLeafletMap();
        if (distanceEl) {
            distanceEl.textContent = "—";
        }
        if (etaEl) {
            etaEl.textContent = "—";
        }
        if (statusEl) {
            statusEl.textContent = "—";
        }
        if (strategyEl) {
            strategyEl.textContent = "—";
        }
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Stored database values
    |--------------------------------------------------------------------------
    */
    if (distanceEl) {
        distanceEl.textContent = formatRouteDistance(record.estimatedDistance);
    }
    if (etaEl) {
        etaEl.textContent = record.estimatedTravelTime || "—";
    }
    if (statusEl) {
        statusEl.textContent = record.status || "—";
    }
    if (strategyEl) {
        strategyEl.textContent = record.optimizationStrategy
            ? record.optimizationStrategy +
              (record.optimizationScore != null
                  ? " · Score " + record.optimizationScore
                  : "")
            : "—";
    }
    /*
    |--------------------------------------------------------------------------
    | Draw actual road route using Leaflet + OSRM
    |--------------------------------------------------------------------------
    */
    try {
        await calculateRouteWithOsrm(record, {
            draw: true,
            silent: true,
        });
    } catch (error) {
        console.warn("Route preview unavailable:", error?.message || error);
    }
}

function updateOptimizationSummaryPanel(record) {
    const set = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    if (!record) {
        set("optSummaryDistance", "—");
        set("optSummaryTime", "—");
        set("optSummaryStrategy", "—");
        set("optSummaryVehicle", "—");
        set("optSummaryDriver", "—");
        set("optSummaryScore", "—");
        return;
    }

    set("optSummaryDistance", formatRouteDistance(record.estimatedDistance));
    set("optSummaryTime", record.estimatedTravelTime || "—");
    set("optSummaryStrategy", record.optimizationStrategy || "—");
    set("optSummaryVehicle", record.vehicle || "—");
    set("optSummaryDriver", record.driver || "—");
    set(
        "optSummaryScore",
        record.optimizationScore != null
            ? String(record.optimizationScore)
            : "—",
    );
}

/**
 * Pure UI refresh.
 *
 * This function DOES NOT call the API.
 * It renders whatever is currently stored
 * in routePlanningRecords.
 */
function refreshRoutePlanningTable(options = {}) {
    if (isRefreshingRoutes) {
        return [];
    }

    isRefreshingRoutes = true;

    try {
        if (options.resetPage === true) {
            routePaginationState.page = 1;
        }

        /*
    |--------------------------------------------------------------------------
    | Stable frontend order
    |--------------------------------------------------------------------------
    */
        routePlanningRecords.forEach((record) => {
            if (record._order === null || record._order === undefined) {
                record._order = routeNextOriginalOrder++;
            }
        });

        const filters = getRouteFilterValues();
        const all = getAllRouteRecords({
            includeArchived: true,
        });

        let matched = all.filter((record) =>
            routeMatchesFilters(record, filters),
        );

        matched = sortRouteRecords(matched);

        const tbody = document.getElementById("routeTableBody");

        if (!tbody) {
            return matched;
        }

        /*
    |--------------------------------------------------------------------------
    | No actual database Route Plans
    |--------------------------------------------------------------------------
    */

        if (all.length === 0) {
            updateRouteEmptyState(true);
            tbody.replaceChildren();
            renderRoutePagination(0);
            void updateRouteMapPanel(null);
            updateOptimizationSummaryPanel(null);

            return [];
        }
        updateRouteEmptyState(false);

        /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

        const pageSize = routePaginationState.pageSize;
        const total = matched.length;
        const totalPages = Math.ceil(total / pageSize) || 0;

        if (totalPages > 0) {
            routePaginationState.page = Math.min(
                Math.max(routePaginationState.page, 1),
                totalPages,
            );
        } else {
            routePaginationState.page = 1;
        }
        const start = (routePaginationState.page - 1) * pageSize;
        const pageRows = matched.slice(start, start + pageSize);
        const fragment = document.createDocumentFragment();

        /*
    |--------------------------------------------------------------------------
    | Filters returned zero results
    |--------------------------------------------------------------------------
    */

        if (pageRows.length === 0) {
            const tr = document.createElement("tr");
            tr.className = "route-no-results";
            tr.dataset.helperRow = "true";
            tr.innerHTML =
                '<td colspan="' +
                ROUTE_TABLE_COLUMN_COUNT +
                '">No routes found.</td>';
            fragment.appendChild(tr);
        } else {
            pageRows.forEach((record) =>
                fragment.appendChild(buildRouteTableRow(record)),
            );
        }

        tbody.replaceChildren(fragment);
        renderRoutePagination(total);

        /*
    |--------------------------------------------------------------------------
    | Side panels
    |--------------------------------------------------------------------------
    */

        const focusId = options.focusId;
        const panelRecord =
            (focusId &&
                matched.find(
                    (record) => String(record.id) === String(focusId),
                )) ||
            matched[0] ||
            all[0] ||
            null;

        if (options.refreshMap !== false) {
            void updateRouteMapPanel(panelRecord);
        }
        updateOptimizationSummaryPanel(panelRecord);

        return matched;
    } catch (error) {
        console.error("refreshRoutePlanningTable failed:", error);

        return [];
    } finally {
        queueMicrotask(() => {
            isRefreshingRoutes = false;
        });
    }
}

/* ==========================================
   API DATA REFRESH
========================================== */
/**
 * Reload Route Plans from Laravel/MySQL,
 * rebuild resource filters, refresh stats,
 * and redraw the table.
 */
async function reloadRoutePlanningData(options = {}) {
    if (isLoadingRouteData) {
        return [];
    }

    isLoadingRouteData = true;

    try {
        await loadRoutePlansFromApi();
        routeNextOriginalOrder = routePlanningRecords.length;
        rebuildRouteResourceFilters(routePlanningRecords);

        /*
    |--------------------------------------------------------------------------
    | Stats endpoint failure should not prevent
    | the Route Planning table from rendering.
    |--------------------------------------------------------------------------
    */

        await refreshRouteStatistics();
        return refreshRoutePlanningTable({
            resetPage: options.resetPage === true,
            focusId: options.focusId,
            refreshMap: options.refreshMap !== false,
            reason: options.reason || "api-refresh",
        });
    } catch (error) {
        console.error("Unable to load Route Planning data:", error);

        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to load Route Planning data.",
                "error",
            );
        }

        /*
    |--------------------------------------------------------------------------
    | Render existing browser cache if available.
    |--------------------------------------------------------------------------
    */

        return refreshRoutePlanningTable({
            resetPage: options.resetPage === true,

            reason: "api-error",
        });
    } finally {
        isLoadingRouteData = false;
    }
}

function startRoutePlanningLiveUpdates() {
    if (routeLiveUpdateInterval) {
        return;
    }
    routeLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (
            routeLiveUpdateRunning ||
            isLoadingRouteData ||
            isRefreshingRoutes
        ) {
            return;
        }
        routeLiveUpdateRunning = true;
        try {
            await reloadRoutePlanningData({
                resetPage: false,
                reason: "live-update",
            });
        } catch (error) {
            console.error("Route Planning live update failed:", error);
        } finally {
            routeLiveUpdateRunning = false;
        }
    }, 10000);
}

function resetRoutePlanningFilters() {
    const search = document.getElementById("routeSearch");
    const priority = document.getElementById("routePriorityFilter");
    const status = document.getElementById("routeStatusFilter");
    const vehicle = document.getElementById("routeVehicleFilter");
    const driver = document.getElementById("routeDriverFilter");
    const department = document.getElementById("routeDepartmentFilter");
    const date = document.getElementById("routeDateFilter");
    const archived = document.getElementById("routeShowArchived");

    if (search) {
        search.value = "";
    }
    if (priority) {
        priority.value = "all";
    }
    if (status) {
        status.value = "all";
    }
    if (vehicle) {
        vehicle.value = "all";
    }
    if (driver) {
        driver.value = "all";
    }
    if (department) {
        department.value = "all";
    }
    if (date) {
        date.value = "";
    }
    if (archived) {
        archived.checked = false;
    }

    routeSortState.field = null;
    routeSortState.direction = null;
    routePaginationState.page = 1;
}

function initRoutePlanningPipeline() {
    const tableBody = document.getElementById("routeTableBody");

    if (!tableBody || tableBody.dataset.routePipelineInit === "true") {
        return;
    }

    tableBody.dataset.routePipelineInit = "true";

    const onFilter = () => {
        refreshRoutePlanningTable({
            resetPage: true,
            reason: "filter",
        });
    };

    document.getElementById("routeSearch")?.addEventListener("input", onFilter);

    [
        "routePriorityFilter",
        "routeStatusFilter",
        "routeVehicleFilter",
        "routeDriverFilter",
        "routeDepartmentFilter",
        "routeDateFilter",
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener("change", onFilter);
    });

    document
        .getElementById("routeShowArchived")
        ?.addEventListener("change", onFilter);

    /*
  |--------------------------------------------------------------------------
  | Refresh Button
  |--------------------------------------------------------------------------
  | This now performs a real Laravel/MySQL reload.
  */

    document
        .getElementById("refreshRoutes")
        ?.addEventListener("click", async () => {
            resetRoutePlanningFilters();

            await reloadRoutePlanningData({
                resetPage: true,
                reason: "manual-refresh",
            });

            if (typeof showToast === "function") {
                showToast("Route planning refreshed.", "success");
            }
        });

    /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

    document
        .getElementById("routePagination")
        ?.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-route-page]");

            if (!button || button.disabled) {
                return;
            }

            const action = button.dataset.routePage;

            if (action === "prev") {
                routePaginationState.page = Math.max(
                    1,
                    routePaginationState.page - 1,
                );
            } else if (action === "next") {
                routePaginationState.page += 1;
            } else if (action === "page") {
                const page = Number(button.dataset.pageNumber);

                if (page) {
                    routePaginationState.page = page;
                }
            }

            refreshRoutePlanningTable({
                resetPage: false,
                reason: "page",
            });
        });

    /*
  |--------------------------------------------------------------------------
  | Table Sorting
  |--------------------------------------------------------------------------
  */

    document
        .querySelectorAll("#routeTable thead th.sortable[data-sort]")
        .forEach((heading) => {
            heading.style.cursor = "pointer";
            heading.addEventListener("click", () => {
                const field = heading.dataset.sort;

                if (!field) {
                    return;
                }

                if (routeSortState.field === field) {
                    if (routeSortState.direction === "asc") {
                        routeSortState.direction = "desc";
                    } else if (routeSortState.direction === "desc") {
                        routeSortState.field = null;

                        routeSortState.direction = null;
                    } else {
                        routeSortState.direction = "asc";
                    }
                } else {
                    routeSortState.field = field;

                    routeSortState.direction = "asc";
                }

                refreshRoutePlanningTable({
                    resetPage: false,
                    reason: "sort",
                });
            });
        });
}
