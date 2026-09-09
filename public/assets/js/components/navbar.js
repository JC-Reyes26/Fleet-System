/* ==========================================
   NAVBAR
   Search, Notifications, Messages
   Shared across all Fleet pages
========================================== */

//   RBAC
function fleetNavCanAccess(moduleName) {
    return window.FLEET_NAV_RBAC?.[moduleName] === true;
}
function fleetNavCanOpenSearchResult(item) {
    if (!item?.module) {
        return false;
    }

    return fleetNavCanAccess(item.module);
}
function fleetNavModuleFromUrl(url) {
    if (!url) {
        return null;
    }

    let pathname = "";

    try {
        pathname = new URL(url, window.location.origin).pathname;
    } catch {
        return null;
    }

    if (pathname.startsWith("/fleet")) {
        return "vehicles";
    }

    if (pathname.startsWith("/reservation")) {
        return "reservations";
    }

    if (pathname.startsWith("/dispatch")) {
        return "dispatch";
    }

    if (pathname.startsWith("/driver")) {
        return "drivers";
    }

    if (pathname.startsWith("/maintenance")) {
        return "maintenance";
    }

    if (pathname.startsWith("/fuel")) {
        return "fuel";
    }

    if (pathname.startsWith("/route-planning")) {
        return "routes";
    }

    if (pathname.startsWith("/cost-analysis")) {
        return "cost";
    }

    if (pathname.startsWith("/reports")) {
        return "reports";
    }

    if (pathname.startsWith("/settings")) {
        return "settings";
    }

    if (pathname.startsWith("/dashboard")) {
        return "dashboard";
    }

    if (pathname.startsWith("/profile")) {
        return "profile";
    }

    return null;
}
function fleetNavCanOpenUrl(url) {
    const moduleName = fleetNavModuleFromUrl(url);
    /*
     * Unknown internal link:
     * don't trust it automatically.
     */
    if (!moduleName) {
        return false;
    }
    return fleetNavCanAccess(moduleName);
}

let navbarBrowserNotificationsEnabled = false;
let navbarGlobalEventsInitialized = false;
let navbarObserverStarted = false;

let navbarNotificationTimeInterval = null;

let navbarNotificationPollInterval = null;
/* ==========================================
   Routes
========================================== */

/*
|--------------------------------------------------------------------------
| NOTE
|--------------------------------------------------------------------------
| These are only used for navigation after clicking a search/message item.
| They DO NOT control whether notification/message panels can open.
|
| We can replace these with the exact Laravel URLs after the navbar
| interactions are confirmed working.
|--------------------------------------------------------------------------
*/

const FLEET_NAV_ROUTES = {
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
    dashboard: "/dashboard",
};

/* ==========================================
   Toast Helpers
========================================== */

function ensureToastHost() {
    if (document.getElementById("toastContainer")) {
        return;
    }

    let host = document.getElementById("toast");

    if (!host) {
        host = document.createElement("div");
        host.id = "toast";
        document.body.appendChild(host);
    }

    if (!document.getElementById("toastContainer")) {
        const box = document.createElement("div");

        box.id = "toastContainer";
        box.className = "toast-container";

        host.appendChild(box);
    }

    if (
        typeof initToast === "function" &&
        typeof window.showToast !== "function"
    ) {
        initToast();
    }

    if (typeof window.showToast !== "function") {
        window.showToast = function (message) {
            console.info(message);
        };
    }
}

function fleetNavNotify(message, type = "info") {
    ensureToastHost();

    if (typeof window.showToast === "function") {
        window.showToast(message, type);
    }
}

function startNavbarNotificationPolling(refreshCallback) {
    if (
        navbarNotificationPollInterval ||
        typeof refreshCallback !== "function"
    ) {
        return;
    }
    navbarNotificationPollInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        try {
            await refreshCallback();
        } catch (error) {
            console.error("Notification live refresh failed:", error);
        }
    }, 10000);
}

