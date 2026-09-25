(function () {
    "use strict";

    let fullRouteMap = null;
    let fullRouteLayer = null;
    let fullRouteMarkerLayer = null;
    let fullRouteVehicleMarkerLayer = null;
    let fullRouteVehicleMarker = null;
    let fullRouteMapInitialized = false;

    let currentFullMapRecord = null;
    let currentFullMapRoute = null;

    let isUpdatingDispatchStatus = false;
    let isReturningToHospital = false;

    let routeDriverStatusConfirmModal = null;

    const FULL_MAP_HOSPITAL = {
        latitude: 14.7707,
        longitude: 121.0659,
        label: "Tala Hospital / DJNRMHS",
        address: "Dr. Uyguangco Avenue, Tala, Caloocan",
    };

    const DISPATCH_STATUS_FLOW = {
        Assigned: "En Route",
        "En Route": "Arrived",
        Arrived: "Completed",
    };

    function getElement(id) {
        return document.getElementById(id);
    }

    function isDriver() {
        const role = String(window.FLEET_RBAC?.role || "")
            .trim()
            .toLowerCase();

        return role === "driver";
    }

    function showFullMapToast(message, type = "warning") {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);
            return;
        }

        console.warn(`[Full Route Map] ${message}`);
    }

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');

        return meta?.getAttribute("content") || "";
    }

    function normalizeTripStatus(status) {
        return String(status || "").trim();
    }

    /* =====================================================
       DISPATCH RESOLUTION
    ===================================================== */

    async function findDispatchForRoute(record) {
        const reservationId =
            record?.reservationId ?? record?.reservation_id ?? null;

        if (!reservationId) {
            return null;
        }

        try {
            const response = await fetch("/dispatch", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                cache: "no-store",
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load dispatch records.",
                );
            }

            const dispatches = Array.isArray(data.dispatches)
                ? data.dispatches
                : [];

            return (
                dispatches.find((dispatch) => {
                    const reservation = dispatch?.reservation || {};

                    const dispatchReservationId =
                        reservation?.id ?? dispatch?.reservation_id ?? null;

                    return (
                        String(dispatchReservationId) === String(reservationId)
                    );
                }) || null
            );
        } catch (error) {
            console.error(
                "[Full Route Map] Failed to resolve dispatch:",
                error,
            );

            showFullMapToast(
                "Unable to verify the dispatch for this route.",
                "error",
            );

            return null;
        }
    }

    async function canOpenFullRouteMap(record) {
        if (!record) {
            return {
                allowed: false,
                message: "No route plan is currently selected.",
                dispatch: null,
            };
        }

        const dispatch = await findDispatchForRoute(record);

        if (!dispatch) {
            return {
                allowed: false,
                message: "This route has not been dispatched yet.",
                dispatch: null,
            };
        }

        const tripStatus = normalizeTripStatus(
            dispatch.trip_status || "Pending",
        );

        if (tripStatus === "Cancelled") {
            return {
                allowed: false,
                message: "This dispatch has been cancelled.",
                dispatch,
            };
        }

        if (tripStatus === "Pending") {
            return {
                allowed: false,
                message: "This route has not been assigned yet.",
                dispatch,
            };
        }

        const allowedStatuses = [
            "Assigned",
            "En Route",
            "Arrived",
            "Completed",
        ];

        if (!allowedStatuses.includes(tripStatus)) {
            return {
                allowed: false,
                message: "The dispatch status does not allow the full map.",
                dispatch,
            };
        }

        return {
            allowed: true,
            message: "",
            dispatch,
        };
    }

    /*
     * Refresh the dispatch from the backend immediately before
     * changing its status.
     *
     * This prevents the full-map button from using an old status
     * when another user has already updated the dispatch.
     */
    async function refreshCurrentDispatch() {
        const dispatchId = currentFullMapRecord?.dispatchId ?? null;

        if (!dispatchId) {
            return null;
        }

        try {
            const response = await fetch(
                `/dispatch/${encodeURIComponent(dispatchId)}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    cache: "no-store",
                },
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.message || "Unable to refresh dispatch.");
            }

            const dispatch = data.dispatch || null;

            if (!dispatch) {
                throw new Error("Dispatch record was not returned.");
            }

            currentFullMapRecord = {
                ...currentFullMapRecord,
                dispatchId: dispatch.id,
                tripStatus: dispatch.trip_status,
                dispatch,
            };

            return dispatch;
        } catch (error) {
            console.error(
                "[Full Route Map] Failed to refresh dispatch:",
                error,
            );

            showFullMapToast(
                error.message || "Unable to refresh dispatch status.",
                "error",
            );

            return null;
        }
    }

    function moveFullRouteMapOverlayToBody() {
        const overlay = getElement("fullRouteMapOverlay");

        if (!overlay) {
            console.warn("[Full Route Map] Overlay not found.");
            return;
        }

        // Move the overlay outside the route-planning/page layout
        // so it can truly cover the entire viewport on all devices.
        if (overlay.parentElement !== document.body) {
            document.body.appendChild(overlay);
        }
    }

    /* =====================================================
       FULL MAP INITIALIZATION
    ===================================================== */

    function initFullRouteMap() {
        if (fullRouteMapInitialized && fullRouteMap) {
            return fullRouteMap;
        }

        const mapElement = getElement("fullRouteLeafletMap");

        if (!mapElement) {
            console.warn("[Full Route Map] Map element not found.");

            return null;
        }

        if (typeof L === "undefined") {
            console.error("[Full Route Map] Leaflet is not loaded.");

            return null;
        }

        fullRouteMap = L.map(mapElement, {
            zoomControl: true,
            scrollWheelZoom: true,
        }).setView(
            [FULL_MAP_HOSPITAL.latitude, FULL_MAP_HOSPITAL.longitude],
            14,
        );

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(fullRouteMap);

        fullRouteLayer = L.layerGroup().addTo(fullRouteMap);

        fullRouteMarkerLayer = L.layerGroup().addTo(fullRouteMap);

        fullRouteVehicleMarkerLayer = L.layerGroup().addTo(fullRouteMap);

        fullRouteMapInitialized = true;

        return fullRouteMap;
    }

    function clearFullRouteMap() {
        if (fullRouteLayer) {
            fullRouteLayer.clearLayers();
        }

        if (fullRouteMarkerLayer) {
            fullRouteMarkerLayer.clearLayers();
        }

        if (fullRouteVehicleMarkerLayer) {
            fullRouteVehicleMarkerLayer.clearLayers();
        }

        fullRouteVehicleMarker = null;
    }

    /* =====================================================
       ROUTE RENDERING
    ===================================================== */

    function drawFullRoute(route, record) {
        if (!fullRouteMap || !route || !record) {
            return;
        }

        const routeCoordinates = route.routeCoordinates;

        if (!routeCoordinates) {
            console.warn("[Full Route Map] Route coordinates are missing.");

            return;
        }

        clearFullRouteMap();

        /*
         * IMPORTANT:
         * Do NOT create another route renderer here.
         *
         * This calls the exact same renderer used by
         * Route Map Preview.
         */
        if (typeof window.drawRouteOnMapTarget === "function") {
            window.drawRouteOnMapTarget({
                map: fullRouteMap,
                routeLayer: fullRouteLayer,
                markerLayer: fullRouteMarkerLayer,
                route: route.geometry
                    ? {
                          geometry: route.geometry,
                      }
                    : route.route,
                routeCoordinates,
                record,
            });
        } else {
            console.error(
                "[Full Route Map] Shared route renderer is not available.",
            );
        }

        /*
         * Re-apply the latest live vehicle marker after
         * clearing the map layers.
         */
        const trackedVehicle = window.getLastRoutePlanningTrackedVehicle?.();

        if (trackedVehicle) {
            updateFullRouteMapVehicleLocation(trackedVehicle);
        } else {
            const gpsLocation = window.FleetGPS?.getCurrentLocation?.();
            const gpsVehicleId = window.FleetGPS?.getVehicleId?.();

            if (
                gpsLocation &&
                gpsVehicleId &&
                record?.vehicleId &&
                String(gpsVehicleId) === String(record.vehicleId)
            ) {
                updateFullRouteMapVehicleLocation({
                    vehicle_id: gpsVehicleId,
                    vehicle_label: record.vehicle || "Vehicle",
                    plate_number: "—",
                    vehicle_status: record.tripStatus || "On Trip",
                    has_location: true,
                    location: {
                        latitude: Number(gpsLocation.latitude),
                        longitude: Number(gpsLocation.longitude),
                        speed: gpsLocation.speed ?? null,
                        heading: gpsLocation.heading ?? null,
                        accuracy: gpsLocation.accuracy ?? null,
                        age_seconds: 0,
                        recorded_at: new Date().toISOString(),
                    },
                });
            }
        }

        window.setTimeout(() => {
            fullRouteMap?.invalidateSize();
        }, 100);
    }

    /* =====================================================
       FULL MAP INFORMATION
    ===================================================== */

    function updateFullMapInfo(record, route) {
        const distanceElement = getElement("fullMapDistanceLabel");

        const etaElement = getElement("fullMapEtaLabel");

        const statusElement = getElement("fullMapStatusLabel");

        if (distanceElement) {
            distanceElement.textContent =
                route?.distanceKm != null
                    ? `${Number(route.distanceKm).toFixed(1)} km`
                    : "—";
        }

        if (etaElement) {
            etaElement.textContent =
                route?.durationMinutes != null
                    ? `${Math.round(route.durationMinutes)} min`
                    : "—";
        }

        const tripStatus = normalizeTripStatus(
            record?.tripStatus ?? record?.trip_status ?? "—",
        );

        if (statusElement) {
            statusElement.textContent = tripStatus;
        }

        const overlay = getElement("fullRouteMapOverlay");

        if (overlay) {
            overlay.dataset.tripStatus = tripStatus;
        }
    }

    /* =====================================================
       DRIVER STATUS CONTROL
    ===================================================== */

    function updateDriverControls(record) {
        const controls = getElement("fullRouteDriverControls");

        const statusButton = getElement("fullRouteStatusBtn");

        const statusButtonText = getElement("fullRouteStatusBtnText");

        if (!controls || !statusButton) {
            return;
        }

        if (!isDriver()) {
            controls.hidden = true;
            return;
        }

        controls.hidden = false;

        const currentStatus = normalizeTripStatus(
            record?.tripStatus ?? record?.trip_status ?? "",
        );

        const nextStatus = DISPATCH_STATUS_FLOW[currentStatus] || null;

        statusButton.disabled = !nextStatus || isUpdatingDispatchStatus;

        statusButton.dataset.status = nextStatus || currentStatus;

        if (statusButtonText) {
            statusButtonText.textContent =
                nextStatus ||
                (currentStatus === "Completed"
                    ? "Completed"
                    : currentStatus || "Unavailable");
        }

        statusButton.setAttribute(
            "aria-label",
            nextStatus
                ? `Update dispatch to ${nextStatus}`
                : `Dispatch status ${currentStatus}`,
        );

        if (currentStatus === "Completed") {
            statusButton.classList.add("is-completed");
        } else {
            statusButton.classList.remove("is-completed");
        }
    }

    async function updateDispatchStatus(nextStatus) {
        const dispatchId = currentFullMapRecord?.dispatchId ?? null;
        if (!dispatchId || !nextStatus || isUpdatingDispatchStatus) {
            return;
        }
        const statusButton = getElement("fullRouteStatusBtn");
        const statusButtonText = getElement("fullRouteStatusBtnText");
        isUpdatingDispatchStatus = true;
        if (statusButton) {
            statusButton.disabled = true;
        }
        if (statusButtonText) {
            statusButtonText.textContent = "Updating...";
        }

        try {
            /*
             * ------------------------------------------
             * Reload authoritative dispatch state
             * ------------------------------------------
             */
            const response = await fetch(
                `/dispatch/${encodeURIComponent(dispatchId)}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    cache: "no-store",
                },
            );

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }
            if (!response.ok || !data.dispatch) {
                throw new Error(data.message || "Failed to load dispatch.");
            }
            const dispatch = data.dispatch;
            const currentStatus = normalizeTripStatus(dispatch.trip_status);

            /*
             * ------------------------------------------
             * Validate exact driver transition
             * ------------------------------------------
             */
            const allowedNextStatus = {
                Assigned: "En Route",
                "En Route": "Arrived",
                Arrived: "Completed",
            };
            if (allowedNextStatus[currentStatus] !== nextStatus) {
                throw new Error(
                    `This dispatch cannot be changed from ${currentStatus} to ${nextStatus}.`,
                );
            }
            /*
             * ------------------------------------------
             * Update authoritative Dispatch backend
             * ------------------------------------------
             */
            const updateResponse = await fetch(
                `/dispatch/${encodeURIComponent(dispatchId)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        dispatch_number: dispatch.dispatch_number || "",
                        trip_status: nextStatus,
                        remarks: dispatch.remarks || "",
                    }),
                },
            );

            let updateData = {};
            try {
                updateData = await updateResponse.json();
            } catch {
                updateData = {};
            }
            if (!updateResponse.ok) {
                const requestError = new Error(
                    updateData.message ||
                        `Failed to update dispatch to ${nextStatus}.`,
                );

                requestError.status = updateResponse.status;
                requestError.data = updateData;

                throw requestError;
            }

            /*
             * ------------------------------------------
             * Update current Full Map state
             * ------------------------------------------
             */
            currentFullMapRecord = {
                ...currentFullMapRecord,
                dispatchId: dispatch.id,
                tripStatus: nextStatus,
                dispatch: {
                    ...dispatch,
                    ...(updateData.dispatch || {}),
                    trip_status: nextStatus,
                },
            };

            /*
             * ------------------------------------------
             * Close confirmation modal
             * ------------------------------------------
             */
            closeRouteDriverStatusConfirmModal();
            /*
             * ------------------------------------------
             * Refresh information
             * ------------------------------------------
             */
            updateFullMapInfo(currentFullMapRecord, currentFullMapRoute);
            updateDriverControls(currentFullMapRecord);
            /*
             * ------------------------------------------
             * Success
             * ------------------------------------------
             */
            showFullMapToast(
                updateData.message ||
                    `Dispatch status updated to ${nextStatus}.`,
                "success",
            );

            /*
             * ------------------------------------------
             * Refresh Route Planning state
             * ------------------------------------------
             */
            if (typeof window.loadDispatches === "function") {
                await window.loadDispatches();
            }

            if (typeof window.loadAvailableReservations === "function") {
                await window.loadAvailableReservations();
            }

            return updateData;
        } catch (error) {
            console.error(
                "[Full Route Map] Dispatch status update error:",
                error,
            );
            showFullMapToast(
                error.message ||
                    "Something went wrong while updating the dispatch status.",
                "error",
            );
        } finally {
            isUpdatingDispatchStatus = false;
            updateDriverControls(currentFullMapRecord);
        }
    }

    async function handleDriverStatusClick() {
        if (!currentFullMapRecord || !isDriver()) {
            return;
        }
        if (isUpdatingDispatchStatus) {
            return;
        }
        const currentStatus = normalizeTripStatus(
            currentFullMapRecord.tripStatus,
        );
        const nextStatus = DISPATCH_STATUS_FLOW[currentStatus];
        if (!nextStatus) {
            return;
        }
        openRouteDriverStatusConfirmModal(nextStatus);
    }

    /* =====================================================
       LIVE VEHICLE
    ===================================================== */

    function updateFullRouteMapVehicleLocation(trackedVehicle) {
        if (!fullRouteMap || !fullRouteVehicleMarkerLayer) {
            return;
        }

        if (typeof window.renderRouteVehicleMarker !== "function") {
            console.warn(
                "[Full Route Map] Shared vehicle renderer is not available.",
            );

            return;
        }

        fullRouteVehicleMarker = window.renderRouteVehicleMarker(
            fullRouteVehicleMarkerLayer,
            fullRouteVehicleMarker,
            trackedVehicle,
        );
    }

    window.updateFullRouteMapVehicleLocation =
        updateFullRouteMapVehicleLocation;

    function initFullRouteMapGpsListener() {
        if (document.documentElement.dataset.fullMapGpsListener === "true") {
            return;
        }

        document.documentElement.dataset.fullMapGpsListener = "true";

        window.addEventListener("fleet:gps-location-updated", (event) => {
            const detail = event.detail || {};
            const vehicleId = detail.vehicleId;
            const location = detail.location;

            if (!vehicleId || !location || !currentFullMapRecord) {
                return;
            }

            /*
             * Only update the marker when the GPS belongs
             * to the vehicle assigned to the current route.
             */
            if (
                !currentFullMapRecord.vehicleId ||
                String(currentFullMapRecord.vehicleId) !== String(vehicleId)
            ) {
                return;
            }

            const latitude = Number(location.latitude);
            const longitude = Number(location.longitude);

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return;
            }

            /*
             * Keep the existing vehicle metadata if it exists.
             */
            const existingVehicle =
                window.getLastRoutePlanningTrackedVehicle?.() || {};

            const trackedVehicle = {
                ...existingVehicle,

                vehicle_id: vehicleId,

                vehicle_label:
                    existingVehicle.vehicle_label ||
                    currentFullMapRecord.vehicle ||
                    "Vehicle",

                plate_number: existingVehicle.plate_number || "—",
                vehicle_status: existingVehicle.vehicle_status || "On Trip",
                has_location: true,
                location: {
                    ...(existingVehicle.location || {}),

                    latitude,
                    longitude,

                    speed: location.speed ?? null,
                    heading: location.heading ?? null,
                    accuracy: location.accuracy ?? null,
                    age_seconds: 0,
                    recorded_at: new Date().toISOString(),
                },
            };

            updateFullRouteMapVehicleLocation(trackedVehicle);
        });
    }

    /* =====================================================
       RETURN TO HOSPITAL
    ===================================================== */

    async function calculateReturnToHospitalRoute() {
        if (!currentFullMapRecord) {
            throw new Error("No active route is loaded.");
        }

        const fleetGpsLocation = window.FleetGPS?.getCurrentLocation?.();
        const trackedVehicle = window.getLastRoutePlanningTrackedVehicle?.();
        const location = fleetGpsLocation || trackedVehicle?.location || null;
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error(
                "The vehicle's live location is not available yet.",
            );
        }

        const routeCoordinates = {
            origin: {
                lat: latitude,
                lng: longitude,
            },
            stops: [],
            destination: {
                lat: FULL_MAP_HOSPITAL.latitude,
                lng: FULL_MAP_HOSPITAL.longitude,
            },
        };

        /*
         * Reuse the existing Route Planning routing
         * functions. No second routing implementation.
         */
        if (typeof window.calculateTrafficRouteFromCoordinates !== "function") {
            throw new Error(
                "The shared traffic routing service is not available.",
            );
        }

        return window.calculateTrafficRouteFromCoordinates(routeCoordinates, {
            origin: "Current Vehicle Location",
            destination: FULL_MAP_HOSPITAL.label,
        });
    }

    function setReturnToHospitalButtonLoading(loading) {
        const button = getElement("returnToHospitalBtn");

        if (!button) {
            return;
        }

        button.disabled = Boolean(loading) || isUpdatingDispatchStatus;

        button.classList.toggle("is-loading", Boolean(loading));

        const text = button.querySelector("span");

        if (text) {
            text.textContent = loading
                ? "Calculating Route..."
                : "Return to Hospital";
        }
    }

    async function handleReturnToHospital() {
        if (!isDriver() || isReturningToHospital) {
            return;
        }

        isReturningToHospital = true;

        setReturnToHospitalButtonLoading(true);

        try {
            const returnRoute = await calculateReturnToHospitalRoute();

            if (!returnRoute) {
                throw new Error("Unable to calculate the return route.");
            }

            currentFullMapRoute = returnRoute;

            /*
             * Build a temporary record only for the
             * shared renderer. Dispatch status remains
             * controlled by Dispatch.
             */
            const returnRecord = {
                ...currentFullMapRecord,
                origin: "Current Vehicle Location",
                destination: FULL_MAP_HOSPITAL.label,
                stops: [],
            };

            drawFullRoute(returnRoute, returnRecord);

            updateFullMapInfo(currentFullMapRecord, returnRoute);

            showFullMapToast(
                `Return route to ${FULL_MAP_HOSPITAL.label} calculated.`,
                "success",
            );
        } catch (error) {
            console.error("[Full Route Map] Return to hospital failed:", error);

            showFullMapToast(
                error.message || "Unable to calculate the return route.",
                "error",
            );
        } finally {
            isReturningToHospital = false;

            setReturnToHospitalButtonLoading(false);
        }
    }

    /* =====================================================
       OPEN FULL MAP
    ===================================================== */

    async function openFullRouteMap(record = null) {
        const selectedRecord =
            record || window.getCurrentRoutePlanningMapRecord?.();
        const validation = await canOpenFullRouteMap(selectedRecord);
        if (!validation.allowed) {
            showFullMapToast(validation.message, "warning");

            return false;
        }

        const dispatch = validation.dispatch;
        const route = window.getCurrentRoutePlanningMapRoute?.() || null;

        if (!route) {
            showFullMapToast(
                "Route data is not ready yet. Please wait for the route to load.",
                "warning",
            );

            return false;
        }

        currentFullMapRecord = {
            ...selectedRecord,
            dispatchId: dispatch.id,
            tripStatus: dispatch.trip_status,
            dispatch,
        };

        currentFullMapRoute = route;

        const overlay = getElement("fullRouteMapOverlay");
        if (!overlay) {
            console.error("[Full Route Map] Overlay not found.");

            return false;
        }
        const title = getElement("fullRouteMapTitle");
        const subtitle = getElement("fullRouteMapSubtitle");

        if (title) {
            title.textContent =
                selectedRecord.routeNumber ||
                selectedRecord.reservationNumber ||
                "Route Map";
        }

        if (subtitle) {
            subtitle.textContent = isDriver()
                ? "Live route tracking"
                : "Route planning preview";
        }

        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        document.body.dataset.fullRouteMapOpen = "true";
        document.body.style.overflow = "hidden";
        initFullRouteMap();
        requestAnimationFrame(() => {
            if (!fullRouteMap) {
                return;
            }

            fullRouteMap.invalidateSize();
            drawFullRoute(currentFullMapRoute, currentFullMapRecord);
            updateFullMapInfo(currentFullMapRecord, currentFullMapRoute);
            updateDriverControls(currentFullMapRecord);
        });

        return true;
    }

    function openRouteDriverStatusConfirmModal(nextStatus) {
        if (!routeDriverStatusConfirmModal || !nextStatus) {
            return;
        }
        const titleElement = routeDriverStatusConfirmModal.querySelector(
            "#routeDriverStatusConfirmTitle",
        );

        const descriptionElement = routeDriverStatusConfirmModal.querySelector(
            "#routeDriverStatusConfirmDescription",
        );
        const statusElement = routeDriverStatusConfirmModal.querySelector(
            "#routeDriverStatusConfirmStatus",
        );
        const messageElement = routeDriverStatusConfirmModal.querySelector(
            "#routeDriverStatusConfirmMessage",
        );
        const confirmButton = routeDriverStatusConfirmModal.querySelector(
            "#confirmRouteDriverStatus",
        );
        const confirmButtonText = routeDriverStatusConfirmModal.querySelector(
            "#confirmRouteDriverStatusText",
        );
        routeDriverStatusConfirmModal.currentStatus = nextStatus;
        if (titleElement) {
            if (nextStatus === "En Route") {
                titleElement.textContent = "Start Trip";
            } else if (nextStatus === "Arrived") {
                titleElement.textContent = "Mark Arrived";
            } else if (nextStatus === "Completed") {
                titleElement.textContent = "Complete Trip";
            } else {
                titleElement.textContent = "Update Dispatch Status";
            }
        }
        if (statusElement) {
            statusElement.textContent = nextStatus;
        }
        if (descriptionElement) {
            descriptionElement.innerHTML =
                `Are you sure you want to change this dispatch to ` +
                `<strong>${nextStatus}</strong>?`;
        }
        if (messageElement) {
            if (nextStatus === "En Route") {
                messageElement.textContent =
                    "The vehicle and driver will be marked as active for this trip.";
            } else if (nextStatus === "Arrived") {
                messageElement.textContent =
                    "The dispatch arrival time will be recorded.";
            } else if (nextStatus === "Completed") {
                messageElement.textContent =
                    "The trip will be completed and the assigned resources will be released.";
            } else {
                messageElement.textContent =
                    "The dispatch status will be updated in the system.";
            }
        }
        if (confirmButtonText) {
            if (nextStatus === "En Route") {
                confirmButtonText.textContent = "Set En Route";
            } else if (nextStatus === "Arrived") {
                confirmButtonText.textContent = "Mark Arrived";
            } else if (nextStatus === "Completed") {
                confirmButtonText.textContent = "Complete Trip";
            } else {
                confirmButtonText.textContent = "Confirm";
            }
        }

        if (confirmButton) {
            confirmButton.disabled = false;
        }
        routeDriverStatusConfirmModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeRouteDriverStatusConfirmModal() {
        if (!routeDriverStatusConfirmModal) {
            return;
        }
        routeDriverStatusConfirmModal.classList.remove("show");
        document.body.style.overflow = "";
        delete routeDriverStatusConfirmModal.currentStatus;
    }

    /* =====================================================
       CLOSE
    ===================================================== */

    function closeFullRouteMap() {
        const overlay = getElement("fullRouteMapOverlay");

        if (!overlay) {
            return;
        }

        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");

        document.body.dataset.fullRouteMapOpen = "false";
        document.body.style.overflow = "";

        currentFullMapRecord = null;
        currentFullMapRoute = null;

        clearFullRouteMap();
    }

    /* =====================================================
       EVENTS
    ===================================================== */
    function bindFullRouteMapEvents() {
        const openButton = getElement("openFullRouteMapBtn");
        const backButton = getElement("backFromFullRouteMapBtn");
        const statusButton = getElement("fullRouteStatusBtn");
        const returnButton = getElement("returnToHospitalBtn");
        if (openButton) {
            openButton.addEventListener("click", () => {
                void openFullRouteMap();
            });
        }
        if (backButton) {
            backButton.addEventListener("click", () => {
                closeFullRouteMap();
            });
        }
        if (statusButton) {
            statusButton.addEventListener("click", () => {
                void handleDriverStatusClick();
            });
        }
        if (returnButton) {
            returnButton.addEventListener("click", () => {
                void handleReturnToHospital();
            });
        }
    }

    /* =====================================================
       PUBLIC API
    ===================================================== */
    window.openFullRouteMap = openFullRouteMap;
    window.closeFullRouteMap = closeFullRouteMap;
    window.getFullRouteMapRecord = function () {
        return currentFullMapRecord;
    };
    window.getFullRouteMapRoute = function () {
        return currentFullMapRoute;
    };
    /* =====================================================
       INIT
    ===================================================== */
    function init() {
        // IMPORTANT:
        // Move the full map overlay directly under <body>.
        // This prevents tablet/mobile layout stacking contexts
        // from trapping the overlay behind the navbar/sidebar.
        moveFullRouteMapOverlayToBody();
        initFullRouteMapGpsListener();

        routeDriverStatusConfirmModal = getElement(
            "routeDriverStatusConfirmModal",
        );
        if (routeDriverStatusConfirmModal) {
            const cancelButton = getElement("cancelRouteDriverStatusConfirm");
            const confirmButton = getElement("confirmRouteDriverStatus");
            if (cancelButton) {
                cancelButton.addEventListener("click", () => {
                    closeRouteDriverStatusConfirmModal();
                });
            }
            if (confirmButton) {
                confirmButton.addEventListener("click", async () => {
                    if (isUpdatingDispatchStatus) {
                        return;
                    }
                    const nextStatus =
                        routeDriverStatusConfirmModal.currentStatus;
                    if (!nextStatus) {
                        return;
                    }
                    await updateDispatchStatus(nextStatus);
                });
            }
            routeDriverStatusConfirmModal.addEventListener("click", (event) => {
                if (event.target === routeDriverStatusConfirmModal) {
                    closeRouteDriverStatusConfirmModal();
                }
            });
        }
        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape" &&
                routeDriverStatusConfirmModal?.classList.contains("show")
            ) {
                closeRouteDriverStatusConfirmModal();
            }
        });
        bindFullRouteMapEvents();
        console.log("[Full Route Map] Initialized.");
    }

    window.initFullRouteMap = init;
    window.openFullRouteMap = openFullRouteMap;
    window.closeFullRouteMap = closeFullRouteMap;
    window.getFullRouteMapRecord = () => currentFullMapRecord;
    window.getFullRouteMapRoute = () => currentFullMapRoute;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();


