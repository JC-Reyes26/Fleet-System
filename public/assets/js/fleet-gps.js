(function () {
    "use strict";

    const FleetGPS = {
        watchId: null,
        syncInterval: null,
        permissionWatcher: null,

        started: false,
        active: false,
        sending: false,

        status: "idle",

        vehicleId: null,
        dispatchId: null,
        dispatchStatus: null,

        currentLocation: null,

        options: {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
        },

        syncIntervalMs: 10000,
    };

    function isDriver() {
        return (
            String(window.FLEET_RBAC?.role || "")
                .trim()
                .toLowerCase() === "driver"
        );
    }

    function getCsrfToken() {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    }

    function setStatus(status, extra = {}) {
        FleetGPS.status = status;

        window.dispatchEvent(
            new CustomEvent("fleet:gps-status", {
                detail: {
                    status,
                    ...extra,
                },
            }),
        );
    }

    function broadcastLocation(location) {
        window.dispatchEvent(
            new CustomEvent("fleet:gps-location-updated", {
                detail: {
                    vehicleId: FleetGPS.vehicleId,
                    dispatchId: FleetGPS.dispatchId,
                    dispatchStatus: FleetGPS.dispatchStatus,
                    location,
                },
            }),
        );
    }

    function normalizeLocation(position) {
        const coords = position?.coords;

        if (!coords) {
            return null;
        }

        const latitude = Number(coords.latitude);
        const longitude = Number(coords.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        return {
            latitude,
            longitude,

            speed:
                coords.speed !== null &&
                coords.speed !== undefined &&
                Number.isFinite(Number(coords.speed))
                    ? Number(coords.speed) * 3.6
                    : null,

            heading:
                coords.heading !== null &&
                coords.heading !== undefined &&
                Number.isFinite(Number(coords.heading))
                    ? Number(coords.heading)
                    : null,

            accuracy:
                coords.accuracy !== null &&
                coords.accuracy !== undefined &&
                Number.isFinite(Number(coords.accuracy))
                    ? Number(coords.accuracy)
                    : null,

            timestamp: Date.now(),
        };
    }

    async function sendLocation(location) {
        if (!FleetGPS.active || FleetGPS.sending || !location) {
            return;
        }

        FleetGPS.sending = true;

        try {
            const response = await fetch("/tracking/location", {
                method: "POST",

                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },

                credentials: "same-origin",

                body: JSON.stringify({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    speed: location.speed,
                    heading: location.heading,
                    accuracy: location.accuracy,

                    /*
                     * Optional.
                     * GPS can continue even if there is no active dispatch.
                     */
                    dispatch_id: FleetGPS.dispatchId,
                }),
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to save the vehicle GPS location.",
                );
            }

            setStatus("active", {
                vehicleId: FleetGPS.vehicleId,
            });
        } catch (error) {
            console.error("[Fleet GPS] Location upload failed:", error);

            setStatus("upload-error", {
                message:
                    error.message || "Unable to save the vehicle location.",
            });
        } finally {
            FleetGPS.sending = false;
        }
    }

    function handlePosition(position) {
        const location = normalizeLocation(position);

        if (!location) {
            setStatus("error", {
                message: "The browser returned invalid GPS coordinates.",
            });

            return;
        }

        FleetGPS.currentLocation = location;

        setStatus("active", {
            location,
            vehicleId: FleetGPS.vehicleId,
            dispatchId: FleetGPS.dispatchId,
        });

        /*
         * Update every map immediately.
         */
        broadcastLocation(location);

        /*
         * Also save to Laravel/MySQL.
         */
        void sendLocation(location);
    }

    function handlePositionError(error) {
        switch (error.code) {
            case 1:
                setStatus("permission-denied", {
                    message: "Location permission was denied for this website.",
                });
                break;

            case 2:
                setStatus("position-unavailable", {
                    message:
                        "The phone could not determine the current location.",
                });
                break;

            case 3:
                setStatus("timeout", {
                    message: "The GPS request timed out.",
                });
                break;

            default:
                setStatus("error", {
                    message: "An unknown GPS error occurred.",
                });
                break;
        }

        console.error("[Fleet GPS] Browser GPS error:", error);
    }

    async function syncDriverContext() {
        if (!isDriver()) {
            stop();

            return null;
        }

        try {
            const response = await fetch("/tracking/active-dispatch", {
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
                    data.message ||
                        "Unable to determine the driver's tracking context.",
                );
            }

            /*
             * The backend returns vehicle_id even when there
             * is no active dispatch.
             */
            const vehicleId = data.vehicle_id ?? null;

            if (!vehicleId) {
                stop();

                setStatus("no-vehicle", {
                    message: "No vehicle is currently assigned to this driver.",
                });

                return data;
            }

            FleetGPS.vehicleId = String(vehicleId);

            FleetGPS.dispatchId =
                data.active && data.dispatch?.id
                    ? String(data.dispatch.id)
                    : null;

            FleetGPS.dispatchStatus =
                data.active && data.dispatch?.status
                    ? String(data.dispatch.status)
                    : null;

            if (!FleetGPS.started) {
                startWatcher();
            }

            return data;
        } catch (error) {
            console.error(
                "[Fleet GPS] Failed to synchronize driver context:",
                error,
            );

            setStatus("context-error", {
                message:
                    error.message ||
                    "Unable to synchronize the driver's GPS context.",
            });

            return null;
        }
    }

    function startWatcher() {
        if (FleetGPS.watchId !== null) {
            return;
        }

        if (!navigator.geolocation) {
            setStatus("unsupported", {
                message: "Geolocation is not supported by this browser.",
            });

            return;
        }

        FleetGPS.started = true;
        FleetGPS.active = true;

        setStatus("requesting-permission");

        FleetGPS.watchId = navigator.geolocation.watchPosition(
            handlePosition,
            handlePositionError,
            FleetGPS.options,
        );

        console.log("[Fleet GPS] GPS watcher started.");
    }

    function stop() {
        FleetGPS.active = false;
        FleetGPS.started = false;

        if (FleetGPS.watchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(FleetGPS.watchId);
        }

        FleetGPS.watchId = null;
        FleetGPS.vehicleId = null;
        FleetGPS.dispatchId = null;
        FleetGPS.dispatchStatus = null;
        FleetGPS.currentLocation = null;

        setStatus("stopped");

        console.log("[Fleet GPS] GPS watcher stopped.");
    }

    async function start() {
        if (!isDriver()) {
            return false;
        }

        if (!navigator.geolocation) {
            setStatus("unsupported", {
                message: "Geolocation is not supported by this browser.",
            });

            return false;
        }

        await syncDriverContext();

        if (!FleetGPS.vehicleId) {
            return false;
        }

        if (FleetGPS.watchId === null) {
            startWatcher();
        }

        /*
         * Keep dispatch association synchronized.
         */
        if (!FleetGPS.syncInterval) {
            FleetGPS.syncInterval = window.setInterval(() => {
                void syncDriverContext();
            }, FleetGPS.syncIntervalMs);
        }

        return true;
    }

    function handleVisibilityChange() {
        if (!document.hidden && isDriver()) {
            void syncDriverContext();

            if (FleetGPS.vehicleId && FleetGPS.watchId === null) {
                startWatcher();
            }
        }
    }

    async function initPermissionWatcher() {
        if (!navigator.permissions?.query) {
            return;
        }

        try {
            FleetGPS.permissionWatcher = await navigator.permissions.query({
                name: "geolocation",
            });

            FleetGPS.permissionWatcher.addEventListener("change", () => {
                if (FleetGPS.permissionWatcher.state === "granted") {
                    setStatus("permission-granted");

                    if (isDriver() && FleetGPS.watchId === null) {
                        void syncDriverContext();
                    }
                }

                if (FleetGPS.permissionWatcher.state === "denied") {
                    setStatus("permission-denied");
                }
            });
        } catch (error) {
            /*
             * Permission API support is optional.
             */
            console.debug("[Fleet GPS] Permission watcher unavailable:", error);
        }
    }

    function getCurrentLocation() {
        return FleetGPS.currentLocation;
    }

    function getStatus() {
        return FleetGPS.status;
    }

    function getVehicleId() {
        return FleetGPS.vehicleId;
    }

    function getDispatchId() {
        return FleetGPS.dispatchId;
    }

    window.FleetGPS = {
        start,
        stop,

        getCurrentLocation,
        getStatus,
        getVehicleId,
        getDispatchId,

        isActive: () => FleetGPS.active,
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                void initPermissionWatcher();
                void start();
            },
            {
                once: true,
            },
        );
    } else {
        void initPermissionWatcher();
        void start();
    }

    console.log("[Fleet GPS] Shared GPS service initialized.");
})();