/* ==========================================
   Navbar Control Wrapper
========================================== */

function ensureNavbarControlWrapper(button) {
    if (!button) {
        return null;
    }
    const existing = button.closest(".navbar-control");
    if (existing) {
        return existing;
    }
    const parent = button.parentNode;
    if (!parent) {
        return null;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "navbar-control";
    parent.insertBefore(wrapper, button);
    wrapper.appendChild(button);

    return wrapper;
}

/* ==========================================
   Close Panels
========================================== */

function closeAllNavbarPanels(except = null) {
    document.querySelectorAll(".navbar-panel.is-open").forEach((panel) => {
        if (except && panel === except) {
            return;
        }

        panel.classList.remove("is-open");
        panel.hidden = true;
    });

    document
        .querySelectorAll(".navbar-right .icon-btn[aria-expanded='true']")
        .forEach((button) => {
            if (except && button.getAttribute("aria-controls") === except.id) {
                return;
            }

            button.setAttribute("aria-expanded", "false");
        });

    const searchResults = document.getElementById("navbarSearchResults");

    if (searchResults && searchResults !== except) {
        searchResults.hidden = true;
        searchResults.innerHTML = "";
    }
}

/* ==========================================
   Browser Notification Settings
========================================== */

async function loadNavbarNotificationSettings() {
    try {
        const response = await fetch("/settings/data", {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        });

        if (!response.ok) {
            throw new Error(`Settings request failed (${response.status}).`);
        }

        const data = await response.json();

        const settings = data?.settings ?? data ?? {};

        navbarBrowserNotificationsEnabled =
            settings?.notifications?.browserNotifications === true;

        return navbarBrowserNotificationsEnabled;
    } catch (error) {
        console.error("Unable to load navbar notification settings:", error);

        navbarBrowserNotificationsEnabled = false;

        return false;
    }
}

async function ensureBrowserNotificationPermission() {
    if (!navbarBrowserNotificationsEnabled || !("Notification" in window)) {
        return false;
    }
    if (Notification.permission === "granted") {
        return true;
    }
    if (Notification.permission === "denied") {
        return false;
    }
    try {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    } catch (error) {
        console.error(
            "Unable to request browser notification permission:",
            error,
        );

        return false;
    }
}

function showBrowserFleetNotification(notification) {
    if (
        !navbarBrowserNotificationsEnabled ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    try {
        const browserNotification = new Notification(
            notification.title || "Fleet Notification",
            {
                body: notification.message || "",

                tag: `fleet-notification-${notification.id}`,
            },
        );

        browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
        };
    } catch (error) {
        console.error("Unable to show browser notification:", error);
    }
}

function getShownBrowserNotificationIds() {
    try {
        const stored = sessionStorage.getItem("fleetShownBrowserNotifications");

        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);

        return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
        return [];
    }
}

function rememberBrowserNotification(notificationId) {
    const id = Number(notificationId);

    if (!Number.isFinite(id)) {
        return;
    }

    const ids = getShownBrowserNotificationIds();

    if (ids.includes(id)) {
        return;
    }

    ids.push(id);

    sessionStorage.setItem(
        "fleetShownBrowserNotifications",
        JSON.stringify(ids.slice(-100)),
    );
}

async function processBrowserNotifications(notifications) {
    if (!navbarBrowserNotificationsEnabled || !Array.isArray(notifications)) {
        return;
    }

    const unread = notifications.filter(
        (notification) => notification.status === "Unread",
    );

    if (!unread.length) {
        return;
    }

    const permitted = await ensureBrowserNotificationPermission();

    if (!permitted) {
        return;
    }

    const shownIds = getShownBrowserNotificationIds();

    unread.forEach((notification) => {
        const id = Number(notification.id);

        if (!Number.isFinite(id) || shownIds.includes(id)) {
            return;
        }

        showBrowserFleetNotification(notification);

        rememberBrowserNotification(id);
    });
}

/* ==========================================
   Notification API
========================================== */

