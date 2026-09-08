/* ==========================================
   HIMS Fleet - Route Planning Modals

   Purpose:
   - New Route
   - View Route
   - Edit Route
   - Delete Route
   - Archive / Restore
   - Duplicate Route
   - Approved Reservation auto-population
   - Laravel/MySQL persistence
========================================== */

let routeModalsInitialized = false;

let routeFormMode = "add"; // add | edit
let routeEditingId = null;
let routeDeleteTargetId = null;

/* ==========================================
   Route Planning Settings
========================================== */

let routeModuleSettings = {
    preferOptimized: true,
};

async function loadRouteModuleSettings() {
    const defaults = {
        preferOptimized: true,
    };
    try {
        const response = await fetch(
            "/settings/data",
            {
                headers: {
                    Accept: "application/json",
                },
                credentials: "same-origin",
            }
        );

        if (!response.ok) {
            throw new Error(
                "Unable to load Route Planning settings."
            );
        }

        const data = await response.json();
        const settings =
            data?.settings?.routes;

        if (
            !settings ||
            typeof settings !== "object"
        ) {
            routeModuleSettings = defaults;
            return routeModuleSettings;
        }

        routeModuleSettings = {
            preferOptimized:
                settings.preferOptimized !== false,
        };
        return routeModuleSettings;
    } catch (error) {
        console.error(
            "Route settings load error:",
            error
        );
        routeModuleSettings = defaults;
        return routeModuleSettings;
    }
}

//   RBAC
function canCreateRoute() {
    return (
        window.FleetRBAC?.hasPermission?.(
            "route_planning",
            "canCreate"
        ) === true
    );
}
function canUpdateRoute() {
    return (
        window.FleetRBAC?.hasPermission?.(
            "route_planning",
            "canUpdate"
        ) === true
    );
}
function canDeleteRoute() {
    return (
        window.FleetRBAC?.hasPermission?.(
            "route_planning",
            "canDelete"
        ) === true
    );
}
function canArchiveRoute() {
    return (
        window.FleetRBAC?.hasPermission?.(
            "route_planning",
            "canArchive"
        ) === true
    );
}
function canRestoreRoute() {
    return (
        window.FleetRBAC?.hasPermission?.(
            "route_planning",
            "canRestore"
        ) === true
    );
}
function canDuplicateRoute() {
    return (
        window.FleetRBAC?.hasPermission?.(
            "route_planning",
            "canDuplicate"
        ) === true
    );
}

let routeLastOptimization = null;

/* ==========================================
   SELECT HELPERS 
========================================== */
function fillRouteSelect(select, options, placeholder) {
    if (!select) {
        return;
    }

    const currentValue = select.value;
    select.innerHTML = `<option value="">${escapeRouteHtml(placeholder)}</option>`;
    options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = String(optionValue);
        option.textContent = String(optionValue);
        select.appendChild(option);
    });

    if (
        currentValue &&
        [...select.options].some((option) => option.value === currentValue)
    ) {
        select.value = currentValue;
    }
}

function populateRouteFormOptions() {
    fillRouteSelect(
        document.getElementById("routeDepartment"),
        ROUTE_DEPARTMENTS,
        "Select department",
    );
}

/* ==========================================
   FIELD ERROR HELPERS
========================================== */
function clearRouteFieldErrors(form) {
    form?.querySelectorAll(".is-invalid").forEach((element) => {
        element.classList.remove("is-invalid");
    });
    form?.querySelectorAll(".field-error").forEach((element) => {
        element.textContent = "";
        element.style.display = "none";
    });
}

function showRouteFieldError(field, message) {
    if (!field) {
        return;
    }
    field.classList.add("is-invalid");
    let error = field.parentElement?.querySelector(
        ".field-error[data-field='" + field.id + "']",
    );
    if (!error) {
        error = document.createElement("div");
        error.className = "field-error";
        error.setAttribute("data-field", field.id);
        field.parentElement?.appendChild(error);
    }
    error.textContent = message;
    error.style.display = "block";
}

function applyLaravelValidationErrors(errors) {
    if (!errors || typeof errors !== "object") {
        return;
    }
    const fieldMap = {
        reservation_id: "routeReservation",
        origin: "routeOrigin",
        destination: "routeDestination",
        priority: "routePriority",
        department: "routeDepartment",
        status: "routeStatus",
        departure_date: "routeDepartureDate",
        departure_time: "routeDepartureTime",
        estimated_distance: "routeEstimatedDistance",
        estimated_time: "routeEstimatedTime",
        optimization_strategy: "routeOptStrategy",
        optimization_score: "routeOptScore",
        purpose: "routePurpose",
        notes: "routeNotes",
    };

    Object.entries(errors).forEach(([key, messages]) => {
        let baseKey = key;
        if (key.startsWith("stops.")) {
            baseKey = null;
        }
        if (!baseKey) {
            return;
        }
        const elementId = fieldMap[baseKey];
        if (!elementId) {
            return;
        }
        const field = document.getElementById(elementId);
        const message = Array.isArray(messages)
            ? messages[0]
            : String(messages);
        showRouteFieldError(field, message);
    });
}

function hasRouteCoordinateValue(value) {
    return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
    );
}

/* ==========================================
   STOPS
========================================== */
function getRouteStopsFromForm() {
    const list = document.getElementById("routeStopsList");

    if (!list) {
        return [];
    }
    return Array.from(list.querySelectorAll("input.route-stop-input"))
        .map((input) => input.value.trim())
        .filter(Boolean);
}

function renderRouteStops(stops) {
    const list = document.getElementById("routeStopsList");

    if (!list) {
        return;
    }

    list.innerHTML = "";
    const items = stops && stops.length ? stops : [""];
    items.forEach((stop, index) => {
        const row = document.createElement("div");
        row.className = "route-stop-row";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "route-stop-input";
        input.id = `routeStop_${index}`;
        input.placeholder = `Stop ${index + 1}`;
        input.value = String(stop || "");
        input.setAttribute("aria-label", `Route stop ${index + 1}`);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-outline route-remove-stop";
        button.setAttribute("aria-label", `Remove stop ${index + 1}`);
        button.innerHTML = '<i class="ph ph-x" aria-hidden="true"></i>';
        row.appendChild(input);
        row.appendChild(button);
        list.appendChild(row);
    });
}

/* ==========================================
   RESERVATION HELPERS
========================================== */

function getSelectedRouteReservation() {
    const reservationId = document.getElementById("routeReservation")?.value;
    if (!reservationId) {
        return null;
    }
    return (
        routeAvailableReservations.find(
            (reservation) => String(reservation.id) === String(reservationId),
        ) || null
    );
}

function setRouteResourceSelect(select, value, label) {
    if (!select) {
        return;
    }
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = value || "";
    option.textContent = label || "Not assigned";
    option.selected = true;
    select.appendChild(option);
    select.disabled = true;
}

