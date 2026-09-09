/* ==========================================
   Dashboard interactions — navigation only
   No CRUD duplication, no fabricated analytics
========================================== */

//   RBAC
function getDashboardPermissions() {
    return window.FLEET_RBAC?.dashboard || {};
}
function canDashboardOpen(permission) {
    return getDashboardPermissions()?.[permission] === true;
}

let dashboardFleetMap = null;
let dashboardDispatchMarkerLayer = null;

function getDashboardMapDispatches() {
    return Array.isArray(window.DASHBOARD_MAP_DISPATCHES)
        ? window.DASHBOARD_MAP_DISPATCHES
        : [];
}
function escapeDashboardMapHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

const DASHBOARD_GEOCODE_CACHE_KEY = "himsFleetDashboardGeocodeCache";

function readDashboardGeocodeCache() {
    try {
        return JSON.parse(
            sessionStorage.getItem(DASHBOARD_GEOCODE_CACHE_KEY) || "{}",
        );
    } catch {
        return {};
    }
}

function writeDashboardGeocodeCache(cache) {
    try {
        sessionStorage.setItem(
            DASHBOARD_GEOCODE_CACHE_KEY,
            JSON.stringify(cache),
        );
    } catch {
        // Ignore storage failure.
    }
}
async function geocodeDashboardLocation(address) {
    const normalized = String(address || "").trim();
    if (!normalized) {
        return null;
    }
    const cache = readDashboardGeocodeCache();
    const cacheKey = normalized.toLowerCase();
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }
    const query = encodeURIComponent(`${normalized}, Philippines`);
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&q=${query}`,
        {
            headers: {
                Accept: "application/json",
            },
        },
    );
    if (!response.ok) {
        return null;
    }
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
        return null;
    }
    const result = {
        lat: Number(results[0].lat),
        lng: Number(results[0].lon),
        displayName: results[0].display_name || normalized,
    };
    if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
        return null;
    }
    cache[cacheKey] = result;
    writeDashboardGeocodeCache(cache);
    return result;
}

async function loadDashboardDispatchMarkers() {
    if (!dashboardFleetMap || typeof L === "undefined") {
        return;
    }
    const dispatches = getDashboardMapDispatches();
    if (dashboardDispatchMarkerLayer) {
        dashboardDispatchMarkerLayer.clearLayers();
    } else {
        dashboardDispatchMarkerLayer = L.layerGroup().addTo(dashboardFleetMap);
    }
    if (!dispatches.length) {
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Keep public geocoding usage light
    |--------------------------------------------------------------------------
    |
    | Dashboard queue is intentionally limited.
    |--------------------------------------------------------------------------
    */
    const dispatchesToMap = dispatches.slice(0, 5);
    const bounds = [];
    for (const dispatch of dispatchesToMap) {
        const pickup = await geocodeDashboardLocation(dispatch.pickup);
        /*
        |--------------------------------------------------------------------------
        | Small delay between uncached public geocoding requests
        |--------------------------------------------------------------------------
        */
        if (pickup) {
            const pickupMarker = L.marker([pickup.lat, pickup.lng]).addTo(
                dashboardDispatchMarkerLayer,
            ).bindPopup(`
                        <strong>
                            ${escapeDashboardMapHtml(
                                dispatch.dispatch_number || "Dispatch",
                            )}
                        </strong>
                        <br>
                        <strong>Pickup:</strong>
                        ${escapeDashboardMapHtml(dispatch.pickup || "—")}
                        <br>
                        <strong>Status:</strong>
                        ${escapeDashboardMapHtml(dispatch.status || "—")}
                        ${
                            dispatch.vehicle
                                ? `
                                    <br>
                                    <strong>Vehicle:</strong>
                                    ${escapeDashboardMapHtml(dispatch.vehicle)}
                                `
                                : ""
                        }
                        ${
                            dispatch.driver
                                ? `
                                    <br>
                                    <strong>Driver:</strong>
                                    ${escapeDashboardMapHtml(dispatch.driver)}
                                `
                                : ""
                        }
                    `);
            bounds.push([pickup.lat, pickup.lng]);
        }
        await dashboardSleep(1100);
        const destination = await geocodeDashboardLocation(
            dispatch.destination,
        );
        if (destination) {
            L.marker([destination.lat, destination.lng]).addTo(
                dashboardDispatchMarkerLayer,
            ).bindPopup(`
                    <strong>
                        ${escapeDashboardMapHtml(
                            dispatch.dispatch_number || "Dispatch",
                        )}
                    </strong>
                    <br>
                    <strong>Destination:</strong>
                    ${escapeDashboardMapHtml(dispatch.destination || "—")}
                `);
            bounds.push([destination.lat, destination.lng]);
        }
    }
    await dashboardSleep(1100);
    if (bounds.length > 0) {
        dashboardFleetMap.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 14,
        });
    }
}
function dashboardSleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function initDashboardFleetMap() {
    const mapElement = document.getElementById("fleetOperationsMap");
    if (!mapElement) {
        return;
    }
    if (typeof L === "undefined") {
        console.error("Leaflet is not available on the dashboard.");

        return;
    }
    if (dashboardFleetMap) {
        dashboardFleetMap.invalidateSize();
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Tala Hospital base location
    |--------------------------------------------------------------------------
    |
    | Replace these coordinates with the exact Tala Hospital coordinates
    | once confirmed.
    |
    */
    const hospitalLatitude = 14.7707;
    const hospitalLongitude = 121.0659;

    dashboardFleetMap = L.map("fleetOperationsMap", {
        zoomControl: true,
        scrollWheelZoom: false,
    }).setView([hospitalLatitude, hospitalLongitude], 15);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(dashboardFleetMap);

    const hospitalMarker = L.marker([
        hospitalLatitude,
        hospitalLongitude,
    ]).addTo(dashboardFleetMap).bindPopup(`
            <strong>Tala Hospital / DJNRMHS</strong>
            <br>
            Dr. Uyguangco Avenue, Tala, Caloocan
        `);

    hospitalMarker.openPopup();
    /*
    |--------------------------------------------------------------------------
    | Fix map sizing after card/layout rendering
    |--------------------------------------------------------------------------
    */
    window.setTimeout(() => {
        dashboardFleetMap?.invalidateSize();
    }, 150);

    loadDashboardDispatchMarkers().catch((error) => {
        console.error("Unable to load dashboard dispatch markers:", error);
    });
}

let dashboardInitialized = false;

let dashboardLiveUpdateInterval = null;
let dashboardLiveUpdateRunning = false;

let dashboardMapDataSignature = "";

async function loadDashboardLiveData() {
    try {
        const response = await fetch("/dashboard/data", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to load dashboard data.");
        }
        await applyDashboardLiveData(data);
        return data;
    } catch (error) {
        console.error("DASHBOARD LIVE UPDATE ERROR:", error);

        return null;
    }
}

function setDashboardLiveText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function getDashboardVehicleStatusClass(status) {
    switch (status) {
        case "Available":
            return "available";
        case "On Trip":
            return "trip";
        case "Maintenance":
            return "maintenance";
        default:
            return "inactive";
    }
}

function getDashboardActivityIcon(title) {
    const value = String(title || "").toLowerCase();

    if (value.includes("maintenance")) {
        return "ph-warning-circle";
    }
    if (value.includes("dispatch")) {
        return "ph-truck";
    }
    if (value.includes("fuel")) {
        return "ph-gas-pump";
    }
    if (value.includes("driver")) {
        return "ph-user";
    }
    return "ph-check-circle";
}

function formatDashboardActivityAge(timestamp) {
    const createdSeconds = Number(timestamp);

    if (!Number.isFinite(createdSeconds)) {
        return "Recently";
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.max(0, nowSeconds - createdSeconds);
    if (diffSeconds < 60) {
        return "Just now";
    }
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

async function applyDashboardLiveData(data) {
    /*
    |--------------------------------------------------------------------------
    | KPI
    |--------------------------------------------------------------------------
    */
    setDashboardLiveText(
        "dashboardAvailableVehicles",
        Number(data.available_vehicles || 0).toLocaleString(),
    );
    setDashboardLiveText(
        "dashboardActiveDispatches",
        Number(data.active_dispatches || 0).toLocaleString(),
    );
    setDashboardLiveText(
        "dashboardDriversOnDuty",
        Number(data.drivers_on_duty || 0).toLocaleString(),
    );
    const fuel = Number(data.average_fuel_level || 0);
    setDashboardLiveText("dashboardAverageFuelLevel", `${fuel}%`);
    const fuelTrend = document.getElementById("dashboardFuelTrend");
    if (fuelTrend) {
        fuelTrend.textContent = fuel < 30 ? "Low fuel" : "Within range";
        fuelTrend.classList.remove("kpi-trend--up", "kpi-trend--steady");
        fuelTrend.classList.add(
            fuel < 30 ? "kpi-trend--up" : "kpi-trend--steady",
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Weekly Activity
    |--------------------------------------------------------------------------
    */
    const weekly = Array.isArray(data.weekly_activity)
        ? data.weekly_activity
        : [];
    const weeklyMax = Math.max(1, Number(data.weekly_activity_max || 1));
    const chart = document.getElementById("dashboardWeeklyChart");
    const legend = document.getElementById("dashboardWeeklyLegend");
    if (chart) {
        chart.innerHTML = weekly
            .map((activity) => {
                const total = Number(activity.total || 0);

                const height =
                    total > 0
                        ? Math.max(8, Math.round((total / weeklyMax) * 100))
                        : 3;

                return `
                        <div
                            class="bar"
                            style="--bar-h: ${height}%"
                            title="${escapeDashboardMapHtml(
                                activity.day,
                            )}: ${total} dispatches"
                        ></div>
                    `;
            })
            .join("");
    }

    if (legend) {
        legend.innerHTML = weekly
            .map(
                (activity) => `
                        <span>
                            ${escapeDashboardMapHtml(activity.day)}
                        </span>
                    `,
            )
            .join("");
    }
    /*
    |--------------------------------------------------------------------------
    | Dispatch Queue
    |--------------------------------------------------------------------------
    */
    setDashboardLiveText(
        "dashboardActiveDispatchBadge",
        `${Number(data.active_dispatches || 0)} Active`,
    );
    const dispatchList = document.getElementById("dashboardDispatchList");
    const dispatches = Array.isArray(data.dispatch_queue)
        ? data.dispatch_queue
        : [];
    if (dispatchList) {
        if (!dispatches.length) {
            dispatchList.innerHTML = `
                <div class="dashboard-empty-state">
                    No active dispatches scheduled today.
                </div>
            `;
        } else {
            dispatchList.innerHTML = dispatches
                .map((dispatch) => {
                    const status = dispatch.status || "Pending";

                    const statusClass =
                        status === "Assigned" || status === "Arrived"
                            ? "status-chip--success"
                            : "status-chip--warning";

                    const dotClass =
                        status === "Assigned" || status === "Arrived"
                            ? "green"
                            : "yellow";

                    const driver = String(dispatch.driver || "").trim();

                    return `
                                <div
                                    class="dispatch-item"
                                    data-dispatch-id="${escapeDashboardMapHtml(
                                        dispatch.id,
                                    )}"
                                >
                                    <div
                                        class="dispatch-dot ${dotClass}"
                                        aria-hidden="true"
                                    ></div>

                                    <div class="dispatch-body">
                                        <div class="dispatch-row">
                                            <strong>
                                                ${escapeDashboardMapHtml(
                                                    dispatch.title,
                                                )}
                                            </strong>

                                            <span
                                                class="status-chip ${statusClass}"
                                            >
                                                ${escapeDashboardMapHtml(
                                                    status,
                                                )}
                                            </span>
                                        </div>

                                        <small>
                                            ${escapeDashboardMapHtml(
                                                dispatch.vehicle ||
                                                    "No vehicle",
                                            )}

                                            ${
                                                driver
                                                    ? ` · ${escapeDashboardMapHtml(
                                                          driver,
                                                      )}`
                                                    : ""
                                            }
                                        </small>
                                    </div>
                                </div>
                            `;
                })
                .join("");
        }
        initDashboardDispatchQueue();
    }
    /*
    |--------------------------------------------------------------------------
    | Vehicle Status
    |--------------------------------------------------------------------------
    */
    const vehicleBody = document.getElementById("dashboardVehicleTableBody");
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    if (vehicleBody) {
        if (!vehicles.length) {
            vehicleBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center"
                    >
                        No vehicle records found.
                    </td>
                </tr>
            `;
        } else {
            vehicleBody.innerHTML = vehicles
                .map(
                    (vehicle) => `
                            <tr>
                                <td>
                                    <strong>
                                        ${escapeDashboardMapHtml(vehicle.label)}
                                    </strong>

                                    ${
                                        vehicle.vehicle_type
                                            ? `
                                                <small class="d-block">
                                                    ${escapeDashboardMapHtml(
                                                        vehicle.vehicle_type,
                                                    )}
                                                </small>
                                            `
                                            : ""
                                    }
                                </td>

                                <td>
                                    ${escapeDashboardMapHtml(
                                        vehicle.driver || "Unassigned",
                                    )}
                                </td>

                                <td>
                                    <span
                                        class="status ${getDashboardVehicleStatusClass(
                                            vehicle.status,
                                        )}"
                                    >
                                        ${escapeDashboardMapHtml(
                                            vehicle.status,
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${
                                        vehicle.fuel_percent !== null &&
                                        vehicle.fuel_percent !== undefined
                                            ? `${vehicle.fuel_percent}%`
                                            : "—"
                                    }
                                </td>

                                <td>
                                    ${
                                        canDashboardOpen("canOpenVehicles")
                                            ? `
                                                <a
                                                    href="${DASHBOARD_ROUTES.vehicles}"
                                                    class="table-btn"
                                                >
                                                    View
                                                </a>
                                            `
                                            : ""
                                    }
                                </td>
                            </tr>
                        `,
                )
                .join("");
        }
        initDashboardVehicleStatus();
    }
    /*
    |--------------------------------------------------------------------------
    | Maintenance Alerts
    |--------------------------------------------------------------------------
    */
    renderDashboardMaintenanceAlerts(data.maintenance_alerts);
    /*
    |--------------------------------------------------------------------------
    | Recent Activity
    |--------------------------------------------------------------------------
    */
    renderDashboardRecentActivity(data.recent_activity);
    /*
    |--------------------------------------------------------------------------
    | Map
    |--------------------------------------------------------------------------
    */
    const mapDispatches = Array.isArray(data.map_dispatches)
        ? data.map_dispatches
        : [];
    const newSignature = JSON.stringify(mapDispatches);
    if (newSignature !== dashboardMapDataSignature) {
        dashboardMapDataSignature = newSignature;
        window.DASHBOARD_MAP_DISPATCHES = mapDispatches;
        if (dashboardFleetMap) {
            await loadDashboardDispatchMarkers();
        }
    }
}