async function fetchNavbarNotifications() {
    try {
        const response = await fetch("/notifications", {
            method: "GET",

            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },

            credentials: "same-origin",
        });

        const contentType = response.headers.get("content-type") || "";

        let data = null;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();

            console.error("Notification endpoint returned non-JSON:", text);

            throw new Error(
                `Notification request failed (${response.status}).`,
            );
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                    `Unable to load notifications (${response.status}).`,
            );
        }

        return {
            notifications: Array.isArray(data?.notifications)
                ? data.notifications
                : [],

            unreadCount: Number(data?.unread_count) || 0,
        };
    } catch (error) {
        console.error("Unable to load navbar notifications:", error);

        return {
            notifications: [],
            unreadCount: 0,
            error: true,
        };
    }
}

async function markNavbarNotificationRead(notificationId) {
    const csrfToken =
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || "";

    const response = await fetch(`/notifications/${notificationId}/read`, {
        method: "PATCH",

        credentials: "same-origin",

        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": csrfToken,
        },
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            data?.message || "Unable to mark notification as read.",
        );
    }

    return data;
}

async function markAllNavbarNotificationsRead() {
    const csrfToken =
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || "";

    const response = await fetch("/notifications/read-all", {
        method: "PATCH",

        credentials: "same-origin",

        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": csrfToken,
        },
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            data?.message || "Unable to mark notifications as read.",
        );
    }

    return data;
}

/* ==========================================
   Notifications Panel
========================================== */

function getNotificationButton() {
    return (
        document.querySelector(
            '.navbar-right button[aria-label="Notifications"]',
        ) ||
        document.querySelector(".navbar-right .ph-bell")?.closest("button") ||
        null
    );
}