function applyReservationResourceDisplay(reservation) {
    const vehicle = reservation?.vehicle || null;
    const driver = reservation?.driver || null;
    const vehicleLabel = getRouteVehicleLabel(vehicle) || "No vehicle assigned";
    const driverLabel = getRouteDriverLabel(driver) || "No driver assigned";
    setRouteResourceSelect(
        document.getElementById("routeVehicle"),
        vehicle?.id ? String(vehicle.id) : "",
        vehicleLabel,
    );
    setRouteResourceSelect(
        document.getElementById("routeDriver"),
        driver?.id ? String(driver.id) : "",
        driverLabel,
    );
}

function resetRouteResourceDisplay() {
    setRouteResourceSelect(
        document.getElementById("routeVehicle"),
        "",
        "Select reservation first",
    );
    setRouteResourceSelect(
        document.getElementById("routeDriver"),
        "",
        "Select reservation first",
    );
}

function resetRouteOptimization() {
    routeLastOptimization = null;
    const distance = document.getElementById("routeEstimatedDistance");
    const time = document.getElementById("routeEstimatedTime");
    const strategy = document.getElementById("routeOptStrategy");
    const score = document.getElementById("routeOptScore");
    const summary = document.getElementById("routeOptimizeSummary");

    if (distance) {
        distance.value = "";
        distance.dataset.raw = "";
    }
    if (time) {
        time.value = "";
        time.dataset.minutes = "";
    }
    if (strategy) {
        strategy.value = "";
    }
    if (score) {
        score.value = "";
        score.dataset.raw = "";
    }
    if (summary) {
        summary.hidden = true;
        summary.innerHTML = "";
    }
}

function applyReservationToRouteForm(reservation) {
    if (!reservation) {
        resetRouteResourceDisplay();
        return;
    }
    const origin = document.getElementById("routeOrigin");
    const destination = document.getElementById("routeDestination");
    const priority = document.getElementById("routePriority");
    const departureDate = document.getElementById("routeDepartureDate");
    const departureTime = document.getElementById("routeDepartureTime");
    if (origin) {
        origin.value = reservation.pickup_location || "";
    }
    if (destination) {
        destination.value = reservation.destination || "";
    }
    if (priority) {
        priority.value = reservation.priority || "Normal";
    }
    if (departureDate) {
        departureDate.value = String(reservation.schedule_date || "").slice(
            0,
            10,
        );
    }
    if (departureTime) {
        departureTime.value = String(reservation.schedule_time || "").slice(
            0,
            5,
        );
    }
    applyReservationResourceDisplay(reservation);
    resetRouteOptimization();
}

async function populateRouteReservations(selectedReservation = null) {
    const select = document.getElementById("routeReservation");
    if (!select) {
        return [];
    }
    select.disabled = true;
    select.innerHTML = '<option value="">Loading reservations...</option>';
    try {
        const available = await fetchAvailableRouteReservations();
        let reservations = available.slice();
        /*
    |--------------------------------------------------------------------------
    | Edit Mode
    |--------------------------------------------------------------------------
    | The selected RoutePlan already owns one Reservation,
    | so it will not appear in availableReservations().
    | Add the existing Reservation manually to the dropdown.
    */
        if (selectedReservation && selectedReservation.id) {
            const exists = reservations.some(
                (reservation) =>
                    String(reservation.id) === String(selectedReservation.id),
            );
            if (!exists) {
                reservations.unshift(selectedReservation);
            }
        }
        routeAvailableReservations = reservations;
        select.innerHTML =
            '<option value="">Select approved reservation</option>';
        reservations.forEach((reservation) => {
            const option = document.createElement("option");
            option.value = String(reservation.id);
            const number =
                reservation.reservation_number ||
                `Reservation #${reservation.id}`;
            const patient = reservation.patient_name
                ? ` — ${reservation.patient_name}`
                : "";
            option.textContent = number + patient;
            select.appendChild(option);
        });
        if (selectedReservation?.id) {
            select.value = String(selectedReservation.id);
        }
        if (routeFormMode === "edit") {
            select.disabled = true;
        } else {
            select.disabled = false;
        }
        if (reservations.length === 0 && routeFormMode === "add") {
            select.innerHTML =
                '<option value="">No approved reservations available</option>';
            select.disabled = true;
        }
        return reservations;
    } catch (error) {
        console.error("Unable to load Route Planning reservations:", error);
        select.innerHTML =
            '<option value="">Unable to load reservations</option>';
        select.disabled = true;
        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to load approved reservations.",
                "error",
            );
        }
        return [];
    }
}

/* ==========================================
   COLLECT FORM DATA
========================================== */
function collectRouteFormData() {
    const get = (id) => document.getElementById(id)?.value?.trim() || "";
    const stops = getRouteStopsFromForm();
    const routeCoordinates = routeLastOptimization?.routeCoordinates || null;

    return {
        reservationId: get("routeReservation"),
        routeNumber: get("routeNumber"),
        origin: get("routeOrigin"),
        destination: get("routeDestination"),
        stops,
        vehicle: get("routeVehicle"),
        driver: get("routeDriver"),
        priority: get("routePriority"),
        department: get("routeDepartment"),
        purpose: get("routePurpose"),
        departureDate: get("routeDepartureDate"),
        departureTime: get("routeDepartureTime"),
        status: get("routeStatus"),
        notes: get("routeNotes"),
        estimatedDistance:
            document.getElementById("routeEstimatedDistance")?.dataset.raw ||
            "",
        estimatedTravelTime: get("routeEstimatedTime"),
        estimatedTravelTimeMinutes:
            document.getElementById("routeEstimatedTime")?.dataset.minutes ||
            "",
        optimizationStrategy: get("routeOptStrategy"),
        optimizationScore:
            document.getElementById("routeOptScore")?.dataset.raw || "",

        /*
        |--------------------------------------------------------------------------
        | Persisted origin coordinates
        |--------------------------------------------------------------------------
        */
        originLatitude: routeCoordinates?.origin?.lat ?? null,
        originLongitude: routeCoordinates?.origin?.lng ?? null,
        /*
        |--------------------------------------------------------------------------
        | Persisted destination coordinates
        |--------------------------------------------------------------------------
        */
        destinationLatitude: routeCoordinates?.destination?.lat ?? null,
        destinationLongitude: routeCoordinates?.destination?.lng ?? null,
        /*
        |--------------------------------------------------------------------------
        | Stop coordinates aligned with current optimized DOM order
        |--------------------------------------------------------------------------
        */
        stopCoordinates: stops.map((location, index) => {
            const stopCoordinate = routeCoordinates?.stops?.[index];
            return {
                location,
                latitude: stopCoordinate?.coordinate?.lat ?? null,
                longitude: stopCoordinate?.coordinate?.lng ?? null,
            };
        }),
    };
}

