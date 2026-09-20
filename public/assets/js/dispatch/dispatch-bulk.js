/* ==========================================
   HIMS Fleet - Dispatch Bulk Actions
========================================== */

function getSelectedDispatchRows() {
    return Array.from(
        document.querySelectorAll(
            "#dispatchTableBody .dispatch-checkbox:checked",
        ),
    )
        .map((checkbox) => checkbox.closest("tr"))
        .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| Update Selected Count
|--------------------------------------------------------------------------
*/
function updateDispatchSelectedCount() {
    const countElement = document.getElementById("dispatchSelectedCount");

    if (!countElement) {
        return;
    }

    const selectedRows = getSelectedDispatchRows();

    const count = selectedRows.length;

    countElement.textContent = `${count} dispatch${count === 1 ? "" : "es"} selected`;
}

/*
|--------------------------------------------------------------------------
| Refresh Bulk Toolbar State
|--------------------------------------------------------------------------
*/
function refreshDispatchBulkState() {
    const toolbar = document.getElementById("dispatchBulkToolbar");

    const archiveBtn = document.getElementById("archiveSelectedDispatches");

    const showArchived = document.getElementById("showArchivedDispatches");

    const isArchivedMode = showArchived?.checked === true;

    updateDispatchSelectedCount();

    if (!toolbar || !archiveBtn) {
        return;
    }

    /*
     * Archived mode:
     * no bulk archive.
     */
    if (isArchivedMode) {
        toolbar.classList.remove("show");

        archiveBtn.disabled = true;

        return;
    }

    const selectedRows = getSelectedDispatchRows();

    /*
     * No selection.
     */
    if (selectedRows.length === 0) {
        toolbar.classList.remove("show");

        archiveBtn.disabled = true;

        return;
    }

    /*
     * Active rows only.
     */
    const activeRows = selectedRows.filter((row) => !row.dataset.archivedAt);

    if (activeRows.length === 0) {
        toolbar.classList.remove("show");

        archiveBtn.disabled = true;

        return;
    }

    /*
     * Show bulk toolbar.
     */
    toolbar.classList.add("show");

    archiveBtn.disabled = false;
}

/*
|--------------------------------------------------------------------------
| Clear Dispatch Selection
|--------------------------------------------------------------------------
*/
function clearDispatchSelection() {
    document
        .querySelectorAll("#dispatchTableBody .dispatch-checkbox:checked")
        .forEach((checkbox) => {
            checkbox.checked = false;
        });

    const selectAll = document.getElementById("selectAllDispatches");

    if (selectAll) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }

    refreshDispatchBulkState();
}

/*
|--------------------------------------------------------------------------
| Row Checkbox Listener
|--------------------------------------------------------------------------
*/
function initDispatchBulkCheckboxes() {
    document.addEventListener("change", (event) => {
        if (!event.target.matches("#dispatchTableBody .dispatch-checkbox")) {
            return;
        }

        const checkboxes = Array.from(
            document.querySelectorAll("#dispatchTableBody .dispatch-checkbox"),
        );

        const checkedCheckboxes = checkboxes.filter(
            (checkbox) => checkbox.checked,
        );

        const selectAll = document.getElementById("selectAllDispatches");

        if (selectAll) {
            selectAll.checked =
                checkboxes.length > 0 &&
                checkedCheckboxes.length === checkboxes.length;

            selectAll.indeterminate =
                checkedCheckboxes.length > 0 &&
                checkedCheckboxes.length < checkboxes.length;
        }

        refreshDispatchBulkState();
    });
}

/*
|--------------------------------------------------------------------------
| Select All Listener
|--------------------------------------------------------------------------
*/
function initDispatchSelectAll() {
    document.addEventListener("change", (event) => {
        if (event.target.id !== "selectAllDispatches") {
            return;
        }

        const showArchived = document.getElementById("showArchivedDispatches");

        if (showArchived?.checked === true) {
            event.target.checked = false;
            event.target.indeterminate = false;

            return;
        }

        const checkboxes = document.querySelectorAll(
            "#dispatchTableBody .dispatch-checkbox",
        );

        checkboxes.forEach((checkbox) => {
            checkbox.checked = event.target.checked;
        });

        refreshDispatchBulkState();
    });
}