function initNavbarNotifications() {
    const button = getNotificationButton();

    if (!button) {
        return;
    }

    startNavbarNotificationTimeUpdater();

    if (button.dataset.navNotificationsInit === "true") {
        return;
    }

    button.dataset.navNotificationsInit = "true";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "navbarNotificationsPanel");
    const control = ensureNavbarControlWrapper(button);

    if (!control) {
        return;
    }

    /* Badge */
    let badge = button.querySelector(".navbar-notification-badge");
    if (!badge) {
        badge = document.createElement("span");
        badge.className = "navbar-notification-badge";
        badge.hidden = true;
        button.appendChild(badge);
    }

    /* Panel */
    let panel = document.getElementById("navbarNotificationsPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "navbarNotificationsPanel";
        panel.className = "navbar-panel";
        panel.hidden = true;
        panel.setAttribute("role", "menu");
        panel.setAttribute("aria-label", "Notifications");
        control.appendChild(panel);
    }

    panel.innerHTML = "";

    /* Header */
    const header = document.createElement("div");
    header.className = "navbar-panel-header";
    const title = document.createElement("span");
    title.textContent = "Notifications";
    const markAllButton = document.createElement("button");
    markAllButton.type = "button";
    markAllButton.className = "navbar-notification-read-all";
    markAllButton.textContent = "Mark all read";
    header.appendChild(title);
    header.appendChild(markAllButton);

    /* List */
    const list = document.createElement("div");

    list.className = "navbar-panel-list";

    panel.appendChild(header);
    panel.appendChild(list);

    function updateBadge(count) {
        const unread = Number(count) || 0;
        if (unread <= 0) {
            badge.hidden = true;
            badge.textContent = "";
            return;
        }
        badge.hidden = false;
        badge.textContent = unread > 99 ? "99+" : String(unread);
    }

    async function refreshNotifications() {
        if (!list.children.length) {
            list.innerHTML =
                '<div class="navbar-search-empty">Loading notifications...</div>';
        }
        const data = await fetchNavbarNotifications();
        updateBadge(data.unreadCount);
        await processBrowserNotifications(data.notifications);
        list.innerHTML = "";
        if (data.error) {
            const error = document.createElement("div");
            error.className = "navbar-search-empty";
            error.textContent = "Unable to load notifications.";
            list.appendChild(error);
            markAllButton.disabled = true;
            return;
        }

        if (!data.notifications.length) {
            const empty = document.createElement("div");
            empty.className = "navbar-search-empty";
            empty.textContent = "No notifications.";
            list.appendChild(empty);
            markAllButton.disabled = true;
            return;
        }

        markAllButton.disabled = data.unreadCount <= 0;
        data.notifications.forEach((notification) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "navbar-panel-item navbar-notification-item";
            item.setAttribute("role", "menuitem");
            if (notification.status === "Unread") {
                item.classList.add("is-unread");
            }
            const itemHeader = document.createElement("div");
            itemHeader.className = "navbar-notification-item-header";

            const itemTitle = document.createElement("strong");
            itemTitle.textContent = notification.title || "Notification";

            const time = document.createElement("span");
            time.className = "navbar-notification-time";
            time.dataset.notificationTimestamp =
                notification.created_at_timestamp;

            time.textContent = formatNotificationAge(
                notification.created_at_timestamp,
            );

            itemHeader.appendChild(itemTitle);

            if (time.textContent) {
                itemHeader.appendChild(time);
            }

            const message = document.createElement("span");
            message.className = "navbar-notification-message";
            message.textContent = notification.message || "";

            item.appendChild(itemHeader);
            item.appendChild(message);
            item.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                try {
                    if (notification.status === "Unread") {
                        await markNavbarNotificationRead(notification.id);
                    }
                    closeAllNavbarPanels();
                    if (notification.link) {
                        if (!fleetNavCanOpenUrl(notification.link)) {
                            fleetNavNotify(
                                "You do not have access to the related module.",
                                "warning",
                            );
                            await refreshNotifications();
                            return;
                        }
                        window.location.href = notification.link;
                        return;
                    }
                    await refreshNotifications();
                } catch (error) {
                    console.error("Unable to open notification:", error);
                    fleetNavNotify(
                        error.message || "Unable to open notification.",
                        "error",
                    );
                }
            });

            list.appendChild(item);
        });
    }

    markAllButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (markAllButton.disabled) {
            return;
        }

        try {
            markAllButton.disabled = true;
            await markAllNavbarNotificationsRead();
            await refreshNotifications();
            fleetNavNotify("All notifications marked as read.", "success");
        } catch (error) {
            console.error("Unable to mark all notifications as read:", error);

            fleetNavNotify(
                error.message || "Unable to update notifications.",
                "error",
            );
        }
    });

    button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const wasOpen = panel.classList.contains("is-open");
        closeAllNavbarPanels();

        if (wasOpen) {
            return;
        }
        panel.hidden = false;
        panel.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        await refreshNotifications();
    });

    startNavbarNotificationPolling(refreshNotifications);

    /*
    |--------------------------------------------------------------------------
    | Initial unread badge
    |--------------------------------------------------------------------------
    */

    void (async () => {
        await loadNavbarNotificationSettings();
        const data = await fetchNavbarNotifications();
        updateBadge(data.unreadCount);
        await processBrowserNotifications(data.notifications);
    })();
}

/* ==========================================
   Messages Panel
========================================== */

function getMessagesButton() {
    return (
        document.querySelector('.navbar-right button[aria-label="Messages"]') ||
        document
            .querySelector(".navbar-right .ph-envelope-simple")
            ?.closest("button") ||
        null
    );
}