async function optimizeRouteWithOsrm(data) {
    if (!data.origin || !data.destination) {
        throw new Error("Origin and destination are required.");
    }
    const stops = Array.isArray(data.stops)
        ? data.stops.map((stop) => String(stop || "").trim()).filter(Boolean)
        : [];

    /*
    |--------------------------------------------------------------------------
    | First geocode all locations
    |--------------------------------------------------------------------------
    */
    const routeCoordinates = await geocodeRouteRecord({
        origin: data.origin,
        destination: data.destination,
        stops,
    });
    let estimatedDistance = null;
    let estimatedTravelTimeMinutes = null;
    let optimizationStrategy = "";
    let optimizationScore = null;
    let optimizedStops = stops.slice();
    let optimizedRouteCoordinates = {
        origin: routeCoordinates.origin,
        stops: routeCoordinates.stops,
        destination: routeCoordinates.destination,
    };

    let routeGeometry = null;
    /*
    |--------------------------------------------------------------------------
    | 2+ Stops → true waypoint optimization
    |--------------------------------------------------------------------------
    */
    if (stops.length >= 2) {
        const optimized = await requestOsrmOptimizedTrip(routeCoordinates);
        const trip = optimized.trip;
        const optimizedStopEntries = getOptimizedRouteStops(
            stops,
            optimized.waypoints,
        );
        optimizedStops = optimizedStopEntries.map((entry) => entry.location);
        /*
        |--------------------------------------------------------------------------
        | Coordinates must follow optimized stop order
        |--------------------------------------------------------------------------
        */
        optimizedRouteCoordinates = {
            origin: routeCoordinates.origin,
            stops: optimizedStopEntries.map((entry) => ({
                location: entry.location,
                coordinate:
                    routeCoordinates.stops[entry.originalStopIndex]
                        ?.coordinate ?? null,
            })),

            destination: routeCoordinates.destination,
        };
        const distanceMeters = Number(trip.distance || 0);
        const durationSeconds = Number(trip.duration || 0);
        if (distanceMeters <= 0 || durationSeconds <= 0) {
            throw new Error(
                "The optimized route returned incomplete route information.",
            );
        }
        estimatedDistance = Number((distanceMeters / 1000).toFixed(2));
        estimatedTravelTimeMinutes = Math.max(
            1,
            Math.ceil(durationSeconds / 60),
        );
        optimizationStrategy = "OSRM Optimized Waypoints";
        optimizationScore = 95;
        routeGeometry = trip.geometry || null;

        /*
        |--------------------------------------------------------------------------
        | Draw optimized route
        |--------------------------------------------------------------------------
        */
        drawRouteOnLeaflet(trip, optimizedRouteCoordinates, {
            origin: data.origin,

            destination: data.destination,
        });
    } else {
        /*
        |--------------------------------------------------------------------------
        | 0–1 Stop → normal route
        |--------------------------------------------------------------------------
        */
        const routeResult = await calculateRouteWithOsrm(
            {
                origin: data.origin,
                destination: data.destination,
                stops,
            },
            {
                draw: true,
                /*
                    |--------------------------------------------------------------------------
                    | Let this function's caller handle errors once.
                    |--------------------------------------------------------------------------
                    */
                silent: true,
            },
        );
        if (!routeResult) {
            throw new Error("Unable to calculate the route.");
        }
        estimatedDistance = Number(routeResult.distanceKm);
        estimatedTravelTimeMinutes = Number(routeResult.durationMinutes);
        optimizationStrategy =
            stops.length === 1 ? "OSRM Multi-stop Route" : "OSRM Fastest Route";
        optimizationScore = stops.length === 1 ? 92 : 95;
        routeGeometry = routeResult.route?.geometry || null;
        /*
        |--------------------------------------------------------------------------
        | calculateRouteWithOsrm() already returns the geocoded coordinates
        |--------------------------------------------------------------------------
        */
        optimizedRouteCoordinates =
            routeResult.routeCoordinates || routeCoordinates;
    }
    /*
    |--------------------------------------------------------------------------
    | Final validation
    |--------------------------------------------------------------------------
    */
    if (
        !Number.isFinite(estimatedDistance) ||
        estimatedDistance <= 0 ||
        !Number.isFinite(estimatedTravelTimeMinutes) ||
        estimatedTravelTimeMinutes <= 0
    ) {
        throw new Error(
            "The routing service returned incomplete route information.",
        );
    }

    const vehicleSelect = document.getElementById("routeVehicle");
    const driverSelect = document.getElementById("routeDriver");

    return {
        estimatedDistance,
        estimatedTravelTimeMinutes,
        estimatedTravelTime: formatRouteMinutes(estimatedTravelTimeMinutes),
        optimizationStrategy,
        /*
        |--------------------------------------------------------------------------
        | Application-generated score.
        | OSRM itself does not provide this score.
        |--------------------------------------------------------------------------
        */
        optimizationScore,
        recommendedVehicle:
            vehicleSelect?.selectedOptions?.[0]?.textContent?.trim() || "—",
        recommendedDriver:
            driverSelect?.selectedOptions?.[0]?.textContent?.trim() || "—",
        optimizedStops,
        routeGeometry,
        /*
        |--------------------------------------------------------------------------
        | Important for backend coordinate persistence
        |--------------------------------------------------------------------------
        */
        routeCoordinates: optimizedRouteCoordinates,
    };
}

/* ==========================================
   OPTIMIZATION
========================================== */
function applyOptimizationToForm(result) {
    routeLastOptimization = result;

    const distance = document.getElementById("routeEstimatedDistance");
    const time = document.getElementById("routeEstimatedTime");
    const strategy = document.getElementById("routeOptStrategy");
    const score = document.getElementById("routeOptScore");
    const summary = document.getElementById("routeOptimizeSummary");

    if (distance) {
        distance.value = formatRouteDistance(result.estimatedDistance);
        distance.dataset.raw = String(result.estimatedDistance);
    }
    if (time) {
        time.value = result.estimatedTravelTime;
        time.dataset.minutes = String(result.estimatedTravelTimeMinutes);
    }
    if (strategy) {
        strategy.value = result.optimizationStrategy;
    }
    if (score) {
        score.value = String(result.optimizationScore);
        score.dataset.raw = String(result.optimizationScore);
    }
    if (summary) {
        summary.hidden = false;
        summary.innerHTML = `
            <strong>Route Calculation Complete</strong>

            <p>
                Strategy:
                ${escapeRouteHtml(result.optimizationStrategy)}
                · Score:
                ${escapeRouteHtml(result.optimizationScore)}
            </p>

            <p>
                Distance:
                ${escapeRouteHtml(formatRouteDistance(result.estimatedDistance))}
                · Time:
                ${escapeRouteHtml(result.estimatedTravelTime)}
            </p>

            <p>
                Assigned vehicle:
                ${escapeRouteHtml(result.recommendedVehicle || "—")}
                · Driver:
                ${escapeRouteHtml(result.recommendedDriver || "—")}
            </p>
        `;
    }
}

