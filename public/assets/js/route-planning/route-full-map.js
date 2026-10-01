(function () {
    "use strict";

    let fullRouteMap = null;
    let fullRouteLayer = null;
    let fullRouteMarkerLayer = null;
    let fullRouteVehicleMarkerLayer = null;
    let fullRouteVehicleMarker = null;
    let fullRouteProgressLayer = null;
    let fullRouteManeuverLayer = null;
    let fullRouteGpsAccuracyCircle = null;
    let fullRouteMapInitialized = false;

    let currentFullMapRecord = null;
    let currentFullMapRoute = null;
    let currentFullMapLiveVehicle = null;

    let isNavigationFollowing = true;
    let lastNavigationLocation = null;

    let lastNavigationCameraUpdate = 0;

    const NAVIGATION_CAMERA_MIN_INTERVAL_MS = 900;
    const NAVIGATION_DEFAULT_ZOOM = 16;
    const NAVIGATION_SLOW_ZOOM = 17;
    const NAVIGATION_FAST_ZOOM = 15;
    const NAVIGATION_TURN_LOOKAHEAD_METERS = 250;

    const NAVIGATION_CAMERA_LOOKAHEAD_MIN_METERS = 80;
    const NAVIGATION_CAMERA_LOOKAHEAD_MAX_METERS = 180;

    const LANE_GUIDANCE_SHOW_DISTANCE_METERS = 500;
    const LANE_GUIDANCE_EMPHASIZE_DISTANCE_METERS = 200;

    let currentNavigationInstruction = null;
    let currentNavigationInstructionIndex = -1;

    let isRerouting = false;
    let lastRerouteAt = 0;

    let fullRouteVehicleAnimationFrame = null;
    let lastFullRouteVehiclePosition = null;
    let lastFullRouteVehicleHeading = null;

    const OFF_ROUTE_THRESHOLD_METERS = 100;
    const REROUTE_COOLDOWN_MS = 15000;

    let destinationArrivalNotified = false;
    let isNearDestination = false;

    const DESTINATION_ARRIVAL_THRESHOLD_METERS = 50;

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
        fullRouteMap.on("dragstart", () => {
            isNavigationFollowing = false;
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(fullRouteMap);

        fullRouteLayer = L.layerGroup().addTo(fullRouteMap);
        fullRouteMarkerLayer = L.layerGroup().addTo(fullRouteMap);
        fullRouteVehicleMarkerLayer = L.layerGroup().addTo(fullRouteMap);
        fullRouteProgressLayer = L.layerGroup().addTo(fullRouteMap);
        fullRouteManeuverLayer = L.layerGroup().addTo(fullRouteMap);
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

        if (fullRouteProgressLayer) {
            fullRouteProgressLayer.clearLayers();
        }
        if (fullRouteManeuverLayer) {
            fullRouteManeuverLayer.clearLayers();
        }
        if (fullRouteGpsAccuracyCircle && fullRouteMap) {
            fullRouteMap.removeLayer(fullRouteGpsAccuracyCircle);
            fullRouteGpsAccuracyCircle = null;
        }

        stopFullRouteVehicleAnimation();

        fullRouteVehicleMarker = null;
        lastFullRouteVehiclePosition = null;
        lastFullRouteVehicleHeading = null;
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
        const trackedVehicle =
            currentFullMapLiveVehicle ||
            window.getLastRoutePlanningTrackedVehicle?.() ||
            null;
        if (trackedVehicle) {
            updateFullRouteMapVehicleLocation(trackedVehicle);
        }

        updateFullMapInfo(currentFullMapRecord, route);

        window.setTimeout(() => {
            fullRouteMap?.invalidateSize();
        }, 100);
    }

    /* =====================================================
    NAVIGATION HELPERS
    ===================================================== */
    function getCurrentFullMapGpsLocation() {
        const liveVehicle = currentFullMapLiveVehicle;
        const trackedLocation =
            liveVehicle?.location ||
            window.getLastRoutePlanningTrackedVehicle?.()?.location ||
            null;

        const latitude = Number(trackedLocation?.latitude);
        const longitude = Number(trackedLocation?.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        return {
            latitude,
            longitude,
        };
    }

    function getCurrentFullMapGpsData() {
        const liveVehicle = currentFullMapLiveVehicle;
        const trackedVehicle =
            liveVehicle ||
            window.getLastRoutePlanningTrackedVehicle?.() ||
            null;
        const location = trackedVehicle?.location || null;
        if (!location) {
            return {
                available: false,
                ageSeconds: null,
                recordedAt: null,
            };
        }
        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        const available =
            Number.isFinite(latitude) && Number.isFinite(longitude);
        if (!available) {
            return {
                available: false,
                ageSeconds: null,
                recordedAt: null,
            };
        }
        const rawAge = Number(location.age_seconds ?? location.ageSeconds);
        let ageSeconds = Number.isFinite(rawAge) ? Math.max(0, rawAge) : null;
        const recordedAt = location.recorded_at ?? location.recordedAt ?? null;
        if (ageSeconds === null && recordedAt) {
            const timestamp = Date.parse(recordedAt);

            if (Number.isFinite(timestamp)) {
                ageSeconds = Math.max(0, (Date.now() - timestamp) / 1000);
            }
        }
        return {
            available: true,
            ageSeconds,
            recordedAt,
            latitude,
            longitude,
            speed: location.speed ?? null,
            heading: location.heading ?? null,
            accuracy: location.accuracy ?? null,
        };
    }
    

    function updateFullMapGpsAccuracyCircle() {
        if (!fullRouteMap) {
            return;
        }
        if (fullRouteGpsAccuracyCircle) {
            fullRouteMap.removeLayer(fullRouteGpsAccuracyCircle);
            fullRouteGpsAccuracyCircle = null;
        }
        const gps = getCurrentFullMapGpsData();
        if (
            !gps?.available ||
            !Number.isFinite(Number(gps.accuracy)) ||
            Number(gps.accuracy) <= 0
        ) {
            return;
        }
        const latitude = Number(gps.latitude);
        const longitude = Number(gps.longitude);
        const accuracy = Number(gps.accuracy);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }
        const primaryColor =
            getComputedStyle(document.documentElement)
                .getPropertyValue("--color-primary")
                .trim() || "#00a86b";
        const displayRadius = Math.min(Math.max(accuracy, 3), 150);
        fullRouteGpsAccuracyCircle = L.circle([latitude, longitude], {
            radius: displayRadius,
            color: primaryColor,
            weight: 1,
            opacity: 0.35,
            fillColor: primaryColor,
            fillOpacity: 0.08,
            interactive: false,
        }).addTo(fullRouteMap);
    }

    function updateFullMapGpsIndicator() {
        const indicator = getElement("fullMapGpsIndicator");
        const icon = getElement("fullMapGpsIndicatorIcon");
        const label = getElement("fullMapGpsIndicatorLabel");
        const detail = getElement("fullMapGpsIndicatorDetail");
        if (!indicator) {
            return;
        }
        indicator.classList.remove(
            "is-live",
            "is-delayed",
            "is-lost",
            "is-no-signal",
        );
        const gps = getCurrentFullMapGpsData();
        if (!gps.available) {
            indicator.classList.add("is-no-signal");
            if (icon) {
                icon.className = "ph ph-crosshair-slash";
            }
            if (label) {
                label.textContent = "GPS";
            }
            if (detail) {
                detail.textContent = "Waiting for location";
            }
            return;
        }
        const ageSeconds = Number(gps.ageSeconds);
        /*
         * No usable timestamp:
         * coordinates exist, but freshness cannot be verified.
         */
        if (!Number.isFinite(ageSeconds)) {
            indicator.classList.add("is-delayed");
            if (icon) {
                icon.className = "ph ph-crosshair";
            }
            if (label) {
                label.textContent = "GPS";
            }
            if (detail) {
                detail.textContent = "Location received";
            }
            return;
        }

        /*
         * LIVE:
         * 0–10 seconds old
         */
        if (ageSeconds <= 10) {
            indicator.classList.add("is-live");
            if (icon) {
                icon.className = "ph ph-crosshair";
            }
            if (label) {
                label.textContent = "GPS Live";
            }
            if (detail) {
                const accuracy = Number(gps.accuracy);
                detail.textContent =
                    Number.isFinite(accuracy) && accuracy > 0
                        ? `Updated just now • ±${Math.round(accuracy)} m`
                        : "Updated just now";
            }
            return;
        }
        /*
         * DELAYED:
         * >10–30 seconds old
         */
        if (ageSeconds <= 30) {
            indicator.classList.add("is-delayed");
            if (icon) {
                icon.className = "ph ph-warning";
            }
            if (label) {
                label.textContent = "GPS Delayed";
            }
            if (detail) {
                detail.textContent = `${Math.round(ageSeconds)}s ago`;
            }
            return;
        }
        /*
         * LOST:
         * >30 seconds old
         */
        indicator.classList.add("is-lost");
        if (icon) {
            icon.className = "ph ph-warning-circle";
        }
        if (label) {
            label.textContent = "GPS Lost";
        }
        if (detail) {
            detail.textContent = `${Math.round(ageSeconds)}s ago`;
        }
    }

    function calculatePolylineRemainingDistanceKm(route, location) {
        if (!route?.geometry?.coordinates?.length || !location) {
            return null;
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (!progress) {
            return null;
        }
        const coordinates = route.geometry.coordinates;
        let totalRouteMeters = 0;
        for (let index = 1; index < coordinates.length; index++) {
            const previous = coordinates[index - 1];
            const current = coordinates[index];
            const previousPoint = {
                lat: Number(previous[1]),
                lng: Number(previous[0]),
            };
            const currentPoint = {
                lat: Number(current[1]),
                lng: Number(current[0]),
            };
            totalRouteMeters += L.latLng(previousPoint).distanceTo(
                L.latLng(currentPoint),
            );
        }
        const remainingMeters = Math.max(
            0,
            totalRouteMeters - Number(progress.progressMeters || 0),
        );
        return remainingMeters / 1000;
    }

    function calculateNavigationRemainingTimeMinutes(
        route,
        remainingDistanceKm,
    ) {
        const totalDistanceKm =
            Number(route?.summary?.lengthInMeters || 0) / 1000;
        const totalTimeMinutes =
            Number(route?.summary?.travelTimeInSeconds || 0) / 60;
        if (
            totalDistanceKm <= 0 ||
            totalTimeMinutes <= 0 ||
            !Number.isFinite(Number(remainingDistanceKm))
        ) {
            return null;
        }
        const ratio = Math.min(
            1,
            Math.max(0, Number(remainingDistanceKm) / totalDistanceKm),
        );
        return Math.max(0, Math.round(totalTimeMinutes * ratio));
    }

    function getNavigationCameraZoom(route, location, speedKph = null) {
        const tripStatus = normalizeTripStatus(
            currentFullMapRecord?.tripStatus ??
                currentFullMapRecord?.trip_status ??
                "",
        );
        if (tripStatus !== "En Route") {
            return NAVIGATION_DEFAULT_ZOOM;
        }
        /*
         * Vehicle speed is optional because some GPS
         * sources may not provide it.
         */
        const speed = Number(speedKph);
        let zoom = NAVIGATION_DEFAULT_ZOOM;
        if (Number.isFinite(speed)) {
            if (speed <= 10) {
                zoom = NAVIGATION_SLOW_ZOOM;
            } else if (speed >= 50) {
                zoom = NAVIGATION_FAST_ZOOM;
            }
        }
        /*
         * When approaching the next maneuver,
         * keep enough context around the upcoming turn.
         */
        const navigation =
            currentFullMapRoute && location
                ? findNextNavigationInstruction(route, location)
                : null;
        const distanceToManeuver = Number(navigation?.distanceToManeuverMeters);
        if (
            Number.isFinite(distanceToManeuver) &&
            distanceToManeuver <= NAVIGATION_TURN_LOOKAHEAD_METERS
        ) {
            zoom = Math.max(zoom, 16);
        }
        return zoom;
    }

    function getFullRouteForwardCameraPoint(
        route,
        location,
        lookaheadMeters = NAVIGATION_CAMERA_LOOKAHEAD_MIN_METERS,
    ) {
        if (
            !route?.geometry ||
            route.geometry.type !== "LineString" ||
            !Array.isArray(route.geometry.coordinates) ||
            route.geometry.coordinates.length < 2 ||
            !location
        ) {
            return null;
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (!progress || !Number.isFinite(Number(progress.progressMeters))) {
            return null;
        }
        const coordinates = route.geometry.coordinates;
        const routePoints = coordinates
            .map((point) => {
                if (!Array.isArray(point) || point.length < 2) {
                    return null;
                }
                const longitude = Number(point[0]);
                const latitude = Number(point[1]);
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    return null;
                }
                return L.latLng(latitude, longitude);
            })
            .filter(Boolean);
        if (routePoints.length < 2) {
            return null;
        }
        const targetProgress =
            Number(progress.progressMeters) +
            Math.max(0, Number(lookaheadMeters) || 0);
        let cumulativeMeters = 0;
        for (let index = 1; index < routePoints.length; index++) {
            const segmentStart = routePoints[index - 1];
            const segmentEnd = routePoints[index];
            const segmentLength = segmentStart.distanceTo(segmentEnd);
            if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
                continue;
            }
            const segmentEndProgress = cumulativeMeters + segmentLength;
            if (segmentEndProgress >= targetProgress) {
                const distanceIntoSegment = Math.max(
                    0,
                    targetProgress - cumulativeMeters,
                );
                const ratio = Math.min(1, distanceIntoSegment / segmentLength);
                return {
                    latitude:
                        segmentStart.lat +
                        (segmentEnd.lat - segmentStart.lat) * ratio,
                    longitude:
                        segmentStart.lng +
                        (segmentEnd.lng - segmentStart.lng) * ratio,
                };
            }
            cumulativeMeters = segmentEndProgress;
        }
        /*
         * Route does not have enough distance ahead.
         * Use the final route point.
         */
        const destination = routePoints[routePoints.length - 1];

        return {
            latitude: destination.lat,
            longitude: destination.lng,
        };
    }

    function getNavigationCameraLookaheadMeters(speedKph) {
        const speed = Number(speedKph);
        if (!Number.isFinite(speed) || speed <= 0) {
            return NAVIGATION_CAMERA_LOOKAHEAD_MIN_METERS;
        }
        /*
         * Slow traffic / maneuvering:
         * keep the camera relatively close.
         */
        if (speed <= 15) {
            return 80;
        }
        if (speed <= 30) {
            return 110;
        }
        if (speed <= 45) {
            return 140;
        }
        if (speed <= 60) {
            return 160;
        }
        return NAVIGATION_CAMERA_LOOKAHEAD_MAX_METERS;
    }

    function centerFullMapOnNavigationLocation(
        location,
        zoom = NAVIGATION_DEFAULT_ZOOM,
        speedKph = null,
        useForwardCamera = true,
    ) {
        if (
            !fullRouteMap ||
            !location ||
            !Number.isFinite(Number(location.latitude)) ||
            !Number.isFinite(Number(location.longitude))
        ) {
            return;
        }
        if (!isNavigationFollowing) {
            return;
        }
        const now = Date.now();
        if (
            now - lastNavigationCameraUpdate <
            NAVIGATION_CAMERA_MIN_INTERVAL_MS
        ) {
            return;
        }
        lastNavigationCameraUpdate = now;
        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        const cameraZoom = getNavigationCameraZoom(
            currentFullMapRoute,
            location,
            speedKph,
        );
        const currentZoom = Number(fullRouteMap.getZoom()) || 14;
        const finalZoom =
            Math.abs(currentZoom - cameraZoom) >= 1 ? cameraZoom : currentZoom;
        let cameraLatitude = latitude;
        let cameraLongitude = longitude;
        /*
         * Forward-looking camera is only used
         * during active navigation.
         */
        const tripStatus = normalizeTripStatus(
            currentFullMapRecord?.tripStatus ??
                currentFullMapRecord?.trip_status ??
                "",
        );
        if (
            useForwardCamera &&
            tripStatus === "En Route" &&
            currentFullMapRoute
        ) {
            const lookaheadMeters =
                getNavigationCameraLookaheadMeters(speedKph);

            const forwardPoint = getFullRouteForwardCameraPoint(
                currentFullMapRoute,
                {
                    latitude,
                    longitude,
                },
                lookaheadMeters,
            );
            if (forwardPoint) {
                /*
                 * Place the viewport center between
                 * the current vehicle and the point ahead.
                 *
                 * This makes the vehicle appear slightly
                 * lower on the screen while keeping the
                 * upcoming route visible.
                 */
                cameraLatitude =
                    latitude +
                    (Number(forwardPoint.latitude) - latitude) * 0.35;

                cameraLongitude =
                    longitude +
                    (Number(forwardPoint.longitude) - longitude) * 0.35;
            }
        }
        fullRouteMap.setView([cameraLatitude, cameraLongitude], finalZoom, {
            animate: true,
            duration: 0.45,
        });
        lastNavigationLocation = {
            latitude,
            longitude,
        };
    }

    function getCurrentRouteDestinationCoordinates(route) {
        const destination =
            route?.routeCoordinates?.destination ||
            route?.destinationCoordinates ||
            route?.destination_coordinate ||
            null;
        const latitude = Number(destination?.lat ?? destination?.latitude);
        const longitude = Number(destination?.lng ?? destination?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        return {
            lat: latitude,
            lng: longitude,
        };
    }

    function calculateDistanceToRouteDestination(route, location) {
        if (!route || !location) {
            return null;
        }
        const destination = getCurrentRouteDestinationCoordinates(route);
        if (!destination) {
            return null;
        }
        const currentPoint = L.latLng(
            Number(location.latitude),
            Number(location.longitude),
        );
        const destinationPoint = L.latLng(
            Number(destination.lat),
            Number(destination.lng),
        );
        const distanceMeters = currentPoint.distanceTo(destinationPoint);
        if (!Number.isFinite(distanceMeters)) {
            return null;
        }
        return distanceMeters;
    }

    function checkDestinationArrival(route) {
        if (!route || isReturningToHospital) {
            return null;
        }
        const tripStatus = normalizeTripStatus(
            currentFullMapRecord?.tripStatus ??
                currentFullMapRecord?.trip_status ??
                "",
        );
        /*
         * Arrival guidance is meaningful only
         * while the trip is actively En Route.
         */
        if (tripStatus !== "En Route") {
            return null;
        }
        const location = getCurrentFullMapGpsLocation();
        if (!location) {
            return null;
        }
        const distanceMeters = calculateDistanceToRouteDestination(
            route,
            location,
        );

        if (!Number.isFinite(distanceMeters)) {
            return null;
        }
        const arrived = distanceMeters <= DESTINATION_ARRIVAL_THRESHOLD_METERS;
        isNearDestination = arrived;
        const nextInstructionElement = getElement("fullMapNextInstruction");
        const nextDistanceElement = getElement(
            "fullMapNextInstructionDistance",
        );

        const nextStreetElement = getElement("fullMapNextInstructionStreet");
        const nextInstructionIcon = getElement("fullMapNextInstructionIcon");
        const navigationModeLabel = getElement("fullMapNavigationModeLabel");

        if (arrived) {
            if (nextInstructionElement) {
                nextInstructionElement.textContent = "You have arrived";
            }
            if (nextDistanceElement) {
                nextDistanceElement.textContent =
                    formatNavigationDistance(distanceMeters);
            }
            if (nextStreetElement) {
                nextStreetElement.textContent =
                    currentFullMapRecord?.destination ||
                    route?.destination ||
                    "Destination";
            }
            if (nextInstructionIcon) {
                nextInstructionIcon.className = "ph ph-flag-checkered";
            }
            if (navigationModeLabel) {
                navigationModeLabel.textContent = "Destination reached";
            }
            /*
             * Notify only once while the vehicle
             * remains inside the arrival radius.
             */
            if (!destinationArrivalNotified) {
                destinationArrivalNotified = true;

                showFullMapToast(
                    "The vehicle has reached the route destination.",
                    "success",
                );
            }
            return {
                arrived: true,
                distanceMeters,
            };
        }
        /*
         * Vehicle moved away from the arrival radius.
         * Allow a future arrival notification again.
         */
        destinationArrivalNotified = false;
        return {
            arrived: false,
            distanceMeters,
        };
    }

    function getCurrentRouteStopCoordinates(route) {
        const stops = Array.isArray(route?.routeCoordinates?.stops)
            ? route.routeCoordinates.stops
            : [];
        return stops
            .map((stop) => {
                const lat = Number(stop?.lat ?? stop?.latitude);
                const lng = Number(stop?.lng ?? stop?.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    return null;
                }
                return {
                    lat,
                    lng,
                };
            })
            .filter(Boolean);
    }

    async function recalculateRouteFromCurrentLocation() {
        if (isRerouting || !currentFullMapRecord || !currentFullMapRoute) {
            return null;
        }
        const now = Date.now();
        if (now - lastRerouteAt < REROUTE_COOLDOWN_MS) {
            return null;
        }
        const location = getCurrentFullMapGpsLocation();
        if (!location) {
            return null;
        }
        const destination =
            getCurrentRouteDestinationCoordinates(currentFullMapRoute);
        if (!destination) {
            console.warn(
                "[Full Route Map] Unable to reroute: destination coordinates are missing.",
            );
            return null;
        }
        if (typeof window.calculateTrafficRouteFromCoordinates !== "function") {
            console.warn(
                "[Full Route Map] Shared traffic routing function is not available.",
            );
            return null;
        }
        isRerouting = true;
        lastRerouteAt = now;
        destinationArrivalNotified = false;
        isNearDestination = false;
        const navigationModeLabel = getElement("fullMapNavigationModeLabel");
        const nextInstructionElement = getElement("fullMapNextInstruction");
        const nextStreetElement = getElement("fullMapNextInstructionStreet");
        const nextDistanceElement = getElement(
            "fullMapNextInstructionDistance",
        );
        const nextInstructionIcon = getElement("fullMapNextInstructionIcon");
        if (navigationModeLabel) {
            navigationModeLabel.textContent = "Recalculating route...";
        }
        if (nextInstructionElement) {
            nextInstructionElement.textContent = "Recalculating route";
        }
        if (nextStreetElement) {
            nextStreetElement.textContent = "Finding a new route";
        }
        if (nextDistanceElement) {
            nextDistanceElement.textContent = "—";
        }
        if (nextInstructionIcon) {
            nextInstructionIcon.className = "ph ph-arrows-clockwise";
        }
        try {
            const routeCoordinates = {
                origin: {
                    lat: Number(location.latitude),
                    lng: Number(location.longitude),
                },
                stops: getCurrentRouteStopCoordinates(currentFullMapRoute),
                destination,
            };
            const reroutedRoute =
                await window.calculateTrafficRouteFromCoordinates(
                    routeCoordinates,
                    {
                        origin: "Current Vehicle Location",
                        destination:
                            currentFullMapRoute.destination ||
                            currentFullMapRecord.destination ||
                            "Route Destination",
                    },
                );
            if (!reroutedRoute) {
                throw new Error("A new route could not be calculated.");
            }
            currentFullMapRoute = {
                ...reroutedRoute,
                routeCoordinates: {
                    ...(reroutedRoute.routeCoordinates || routeCoordinates),
                    origin: routeCoordinates.origin,
                    stops: routeCoordinates.stops,
                    destination:
                        reroutedRoute.routeCoordinates?.destination ||
                        routeCoordinates.destination,
                },
            };
            drawFullRoute(currentFullMapRoute, currentFullMapRecord);
            updateFullMapInfo(currentFullMapRecord, currentFullMapRoute);
            if (navigationModeLabel) {
                navigationModeLabel.textContent = "Driver Navigation";
            }
            showFullMapToast(
                "Route recalculated from the current vehicle location.",
                "success",
            );
            return currentFullMapRoute;
        } catch (error) {
            console.error(
                "[Full Route Map] Automatic rerouting failed:",
                error,
            );
            if (navigationModeLabel) {
                navigationModeLabel.textContent = isDriver()
                    ? "Driver Navigation"
                    : "Live Route View";
            }
            updateCurrentNavigationInstruction(currentFullMapRoute);
            showFullMapToast(
                error.message || "Unable to recalculate the route.",
                "error",
            );
            return null;
        } finally {
            isRerouting = false;
        }
    }

    function checkNavigationOffRoute(route) {
        const tripStatus = normalizeTripStatus(
            currentFullMapRecord?.tripStatus ??
                currentFullMapRecord?.trip_status ??
                "",
        );
        if (
            !route ||
            isRerouting ||
            isReturningToHospital ||
            tripStatus !== "En Route"
        ) {
            return null;
        }
        const location = getCurrentFullMapGpsLocation();
        if (!location) {
            return null;
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (!progress) {
            return null;
        }
        const distanceFromRouteMeters = Number(
            progress.distanceFromRouteMeters,
        );
        if (!Number.isFinite(distanceFromRouteMeters)) {
            return null;
        }
        if (distanceFromRouteMeters > OFF_ROUTE_THRESHOLD_METERS) {
            void recalculateRouteFromCurrentLocation();
        }
        return {
            isOffRoute: distanceFromRouteMeters > OFF_ROUTE_THRESHOLD_METERS,
            distanceFromRouteMeters,
            progressMeters: progress.progressMeters,
        };
    }

    function updateNavigationProgress(route) {
        if (!route) {
            return null;
        }
        const location = getCurrentFullMapGpsLocation();
        if (!location) {
            return null;
        }
        const remainingDistanceKm =
            calculatePolylineRemainingDistanceKm(
                route,
                location,
            );
        if (remainingDistanceKm === null) {
            return null;
        }

        const remainingMinutes =
            calculateNavigationRemainingTimeMinutes(
                route,
                remainingDistanceKm,
            );
        const progress = {
            latitude: location.latitude,
            longitude: location.longitude,
            remainingDistanceKm,
            remainingMinutes,
        };
        lastNavigationLocation = location;
        return progress;
    }

    /* =====================================================
    TURN-BY-TURN NAVIGATION
    ===================================================== */
    function getRouteInstructions(route) {
        if (!Array.isArray(route?.instructions)) {
            return [];
        }
        return route.instructions
            .map((instruction, index) => ({
                ...instruction,
                _index: index,
                _routeOffsetMeters: Number(
                    instruction?.route_offset_meters ??
                        instruction?.routeOffsetInMeters ??
                        0,
                ),
                _pointIndex: Number(
                    instruction?.point_index ?? instruction?.pointIndex ?? -1,
                ),
                _latitude:
                    instruction?.point?.latitude != null
                        ? Number(instruction.point.latitude)
                        : null,
                _longitude:
                    instruction?.point?.longitude != null
                        ? Number(instruction.point.longitude)
                        : null,
                _maneuver: instruction?.maneuver || "",
                _message:
                    instruction?.message ||
                    instruction?.combined_message ||
                    instruction?.combinedMessage ||
                    "",
                _street: instruction?.street || "",
                _roadNumbers: Array.isArray(
                    instruction?.road_numbers ?? instruction?.roadNumbers,
                )
                    ? (instruction?.road_numbers ?? instruction?.roadNumbers)
                          .map((value) => String(value || "").trim())
                          .filter(Boolean)
                    : String(
                          instruction?.road_numbers ??
                              instruction?.roadNumbers ??
                              "",
                      )
                          .split(/[;,|]/)
                          .map((value) => value.trim())
                          .filter(Boolean),
                _signpostText: String(
                    instruction?.signpost_text ??
                        instruction?.signpostText ??
                        "",
                ).trim(),
                _junctionType: String(
                    instruction?.junction_type ??
                        instruction?.junctionType ??
                        "",
                ).trim(),
                _roundaboutExitNumber: Number(
                    instruction?.roundabout_exit_number ??
                        instruction?.roundaboutExitNumber ??
                        NaN,
                ),
                _drivingSide: String(
                    instruction?.driving_side ?? instruction?.drivingSide ?? "",
                ).trim(),
                _instructionType: String(
                    instruction?.instruction_type ??
                        instruction?.instructionType ??
                        "",
                ).trim(),
                _laneGuidance:
                    instruction?.lane_guidance ??
                    instruction?.laneGuidance ??
                    instruction?.lanes ??
                    null,
                _travelTimeSeconds: Number(
                    instruction?.travel_time_seconds ??
                        instruction?.travelTimeInSeconds ??
                        0,
                ),
            }))
            .filter((instruction) =>
                Number.isFinite(instruction._routeOffsetMeters),
            )
            .sort((a, b) => a._routeOffsetMeters - b._routeOffsetMeters);
    }
    function getRouteLaneSections(route) {
        if (!Array.isArray(route?.laneSections)) {
            return [];
        }
        return route.laneSections
            .map((section) => ({
                startPointIndex: Number(
                    section?.start_point_index ??
                        section?.startPointIndex ??
                        -1,
                ),
                endPointIndex: Number(
                    section?.end_point_index ?? section?.endPointIndex ?? -1,
                ),
                lanes: Array.isArray(section?.lanes)
                    ? section.lanes.map((lane) => ({
                          directions: Array.isArray(lane?.directions)
                              ? lane.directions
                                    .map((direction) =>
                                        String(direction || "")
                                            .trim()
                                            .toUpperCase(),
                                    )
                                    .filter(Boolean)
                              : [],

                          follow: lane?.follow
                              ? String(lane.follow).trim().toUpperCase()
                              : null,
                      }))
                    : [],
                laneSeparators: Array.isArray(
                    section?.lane_separators ?? section?.laneSeparators,
                )
                    ? (section?.lane_separators ?? section?.laneSeparators).map(
                          (value) =>
                              String(value || "")
                                  .trim()
                                  .toUpperCase(),
                      )
                    : [],
            }))
            .filter(
                (section) =>
                    Number.isInteger(section.startPointIndex) &&
                    Number.isInteger(section.endPointIndex) &&
                    section.startPointIndex >= 0 &&
                    section.endPointIndex >= section.startPointIndex &&
                    section.lanes.length > 0,
            );
    }

    function getRouteProgressAtPointIndex(route, pointIndex) {
        if (
            !route?.geometry ||
            route.geometry.type !== "LineString" ||
            !Array.isArray(route.geometry.coordinates)
        ) {
            return null;
        }
        const index = Number(pointIndex);
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= route.geometry.coordinates.length
        ) {
            return null;
        }
        const points = route.geometry.coordinates
            .map((point) => {
                if (!Array.isArray(point) || point.length < 2) {
                    return null;
                }
                const lng = Number(point[0]);
                const lat = Number(point[1]);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    return null;
                }
                return L.latLng(lat, lng);
            })
            .filter(Boolean);
        if (points.length < 2) {
            return null;
        }
        const safeIndex = Math.min(index, points.length - 1);
        let cumulativeMeters = 0;
        for (let i = 0; i < safeIndex; i++) {
            const start = points[i];
            const end = points[i + 1];
            const segmentLength = start.distanceTo(end);
            if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
                continue;
            }
            cumulativeMeters += segmentLength;
        }
        return cumulativeMeters;
    }

    function findActiveRouteLaneSection(route, location) {
        const sections = getRouteLaneSections(route);
        if (sections.length === 0 || !location) {
            return null;
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (!progress) {
            return null;
        }
        const pointIndex = Number(progress.nearestSegmentIndex);
        if (!Number.isInteger(pointIndex)) {
            return null;
        }
        /*
         * Use the route polyline index to identify
         * which lane section is currently active.
         */
        return (
            sections.find(
                (section) =>
                    pointIndex >= section.startPointIndex &&
                    pointIndex <= section.endPointIndex,
            ) || null
        );
    }

    function getLaneDirectionIcon(direction) {
        const value = String(
            direction || "",
        )
            .trim()
            .toUpperCase();
        switch (value) {
            case "LEFT":
                return "ph-arrow-up-left";
            case "SLIGHT_LEFT":
                return "ph-arrow-up-left";
            case "SHARP_LEFT":
                return "ph-arrow-turn-up-left";
            case "RIGHT":
                return "ph-arrow-up-right";
            case "SLIGHT_RIGHT":
                return "ph-arrow-up-right";
            case "SHARP_RIGHT":
                return "ph-arrow-turn-up-right";
            case "UTURN":
            case "U_TURN":
                return "ph-arrow-u-up-right";
            case "STRAIGHT":
                return "ph-arrow-up";
            case "MERGE_LEFT":
                return "ph-arrow-left";
            case "MERGE_RIGHT":
                return "ph-arrow-right";
            default:
                return "ph-arrow-up";
        }
    }

    function findRelevantRouteLaneSection(route, location) {
        const sections = getRouteLaneSections(route);
        if (sections.length === 0 || !location) {
            return null;
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (!progress) {
            return null;
        }
        const currentProgressMeters = Number(progress.progressMeters);
        if (!Number.isFinite(currentProgressMeters)) {
            return null;
        }
        let bestSection = null;
        let bestDistance = Infinity;
        for (const section of sections) {
            const sectionStartProgress = getRouteProgressAtPointIndex(
                route,
                section.startPointIndex,
            );
            const sectionEndProgress = getRouteProgressAtPointIndex(
                route,
                section.endPointIndex,
            );
            if (
                !Number.isFinite(sectionStartProgress) ||
                !Number.isFinite(sectionEndProgress)
            ) {
                continue;
            }
            /*
             * Section already passed.
             */
            if (currentProgressMeters > sectionEndProgress + 20) {
                continue;
            }
            /*
             * Distance until lane section begins.
             */
            const distanceToSectionStart = Math.max(
                0,
                sectionStartProgress - currentProgressMeters,
            );
            /*
             * Only show lane guidance within
             * the defined approach distance.
             */
            if (distanceToSectionStart > LANE_GUIDANCE_SHOW_DISTANCE_METERS) {
                continue;
            }
            if (distanceToSectionStart < bestDistance) {
                bestDistance = distanceToSectionStart;

                bestSection = {
                    ...section,
                    distanceToStartMeters: distanceToSectionStart,
                    distanceToEndMeters: Math.max(
                        0,
                        sectionEndProgress - currentProgressMeters,
                    ),
                    isInsideSection:
                        currentProgressMeters >= sectionStartProgress &&
                        currentProgressMeters <= sectionEndProgress,
                };
            }
        }
        return bestSection;
    }

    function updateFullMapLaneGuidance(route) {
        const container = getElement("fullMapLaneGuidance");
        const lanesContainer = getElement("fullMapLaneGuidanceLanes");
        const messageElement = getElement("fullMapLaneGuidanceMessage");
        if (!container || !lanesContainer || !messageElement) {
            return;
        }
        container.hidden = true;
        container.classList.remove("is-approaching", "is-imminent");
        lanesContainer.innerHTML = "";
        messageElement.textContent = "";
        const tripStatus = normalizeTripStatus(
            currentFullMapRecord?.tripStatus ??
                currentFullMapRecord?.trip_status ??
                "",
        );
        if (tripStatus !== "En Route") {
            return;
        }
        const location = getCurrentFullMapGpsLocation();
        if (!location) {
            return;
        }
        const activeSection = findRelevantRouteLaneSection(route, location);
        if (
            !activeSection ||
            !Array.isArray(activeSection.lanes) ||
            activeSection.lanes.length === 0
        ) {
            return;
        }
        const distanceToLaneSection = Number(
            activeSection.distanceToStartMeters,
        );
        if (
            Number.isFinite(distanceToLaneSection) &&
            distanceToLaneSection > LANE_GUIDANCE_EMPHASIZE_DISTANCE_METERS
        ) {
            container.classList.add("is-approaching");
        } else {
            container.classList.add("is-imminent");
        }
        let recommendedLaneFound = false;
        activeSection.lanes.forEach((lane, index) => {
            const laneElement = document.createElement("div");
            laneElement.className = "full-map-lane";
            const directions = Array.isArray(lane.directions)
                ? lane.directions
                : [];
            const follow = lane.follow || null;
            if (follow) {
                laneElement.classList.add("is-recommended");
                recommendedLaneFound = true;
            }
            const directionsContainer = document.createElement("div");
            directionsContainer.className = "full-map-lane-directions";
            directions.forEach((direction) => {
                const icon = document.createElement("i");
                icon.className = `ph ${getLaneDirectionIcon(direction)}`;
                icon.setAttribute("aria-hidden", "true");
                directionsContainer.appendChild(icon);
            });
            if (directionsContainer.children.length === 0) {
                const icon = document.createElement("i");
                icon.className = "ph ph-minus";
                directionsContainer.appendChild(icon);
            }
            laneElement.appendChild(directionsContainer);
            if (follow) {
                const recommendedLabel = document.createElement("span");
                recommendedLabel.className = "full-map-lane-recommended";
                recommendedLabel.textContent = "Use";
                laneElement.appendChild(recommendedLabel);
            }
            lanesContainer.appendChild(laneElement);
        });
        if (!recommendedLaneFound) {
            return;
        }
        messageElement.textContent =
            "Use the highlighted lane for the upcoming maneuver.";
        container.hidden = false;
    }

    function buildFullMapManeuverApproachCoordinates(
        route,
        startProgressMeters,
        endProgressMeters,
    ) {
        if (
            !route?.geometry ||
            route.geometry.type !== "LineString" ||
            !Array.isArray(route.geometry.coordinates) ||
            route.geometry.coordinates.length < 2
        ) {
            return [];
        }

        const startProgress = Number(startProgressMeters);
        const endProgress = Number(endProgressMeters);

        if (!Number.isFinite(startProgress) || !Number.isFinite(endProgress)) {
            return [];
        }

        if (endProgress <= startProgress) {
            return [];
        }

        const routePoints = route.geometry.coordinates
            .map((point) => {
                if (!Array.isArray(point) || point.length < 2) {
                    return null;
                }

                const longitude = Number(point[0]);
                const latitude = Number(point[1]);

                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    return null;
                }

                return L.latLng(latitude, longitude);
            })
            .filter(Boolean);

        if (routePoints.length < 2) {
            return [];
        }
        let cumulativeMeters = 0;
        let startPoint = null;
        let endPoint = null;
        let startSegmentIndex = -1;
        let endSegmentIndex = -1;
        for (let index = 0; index < routePoints.length - 1; index++) {
            const segmentStart = routePoints[index];
            const segmentEnd = routePoints[index + 1];
            const segmentLength = segmentStart.distanceTo(segmentEnd);
            if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
                continue;
            }
            const segmentStartProgress = cumulativeMeters;
            const segmentEndProgress = cumulativeMeters + segmentLength;
            if (
                !startPoint &&
                startProgress >= segmentStartProgress &&
                startProgress <= segmentEndProgress
            ) {
                const ratio =
                    (startProgress - segmentStartProgress) / segmentLength;
                startPoint = L.latLng(
                    segmentStart.lat +
                        (segmentEnd.lat - segmentStart.lat) * ratio,
                    segmentStart.lng +
                        (segmentEnd.lng - segmentStart.lng) * ratio,
                );
                startSegmentIndex = index;
            }
            if (
                !endPoint &&
                endProgress >= segmentStartProgress &&
                endProgress <= segmentEndProgress
            ) {
                const ratio =
                    (endProgress - segmentStartProgress) / segmentLength;
                endPoint = L.latLng(
                    segmentStart.lat +
                        (segmentEnd.lat - segmentStart.lat) * ratio,
                    segmentStart.lng +
                        (segmentEnd.lng - segmentStart.lng) * ratio,
                );
                endSegmentIndex = index;
            }
            cumulativeMeters = segmentEndProgress;
        }
        if (!startPoint) {
            startPoint = routePoints[0];
            startSegmentIndex = 0;
        }
        if (!endPoint) {
            endPoint = routePoints[routePoints.length - 1];
            endSegmentIndex = routePoints.length - 2;
        }
        if (!startPoint || !endPoint) {
            return [];
        }
        const coordinates = [[startPoint.lat, startPoint.lng]];
        const firstIndex = Math.max(1, startSegmentIndex + 1);
        const lastIndex = Math.min(routePoints.length - 1, endSegmentIndex + 1);
        for (let index = firstIndex; index <= lastIndex; index++) {
            const point = routePoints[index];
            coordinates.push([point.lat, point.lng]);
        }
        const lastCoordinate = coordinates[coordinates.length - 1];
        if (
            !lastCoordinate ||
            lastCoordinate[0] !== endPoint.lat ||
            lastCoordinate[1] !== endPoint.lng
        ) {
            coordinates.push([endPoint.lat, endPoint.lng]);
        }
        return coordinates;
    }

    function updateFullMapManeuverHighlight(route, navigation) {
        if (!fullRouteMap || !fullRouteManeuverLayer) {
            return;
        }
        fullRouteManeuverLayer.clearLayers();
        if (!route || !navigation?.instruction) {
            return;
        }
        const tripStatus = normalizeTripStatus(
            currentFullMapRecord?.tripStatus ??
                currentFullMapRecord?.trip_status ??
                "",
        );
        if (tripStatus !== "En Route") {
            return;
        }
        const distanceToManeuver = Number(navigation.distanceToManeuverMeters);
        if (Number.isFinite(distanceToManeuver) && distanceToManeuver > 1000) {
            return;
        }
        const progress = calculateRouteProgressMeters(
            route,
            getCurrentFullMapGpsLocation(),
        );
        if (!progress) {
            return;
        }
        const instruction = navigation.instruction;
        const maneuverProgress = Number(instruction?._routeOffsetMeters);
        if (!Number.isFinite(maneuverProgress)) {
            return;
        }
        const approachCoordinates = buildFullMapManeuverApproachCoordinates(
            route,
            Number(progress.progressMeters),
            maneuverProgress,
        );
        if (approachCoordinates.length >= 2) {
            const primaryColor =
                getComputedStyle(document.documentElement)
                    .getPropertyValue("--color-primary")
                    .trim() || "#00a86b";
            /*
             * Wider translucent underlay.
             * Makes the approach section visibly
             * distinct from the normal route.
             */
            L.polyline(approachCoordinates, {
                color: primaryColor,
                weight: 11,
                opacity: 0.16,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
            }).addTo(fullRouteManeuverLayer);
            /*
             * Main highlighted approach line.
             */
            L.polyline(approachCoordinates, {
                color: primaryColor,
                weight: 6,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
            }).addTo(fullRouteManeuverLayer);
        }
        const latitude = Number(
            instruction?._latitude ?? instruction?.point?.latitude,
        );
        const longitude = Number(
            instruction?._longitude ?? instruction?.point?.longitude,
        );
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }
        const maneuverMarker = L.circleMarker([latitude, longitude], {
            radius: 10,
            color:
                getComputedStyle(document.documentElement)
                    .getPropertyValue("--color-primary")
                    .trim() || "#00a86b",
            weight: 3,
            opacity: 1,
            fillColor:
                getComputedStyle(document.documentElement)
                    .getPropertyValue("--color-primary")
                    .trim() || "#00a86b",
            fillOpacity: 0.2,
            interactive: false,
        });
        maneuverMarker
            .bindTooltip("Next maneuver", {
                permanent: false,
                direction: "top",
                offset: [0, -8],
                opacity: 0.95,
            })
            .addTo(fullRouteManeuverLayer);
    }

    function updateFullRouteProgress(route, record) {
        if (!fullRouteMap || !fullRouteProgressLayer || !route) {
            return;
        }
        /*
         * Re-render only the progress overlay.
         * The original shared route remains untouched.
         */
        fullRouteProgressLayer.clearLayers();
        const tripStatus = normalizeTripStatus(
            record?.tripStatus ?? record?.trip_status ?? "",
        );
        /*
         * Live travelled path is meaningful
         * while the trip is active or has already
         * reached/completed its destination.
         */
        if (!["En Route", "Arrived", "Completed"].includes(tripStatus)) {
            return;
        }
        const location = getCurrentFullMapGpsLocation();
        if (!location) {
            return;
        }
        const traveledCoordinates = buildTraveledRouteCoordinates(
            route,
            location,
        );
        if (traveledCoordinates.length < 2) {
            return;
        }
        const primaryColor =
            getComputedStyle(document.documentElement)
                .getPropertyValue("--color-primary")
                .trim() || "#00a86b";
        L.polyline(traveledCoordinates, {
            color: primaryColor,
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
        }).addTo(fullRouteProgressLayer);
    }

    function calculateRouteProgressMeters(route, location) {
        if (
            !route?.geometry ||
            route.geometry.type !== "LineString" ||
            !Array.isArray(route.geometry.coordinates) ||
            route.geometry.coordinates.length < 2 ||
            !location
        ) {
            return null;
        }
        const routePoints = route.geometry.coordinates
            .map((point) => {
                if (!Array.isArray(point) || point.length < 2) {
                    return null;
                }
                const longitude = Number(point[0]);
                const latitude = Number(point[1]);
                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {
                    return null;
                }
                return L.latLng(latitude, longitude);
            })
            .filter(Boolean);
        if (routePoints.length < 2) {
            return null;
        }
        const currentPoint = L.latLng(
            Number(location.latitude),
            Number(location.longitude),
        );
        let nearestSegmentIndex = 0;
        let nearestDistance = Infinity;
        let nearestPoint = routePoints[0];
        let progressBeforeSegment = 0;
        let cumulativeMeters = 0;
        for (
            let index = 0;
            index < routePoints.length - 1;
            index++
        ) {
            const start = routePoints[index];
            const end = routePoints[index + 1];
            const segmentLength = start.distanceTo(end);
            if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
                continue;
            }
            /*
            |--------------------------------------------------------------------------
            | Approximate projection onto the route segment
            |--------------------------------------------------------------------------
            |
            | Leaflet gives us geographic distance, while this lightweight
            | projection estimates where the vehicle sits along the segment.
            |
            |--------------------------------------------------------------------------
            */
            const lat1 = start.lat;
            const lng1 = start.lng;
            const lat2 = end.lat;
            const lng2 = end.lng;
            const latScale = 111320;
            const lngScale =
                111320 *
                Math.cos(
                    ((lat1 + lat2) / 2) *
                        Math.PI /
                        180
                );
            const x1 = 0;
            const y1 = 0;
            const x2 = (lng2 - lng1) * lngScale;
            const y2 = (lat2 - lat1) * latScale;
            const px =
                (currentPoint.lng - lng1) *
                lngScale;
            const py =
                (currentPoint.lat - lat1) *
                latScale;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const denominator =
                dx * dx +
                dy * dy;
            let ratio = 0;
            if (denominator > 0) {
                ratio =
                    (px * dx + py * dy) /
                    denominator;
            }
            ratio = Math.max(
                0,
                Math.min(1, ratio)
            );
            const projectedLat =
                lat1 +
                (lat2 - lat1) * ratio;
            const projectedLng =
                lng1 +
                (lng2 - lng1) * ratio;
            const projectedPoint =
                L.latLng(
                    projectedLat,
                    projectedLng,
                );
            const distanceToProjection =
                currentPoint.distanceTo(
                    projectedPoint
                );
            if (
                distanceToProjection <
                nearestDistance
            ) {
                nearestDistance =
                    distanceToProjection;
                nearestSegmentIndex = index;
                nearestPoint =
                    projectedPoint;
                progressBeforeSegment =
                    cumulativeMeters;
            }
            cumulativeMeters +=
                segmentLength;
        }
        if (
            !Number.isFinite(nearestDistance)
        ) {
            return null;
        }
        const segmentStart =
            routePoints[
                nearestSegmentIndex
            ];
        const segmentEnd =
            routePoints[
                nearestSegmentIndex + 1
            ];
        if (!segmentStart || !segmentEnd) {
            return null;
        }
        const segmentLength =
            segmentStart.distanceTo(
                segmentEnd
            );
        const traveledOnSegment =
            segmentStart.distanceTo(
                nearestPoint
            );
        const progressMeters =
            progressBeforeSegment +
            Math.min(
                segmentLength,
                Math.max(
                    0,
                    traveledOnSegment
                )
            );
        return {
            progressMeters,
            distanceFromRouteMeters: nearestDistance,
            nearestSegmentIndex,
            nearestPoint: {
                latitude: nearestPoint.lat,
                longitude: nearestPoint.lng,
            },
        };
    }

    function getSnappedFullRouteVehiclePosition(route, location) {
        if (!route || !location) {
            return null;
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (!progress || !progress.nearestPoint) {
            return null;
        }
        const distanceFromRouteMeters = Number(
            progress.distanceFromRouteMeters,
        );
        if (
            !Number.isFinite(distanceFromRouteMeters) ||
            distanceFromRouteMeters > 30
        ) {
            return null;
        }
        return {
            latitude: Number(progress.nearestPoint.latitude),
            longitude: Number(progress.nearestPoint.longitude),
            distanceFromRouteMeters,
            progressMeters: Number(progress.progressMeters || 0),
        };
    }

    function buildTraveledRouteCoordinates(route, location) {
        if (
            !route?.geometry ||
            route.geometry.type !== "LineString" ||
            !Array.isArray(route.geometry.coordinates) ||
            route.geometry.coordinates.length < 2 ||
            !location
        ) {
            return [];
        }
        const routePoints = route.geometry.coordinates
            .map((point) => {
                if (!Array.isArray(point) || point.length < 2) {
                    return null;
                }
                const longitude = Number(point[0]);
                const latitude = Number(point[1]);
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    return null;
                }
                return L.latLng(latitude, longitude);
            })
            .filter(Boolean);
        if (routePoints.length < 2) {
            return [];
        }
        const progress = calculateRouteProgressMeters(route, location);
        if (
            !progress ||
            !Number.isInteger(progress.nearestSegmentIndex) ||
            !progress.nearestPoint
        ) {
            return [];
        }
        const coordinates = [];
        /*
         * Include all route points before
         * the vehicle's current route segment.
         */
        for (let index = 0; index <= progress.nearestSegmentIndex; index++) {
            coordinates.push([routePoints[index].lat, routePoints[index].lng]);
        }
        /*
         * Add the projected current position.
         */
        coordinates.push([
            Number(progress.nearestPoint.latitude),
            Number(progress.nearestPoint.longitude),
        ]);
        return coordinates;
    }

    function findNextNavigationInstruction(
        route,
        location,
    ) {
        const instructions =
            getRouteInstructions(route);

        if (
            instructions.length === 0 ||
            !location
        ) {
            return null;
        }
        const progress =
            calculateRouteProgressMeters(
                route,
                location,
            );
        if (!progress) {
            return null;
        }
        /*
        |--------------------------------------------------------------------------
        | Ignore instructions that have already been passed.
        |--------------------------------------------------------------------------
        */
        const passedToleranceMeters = 15;
        const nextIndex =
            instructions.findIndex(
                (instruction) =>
                    instruction._routeOffsetMeters >
                    progress.progressMeters +
                        passedToleranceMeters
            );
        /*
        |--------------------------------------------------------------------------
        | No upcoming instruction means destination is near/reached.
        |--------------------------------------------------------------------------
        */
        if (nextIndex === -1) {
            const last =
                instructions[
                    instructions.length - 1
                ];
            return {
                instruction: last,
                index: instructions.length - 1,
                distanceToManeuverMeters: 0,
                progressMeters:
                    progress.progressMeters,
            };
        }
        const instruction =
            instructions[nextIndex];
        /*
        |--------------------------------------------------------------------------
        | TomTom's routeOffsetInMeters is the distance
        | from route start to the maneuver.
        |--------------------------------------------------------------------------
        */
        const distanceToManeuverMeters =
            Math.max(
                0,
                instruction._routeOffsetMeters -
                    progress.progressMeters
            );
        return {
            instruction,
            index: nextIndex,
            distanceToManeuverMeters,
            progressMeters:
                progress.progressMeters,
        };
    }

    function formatNavigationDistance(
        meters
    ) {
        const value = Number(meters);
        if (!Number.isFinite(value)) {
            return "—";
        }
        if (value < 1000) {
            return `${Math.max(
                0,
                Math.round(value)
            )} m`;
        }
        return `${(
            value / 1000
        ).toFixed(1)} km`;
    }

    function getNavigationManeuverLabel(instruction) {
        if (!instruction) {
            return "Continue";
        }
        const message = String(instruction._message || "").trim();
        const maneuver = String(instruction._maneuver || "")
            .trim()
            .replace(/_/g, " ");
        const junctionType = String(instruction._junctionType || "")
            .trim()
            .toLowerCase();
        const exitNumber = Number(instruction._roundaboutExitNumber);
        if (
            junctionType.includes("roundabout") ||
            junctionType.includes("rotary") ||
            message.toLowerCase().includes("roundabout")
        ) {
            if (Number.isFinite(exitNumber)) {
                return `Take roundabout exit ${Math.max(
                    1,
                    Math.round(exitNumber),
                )}`;
            }
            return "Enter roundabout";
        }
        if (message) {
            return message;
        }
        if (maneuver) {
            return maneuver
                .toLowerCase()
                .replace(/\b\w/g, (letter) => letter.toUpperCase());
        }
        return "Continue";
    }

    function getNavigationManeuverIcon(instruction) {
        if (!instruction) {
            return "ph-arrow-up-right";
        }
        const maneuver = String(
            instruction._maneuver || instruction.maneuver || "",
        )
            .toLowerCase()
            .replace(/[_-]/g, " ");
        const message = String(
            instruction._message ||
                instruction.message ||
                instruction.combined_message ||
                "",
        ).toLowerCase();
        const value = `${maneuver} ${message}`;
        if (
            value.includes("u turn") ||
            value.includes("uturn") ||
            value.includes("make a u")
        ) {
            return "ph-arrow-u-up-right";
        }
        if (value.includes("roundabout") || value.includes("rotary")) {
            return "ph-arrows-clockwise";
        }
        if (
            value.includes("turn left") ||
            value.includes("left turn") ||
            value.includes("bear left")
        ) {
            return "ph-arrow-turn-left";
        }
        if (
            value.includes("turn right") ||
            value.includes("right turn") ||
            value.includes("bear right")
        ) {
            return "ph-arrow-turn-right";
        }
        if (value.includes("keep left") || value.includes("slight left")) {
            return "ph-arrow-up-left";
        }
        if (value.includes("keep right") || value.includes("slight right")) {
            return "ph-arrow-up-right";
        }
        if (
            value.includes("destination") ||
            value.includes("arrive") ||
            value.includes("arrived")
        ) {
            return "ph-flag-checkered";
        }
        if (
            value.includes("straight") ||
            value.includes("continue") ||
            value.includes("proceed")
        ) {
            return "ph-arrow-up";
        }
        return "ph-arrow-up-right";
    }

    function getNavigationInstructionContext(instruction) {
        if (!instruction) {
            return "";
        }
        const street = String(instruction?._street || "").trim();
        const roadNumbers = Array.isArray(instruction?._roadNumbers)
            ? instruction._roadNumbers.filter(Boolean)
            : [];
        const signpostText = String(instruction?._signpostText || "").trim();
        const junctionType = String(instruction?._junctionType || "")
            .trim()
            .toLowerCase();
        const exitNumber = Number(instruction?._roundaboutExitNumber);
        const parts = [];
        /*
         * Roundabout context gets priority.
         */
        if (
            Number.isFinite(exitNumber) &&
            (junctionType.includes("roundabout") ||
                junctionType.includes("rotary"))
        ) {
            parts.push(`Exit ${Math.max(1, Math.round(exitNumber))}`);
        }
        /*
         * Street name.
         */
        if (street) {
            parts.push(street);
        }
        /*
         * Road number / route designation.
         */
        if (roadNumbers.length > 0) {
            const uniqueRoadNumbers = [...new Set(roadNumbers)];
            parts.push(uniqueRoadNumbers.join(" / "));
        }
        /*
         * Signpost destination or road destination.
         */
        if (
            signpostText &&
            signpostText.toLowerCase() !== street.toLowerCase()
        ) {
            parts.push(signpostText);
        }
        const uniqueParts = [];
        for (const part of parts) {
            const normalizedPart = part
                .toLowerCase()
                .replace(/\s+/g, " ")
                .trim();
            if (
                !normalizedPart ||
                uniqueParts.some(
                    (existing) =>
                        existing.toLowerCase().replace(/\s+/g, " ").trim() ===
                        normalizedPart,
                )
            ) {
                continue;
            }
            uniqueParts.push(part);
        }
        return uniqueParts.join(" • ");
    }

    function getNavigationManeuverDistanceState(distanceMeters) {
        const distance = Number(distanceMeters);
        if (!Number.isFinite(distance)) {
            return "unknown";
        }
        if (distance <= 50) {
            return "imminent";
        }
        if (distance <= 100) {
            return "prepare";
        }
        if (distance <= 200) {
            return "close";
        }
        if (distance <= 500) {
            return "approaching";
        }
        return "far";
    }

    function updateNavigationInstructionUI(navigation) {
        const instruction = navigation?.instruction || null;
        const distanceMeters = navigation?.distanceToManeuverMeters;
        const nextInstructionElement = getElement("fullMapNextInstruction");
        const nextDistanceElement = getElement(
            "fullMapNextInstructionDistance",
        );
        const nextStreetElement = getElement("fullMapNextInstructionStreet");
        const nextInstructionIcon = getElement("fullMapNextInstructionIcon");
        const navigationCard = getElement("fullMapNavigationCard");
        if (navigationCard) {
            navigationCard.classList.remove(
                "is-far",
                "is-approaching",
                "is-close",
                "is-prepare",
                "is-imminent",
            );
        }
        if (!instruction) {
            if (nextInstructionElement) {
                nextInstructionElement.textContent = "Continue on route";
            }
            if (nextDistanceElement) {
                nextDistanceElement.textContent = "—";
            }
            if (nextStreetElement) {
                nextStreetElement.textContent = "";
            }
            if (nextInstructionIcon) {
                nextInstructionIcon.className = "ph ph-arrow-up-right";
            }
            return;
        }
        const maneuverLabel = getNavigationManeuverLabel(instruction);
        const maneuverIcon = getNavigationManeuverIcon(instruction);
        const distanceState =
            getNavigationManeuverDistanceState(distanceMeters);
        if (nextInstructionElement) {
            nextInstructionElement.textContent = maneuverLabel;
        }
        if (nextDistanceElement) {
            const formattedDistance = formatNavigationDistance(distanceMeters);
            if (distanceState === "imminent") {
                nextDistanceElement.textContent = `${formattedDistance} • NOW`;
            } else if (distanceState === "prepare") {
                nextDistanceElement.textContent = `${formattedDistance} • Prepare`;
            } else if (distanceState === "close") {
                nextDistanceElement.textContent = `${formattedDistance} • Near`;
            } else if (distanceState === "approaching") {
                nextDistanceElement.textContent = `${formattedDistance} • Approaching`;
            } else {
                nextDistanceElement.textContent = formattedDistance;
            }
        }
        if (nextStreetElement) {
            nextStreetElement.textContent =
                getNavigationInstructionContext(instruction);
        }
        if (nextInstructionIcon) {
            nextInstructionIcon.className = `ph ${maneuverIcon}`;
        }
        if (navigationCard) {
            navigationCard.classList.add(`is-${distanceState}`);
        }
    }

    function updateCurrentNavigationInstruction(
        route
    ) {
        const location =
            getCurrentFullMapGpsLocation();

        if (!route || !location) {
            const laneGuidance = getElement("fullMapLaneGuidance");
            if (laneGuidance) {
                laneGuidance.hidden = true;
            }
            currentNavigationInstruction = null;
            currentNavigationInstructionIndex = -1;
            updateNavigationInstructionUI(null);
            updateFullMapManeuverHighlight(route, null);
            return null;
        }
        const navigation =
            findNextNavigationInstruction(
                route,
                location,
            );
        if (!navigation) {
            const laneGuidance = getElement("fullMapLaneGuidance");
            if (laneGuidance) {
                laneGuidance.hidden = true;
            }
            currentNavigationInstruction = null;
            currentNavigationInstructionIndex = -1;
            updateNavigationInstructionUI(null);
            updateFullMapManeuverHighlight(route, null);
            return null;
        }
        currentNavigationInstruction = navigation.instruction;
        currentNavigationInstructionIndex = navigation.index;
        updateNavigationInstructionUI(navigation);
        updateFullMapManeuverHighlight(route, navigation);
        updateFullMapLaneGuidance(route);
        return navigation;
    }

    function updateStatusAwareNavigationUI(record, route) {
        const tripStatus = normalizeTripStatus(
            record?.tripStatus ?? record?.trip_status ?? "—",
        );
        const navigationModeLabel = getElement("fullMapNavigationModeLabel");
        const nextInstructionElement = getElement("fullMapNextInstruction");
        const nextDistanceElement = getElement(
            "fullMapNextInstructionDistance",
        );
        const nextStreetElement = getElement("fullMapNextInstructionStreet");
        const nextInstructionIcon = getElement("fullMapNextInstructionIcon");
        const destination =
            record?.destination || route?.destination || "Destination";
        /*
         * ------------------------------------------
         * ASSIGNED
         * ------------------------------------------
         */
        if (tripStatus === "Assigned") {
            if (navigationModeLabel) {
                navigationModeLabel.textContent = "Navigation Ready";
            }
            if (nextInstructionElement) {
                nextInstructionElement.textContent = "Ready to start trip";
            }
            if (nextDistanceElement) {
                nextDistanceElement.textContent = "—";
            }
            if (nextStreetElement) {
                nextStreetElement.textContent =
                    "Start the trip to begin live navigation";
            }
            if (nextInstructionIcon) {
                nextInstructionIcon.className = "ph ph-navigation-arrow";
            }
            return;
        }
        /*
         * ------------------------------------------
         * EN ROUTE
         * ------------------------------------------
         */
        if (tripStatus === "En Route") {
            if (navigationModeLabel) {
                navigationModeLabel.textContent = "Driver Navigation";
            }
            const arrival = checkDestinationArrival(route);
            if (arrival?.arrived) {
                updateFullMapManeuverHighlight(route, null);
                const laneGuidance = getElement("fullMapLaneGuidance");
                if (laneGuidance) {
                    laneGuidance.hidden = true;
                }
                return;
            }
            updateCurrentNavigationInstruction(route);
            return;
        }
        /*
         * ------------------------------------------
         * ARRIVED
         * ------------------------------------------
         */
        if (tripStatus === "Arrived") {
            if (navigationModeLabel) {
                navigationModeLabel.textContent = "Destination reached";
            }
            if (nextInstructionElement) {
                nextInstructionElement.textContent = "Arrived at destination";
            }
            if (nextDistanceElement) {
                nextDistanceElement.textContent = "—";
            }
            if (nextStreetElement) {
                nextStreetElement.textContent = destination;
            }
            if (nextInstructionIcon) {
                nextInstructionIcon.className = "ph ph-flag-checkered";
            }
            return;
        }
        /*
         * ------------------------------------------
         * COMPLETED
         * ------------------------------------------
         */
        if (tripStatus === "Completed") {
            if (navigationModeLabel) {
                navigationModeLabel.textContent = "Trip completed";
            }
            if (nextInstructionElement) {
                nextInstructionElement.textContent = "Trip completed";
            }
            if (nextDistanceElement) {
                nextDistanceElement.textContent = "—";
            }
            if (nextStreetElement) {
                nextStreetElement.textContent = destination;
            }
            if (nextInstructionIcon) {
                nextInstructionIcon.className = "ph ph-check-circle";
            }
            return;
        }
        /*
         * ------------------------------------------
         * FALLBACK
         * ------------------------------------------
         */
        if (navigationModeLabel) {
            navigationModeLabel.textContent = isDriver()
                ? "Driver Navigation"
                : "Live Route View";
        }
        if (nextInstructionElement) {
            nextInstructionElement.textContent = "Navigation unavailable";
        }
        if (nextDistanceElement) {
            nextDistanceElement.textContent = "—";
        }
        if (nextStreetElement) {
            nextStreetElement.textContent = "";
        }
        if (nextInstructionIcon) {
            nextInstructionIcon.className = "ph ph-navigation";
        }
    }

    /* =====================================================
       FULL MAP INFORMATION
    ===================================================== */
    function updateFullMapInfo(record, route) {
        const distanceElement = getElement("fullMapDistanceLabel");
        const etaElement = getElement("fullMapEtaLabel");
        const statusElement = getElement("fullMapStatusLabel");
        const tripStatus = normalizeTripStatus(
            record?.tripStatus ?? record?.trip_status ?? "—",
        );
        /*
         * ------------------------------------------
         * LIVE NAVIGATION PROGRESS
         *
         * Only active during En Route.
         * ------------------------------------------
         */
        if (tripStatus === "En Route") {
            const navigationProgress = updateNavigationProgress(route);

            if (
                navigationProgress &&
                Number.isFinite(Number(navigationProgress.remainingDistanceKm))
            ) {
                if (distanceElement) {
                    distanceElement.textContent = `${Number(
                        navigationProgress.remainingDistanceKm,
                    ).toFixed(1)} km remaining`;
                }

                if (
                    etaElement &&
                    Number.isFinite(Number(navigationProgress.remainingMinutes))
                ) {
                    etaElement.textContent = `${Math.max(
                        0,
                        Math.round(navigationProgress.remainingMinutes),
                    )} min remaining`;
                }
            } else {
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
            }
        } else if (tripStatus === "Arrived" || tripStatus === "Completed") {
            /*
             * Once the trip has reached its destination,
             * navigation progress is no longer active.
             */
            if (distanceElement) {
                distanceElement.textContent = "0.0 km";
            }
            if (etaElement) {
                etaElement.textContent = "0 min";
            }
        } else {
            /*
             * Assigned / other non-active states:
             * show the planned route values.
             */
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
        }
        /*
         * ------------------------------------------
         * STATUS-AWARE NAVIGATION UI
         * ------------------------------------------
         */
        updateStatusAwareNavigationUI(record, route);
        updateFullRouteProgress(route, record);
        updateFullMapGpsIndicator();
        updateFullMapGpsAccuracyCircle();
        /*
         * ------------------------------------------
         * STATUS LABEL
         * ------------------------------------------
         */
        if (statusElement) {
            statusElement.textContent = tripStatus;
        }
        /*
         * ------------------------------------------
         * OVERLAY STATUS
         * ------------------------------------------
         */
        const overlay = getElement("fullRouteMapOverlay");
        if (overlay) {
            overlay.dataset.tripStatus = tripStatus;
        }
    }

    function updateDriverControls(record) {
        const controls = getElement("fullRouteDriverControls");
        const statusButton = getElement("fullRouteStatusBtn");
        const statusButtonText = getElement("fullRouteStatusBtnText");
        const returnButton = getElement("returnToHospitalBtn");
        if (!controls) {
            return;
        }
        /*
         * Driver-only controls.
         * Non-driver roles never see this section.
         */
        if (!isDriver()) {
            controls.setAttribute("hidden", "");

            if (statusButton) {
                statusButton.disabled = true;
            }
            if (returnButton) {
                returnButton.disabled = true;
            }
            return;
        }
        const currentStatus = normalizeTripStatus(
            record?.tripStatus ?? record?.trip_status ?? "",
        );
        const nextStatus = DISPATCH_STATUS_FLOW[currentStatus] ?? null;
        /*
         * ------------------------------------------
         * COMPLETED
         * ------------------------------------------
         *
         * No more status transition is available.
         */
        if (currentStatus === "Completed") {
            controls.removeAttribute("hidden");
            if (statusButton) {
                statusButton.disabled = true;
                statusButton.dataset.status = "";
                statusButton.classList.remove("is-loading");
            }
            if (statusButtonText) {
                statusButtonText.textContent = "Trip Completed";
            }
            /*
             * Keep Return to Hospital available
             * for the driver after completing the trip.
             */
            if (returnButton) {
                returnButton.disabled = false;
            }

            return;
        }
        /*
         * ------------------------------------------
         * VALID DRIVER STATUS
         * ------------------------------------------
         */
        if (["Assigned", "En Route", "Arrived"].includes(currentStatus)) {
            controls.removeAttribute("hidden");
            if (statusButton) {
                statusButton.disabled = !nextStatus;

                statusButton.dataset.status = nextStatus || "";
            }
            if (statusButtonText) {
                if (currentStatus === "Assigned") {
                    statusButtonText.textContent = "Start Trip";
                } else if (currentStatus === "En Route") {
                    statusButtonText.textContent = "Mark Arrived";
                } else if (currentStatus === "Arrived") {
                    statusButtonText.textContent = "Complete Trip";
                } else {
                    statusButtonText.textContent = "Update Status";
                }
            }
            if (returnButton) {
                returnButton.disabled = false;
            }
            return;
        }
        /*
         * ------------------------------------------
         * UNKNOWN / UNSUPPORTED STATUS
         * ------------------------------------------
         */
        controls.setAttribute("hidden", "");
        if (statusButton) {
            statusButton.disabled = true;
        }
        if (returnButton) {
            returnButton.disabled = true;
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
            if (nextStatus !== "En Route") {
                currentNavigationInstruction = null;
                currentNavigationInstructionIndex = -1;
            }

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

    function getFullRouteVehiclePosition(trackedVehicle) {
        const location = trackedVehicle?.location;
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        return {
            latitude,
            longitude,
        };
    }

    function calculateFullRouteBearing(start, end) {
        if (!start || !end) {
            return null;
        }
        const lat1 = (Number(start.latitude) * Math.PI) / 180;
        const lat2 = (Number(end.latitude) * Math.PI) / 180;
        const deltaLongitude =
            ((Number(end.longitude) - Number(start.longitude)) * Math.PI) / 180;
        if (
            !Number.isFinite(lat1) ||
            !Number.isFinite(lat2) ||
            !Number.isFinite(deltaLongitude)
        ) {
            return null;
        }
        const y = Math.sin(deltaLongitude) * Math.cos(lat2);
        const x =
            Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);
        const bearing = (Math.atan2(y, x) * 180) / Math.PI;
        return (bearing + 360) % 360;
    }

    function applyFullRouteVehicleHeading(marker, heading) {
        const numericHeading = Number(heading);
        if (!marker || !Number.isFinite(numericHeading)) {
            return;
        }
        const markerElement = marker.getElement?.();
        if (!markerElement) {
            return;
        }
        /*
         * Rotate an inner element rather than
         * the Leaflet marker itself.
         *
         * This prevents Leaflet's own map-position
         * transform from being overwritten.
         */
        const rotationTarget =
            markerElement.querySelector(
                "[data-vehicle-marker], " +
                    ".route-vehicle-marker, " +
                    ".vehicle-marker, " +
                    ".route-map-marker, " +
                    "i",
            ) ||
            markerElement.firstElementChild ||
            markerElement;
        const normalizedHeading = (numericHeading + 360) % 360;
        rotationTarget.style.transformOrigin = "center center";
        rotationTarget.style.transition = "transform 250ms linear";
        rotationTarget.style.transform = `rotate(${normalizedHeading}deg)`;
    }

    function stopFullRouteVehicleAnimation() {
        if (fullRouteVehicleAnimationFrame !== null) {
            cancelAnimationFrame(fullRouteVehicleAnimationFrame);

            fullRouteVehicleAnimationFrame = null;
        }
    }

    function animateFullRouteVehicle(
        marker,
        start,
        end,
        heading,
        duration = 700,
    ) {
        if (!marker || !start || !end) {
            return;
        }
        stopFullRouteVehicleAnimation();
        const startedAt = performance.now();
        const startLatitude = Number(start.latitude);
        const startLongitude = Number(start.longitude);
        const endLatitude = Number(end.latitude);
        const endLongitude = Number(end.longitude);
        const animate = (timestamp) => {
            const elapsed = timestamp - startedAt;
            const progress = Math.min(1, elapsed / duration);
            /*
             * Ease-out movement so the marker
             * slows slightly as it reaches GPS target.
             */
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const latitude =
                startLatitude + (endLatitude - startLatitude) * easedProgress;
            const longitude =
                startLongitude +
                (endLongitude - startLongitude) * easedProgress;
            marker.setLatLng([latitude, longitude]);
            applyFullRouteVehicleHeading(marker, heading);
            if (progress < 1) {
                fullRouteVehicleAnimationFrame = requestAnimationFrame(animate);
                return;
            }
            fullRouteVehicleAnimationFrame = null;
            marker.setLatLng([endLatitude, endLongitude]);
            applyFullRouteVehicleHeading(marker, heading);
            lastFullRouteVehiclePosition = {
                latitude: endLatitude,
                longitude: endLongitude,
            };
        };
        /*
         * Start from the previous position.
         */
        marker.setLatLng([startLatitude, startLongitude]);
        applyFullRouteVehicleHeading(marker, heading);
        fullRouteVehicleAnimationFrame = requestAnimationFrame(animate);
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
        const targetPosition = getFullRouteVehiclePosition(trackedVehicle);

        /*
         * Let the shared renderer handle
         * invalid/stale vehicle data.
         */
        if (!targetPosition) {
            stopFullRouteVehicleAnimation();

            fullRouteVehicleMarker = window.renderRouteVehicleMarker(
                fullRouteVehicleMarkerLayer,
                fullRouteVehicleMarker,
                trackedVehicle,
            );

            lastFullRouteVehiclePosition = null;

            return;
        }
        const location = trackedVehicle?.location || {};
        let heading = Number(location.heading);
        /*
         * If GPS heading is unavailable,
         * derive direction from movement.
         */
        if (!Number.isFinite(heading) && lastFullRouteVehiclePosition) {
            const movementBearing = calculateFullRouteBearing(
                lastFullRouteVehiclePosition,
                targetPosition,
            );
            if (Number.isFinite(movementBearing)) {
                heading = movementBearing;
            }
        }
        /*
         * Keep previous heading when the
         * vehicle has not moved enough to
         * calculate a useful movement bearing.
         */
        if (!Number.isFinite(heading)) {
            heading = lastFullRouteVehicleHeading;
        }
        if (Number.isFinite(heading)) {
            lastFullRouteVehicleHeading = heading;
        }
        /*
         * Save the previous marker position
         * before the shared renderer updates it.
         */
        let startPosition = null;
        if (fullRouteVehicleMarker?.getLatLng) {
            const current = fullRouteVehicleMarker.getLatLng();
            if (
                current &&
                Number.isFinite(current.lat) &&
                Number.isFinite(current.lng)
            ) {
                startPosition = {
                    latitude: current.lat,
                    longitude: current.lng,
                };
            }
        }
        if (!startPosition && lastFullRouteVehiclePosition) {
            startPosition = lastFullRouteVehiclePosition;
        }
        /*
         * Shared renderer preserves the
         * existing marker/popup/icon behavior.
         */
        fullRouteVehicleMarker = window.renderRouteVehicleMarker(
            fullRouteVehicleMarkerLayer,
            fullRouteVehicleMarker,
            trackedVehicle,
        );
        if (!fullRouteVehicleMarker) {
            stopFullRouteVehicleAnimation();
            lastFullRouteVehiclePosition = null;
            return;
        }
        /*
         * First GPS position:
         * place immediately.
         */
        if (!startPosition) {
            fullRouteVehicleMarker.setLatLng([
                targetPosition.latitude,
                targetPosition.longitude,
            ]);
            applyFullRouteVehicleHeading(fullRouteVehicleMarker, heading);
            lastFullRouteVehiclePosition = targetPosition;
            return;
        }
        const startLatLng = L.latLng(
            startPosition.latitude,
            startPosition.longitude,
        );
        const targetLatLng = L.latLng(
            targetPosition.latitude,
            targetPosition.longitude,
        );
        const movementDistance = startLatLng.distanceTo(targetLatLng);
        /*
         * Ignore extremely tiny movements
         * caused by GPS jitter.
         */
        if (!Number.isFinite(movementDistance) || movementDistance < 0.5) {
            fullRouteVehicleMarker.setLatLng([
                targetPosition.latitude,
                targetPosition.longitude,
            ]);
            applyFullRouteVehicleHeading(fullRouteVehicleMarker, heading);
            lastFullRouteVehiclePosition = targetPosition;
            return;
        }
        /*
         * Animate live vehicle movement.
         */
        animateFullRouteVehicle(
            fullRouteVehicleMarker,
            startPosition,
            targetPosition,
            heading,
            700,
        );
        lastFullRouteVehiclePosition = targetPosition;
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

            let displayLatitude = latitude;
            let displayLongitude = longitude;

            const rawLocation = {
                latitude,
                longitude,
            };
            const snappedPosition = getSnappedFullRouteVehiclePosition(
                currentFullMapRoute,
                rawLocation,
            );
            if (snappedPosition) {
                displayLatitude = snappedPosition.latitude;
                displayLongitude = snappedPosition.longitude;
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
                    age_seconds:
                        location.age_seconds ?? location.ageSeconds ?? 0,
                    recorded_at:
                        location.recorded_at ??
                        location.recordedAt ??
                        new Date().toISOString(),
                },
            };

            currentFullMapLiveVehicle = trackedVehicle;
            updateFullRouteMapVehicleLocation(trackedVehicle);
            const currentTripStatus = normalizeTripStatus(
                currentFullMapRecord?.tripStatus ??
                    currentFullMapRecord?.trip_status ??
                    "",
            );
            if (
                isDriver() &&
                currentTripStatus === "En Route" &&
                isNavigationFollowing
            ) {
                centerFullMapOnNavigationLocation(
                    {
                        latitude,
                        longitude,
                    },
                    NAVIGATION_DEFAULT_ZOOM,
                    location.speed ?? null,
                );
            }
            updateFullMapInfo(currentFullMapRecord, currentFullMapRoute);
            if (isDriver() && currentFullMapRoute) {
                checkNavigationOffRoute(currentFullMapRoute);
            }
        });
        if (!document.documentElement.dataset.fullMapGpsIndicatorTimer) {
            document.documentElement.dataset.fullMapGpsIndicatorTimer = "true";

            window.setInterval(() => {
                if (!currentFullMapRecord) {
                    return;
                }

                updateFullMapGpsIndicator();
            }, 5000);
        }
    }

    /* =====================================================
       RETURN TO HOSPITAL
    ===================================================== */

    async function calculateReturnToHospitalRoute() {
        if (!currentFullMapRecord) {
            throw new Error("No active route is loaded.");
        }

        const location = getCurrentFullMapGpsLocation();
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

        isNavigationFollowing = true;
        lastNavigationLocation = null;

        currentNavigationInstruction = null;
        currentNavigationInstructionIndex = -1;

        destinationArrivalNotified = false;
        isNearDestination = false;

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
                ? "Driver Navigation"
                : "Live Route View";
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
            const gpsLocation = getCurrentFullMapGpsLocation();
            if (isDriver() && gpsLocation) {
                const gpsSpeed =
                    currentFullMapLiveVehicle?.location?.speed ?? null;
                centerFullMapOnNavigationLocation(
                    gpsLocation,
                    NAVIGATION_DEFAULT_ZOOM,
                    gpsSpeed,
                );
            }
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
        routeDriverStatusConfirmModal.removeAttribute("hidden");
        routeDriverStatusConfirmModal.setAttribute("aria-hidden", "false");
        routeDriverStatusConfirmModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeRouteDriverStatusConfirmModal() {
        if (!routeDriverStatusConfirmModal) {
            return;
        }
        routeDriverStatusConfirmModal.classList.remove("show");
        routeDriverStatusConfirmModal.setAttribute("hidden", "");
        routeDriverStatusConfirmModal.setAttribute("aria-hidden", "true");
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
        currentFullMapLiveVehicle = null;

        currentNavigationInstruction = null;
        currentNavigationInstructionIndex = -1;
        lastNavigationLocation = null;

        lastNavigationCameraUpdate = 0;

        stopFullRouteVehicleAnimation();

        lastFullRouteVehiclePosition = null;
        lastFullRouteVehicleHeading = null;

        destinationArrivalNotified = false;
        isNearDestination = false;

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
        const recenterButton = getElement("fullMapRecenterBtn");
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
        if (recenterButton) {
            recenterButton.addEventListener("click", () => {
                const location = getCurrentFullMapGpsLocation();
                if (!location) {
                    showFullMapToast(
                        "Vehicle GPS location is not available yet.",
                        "warning",
                    );

                    return;
                }
                isNavigationFollowing = true;
                centerFullMapOnNavigationLocation(
                    location,
                    16,
                    currentFullMapLiveVehicle?.location?.speed ?? null,
                    false,
                );
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
            /*
             * Move the confirmation modal directly under <body>.
             * This keeps it above the Full Map overlay and prevents
             * page/layout stacking-context conflicts.
             */
            if (routeDriverStatusConfirmModal.parentElement !== document.body) {
                document.body.appendChild(routeDriverStatusConfirmModal);
            }
            /*
             * Modal starts hidden.
             */
            routeDriverStatusConfirmModal.setAttribute("hidden", "");
            routeDriverStatusConfirmModal.setAttribute("aria-hidden", "true");
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