function renderDashboardMaintenanceAlerts(alerts) {
    const list = document.getElementById("dashboardMaintenanceList");
    if (!list) {
        return;
    }
    const records = Array.isArray(alerts) ? alerts : [];
    if (!records.length) {
        list.innerHTML = `
            <div class="dashboard-empty-state">
                No active maintenance alerts.
            </div>
        `;

        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    list.innerHTML = records
        .map((maintenance) => {
            const date = maintenance.maintenance_date
                ? new Date(`${maintenance.maintenance_date}T00:00:00`)
                : null;
            let days = null;
            if (date && !Number.isNaN(date.getTime())) {
                days = Math.round((date - today) / 86400000);
            }
            const criticalPriority = ["Emergency", "High"].includes(
                maintenance.priority,
            );

            let severity = "success";
            let label = "Scheduled";
            let chip = "status-chip--success";
            let icon = "ph-calendar-check";

            if (maintenance.status === "In Progress" && criticalPriority) {
                severity = "critical";
                label = "Critical";
                chip = "status-chip--danger";
                icon = "ph-warning-circle";
            } else if (
                maintenance.status === "Scheduled" &&
                days !== null &&
                days <= 0
            ) {
                severity = "critical";
                label = "Critical";
                chip = "status-chip--danger";
                icon = "ph-warning-circle";
            } else if (
                maintenance.status === "Scheduled" &&
                days !== null &&
                days > 0 &&
                days <= 3
            ) {
                severity = "warning";
                label = "Due soon";
                chip = "status-chip--warning";
                icon = "ph-wrench";
            } else if (maintenance.status === "In Progress") {
                severity = "warning";
                label = "In Progress";
                chip = "status-chip--warning";
                icon = "ph-wrench";
            }

            const dateLabel =
                date && !Number.isNaN(date.getTime())
                    ? date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                      })
                    : "";

            return `
                    <div
                        class="maintenance-item ${severity}"
                        data-maintenance-id="${escapeDashboardMapHtml(
                            maintenance.id,
                        )}"
                    >
                        <div
                            class="maintenance-icon"
                            aria-hidden="true"
                        >
                            <i
                                class="ph-fill ${icon}"
                            ></i>
                        </div>

                        <div class="maintenance-body">
                            <div class="dispatch-row">
                                <strong>
                                    ${escapeDashboardMapHtml(
                                        maintenance.maintenance_type,
                                    )}
                                </strong>

                                <span
                                    class="status-chip ${chip}"
                                >
                                    ${label}
                                </span>
                            </div>

                            <small>
                                ${escapeDashboardMapHtml(
                                    maintenance.vehicle || "Vehicle",
                                )}

                                ${dateLabel ? ` · ${dateLabel}` : ""}
                            </small>
                        </div>
                    </div>
                `;
        })
        .join("");
    initDashboardMaintenanceAlerts();
}

