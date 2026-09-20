/* ==========================================
   Driver Bulk Actions
========================================== */

let driverBulkState = null;

function getDriverBulkRows() {
    if (!driverBulkState || typeof getDriverDataRows !== "function") {
        return [];
    }

    return getDriverDataRows(driverBulkState.tableBody);
}

function getDriverBulkCheckboxes() {
    return getDriverBulkRows()
        .map((row) => row.querySelector(".driver-checkbox"))
        .filter(Boolean);
}

function getVisibleDriverBulkCheckboxes() {
    return getDriverBulkRows()
        .filter((row) => row.style.display !== "none")
        .map((row) => row.querySelector(".driver-checkbox"))
        .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| Refresh Bulk State
|--------------------------------------------------------------------------
*/
function refreshDriverBulkState() {
    if (!driverBulkState) {
        return;
    }

    const { selectAll, toolbar, selectedCount, archiveButton } =
        driverBulkState;

    const showArchived =
        document.getElementById("showArchivedDrivers")?.checked === true;

    /*
    |--------------------------------------------------------------------------
    | Archived mode
    |--------------------------------------------------------------------------
    */
    if (showArchived) {
        toolbar.classList.remove("show");

        selectAll.checked = false;
        selectAll.indeterminate = false;

        selectedCount.textContent = "0 drivers selected";

        archiveButton.disabled = true;

        return;
    }

    const checkboxes = getDriverBulkCheckboxes();

    const visibleCheckboxes = getVisibleDriverBulkCheckboxes();

    const selectedCheckboxes = checkboxes.filter(
        (checkbox) => checkbox.checked,
    );

    const selectedVisibleCheckboxes = visibleCheckboxes.filter(
        (checkbox) => checkbox.checked,
    );

    const allVisibleSelected =
        visibleCheckboxes.length > 0 &&
        selectedVisibleCheckboxes.length === visibleCheckboxes.length;

    selectedCount.textContent = `${selectedCheckboxes.length} driver${
        selectedCheckboxes.length === 1 ? "" : "s"
    } selected`;

    toolbar.classList.toggle("show", selectedCheckboxes.length > 0);

    archiveButton.disabled = selectedCheckboxes.length === 0;

    selectAll.checked = allVisibleSelected;

    selectAll.indeterminate =
        selectedVisibleCheckboxes.length > 0 && !allVisibleSelected;
}

/*
|--------------------------------------------------------------------------
| Clear Selection
|--------------------------------------------------------------------------
*/
function clearDriverSelection() {
    getDriverBulkCheckboxes().forEach((checkbox) => {
        checkbox.checked = false;
    });

    if (driverBulkState) {
        driverBulkState.selectAll.checked = false;

        driverBulkState.selectAll.indeterminate = false;
    }

    refreshDriverBulkState();
}

/*
|--------------------------------------------------------------------------
| Bulk Archive
|--------------------------------------------------------------------------
*/
async function handleArchiveSelectedDrivers() {
    if (!driverBulkState) {
        return;
    }

    const ids = getDriverBulkCheckboxes()
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.dataset.id)
        .filter(Boolean);

    if (ids.length === 0) {
        return;
    }

    const archiveButton = document.getElementById("archiveSelectedDrivers");

    if (archiveButton) {
        archiveButton.disabled = true;

        archiveButton.innerHTML = '<i class="ph ph-spinner"></i> Archiving...';
    }

    try {
        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content");

        const response = await fetch("/drivers/bulk-archive", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",

                Accept: "application/json",

                ...(csrfToken
                    ? {
                          "X-CSRF-TOKEN": csrfToken,
                      }
                    : {}),
            },

            credentials: "same-origin",

            body: JSON.stringify({
                ids: ids,
            }),
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            if (typeof window.showToast === "function") {
                window.showToast(
                    data.message || "Failed to archive drivers.",
                    "error",
                );
            }

            return;
        }

        clearDriverSelection();

        /*
        |--------------------------------------------------------------------------
        | Reload backend state
        |--------------------------------------------------------------------------
        */
        if (typeof loadDrivers === "function") {
            await loadDrivers();
        }

        /*
        |--------------------------------------------------------------------------
        | Refresh vehicle options
        |--------------------------------------------------------------------------
        */
        if (typeof loadDriverVehicleOptions === "function") {
            await loadDriverVehicleOptions();
        }

        if (typeof window.showToast === "function") {
            window.showToast(
                data.message || "Drivers archived successfully.",
                "success",
            );
        }
    } catch (error) {
        console.error("Driver bulk archive error:", error);

        if (typeof window.showToast === "function") {
            window.showToast(
                "Something went wrong while archiving drivers.",
                "error",
            );
        }
    } finally {
        if (archiveButton) {
            archiveButton.disabled = false;

            archiveButton.innerHTML =
                '<i class="ph ph-archive"></i> Archive Selected';
        }

        refreshDriverBulkState();
    }
}

/*
|--------------------------------------------------------------------------
| Initialize Bulk Actions
|--------------------------------------------------------------------------
*/
function initDriverBulkActions() {
    const tableBody = document.getElementById("driverTableBody");

    const selectAll = document.getElementById("selectAllDrivers");

    const toolbar = document.getElementById("driverBulkToolbar");

    const selectedCount = document.getElementById("driverSelectedCount");

    const clearButton = document.getElementById("clearDriverSelection");

    const archiveButton = document.getElementById("archiveSelectedDrivers");

    /*
    |--------------------------------------------------------------------------
    | No bulk UI for this role/page.
    |--------------------------------------------------------------------------
    */
    if (
        !tableBody ||
        !selectAll ||
        !toolbar ||
        !selectedCount ||
        !archiveButton
    ) {
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate initialization.
    |--------------------------------------------------------------------------
    */
    if (tableBody.dataset.driverBulkInitialized === "true") {
        refreshDriverBulkState();

        return;
    }

    tableBody.dataset.driverBulkInitialized = "true";

    driverBulkState = {
        tableBody,
        selectAll,
        toolbar,
        selectedCount,
        archiveButton,
    };

    /*
    |--------------------------------------------------------------------------
    | Select All
    |--------------------------------------------------------------------------
    */
    selectAll.addEventListener("change", () => {
        const showArchived =
            document.getElementById("showArchivedDrivers")?.checked === true;

        if (showArchived) {
            selectAll.checked = false;

            return;
        }

        getVisibleDriverBulkCheckboxes().forEach((checkbox) => {
            checkbox.checked = selectAll.checked;
        });

        refreshDriverBulkState();
    });

    /*
    |--------------------------------------------------------------------------
    | Individual checkboxes
    |--------------------------------------------------------------------------
    */
    tableBody.addEventListener("change", (event) => {
        if (!event.target?.classList?.contains("driver-checkbox")) {
            return;
        }

        refreshDriverBulkState();
    });

    /*
    |--------------------------------------------------------------------------
    | Clear
    |--------------------------------------------------------------------------
    */
    clearButton?.addEventListener("click", clearDriverSelection);

    /*
    |--------------------------------------------------------------------------
    | Bulk Archive
    |--------------------------------------------------------------------------
    */
    archiveButton.addEventListener("click", handleArchiveSelectedDrivers);

    refreshDriverBulkState();
}

/*
|--------------------------------------------------------------------------
| Initialize
|--------------------------------------------------------------------------
*/
document.addEventListener("DOMContentLoaded", () => {
    initDriverBulkActions();
});