function initNavbarMessages() {
    const button = getMessagesButton();
    if (!button) {
        return;
    }
    if (button.dataset.navMessagesInit === "true") {
        return;
    }
    button.dataset.navMessagesInit = "true";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "navbarMessagesPanel");
    const control = ensureNavbarControlWrapper(button);
    if (!control) {
        return;
    }
    let panel = document.getElementById("navbarMessagesPanel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "navbarMessagesPanel";
        panel.className = "navbar-panel";
        panel.hidden = true;
        panel.setAttribute("role", "menu");
        panel.setAttribute("aria-label", "Messages");
        control.appendChild(panel);
    }
    panel.innerHTML = "";
    /*
    |--------------------------------------------------------------------------
    | Header
    |--------------------------------------------------------------------------
    */
    const header = document.createElement("div");
    header.className = "navbar-panel-header";
    header.textContent = "Messages";
    /*
    |--------------------------------------------------------------------------
    | Message list
    |--------------------------------------------------------------------------
    */
    const list = document.createElement("div");
    list.className = "navbar-panel-list";
    /*
    |--------------------------------------------------------------------------
    | Messaging unavailable
    |--------------------------------------------------------------------------
    |
    | Messaging is not currently an official Fleet module,
    | so there is no separate messaging RBAC permission.
    |--------------------------------------------------------------------------
    */
    const unavailable = document.createElement("button");
    unavailable.type = "button";
    unavailable.className = "navbar-panel-item";
    const unavailableTitle = document.createElement("strong");
    unavailableTitle.textContent = "No messaging module";
    const unavailableText = document.createElement("span");
    unavailableText.textContent =
        "Internal messages are not enabled in this system.";
    unavailable.appendChild(unavailableTitle);
    unavailable.appendChild(unavailableText);
    unavailable.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        fleetNavNotify("Messaging is not available in this system.", "info");
    });
    list.appendChild(unavailable);
    /*
    |--------------------------------------------------------------------------
    | Settings shortcut
    |--------------------------------------------------------------------------
    |
    | Only Fleet Manager / IT Admin currently have Settings access.
    |--------------------------------------------------------------------------
    */
    if (fleetNavCanAccess("settings")) {
        const settings = document.createElement("button");
        settings.type = "button";
        settings.className = "navbar-panel-item";
        const settingsTitle = document.createElement("strong");
        settingsTitle.textContent = "Open Settings";
        const settingsText = document.createElement("span");
        settingsText.textContent = "Configure fleet preferences";
        settings.appendChild(settingsTitle);
        settings.appendChild(settingsText);
        settings.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!fleetNavCanAccess("settings")) {
                return;
            }
            window.location.href = FLEET_NAV_ROUTES.settings;
        });
        list.appendChild(settings);
    }
    panel.appendChild(header);
    panel.appendChild(list);

    /*
    |--------------------------------------------------------------------------
    | Toggle panel
    |--------------------------------------------------------------------------
    */
    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const wasOpen = panel.classList.contains("is-open");
        closeAllNavbarPanels();
        if (wasOpen) {
            return;
        }
        panel.hidden = false;
        panel.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
    });
}