/* ==========================================
   FORM VALIDATION
========================================== */
function validateRouteForm() {
    const form = document.getElementById("routeForm");

    if (!form) {
        return false;
    }
    clearRouteFieldErrors(form);
    let firstInvalid = null;
    const fail = (id, message) => {
        const field = document.getElementById(id);
        showRouteFieldError(field, message);

        if (!firstInvalid && field) {
            firstInvalid = field;
        }
    };
    const data = collectRouteFormData();
    /*
  |--------------------------------------------------------------------------
  | Reservation
  |--------------------------------------------------------------------------
  */
    if (routeFormMode === "add" && !data.reservationId) {
        fail("routeReservation", "Reservation is required.");
    }
    /*
  |--------------------------------------------------------------------------
  | Route Information
  |--------------------------------------------------------------------------
  */
    if (!data.origin) {
        fail("routeOrigin", "Origin is required.");
    }
    if (!data.destination) {
        fail("routeDestination", "Destination is required.");
    }

    if (
        data.origin &&
        data.destination &&
        data.origin.toLowerCase() === data.destination.toLowerCase()
    ) {
        fail("routeDestination", "Destination must differ from origin.");
    }
    if (!data.priority) {
        fail("routePriority", "Priority is required.");
    }
    if (!data.department) {
        fail("routeDepartment", "Department is required.");
    }
    if (!data.departureDate) {
        fail("routeDepartureDate", "Departure date is required.");
    }
    if (!data.departureTime) {
        fail("routeDepartureTime", "Departure time is required.");
    }
    /*
  |--------------------------------------------------------------------------
  | Edit Status
  |--------------------------------------------------------------------------
  */
    if (routeFormMode === "edit" && !data.status) {
        fail("routeStatus", "Status is required.");
    }
    /*
  |--------------------------------------------------------------------------
  | Ready For Dispatch requires optimization
  |--------------------------------------------------------------------------
  |
  | Backend also validates this.
  |
  */
    if (data.status === "Ready For Dispatch") {
        if (
            data.estimatedDistance === "" ||
            data.estimatedTravelTimeMinutes === ""
        ) {
            fail(
                "routeEstimatedDistance",
                "Run Optimize Route before marking the route Ready For Dispatch.",
            );
        }
    }

    if (firstInvalid) {
        firstInvalid.focus();
    }
    return !firstInvalid;
}

/* ==========================================
   API PAYLOAD BUILDERS
========================================== */
function buildCreateRoutePayload(data) {
    return {
        reservation_id: Number(data.reservationId),
        department: data.department,
        origin_latitude: data.originLatitude,
        origin_longitude: data.originLongitude,
        destination_latitude: data.destinationLatitude,
        destination_longitude: data.destinationLongitude,
        estimated_distance:
            data.estimatedDistance === ""
                ? null
                : Number(data.estimatedDistance),
        estimated_time:
            data.estimatedTravelTimeMinutes === ""
                ? null
                : Number(data.estimatedTravelTimeMinutes),
        optimization_strategy: data.optimizationStrategy || null,
        optimization_score:
            data.optimizationScore === ""
                ? null
                : Number(data.optimizationScore),
        purpose: data.purpose || null,
        notes: data.notes || null,
        stops: data.stopCoordinates,
    };
}

function buildUpdateRoutePayload(data) {
    return {
        origin: data.origin,
        origin_latitude: data.originLatitude,
        origin_longitude: data.originLongitude,
        destination: data.destination,
        destination_latitude: data.destinationLatitude,
        destination_longitude: data.destinationLongitude,
        priority: data.priority,
        department: data.department,
        status: data.status,
        estimated_distance:
            data.estimatedDistance === ""
                ? null
                : Number(data.estimatedDistance),
        estimated_time:
            data.estimatedTravelTimeMinutes === ""
                ? null
                : Number(data.estimatedTravelTimeMinutes),
        optimization_strategy: data.optimizationStrategy || null,
        optimization_score:
            data.optimizationScore === ""
                ? null
                : Number(data.optimizationScore),
        purpose: data.purpose || null,
        notes: data.notes || null,
        stops: data.stopCoordinates,
    };
}