/*
|--------------------------------------------------------------------------
| Clear Button
|--------------------------------------------------------------------------
*/
function initDispatchClearSelection() {
    const clearButton = document.getElementById("clearDispatchSelection");

    if (!clearButton) {
        return;
    }

    clearButton.addEventListener("click", clearDispatchSelection);
}

/*
|--------------------------------------------------------------------------
| Bulk Archive
|--------------------------------------------------------------------------
*/
async function handleArchiveSelected() {
    const tableBody = document.getElementById("dispatchTableBody");

    if (!tableBody) {
        return;
    }

    const rowsToArchive = getSelectedDispatchRows();

    if (rowsToArchive.length === 0) {
        return;
    }

    const activeRowsToArchive = rowsToArchive.filter(
        (row) => !row.dataset.archivedAt,
    );

    if (activeRowsToArchive.length === 0) {
        if (typeof showToast === "function") {
            showToast("No active dispatches selected for archiving.", "error");
        }

        return;
    }

    const dispatchIds = activeRowsToArchive
        .map((row) => row.dataset.id)
        .filter(Boolean);

    if (dispatchIds.length === 0) {
        return;
    }

    const archiveBtn = document.getElementById("archiveSelectedDispatches");

    if (archiveBtn) {
        archiveBtn.disabled = true;

        archiveBtn.innerHTML = '<i class="ph ph-spinner"></i> Archiving...';
    }

    try {
        const response = await fetch("/dispatch/bulk-archive", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

                Accept: "application/json",

                "X-CSRF-TOKEN": document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content"),
            },
            credentials: "same-origin",
            body: JSON.stringify({
                dispatch_ids: dispatchIds,
            }),
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            console.error(data);

            if (typeof showToast === "function") {
                showToast(
                    data.message || "Failed to archive dispatches.",
                    "error",
                );
            }

            return;
        }

        clearDispatchSelection();

        /*
        |--------------------------------------------------------------------------
        | Reload backend state
        |--------------------------------------------------------------------------
        */
        if (typeof loadDispatches === "function") {
            await loadDispatches();
        }

        /*
        |--------------------------------------------------------------------------
        | Refresh available reservations
        |--------------------------------------------------------------------------
        */
        if (typeof loadAvailableReservations === "function") {
            await loadAvailableReservations();
        }

        if (typeof applyDispatchFilters === "function") {
            applyDispatchFilters({
                resetPage: false,
            });
        }

        if (typeof updateDispatchStatistics === "function") {
            updateDispatchStatistics();
        }

        if (typeof refreshDispatchPagination === "function") {
            refreshDispatchPagination({
                reset: false,
            });
        } else if (typeof updateDispatchPagination === "function") {
            updateDispatchPagination();
        }

        refreshDispatchBulkState();

        const archivedCount = Array.isArray(data.archived_ids)
            ? data.archived_ids.length
            : 0;

        if (typeof showToast === "function") {
            if (archivedCount > 0) {
                showToast(
                    data.message ||
                        `${archivedCount} dispatch${
                            archivedCount === 1 ? "" : "es"
                        } archived successfully.`,
                    "success",
                );
            } else {
                showToast(
                    data.message || "No selected dispatches could be archived.",
                    "error",
                );
            }
        }
    } catch (error) {
        console.error("Bulk dispatch archive error:", error);

        if (typeof showToast === "function") {
            showToast(
                "Something went wrong while archiving dispatches.",
                "error",
            );
        }
    } finally {
        if (archiveBtn) {
            archiveBtn.disabled = false;

            archiveBtn.innerHTML =
                '<i class="ph ph-archive"></i> Archive Selected';
        }

        refreshDispatchBulkState();
    }
}

/*
|--------------------------------------------------------------------------
| Initialization
|--------------------------------------------------------------------------
*/
document.addEventListener("DOMContentLoaded", () => {
    initDispatchBulkCheckboxes();
    initDispatchSelectAll();
    initDispatchClearSelection();

    const archiveButton = document.getElementById("archiveSelectedDispatches");

    if (archiveButton) {
        archiveButton.addEventListener("click", handleArchiveSelected);
    }

    refreshDispatchBulkState();
});