function formatNotificationAge(timestamp) {
    const createdSeconds = Number(timestamp);
    if (!Number.isFinite(createdSeconds)) {
        return "";
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.max(0, nowSeconds - createdSeconds);
    if (diffSeconds < 60) {
        return "now";
    }
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d`;
}
function refreshNavbarNotificationTimes() {
    document
        .querySelectorAll(
            ".navbar-notification-time[data-notification-timestamp]",
        )
        .forEach((element) => {
            element.textContent = formatNotificationAge(
                element.dataset.notificationTimestamp,
            );
        });
}
function startNavbarNotificationTimeUpdater() {
    if (navbarNotificationTimeInterval) {
        return;
    }

    navbarNotificationTimeInterval = window.setInterval(
        refreshNavbarNotificationTimes,
        30000,
    );
}
/* ==========================================
   Global Search
========================================== */
/*
|--------------------------------------------------------------------------
| Global DB-backed Fleet Search
|--------------------------------------------------------------------------
*/
function initNavbarSearch() {
    const box = document.querySelector(".navbar-center .search-box");
    const input = box?.querySelector("input");
    if (!box || !input) {
        return;
    }
    if (input.dataset.navSearchInit === "true") {
        return;
    }
    input.dataset.navSearchInit = "true";
    let results = document.getElementById("navbarSearchResults");
    if (!results) {
        results = document.createElement("div");
        results.id = "navbarSearchResults";
        results.className = "navbar-search-results";
        results.hidden = true;
        results.setAttribute("role", "listbox");
        results.setAttribute("aria-label", "Search results");
        box.classList.add("navbar-search-wrap");
        box.appendChild(results);
    }

    let timer = null;
    let requestController = null;
    async function searchFleet(query) {
        const q = String(query || "").trim();
        if (!q) {
            results.hidden = true;
            results.innerHTML = "";
            return;
        }
        if (requestController) {
            requestController.abort();
        }
        requestController = new AbortController();
        results.innerHTML =
            '<div class="navbar-search-empty">Searching...</div>';
        results.hidden = false;
        try {
            const response = await fetch(
                `/fleet-search?q=${encodeURIComponent(q)}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    signal: requestController.signal,
                },
            );
            if (!response.ok) {
                throw new Error(`Search failed (${response.status}).`);
            }

            const data = await response.json();
            const matches = Array.isArray(data?.results) ? data.results : [];
            results.innerHTML = "";
            if (!matches.length) {
                const empty = document.createElement("div");
                empty.className = "navbar-search-empty";
                empty.textContent = "No matching fleet records.";
                results.appendChild(empty);
                return;
            }

            matches.forEach((item) => {
                if (!fleetNavCanOpenSearchResult(item)) {
                    return;
                }
                const button = document.createElement("button");
                button.type = "button";
                button.className = "navbar-search-item";
                button.setAttribute("role", "option");
                const title = document.createElement("strong");
                title.textContent = item.label || item.type || "Result";
                const detail = document.createElement("span");
                detail.textContent =
                    item.type + (item.detail ? ` · ${item.detail}` : "");
                button.appendChild(title);
                button.appendChild(detail);
                button.addEventListener("click", () => {
                    if (item.url) {
                        window.location.href = item.url;
                    }
                });

                results.appendChild(button);
            });
        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }
            console.error("Fleet navbar search failed:", error);
            results.innerHTML =
                '<div class="navbar-search-empty">Unable to search fleet records.</div>';
            results.hidden = false;
        }
    }

    input.addEventListener("input", () => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            searchFleet(input.value);
        }, 250);
    });
    input.addEventListener("focus", () => {
        if (input.value.trim()) {
            searchFleet(input.value);
        }
    });
    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            input.value = "";
            results.hidden = true;
            results.innerHTML = "";
            input.blur();
        }
    });
}

/* ==========================================
   Navbar Initialization
========================================== */
function initNavbarInteractions() {
    const navbar = document.querySelector(".navbar-custom");

    if (!navbar) {
        return;
    }
    ensureToastHost();
    /*
    |--------------------------------------------------------------------------
    | Safe to call repeatedly
    |--------------------------------------------------------------------------
    |
    | Each component has its own initialization guard.
    |
    */
    initNavbarSearch();
    initNavbarNotifications();
    initNavbarMessages();
    /*
    |--------------------------------------------------------------------------
    | Global events only once
    |--------------------------------------------------------------------------
    */
    if (navbarGlobalEventsInitialized) {
        return;
    }
    navbarGlobalEventsInitialized = true;
    document.addEventListener("click", (event) => {
        if (
            event.target.closest(".navbar-control") ||
            event.target.closest(".navbar-search-wrap")
        ) {
            return;
        }
        closeAllNavbarPanels();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAllNavbarPanels();
        }
    });
}

/* ==========================================
   Boot Navbar
========================================== */
function bootNavbarInteractions() {
    initNavbarInteractions();
    setTimeout(initNavbarInteractions, 100);
    setTimeout(initNavbarInteractions, 500);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootNavbarInteractions);
} else {
    bootNavbarInteractions();
}


function startNavbarObserver() {
    if (navbarObserverStarted) {
        return;
    }
    navbarObserverStarted = true;
    const observer = new MutationObserver(() => {
        initNavbarInteractions();
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

startNavbarObserver();