/* ==========================================
   FORM MODAL
========================================== */
async function openRouteFormModal(mode, record = null) {
    if (mode === "add" && !canCreateRoute()) {
        return;
    }
    if (mode === "edit" && !canUpdateRoute()) {
        return;
    }
    const modal = document.getElementById("routeFormModal");
    const title = document.getElementById("routeFormModalTitle");
    const form = document.getElementById("routeForm");
    if (!modal || !form) {
        return;
    }
    routeFormMode = mode;
    routeEditingId = mode === "edit" && record ? record.id : null;
    routeLastOptimization = null;
    clearRouteFieldErrors(form);
    populateRouteFormOptions();
    const reservationSelect = document.getElementById("routeReservation");
    const statusSelect = document.getElementById("routeStatus");
    const summary = document.getElementById("routeOptimizeSummary");
    if (summary) {
        summary.hidden = true;
        summary.innerHTML = "";
    }

    /*
  |--------------------------------------------------------------------------
  | EDIT
  |--------------------------------------------------------------------------
  */
    if (mode === "edit" && record) {
        if (title) {
            title.textContent = "Edit Route";
        }
        form.reset();
        let fullRoute = record;
        /*
    |--------------------------------------------------------------------------
    | Fetch latest database record before editing.
    |--------------------------------------------------------------------------
    */
        try {
            const fresh = await fetchRoutePlanById(record.id);

            if (fresh) {
                fullRoute = fresh;
            }
        } catch (error) {
            console.warn("Unable to refresh route before editing:", error);
        }
        const existingReservation = {
            id: fullRoute.reservationId,
            reservation_number: fullRoute.reservationNumber,
            patient_name: fullRoute.patientName,
            pickup_location: fullRoute.origin,
            destination: fullRoute.destination,
            priority: fullRoute.priority,
            schedule_date: fullRoute.departureDate,
            schedule_time: fullRoute.departureTime,
            vehicle: fullRoute.vehicleId
                ? {
                      id: fullRoute.vehicleId,
                      vehicle_name: fullRoute.vehicle,
                  }
                : null,
            driver: fullRoute.driverId
                ? {
                      id: fullRoute.driverId,
                      name: fullRoute.driver,
                  }
                : null,
        };
        await populateRouteReservations(existingReservation);
        if (reservationSelect) {
            reservationSelect.value = String(fullRoute.reservationId || "");
            reservationSelect.disabled = true;
        }
        const routeNumber = document.getElementById("routeNumber");
        if (routeNumber) {
            routeNumber.value = fullRoute.routeNumber || "";
        }
        document.getElementById("routeOrigin").value = fullRoute.origin || "";
        document.getElementById("routeDestination").value =
            fullRoute.destination || "";
        renderRouteStops(fullRoute.stops || []);
        applyReservationResourceDisplay(existingReservation);
        document.getElementById("routePriority").value =
            fullRoute.priority || "Normal";
        document.getElementById("routeDepartment").value =
            fullRoute.department || "";
        document.getElementById("routePurpose").value = fullRoute.purpose || "";
        document.getElementById("routeDepartureDate").value =
            fullRoute.departureDate || "";
        document.getElementById("routeDepartureTime").value =
            fullRoute.departureTime || "";
        if (statusSelect) {
            statusSelect.disabled = false;

            statusSelect.value = fullRoute.status || "Draft";
        }
        document.getElementById("routeNotes").value = fullRoute.notes || "";

        /*
    |--------------------------------------------------------------------------
    | Optimization
    |--------------------------------------------------------------------------
    */
        const distance = document.getElementById("routeEstimatedDistance");
        const time = document.getElementById("routeEstimatedTime");
        const strategy = document.getElementById("routeOptStrategy");
        const score = document.getElementById("routeOptScore");

        if (distance) {
            distance.value =
                fullRoute.estimatedDistance === null
                    ? ""
                    : formatRouteDistance(fullRoute.estimatedDistance);
            distance.dataset.raw =
                fullRoute.estimatedDistance === null
                    ? ""
                    : String(fullRoute.estimatedDistance);
        }
        if (time) {
            time.value = fullRoute.estimatedTravelTime || "";
            time.dataset.minutes =
                fullRoute.estimatedTravelTimeMinutes === null
                    ? ""
                    : String(fullRoute.estimatedTravelTimeMinutes);
        }
        if (strategy) {
            strategy.value = fullRoute.optimizationStrategy || "";
        }
        if (score) {
            score.value =
                fullRoute.optimizationScore === null
                    ? ""
                    : String(fullRoute.optimizationScore);
            score.dataset.raw =
                fullRoute.optimizationScore === null
                    ? ""
                    : String(fullRoute.optimizationScore);
        }
        /*
        |--------------------------------------------------------------------------
        | Restore persisted route optimization + coordinates
        |--------------------------------------------------------------------------
        */
        const hasOriginCoordinates =
            hasRouteCoordinateValue(fullRoute.originLatitude) &&
            hasRouteCoordinateValue(fullRoute.originLongitude);
        const hasDestinationCoordinates =
            hasRouteCoordinateValue(fullRoute.destinationLatitude) &&
            hasRouteCoordinateValue(fullRoute.destinationLongitude);
        const restoredStopCoordinates = Array.isArray(fullRoute.stopCoordinates)
            ? fullRoute.stopCoordinates.map((stop) => {
                  const hasCoordinates =
                      hasRouteCoordinateValue(stop?.latitude) &&
                      hasRouteCoordinateValue(stop?.longitude);
                  return {
                      location: String(stop?.location || "").trim(),
                      coordinate: hasCoordinates
                          ? {
                                lat: Number(stop.latitude),
                                lng: Number(stop.longitude),
                            }
                          : null,
                  };
              })
            : [];
        routeLastOptimization = {
            estimatedDistance: fullRoute.estimatedDistance,
            estimatedTravelTimeMinutes: fullRoute.estimatedTravelTimeMinutes,
            estimatedTravelTime: fullRoute.estimatedTravelTime,
            optimizationStrategy: fullRoute.optimizationStrategy,
            optimizationScore: fullRoute.optimizationScore,
            optimizedStops: Array.isArray(fullRoute.stops)
                ? fullRoute.stops.slice()
                : [],
            routeCoordinates: {
                origin: hasOriginCoordinates
                    ? {
                          lat: Number(fullRoute.originLatitude),
                          lng: Number(fullRoute.originLongitude),
                          displayName: fullRoute.origin,
                      }
                    : null,
                stops: restoredStopCoordinates,
                destination: hasDestinationCoordinates
                    ? {
                          lat: Number(fullRoute.destinationLatitude),
                          lng: Number(fullRoute.destinationLongitude),
                          displayName: fullRoute.destination,
                      }
                    : null,
            },
        };
    } else {

    /*
  |--------------------------------------------------------------------------
  | ADD
  |--------------------------------------------------------------------------
  */
        if (title) {
            title.textContent = "New Route";
        }

        form.reset();

        resetRouteResourceDisplay();
        resetRouteOptimization();
        renderRouteStops([""]);
        if (statusSelect) {
            statusSelect.value = "Draft";
            statusSelect.disabled = true;
        }
        await populateRouteReservations();
        const routeNumber = document.getElementById("routeNumber");
        if (routeNumber) {
            routeNumber.value = "Loading...";
        }
        try {
            const nextNumber = await fetchNextRouteNumber();
            if (routeNumber) {
                routeNumber.value = nextNumber;
            }
        } catch (error) {
            if (routeNumber) {
                routeNumber.value = "";
            }
            console.error("Unable to load next Route Number:", error);
        }
        const priority = document.getElementById("routePriority");
        if (priority) {
            priority.value = "Normal";
        }

        /*
    |--------------------------------------------------------------------------
    | Reservation-derived fields remain blank
    | until a Reservation is selected.
    |--------------------------------------------------------------------------
    */
        const origin = document.getElementById("routeOrigin");
        const destination = document.getElementById("routeDestination");
        const departureDate = document.getElementById("routeDepartureDate");
        const departureTime = document.getElementById("routeDepartureTime");

        if (origin) {
            origin.value = "";
        }
        if (destination) {
            destination.value = "";
        }
        if (departureDate) {
            departureDate.value = "";
        }
        if (departureTime) {
            departureTime.value = "";
        }
    }

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
        if (routeFormMode === "add") {
            document.getElementById("routeReservation")?.focus();
        } else {
            document.getElementById("routeOrigin")?.focus();
        }
    });
}

function closeRouteFormModal() {
    const modal = document.getElementById("routeFormModal");

    if (!modal) {
        return;
    }
    modal.classList.remove("show");
    document.body.style.overflow = "";
    routeEditingId = null;
    routeFormMode = "add";
    routeLastOptimization = null;
}

/* ==========================================
   VIEW MODAL
========================================== */

