document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("auditFilterForm");

    const search = document.getElementById("auditSearch");
    const moduleFilter = document.getElementById("auditModuleFilter");
    const actionFilter = document.getElementById("auditActionFilter");
    const dateFilter = document.getElementById("auditDateFilter");

    let searchTimer;

    function setDetailValue(id, value) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        element.textContent =
            value === null || value === undefined || value === "" ? "—" : value;
    }

    /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

    search?.addEventListener("input", function () {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(function () {
            form?.submit();
        }, 500);
    });

    moduleFilter?.addEventListener("change", function () {
        form?.submit();
    });

    actionFilter?.addEventListener("change", function () {
        form?.submit();
    });

    dateFilter?.addEventListener("change", function () {
        form?.submit();
    });

    /*
  |--------------------------------------------------------------------------
  | Audit Details Modal
  |--------------------------------------------------------------------------
  */

    const modal = document.getElementById("auditDetailsModal");

    function closeAuditModal() {
        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.setAttribute("hidden", "");

        document.body.classList.remove("modal-open");
    }

    document
        .getElementById("closeAuditDetailsModal")
        ?.addEventListener("click", closeAuditModal);

    document
        .getElementById("closeAuditDetailsModalFooter")
        ?.addEventListener("click", closeAuditModal);

    modal?.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeAuditModal();
        }
    });

    /*
  |--------------------------------------------------------------------------
  | Escape Key
  |--------------------------------------------------------------------------
  */

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal && !modal.hidden) {
            closeAuditModal();
        }
    });

    /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

    function prettyJson(value) {
        if (value === null || value === undefined) {
            return "—";
        }

        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return String(value);
        }
    }

    function formatRole(role) {
        if (!role) {
            return "—";
        }

        return role
            .replaceAll("_", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function formatTimestamp(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString();
    }

    function setInputValue(id, value) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        element.value =
            value === null || value === undefined || value === "" ? "—" : value;
    }

    function setTextValue(id, value) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        element.textContent =
            value === null || value === undefined || value === "" ? "—" : value;
    }

    /*
  |--------------------------------------------------------------------------
  | Load Audit Details
  |--------------------------------------------------------------------------
  */

    function loadAuditDetails(auditId) {
        if (!auditId) {
            return;
        }

        const dataElement = document.getElementById(`audit-data-${auditId}`);

        if (!dataElement) {
            console.error("Audit JSON element not found:", auditId);
            return;
        }

        let log;

        try {
            log = JSON.parse(dataElement.textContent);
        } catch (error) {
            console.error("Unable to parse audit data:", error);
            return;
        }

        setDetailValue("auditDetailUser", log.user_name || "Guest / System");
        setDetailValue("auditDetailEmail", log.user_email);
        setDetailValue("auditDetailRole", formatRole(log.user_role));
        setDetailValue("auditDetailModule", log.module);
        setDetailValue("auditDetailAction", log.action);
        setDetailValue("auditDetailTimestamp", formatTimestamp(log.created_at));
        setDetailValue("auditDetailIp", log.ip_address);
        setDetailValue("auditDetailMethod", log.request_method);
        setDetailValue("auditDetailPath", log.request_path);
        setDetailValue("auditDetailDescription", log.description);
        setDetailValue("auditDetailUserAgent", log.user_agent);
        setTextValue("auditDetailOldValues", prettyJson(log.old_values));
        setTextValue("auditDetailNewValues", prettyJson(log.new_values));

        if (!modal) {
            console.error("Audit modal not found.");
            return;
        }

        modal.removeAttribute("hidden");
        modal.classList.add("show");
        document.body.classList.add("modal-open");
    }

    /*
  |--------------------------------------------------------------------------
  | View Buttons
  |--------------------------------------------------------------------------
  */

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".audit-view-btn");
        if (!button) {
            return;
        }
        event.preventDefault();
        loadAuditDetails(button.dataset.auditId);
    });
});