function renderDashboardRecentActivity(activities) {
    const list = document.getElementById("dashboardActivityList");
    if (!list) {
        return;
    }
    const records = Array.isArray(activities) ? activities : [];
    if (!records.length) {
        list.innerHTML = `
            <div class="dashboard-empty-state">
                No recent activity.
            </div>
        `;

        return;
    }
    list.innerHTML = records
        .map((activity) => {
            const icon = getDashboardActivityIcon(activity.title);

            return `
                    <div
                        class="activity-item"
                        ${
                            activity.link
                                ? `data-href="${escapeDashboardMapHtml(
                                      activity.link,
                                  )}"`
                                : ""
                        }
                    >
                        <div
                            class="activity-icon primary"
                            aria-hidden="true"
                        >
                            <i
                                class="ph-fill ${icon}"
                            ></i>
                        </div>

                        <div class="activity-body">
                            <strong>
                                ${escapeDashboardMapHtml(activity.title)}
                            </strong>

                            <small>
                                ${formatDashboardActivityAge(
                                    activity.created_at_timestamp,
                                )}
                            </small>
                        </div>
                    </div>
                `;
        })
        .join("");

    initDashboardActivity();
}

function startDashboardLiveUpdates() {
    if (dashboardLiveUpdateInterval) {
        return;
    }
    dashboardLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (dashboardLiveUpdateRunning) {
            return;
        }
        dashboardLiveUpdateRunning = true;
        try {
            await loadDashboardLiveData();
        } finally {
            dashboardLiveUpdateRunning = false;
        }
    }, 10000);
}

const DASHBOARD_ROUTES = {
    dashboard: "/dashboard",
    vehicles: "/fleet",
    reservations: "/reservation",
    dispatch: "/dispatch",
    drivers: "/driver",
    maintenance: "/maintenance",
    fuel: "/fuel",
    routes: "/route-planning",
    cost: "/cost-analysis",
    reports: "/reports",
    settings: "/settings",
};

function dashboardToast(message, type) {
    if (typeof ensureToastHost === "function") ensureToastHost();
    if (typeof showToast === "function") {
        showToast(message, type || "info");
    }
}

function dashboardGo(url) {
    if (!url) return;
    window.location.href = url;
}

function updateDashboardDateLabel() {
    const el = document.getElementById("dashboardDateLabel");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function makeDashboardItemInteractive(el, label, onActivate) {
    if (!el || el.dataset.dashInteractive === "true") return;
    el.dataset.dashInteractive = "true";
    el.classList.add("dashboard-interactive");
    if (!el.getAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (!el.getAttribute("role")) el.setAttribute("role", "link");
    if (label && !el.getAttribute("aria-label")) {
        el.setAttribute("aria-label", label);
    }
    el.addEventListener("click", (e) => {
        if (e.target.closest("button, a")) return;
        onActivate();
    });
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate();
        }
    });
}

function initDashboardHeaderControls() {
    /* Date is informational; keep live calendar date */
    updateDashboardDateLabel();
}

function initDashboardChartControls() {
    const periodBtn = document.querySelector(".dashboard-chart .btn-filter");

    if (!periodBtn || periodBtn.dataset.dashBound === "true") {
        return;
    }
    periodBtn.dataset.dashBound = "true";
    periodBtn.title = "Current week fleet activity";
    periodBtn.addEventListener("click", (e) => {
        e.preventDefault();
        dashboardToast(
            "Fleet Activity shows this week’s dispatch activity. Open Reports for detailed analytics.",
            "info",
        );
    });
}

function initDashboardVehicleStatus() {
    document.querySelectorAll(".dashboard-page .btn-filter").forEach((btn) => {
        if (btn.dataset.dashBound === "true") {
            return;
        }
        const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
        if (label === "View All") {
            btn.dataset.dashBound = "true";

            if (!canDashboardOpen("canOpenVehicles")) {
                btn.hidden = true;
                return;
            }
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                dashboardGo(DASHBOARD_ROUTES.vehicles);
            });
        } else if (label === "Dispatches") {
            btn.dataset.dashBound = "true";
            if (!canDashboardOpen("canOpenDispatch")) {
                btn.hidden = true;
                return;
            }
            btn.addEventListener("click", (e) => {
                e.preventDefault();

                dashboardGo(DASHBOARD_ROUTES.dispatch);
            });
        }
    });
    document.querySelectorAll(".dashboard-page .table-btn").forEach((btn) => {
        if (btn.dataset.dashBound === "true") {
            return;
        }
        btn.dataset.dashBound = "true";
        if (!canDashboardOpen("canOpenVehicles")) {
            btn.hidden = true;
            return;
        }
        const row = btn.closest("tr");
        const vehicleName = row?.querySelector("td")?.textContent?.trim() || "";
        btn.setAttribute(
            "aria-label",
            vehicleName
                ? "View " + vehicleName + " in Vehicles"
                : "View vehicle",
        );
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            dashboardGo(DASHBOARD_ROUTES.vehicles);
        });
    });
}

function initDashboardDispatchQueue() {
    if (!canDashboardOpen("canOpenDispatch")) {
        return;
    }
    document
        .querySelectorAll(".dashboard-page .dispatch-item")
        .forEach((item) => {
            const title =
                item.querySelector("strong")?.textContent?.trim() ||
                "Dispatch item";
            makeDashboardItemInteractive(
                item,
                "Open Dispatch: " + title,
                () => {
                    dashboardGo(DASHBOARD_ROUTES.dispatch);
                },
            );
        });
    const badge = document.querySelector(
        ".dashboard-page .dispatch-card .badge-green",
    );
    if (badge && badge.dataset.dashBound !== "true") {
        badge.dataset.dashBound = "true";
        badge.setAttribute("role", "link");
        badge.setAttribute("tabindex", "0");
        badge.setAttribute("aria-label", "View active dispatches");
        badge.classList.add("dashboard-interactive");
        const go = () => dashboardGo(DASHBOARD_ROUTES.dispatch);
        badge.addEventListener("click", go);
        badge.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                go();
            }
        });
    }
}

function initDashboardMaintenanceAlerts() {
    if (!canDashboardOpen("canOpenMaintenance")) {
        return;
    }
    document
        .querySelectorAll(".dashboard-page .maintenance-item")
        .forEach((item) => {
            const title =
                item.querySelector("strong")?.textContent?.trim() ||
                "Maintenance alert";
            makeDashboardItemInteractive(
                item,
                "Open Maintenance: " + title,
                () => {
                    dashboardGo(DASHBOARD_ROUTES.maintenance);
                },
            );
        });
}

function canOpenDashboardActivityHref(href) {
    if (!href) {
        return false;
    }
    if (href.startsWith(DASHBOARD_ROUTES.vehicles)) {
        return canDashboardOpen("canOpenVehicles");
    }
    if (href.startsWith(DASHBOARD_ROUTES.dispatch)) {
        return canDashboardOpen("canOpenDispatch");
    }
    if (href.startsWith(DASHBOARD_ROUTES.maintenance)) {
        return canDashboardOpen("canOpenMaintenance");
    }
    return true;
}

function initDashboardActivity() {
    document
        .querySelectorAll(".dashboard-page .activity-item")
        .forEach((item) => {
            const text =
                item.querySelector("strong")?.textContent?.trim() || "Activity";
            const href = item.dataset.href || "";
            if (!href) {
                return;
            }
            if (!canOpenDashboardActivityHref(href)) {
                return;
            }
            makeDashboardItemInteractive(
                item,
                "Open related module: " + text,
                () => {
                    dashboardGo(href);
                },
            );
        });
}

/**
 * KPI cards are not visually button-like; leave non-interactive
 * per design guidance unless future design adds affordances.
 */
function initDashboardKpiCards() {
    /* intentional no-op: plain metric cards */
}

function initDashboardPage() {
    if (dashboardInitialized) return;
    if (!document.querySelector(".dashboard-page")) return;
    dashboardInitialized = true;

    try {
        if (typeof ensureToastHost === "function") ensureToastHost();
        if (
            typeof initToast === "function" &&
            typeof window.showToast !== "function"
        ) {
            initToast();
        }

        initDashboardHeaderControls();
        initDashboardChartControls();
        initDashboardVehicleStatus();
        initDashboardDispatchQueue();
        initDashboardMaintenanceAlerts();
        initDashboardActivity();
        initDashboardKpiCards();
        initDashboardFleetMap();

        startDashboardLiveUpdates();
    } catch (error) {
        console.error("Dashboard init failed:", error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardPage);
} else {
    initDashboardPage();
}