function openViewRouteModal(record) {
    const modal = document.getElementById("viewRouteModal");

    if (!modal || !record) {
        return;
    }

    const set = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value === null || value === undefined || value === ""
                    ? "—"
                    : value;
        }
    };
    set("viewRouteNumber", record.routeNumber);
    set("viewRouteStatus", record.status);
    set("viewRoutePriority", record.priority);
    set("viewRouteOrigin", record.origin);
    set("viewRouteDestination", record.destination);
    set(
        "viewRouteStops",
        (record.stops || []).filter(Boolean).join(" → ") || "None",
    );
    set("viewRouteVehicle", record.vehicle);
    set("viewRouteDriver", record.driver);
    set("viewRouteDepartment", record.department);
    set("viewRoutePurpose", record.purpose);
    set(
        "viewRouteDeparture",
        formatRouteDeparture(record.departureDate, record.departureTime),
    );
    set("viewRouteDistance", formatRouteDistance(record.estimatedDistance));
    set("viewRouteTime", record.estimatedTravelTime);
    set("viewRouteStrategy", record.optimizationStrategy);
    set("viewRouteScore", record.optimizationScore);
    set("viewRouteNotes", record.notes);
    set("viewRouteCreated", formatRouteCreated(record.createdAt));
    set("viewRouteUpdated", formatRouteCreated(record.updatedAt));

    /*
  |--------------------------------------------------------------------------
  | Timeline
  |--------------------------------------------------------------------------
  |
  | Since status history is not yet persisted in MySQL,
  | show basic current-state information.
  |
  */
    const timeline = document.getElementById("viewRouteTimeline");
    if (timeline) {
        const lifecycle = [
            "Draft",
            "Planned",
            "Ready For Dispatch",
            "Completed",
        ];
        let visibleStatuses = [];
        if (record.status === "Archived") {
            visibleStatuses = ["Draft", "Archived"];
        } else {
            const currentIndex = lifecycle.indexOf(record.status);
            if (currentIndex >= 0) {
                visibleStatuses = lifecycle.slice(0, currentIndex + 1);
            } else {
                visibleStatuses = [record.status || "Draft"];
            }
        }

        timeline.innerHTML = visibleStatuses
            .map((status, index) => {
                const isFirst = index === 0;
                const isCurrent = status === record.status;
                let dateLabel = "";
                if (isFirst) {
                    dateLabel = formatRouteDateTime(record.createdAt);
                } else if (isCurrent) {
                    dateLabel = formatRouteDateTime(record.updatedAt);
                } else {
                    dateLabel = "Previously completed";
                }
                return `
            <li class="${isCurrent ? "current" : ""}">
              <strong>
                ${escapeRouteHtml(status)}
              </strong>
              <span>
                ${escapeRouteHtml(dateLabel)}
              </span>
            </li>
          `;
            })
            .join("");
    }

    const archiveButton = document.getElementById("archiveRouteFromViewBtn");
    const restoreButton = document.getElementById("restoreRouteFromViewBtn");
    const editButton = document.getElementById("editRouteFromViewBtn");
    const duplicateButton = document.getElementById(
        "duplicateRouteFromViewBtn",
    );
    if (duplicateButton) {
        duplicateButton.hidden = !canDuplicateRoute();
    }
    if (archiveButton) {
        archiveButton.hidden =
            !canArchiveRoute() ||
            record.status === "Archived" ||
            record.status === "Completed";
    }
    if (restoreButton) {
        restoreButton.hidden =
            !canRestoreRoute() || record.status !== "Archived";
    }
    if (editButton) {
        editButton.hidden = !canUpdateRoute();
        editButton.disabled =
            !canUpdateRoute() ||
            ["Completed", "Archived"].includes(record.status);
    }

    modal.dataset.routeId = record.id;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeViewRouteModal() {
    const modal = document.getElementById("viewRouteModal");
    if (!modal) {
        return;
    }
    modal.classList.remove("show");
    document.body.style.overflow = "";
    delete modal.dataset.routeId;
}

/* ==========================================
   DELETE MODAL
========================================== */

function openDeleteRouteModal(record) {
    if (!canDeleteRoute()) {
        return;
    }
    const modal = document.getElementById("deleteRouteModal");

    if (!modal || !record) {
        return;
    }
    routeDeleteTargetId = record.id;
    const description = document.getElementById("deleteRouteModalDescription");
    if (description) {
        description.innerHTML =
            "Are you sure you want to delete route <strong>" +
            escapeRouteHtml(record.routeNumber) +
            "</strong> (" +
            escapeRouteHtml(record.origin) +
            " → " +
            escapeRouteHtml(record.destination) +
            ")?";
    }
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    document.getElementById("cancelDeleteRoute")?.focus();
}

function closeDeleteRouteModal() {
    const modal = document.getElementById("deleteRouteModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");
    document.body.style.overflow = "";
    routeDeleteTargetId = null;
}

