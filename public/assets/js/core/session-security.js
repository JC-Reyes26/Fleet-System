/* ==========================================
   HIMS Fleet Session Security
========================================== */

(() => {
    "use strict";

    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const TAB_HEARTBEAT = 2000;
    const TAB_EXPIRY = 7000;
    const ACTIVITY_PING_INTERVAL = 30000;

    const TAB_ID_KEY = "himsFleetTabId";
    const OPEN_TABS_KEY = "himsFleetOpenTabs";
    const SESSION_STATE_KEY = "himsFleetSessionState";
    const LOGOUT_EVENT_KEY = "himsFleetLogoutEvent";
    const LAST_EXIT_KEY = "himsFleetLastExit";

    let logoutStarted = false;
    let lastActivityAt = Date.now();
    let lastActivityPingAt = 0;

    function getCsrfToken() {
        return document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content");
    }

    function safeParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    }

    function getTabId() {
        try {
            let tabId = sessionStorage.getItem(TAB_ID_KEY);

            if (!tabId) {
                tabId =
                    "tab_" +
                    Date.now() +
                    "_" +
                    Math.random().toString(36).slice(2, 12);

                sessionStorage.setItem(TAB_ID_KEY, tabId);
            }

            return tabId;
        } catch {
            return (
                "tab_" +
                Date.now() +
                "_" +
                Math.random().toString(36).slice(2, 12)
            );
        }
    }

    const tabId = getTabId();

    function getOpenTabs() {
        return safeParse(localStorage.getItem(OPEN_TABS_KEY), {});
    }

    function saveOpenTabs(tabs) {
        try {
            localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(tabs));
        } catch {
            // Ignore storage failures.
        }
    }

    function pruneOpenTabs() {
        const now = Date.now();
        const tabs = getOpenTabs();

        let changed = false;

        Object.keys(tabs).forEach((id) => {
            if (now - Number(tabs[id]) > TAB_EXPIRY) {
                delete tabs[id];
                changed = true;
            }
        });

        if (changed) {
            saveOpenTabs(tabs);
        }

        return tabs;
    }

    function registerTab() {
        const tabs = pruneOpenTabs();

        tabs[tabId] = Date.now();

        saveOpenTabs(tabs);
    }

    function unregisterTab() {
        const tabs = getOpenTabs();

        if (tabs[tabId]) {
            delete tabs[tabId];
            saveOpenTabs(tabs);
        }

        try {
            localStorage.setItem(
                LAST_EXIT_KEY,
                JSON.stringify({
                    tabId,
                    timestamp: Date.now(),
                }),
            );
        } catch {
            // Ignore storage failures.
        }
    }

    function getSessionState() {
        return safeParse(localStorage.getItem(SESSION_STATE_KEY), null);
    }

    function setSessionState(state) {
        try {
            localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
        } catch {
            // Ignore storage failures.
        }
    }

    function getOtherActiveTabs() {
        const tabs = pruneOpenTabs();

        return Object.keys(tabs).filter((id) => id !== tabId);
    }

    /*
    |--------------------------------------------------------------------------
    | Detect opening a new tab after all previous Fleet tabs were closed.
    |--------------------------------------------------------------------------
    */
    async function enforceFreshLoginAfterLastTabClosed() {
        const sessionState = getSessionState();

        const otherTabs = getOtherActiveTabs();

        const lastExit = safeParse(localStorage.getItem(LAST_EXIT_KEY), null);

        /*
        |--------------------------------------------------------------------------
        | Same tab navigation/reload:
        | sessionStorage keeps the same tab ID.
        |--------------------------------------------------------------------------
        */
        if (lastExit && lastExit.tabId === tabId) {
            try {
                localStorage.removeItem(LAST_EXIT_KEY);
            } catch {
                // Ignore.
            }

            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Another Fleet tab is still open.
        |--------------------------------------------------------------------------
        */
        if (otherTabs.length > 0) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | No previous Fleet session marker.
        | This is likely the first authenticated page load after login.
        |--------------------------------------------------------------------------
        */
        if (!sessionState?.active) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | This is a NEW tab and no Fleet tabs remain.
        | Force Laravel logout before allowing the application to continue.
        |--------------------------------------------------------------------------
        */
        await performFleetLogout(false, true);

        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | Send activity timestamp to Laravel.
    |--------------------------------------------------------------------------
    */
    async function sendActivityPing(force = false) {
        const now = Date.now();

        if (!force && now - lastActivityPingAt < ACTIVITY_PING_INTERVAL) {
            return;
        }

        lastActivityPingAt = now;

        try {
            await fetch("/session/activity", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify({}),
            });
        } catch {
            // Network failures are handled by the regular session checks.
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Shared activity across every Fleet tab.
    |--------------------------------------------------------------------------
    */
    function recordActivity() {
        if (logoutStarted) {
            return;
        }

        lastActivityAt = Date.now();

        setSessionState({
            active: true,
            lastActivityAt,
        });

        sendActivityPing(false);
    }

    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */
    async function performFleetLogout(redirect = true, force = false) {
        if (logoutStarted) {
            return;
        }

        logoutStarted = true;

        try {
            setSessionState({
                active: false,
                logoutAt: Date.now(),
            });

            localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
        } catch {
            // Ignore storage failures.
        }

        const csrfToken = getCsrfToken();

        try {
            await fetch("/logout", {
                method: "POST",
                credentials: "same-origin",
                keepalive: true,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken || "",
                },
                body: JSON.stringify({}),
            });
        } catch {
            /*
            |--------------------------------------------------------------------------
            | Even if the request fails, redirect to login.
            | Laravel auth middleware will enforce authentication server-side.
            |--------------------------------------------------------------------------
            */
        }

        if (redirect) {
            window.location.replace(force ? "/login?timeout=1" : "/login");
        }
    }

    /*
    |--------------------------------------------------------------------------
    | 5-minute inactivity checker
    |--------------------------------------------------------------------------
    */
    function checkIdleTimeout() {
        if (logoutStarted) {
            return;
        }

        const sessionState = getSessionState();

        const sharedActivity = Number(sessionState?.lastActivityAt || 0);

        const latestActivity = Math.max(lastActivityAt, sharedActivity);

        if (latestActivity <= 0) {
            return;
        }

        if (Date.now() - latestActivity >= IDLE_TIMEOUT) {
            performFleetLogout(true, true);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Keep the local copy synchronized across tabs.
        |--------------------------------------------------------------------------
        */
        if (sharedActivity > lastActivityAt) {
            lastActivityAt = sharedActivity;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Cross-tab logout listener
    |--------------------------------------------------------------------------
    */
    function initCrossTabLogout() {
        window.addEventListener("storage", (event) => {
            if (event.key === LOGOUT_EVENT_KEY) {
                window.location.replace("/login?timeout=1");
            }

            if (event.key === SESSION_STATE_KEY) {
                const state = safeParse(event.newValue, null);

                if (state && state.active === false) {
                    window.location.replace("/login?timeout=1");
                }

                if (state?.lastActivityAt) {
                    lastActivityAt = Math.max(
                        lastActivityAt,
                        Number(state.lastActivityAt),
                    );
                }
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | User activity listeners
    |--------------------------------------------------------------------------
    */
    function initActivityTracking() {
        const events = [
            "pointerdown",
            "keydown",
            "wheel",
            "scroll",
            "touchstart",
            "mousemove",
        ];

        let activityScheduled = false;

        const handler = () => {
            if (activityScheduled) {
                return;
            }

            activityScheduled = true;

            requestAnimationFrame(() => {
                activityScheduled = false;

                recordActivity();
            });
        };

        events.forEach((eventName) => {
            window.addEventListener(eventName, handler, {
                passive: true,
            });
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Keep this tab registered.
    |--------------------------------------------------------------------------
    */
    function initTabHeartbeat() {
        registerTab();

        setInterval(() => {
            if (logoutStarted) {
                return;
            }

            registerTab();
        }, TAB_HEARTBEAT);
    }

    /*
    |--------------------------------------------------------------------------
    | Remove tab when leaving/closing.
    |--------------------------------------------------------------------------
    */
    function initTabExitHandler() {
        window.addEventListener("pagehide", () => {
            unregisterTab();
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Initial boot
    |--------------------------------------------------------------------------
    */
    async function boot() {
        const wasForcedToLogin = await enforceFreshLoginAfterLastTabClosed();

        if (wasForcedToLogin) {
            return;
        }

        registerTab();

        const sessionState = getSessionState();

        const now = Date.now();

        if (!sessionState || sessionState.active !== true) {
            lastActivityAt = now;

            setSessionState({
                active: true,
                lastActivityAt: now,
            });

            await sendActivityPing(true);
        } else {
            lastActivityAt = Number(sessionState.lastActivityAt || now);
        }

        initCrossTabLogout();
        initActivityTracking();
        initTabHeartbeat();
        initTabExitHandler();

        setInterval(checkIdleTimeout, 1000);
    }

    /*
    |--------------------------------------------------------------------------
    | Expose logout helper for existing UI.
    |--------------------------------------------------------------------------
    */
    window.performFleetLogout = performFleetLogout;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