async function saveRouteFromForm() {
    if (routeFormMode === "add" && !canCreateRoute()) {
        return;
    }
    if (routeFormMode === "edit" && !canUpdateRoute()) {
        return;
    }
    const form = document.getElementById("routeForm");
    if (!form) {
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Prefer optimized routes
    |--------------------------------------------------------------------------
    |
    | If enabled, automatically attempt optimization when the current
    | route has no valid optimization result.
    |
    | This is a preference, not a hard requirement.
    |
    */
    let data = collectRouteFormData();
    const needsOptimization =
        data.origin &&
        data.destination &&
        (data.estimatedDistance === "" ||
            data.estimatedTravelTimeMinutes === "");
    if (routeModuleSettings.preferOptimized && needsOptimization) {
        try {
            await runRouteOptimization({
                showSuccessToast: false,
            });
            /*
            |--------------------------------------------------------------------------
            | Recollect because optimization updated the fields + stop order
            |--------------------------------------------------------------------------
            */
            data = collectRouteFormData();
        } catch (error) {
            console.warn(
                "Preferred route optimization was unavailable:",
                error,
            );
            /*
            |--------------------------------------------------------------------------
            | Draft / Planned routes may continue.
            | Ready For Dispatch will still fail normal validation below.
            |--------------------------------------------------------------------------
            */
            if (data.status === "Ready For Dispatch") {
                if (typeof showToast === "function") {
                    showToast(
                        error.message ||
                            "Route optimization is required before this route can be marked Ready For Dispatch.",
                        "error",
                    );
                }
                return;
            }
        }
    }
    if (!validateRouteForm()) {
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Collect again after validation / possible optimization
    |--------------------------------------------------------------------------
    */
    data = collectRouteFormData();
    clearRouteFieldErrors(form);
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
 
        if (routeFormMode === "edit" && routeEditingId) {
            const payload = buildUpdateRoutePayload(data);
            const result = await updateRoutePlanApi(routeEditingId, payload);
            const updated = result.routePlan;
            closeRouteFormModal();
            await reloadRoutePlanningData({
                resetPage: false,

                focusId: updated?.id || routeEditingId,

                reason: "edit",
            });

            if (typeof showToast === "function") {
                showToast(
                    result.message || "Route updated successfully.",
                    "success",
                );
            }

            return;
        }

        const payload = buildCreateRoutePayload(data);
        const result = await createRoutePlanApi(payload);
        const created = result.routePlan;
        closeRouteFormModal();
        await reloadRoutePlanningData({
            resetPage: true,
            focusId: created?.id,
            reason: "add",
        });

        if (typeof showToast === "function") {
            showToast(
                result.message || "Route plan created successfully.",
                "success",
            );
        }
    } catch (error) {
        console.error("Unable to save Route Plan:", error);

        applyLaravelValidationErrors(error.errors);

        if (typeof showToast === "function") {
            showToast(error.message || "Unable to save Route Plan.", "error");
        }
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

/* ==========================================
   DUPLICATE
========================================== */
/**
 * Ask the user which Approved Reservation
 * should own the duplicated RoutePlan.
 *
 * For now this uses a simple prompt so we do not
 * need to redesign the existing UI.
 *
 * Later we can replace this with a proper modal.
 */
async function duplicateRouteFromView(routeId) {
    if (!canDuplicateRoute()) {
        return;
    }
    try {
        const reservations = await fetchAvailableRouteReservations();
        if (reservations.length === 0) {
            if (typeof showToast === "function") {
                showToast(
                    "No Approved reservation is available for duplication.",
                    "warning",
                );
            }
            return;
        }

        const choices = reservations
            .map((reservation, index) => {
                return (
                    `${index + 1}. ` +
                    `${reservation.reservation_number}` +
                    (reservation.patient_name
                        ? ` — ${reservation.patient_name}`
                        : "")
                );
            })
            .join("\n");

        const input = window.prompt(
            "Select the target reservation by number:\n\n" + choices,
        );

        if (input === null) {
            return;
        }
        const choice = Number.parseInt(input, 10);
        if (
            Number.isNaN(choice) ||
            choice < 1 ||
            choice > reservations.length
        ) {
            if (typeof showToast === "function") {
                showToast("Invalid reservation selection.", "warning");
            }
            return;
        }

        const selected = reservations[choice - 1];
        const result = await duplicateRoutePlanApi(routeId, selected.id);
        closeViewRouteModal();
        await reloadRoutePlanningData({
            resetPage: true,
            focusId: result.routePlan?.id,
            reason: "duplicate",
        });

        if (typeof showToast === "function") {
            showToast(
                result.message || "Route duplicated successfully.",
                "success",
            );
        }
    } catch (error) {
        console.error("Unable to duplicate Route Plan:", error);

        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to duplicate Route Plan.",
                "error",
            );
        }
    }
}

async function runRouteOptimization({ showSuccessToast = true } = {}) {
    const data = collectRouteFormData();
    if (!data.origin || !data.destination) {
        throw new Error(
            "Origin and destination are required before calculating the route.",
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Calculate using Nominatim + OSRM.
    | optimizeRouteWithOsrm() already draws the result.
    |--------------------------------------------------------------------------
    */
    const result = await optimizeRouteWithOsrm(data);
    if (
        Array.isArray(data.stops) &&
        Array.isArray(result.optimizedStops) &&
        data.stops.length !== result.optimizedStops.length
    ) {
        throw new Error(
            "The optimized route returned an incomplete stop sequence.",
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Store latest optimization result including coordinates
    |--------------------------------------------------------------------------
    */
    applyOptimizationToForm(result);

    /*
    |--------------------------------------------------------------------------
    | Render optimized stop order into form.
    |--------------------------------------------------------------------------
    */
    if (Array.isArray(result.optimizedStops)) {
        renderRouteStops(result.optimizedStops);
    }
    /*
    |--------------------------------------------------------------------------
    | Update map labels only.
    | Do NOT call updateRouteMapPanel() here,
    | because route is already drawn.
    |--------------------------------------------------------------------------
    */
    const mapDistance = document.getElementById("mapDistanceLabel");
    const mapEta = document.getElementById("mapEtaLabel");
    const mapStatus = document.getElementById("mapStatusLabel");
    const mapStrategy = document.getElementById("mapStrategyLabel");
    if (mapDistance) {
        mapDistance.textContent = formatRouteDistance(result.estimatedDistance);
    }
    if (mapEta) {
        mapEta.textContent = result.estimatedTravelTime || "—";
    }
    if (mapStatus) {
        mapStatus.textContent = data.status || "Draft";
    }
    if (mapStrategy) {
        mapStrategy.textContent = result.optimizationStrategy
            ? result.optimizationStrategy +
              (result.optimizationScore != null
                  ? ` · Score ${result.optimizationScore}`
                  : "")
            : "—";
    }
    /*
    |--------------------------------------------------------------------------
    | Optimization summary
    |--------------------------------------------------------------------------
    */
    updateOptimizationSummaryPanel({
        estimatedDistance: result.estimatedDistance,
        estimatedTravelTime: result.estimatedTravelTime,
        optimizationStrategy: result.optimizationStrategy,
        optimizationScore: result.optimizationScore,
        vehicle: result.recommendedVehicle,
        driver: result.recommendedDriver,
    });
    if (showSuccessToast && typeof showToast === "function") {
        showToast("Route optimized successfully.", "success");
    }
    return result;
}

function initRoutePlanningModals() {
    if (routeModalsInitialized) {
        return;
    }
    if (!document.getElementById("routePlanningPage")) {
        return;
    }
    routeModalsInitialized = true;
    populateRouteFormOptions();

    /*
  |--------------------------------------------------------------------------
  | New Route
  |--------------------------------------------------------------------------
  */
    if (canCreateRoute()) {
        document
            .getElementById("newRouteBtn")
            ?.addEventListener("click", async () => {
                await openRouteFormModal("add");
            });
    }
    document
        .getElementById("routeReservation")
        ?.addEventListener("change", () => {
            if (routeFormMode !== "add") {
                return;
            }
            const reservation = getSelectedRouteReservation();

            if (!reservation) {
                resetRouteResourceDisplay();
                return;
            }
            applyReservationToRouteForm(reservation);
        });
    document
        .getElementById("closeRouteFormModal")
        ?.addEventListener("click", closeRouteFormModal);
    document
        .getElementById("cancelRouteForm")
        ?.addEventListener("click", closeRouteFormModal);
    document
        .getElementById("routeFormModal")
        ?.addEventListener("click", (event) => {
            if (event.target.id === "routeFormModal") {
                closeRouteFormModal();
            }
        });
  document
        .getElementById("addRouteStopBtn")
        ?.addEventListener("click", () => {
            const stops = getRouteStopsFromForm();
            stops.push("");
            renderRouteStops(stops);
            resetRouteOptimization();
        });
    document
        .getElementById("routeStopsList")
        ?.addEventListener("click", (event) => {
            const button = event.target.closest(".route-remove-stop");
            if (!button) {
                return;
            }
            const row = button.closest(".route-stop-row");
            row?.remove();
            const remaining = getRouteStopsFromForm();
            if (remaining.length === 0) {
                renderRouteStops([""]);
            }
            resetRouteOptimization();
        });
    [
        "routeOrigin",
        "routeDestination",
        "routeDepartureDate",
        "routeDepartureTime",
    ].forEach((id) => {
        const field = document.getElementById(id);
        field?.addEventListener("input", () => {
            resetRouteOptimization();
        });
        field?.addEventListener("change", () => {
            resetRouteOptimization();
        });
    });
    document
        .getElementById("routeStopsList")
        ?.addEventListener("input", (event) => {
            if (event.target.matches(".route-stop-input")) {
                resetRouteOptimization();
            }
        });
    document
        .getElementById("optimizeRouteBtn")
        ?.addEventListener("click", async () => {
            const optimizeButton = document.getElementById("optimizeRouteBtn");
            const originalHtml = optimizeButton?.innerHTML;
            try {
                if (optimizeButton) {
                    optimizeButton.disabled = true;

                    optimizeButton.innerHTML = `
                        <i class="ph ph-spinner"></i>
                        Optimizing...
                    `;
                }
                await runRouteOptimization({
                    showSuccessToast: true,
                });
            } catch (error) {
                console.error("Route calculation failed:", error);

                if (typeof showToast === "function") {
                    showToast(
                        error.message || "Unable to calculate the route.",
                        "error",
                    );
                }
            } finally {
                if (optimizeButton) {
                    optimizeButton.disabled = false;

                    if (originalHtml !== undefined) {
                        optimizeButton.innerHTML = originalHtml;
                    }
                }
            }
        });
    document
        .getElementById("routeForm")
        ?.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (routeFormMode === "add" && !canCreateRoute()) {
                return;
            }
            if (routeFormMode === "edit" && !canUpdateRoute()) {
                return;
            }
            await saveRouteFromForm();
        });
    document
        .getElementById("routeTableBody")
        ?.addEventListener("click", async (event) => {
            const viewButton = event.target.closest(".view-route");
            const editButton = event.target.closest(".edit-route");
            const deleteButton = event.target.closest(".delete-route");
            const row = event.target.closest("tr[data-route-id]");
            if (!row) {
                return;
            }
            const record = getRouteRecordById(row.dataset.routeId);
            if (!record) {
                return;
            }
            if (viewButton) {
                openViewRouteModal(record);
                updateRouteMapPanel(record);
                updateOptimizationSummaryPanel(record);
                return;
            }
            if (editButton && !editButton.disabled && canUpdateRoute()) {
                await openRouteFormModal("edit", record);
                return;
            }
            if (deleteButton && !deleteButton.disabled && canDeleteRoute()) {
                openDeleteRouteModal(record);
            }
        });
    document
        .getElementById("closeViewRouteModal")
        ?.addEventListener("click", closeViewRouteModal);
    document
        .getElementById("closeViewRouteBtn")
        ?.addEventListener("click", closeViewRouteModal);
    document
        .getElementById("viewRouteModal")
        ?.addEventListener("click", (event) => {
            if (event.target.id === "viewRouteModal") {
                closeViewRouteModal();
            }
        });
    document
        .getElementById("editRouteFromViewBtn")
        ?.addEventListener("click", async () => {
            if (!canUpdateRoute()) {
                return;
            }
            const viewModal = document.getElementById("viewRouteModal");
            const editModal = document.getElementById("routeFormModal");
            const id = viewModal?.dataset.routeId;
            const record = getRouteRecordById(id);
            if (!record) {
                return;
            }
            const editButton = document.getElementById("editRouteFromViewBtn");
            if (editButton) {
                editButton.disabled = true;
            }
            try {
                await openRouteFormModal("edit", record);
                if (editModal) {
                    editModal.style.zIndex = "1100";
                }
                await new Promise((resolve) => setTimeout(resolve, 140));
                closeViewRouteModal();
                document.body.style.overflow = "hidden";
                setTimeout(() => {
                    if (editModal) {
                        editModal.style.zIndex = "";
                    }
                }, 200);
            } catch (error) {
                console.error("Unable to open Edit Route:", error);

                if (typeof showToast === "function") {
                    showToast("Unable to open route for editing.", "error");
                }
            } finally {
                if (editButton) {
                    editButton.disabled = false;
                }
            }
        });
    document
        .getElementById("duplicateRouteFromViewBtn")
        ?.addEventListener("click", async () => {
            const modal = document.getElementById("viewRouteModal");
            const id = modal?.dataset.routeId;
            if (!id) {
                return;
            }
            await duplicateRouteFromView(id);
        });
    document
        .getElementById("archiveRouteFromViewBtn")
        ?.addEventListener("click", async () => {
            if (!canArchiveRoute()) {
                return;
            }
            const modal = document.getElementById("viewRouteModal");
            const id = modal?.dataset.routeId;

            if (!id) {
                return;
            }

            try {
                const result = await archiveRoutePlanApi(id);
                closeViewRouteModal();
                await reloadRoutePlanningData({
                    resetPage: false,
                    reason: "archive",
                });

                if (typeof showToast === "function") {
                    showToast(result.message || "Route archived.", "success");
                }
            } catch (error) {
                if (typeof showToast === "function") {
                    showToast(
                        error.message || "Unable to archive route.",
                        "error",
                    );
                }
            }
        });

    document
        .getElementById("restoreRouteFromViewBtn")
        ?.addEventListener("click", async () => {
            if (!canRestoreRoute()) {
                return;
            }
            const modal = document.getElementById("viewRouteModal");
            const id = modal?.dataset.routeId;
            if (!id) {
                return;
            }
            try {
                const result = await restoreRoutePlanApi(id);
                closeViewRouteModal();
                await reloadRoutePlanningData({
                    resetPage: false,
                    focusId: result.routePlan?.id,
                    reason: "restore",
                });
                if (typeof showToast === "function") {
                    showToast(
                        result.message || "Route restored to Draft.",
                        "success",
                    );
                }
            } catch (error) {
                if (typeof showToast === "function") {
                    showToast(
                        error.message || "Unable to restore route.",
                        "error",
                    );
                }
            }
        });

    document
        .getElementById("closeDeleteRouteModal")
        ?.addEventListener("click", closeDeleteRouteModal);
    document
        .getElementById("cancelDeleteRoute")
        ?.addEventListener("click", closeDeleteRouteModal);
    document
        .getElementById("deleteRouteModal")
        ?.addEventListener("click", (event) => {
            if (event.target.id === "deleteRouteModal") {
                closeDeleteRouteModal();
            }
        });
    document
        .getElementById("confirmDeleteRoute")
        ?.addEventListener("click", async () => {
            if (!canDeleteRoute()) {
                return;
            }
            if (!routeDeleteTargetId) {
                return;
            }
            const id = routeDeleteTargetId;
            try {
                const result = await deleteRoutePlanApi(id);
                closeDeleteRouteModal();
                await reloadRoutePlanningData({
                    resetPage: false,
                    reason: "delete",
                });
                if (typeof showToast === "function") {
                    showToast(
                        result.message || "Route deleted successfully.",
                        "success",
                    );
                }
            } catch (error) {
                closeDeleteRouteModal();

                if (typeof showToast === "function") {
                    showToast(
                        error.message || "Unable to delete route.",
                        "error",
                    );
                }
            }
        });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }
        if (
            document
                .getElementById("routeFormModal")
                ?.classList.contains("show")
        ) {
            closeRouteFormModal();
        } else if (
            document
                .getElementById("viewRouteModal")
                ?.classList.contains("show")
        ) {
            closeViewRouteModal();
        } else if (
            document
                .getElementById("deleteRouteModal")
                ?.classList.contains("show")
        ) {
            closeDeleteRouteModal();
        }
    });
}

async function initRoutePlanningPage() {
    const page = document.getElementById("routePlanningPage");

    if (!page) {
        return;
    }
    if (page.dataset.init === "true") {
        return;
    }

    page.dataset.init = "true";
    await loadRouteModuleSettings();
    initRoutePlanningPipeline();
    initRoutePlanningModals();

    if (typeof initRouteTemplates === "function") {
        initRouteTemplates();
    }
    if (typeof initRouteExport === "function") {
        initRouteExport();
    }
    await reloadRoutePlanningData({
        resetPage: true,
        reason: "init",
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initRoutePlanningPage();
});