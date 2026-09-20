/* ==========================================
   Maintenance Bulk Selection + Bulk Archive

   Uses database IDs only.
========================================== */

const selectedMaintenanceIds = new Set();

let maintenanceBulkState = null;

/* ==========================================
   ID Helpers
========================================== */

function getMaintenanceRecordId(row) {
    if (!row) {
        return "";
    }
    const id = (row.dataset.id || "").trim();
    if (!id || !/^\d+$/.test(id)) {
        return "";
    }
    return id;
}

function ensureMaintenanceRecordId(row) {
    return getMaintenanceRecordId(row);
}

/* ==========================================
   Rows
========================================== */

function getMaintenanceBulkRows() {
    if (!maintenanceBulkState) {
        const tableBody = document.getElementById("maintenanceTableBody");

        if (!tableBody || typeof getMaintenanceDataRows !== "function") {
            return [];
        }
        return getMaintenanceDataRows(tableBody);
    }
    if (typeof getMaintenanceDataRows === "function") {
        return getMaintenanceDataRows(maintenanceBulkState.tableBody);
    }
    return Array.from(
        maintenanceBulkState.tableBody.querySelectorAll("tr"),
    ).filter((row) => row.querySelector(".maintenance-checkbox"));
}

function getVisibleMaintenanceBulkRows() {
    return getMaintenanceBulkRows().filter(
        (row) => row.style.display !== "none",
    );
}

/* ==========================================
   Sync Selection UI
========================================== */

function syncMaintenanceSelectionUI() {
    const tableBody =
        maintenanceBulkState?.tableBody ||
        document.getElementById("maintenanceTableBody");
    const selectAll =
        maintenanceBulkState?.selectAll ||
        document.getElementById("selectAllMaintenance");
    const toolbar =
        maintenanceBulkState?.toolbar ||
        document.getElementById("maintenanceBulkToolbar");
    const selectedCount =
        maintenanceBulkState?.selectedCount ||
        document.getElementById("maintenanceSelectedCount");
    const archiveButton =
        maintenanceBulkState?.archiveButton ||
        document.getElementById("archiveSelectedMaintenance");
    if (!tableBody) {
        return;
    }
    const showArchived =
        document.getElementById("showArchivedMaintenances")?.checked === true;
    const dataRows =
        typeof getMaintenanceDataRows === "function"
            ? getMaintenanceDataRows(tableBody)
            : getMaintenanceBulkRows();

    /*
    |--------------------------------------------------------------------------
    | Archived mode
    |--------------------------------------------------------------------------
    */
    if (showArchived) {
        selectedMaintenanceIds.clear();
        dataRows.forEach((row) => {
            row.classList.remove("is-selected");
            const checkbox = row.querySelector(".maintenance-checkbox");
            if (checkbox) {
                checkbox.checked = false;
            }
        });
        if (selectedCount) {
            selectedCount.textContent = "0 maintenance selected";
        }
        if (toolbar) {
            toolbar.classList.remove("show");
        }
        if (archiveButton) {
            archiveButton.disabled = true;
        }
        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
            selectAll.hidden = true;
        }

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Active mode
    |--------------------------------------------------------------------------
    */
    dataRows.forEach((row) => {
        const id = ensureMaintenanceRecordId(row);
        const checkbox = row.querySelector(".maintenance-checkbox");
        const isSelected = Boolean(id && selectedMaintenanceIds.has(id));
        if (checkbox) {
            checkbox.checked = isSelected;
            if (id) {
                checkbox.dataset.id = id;

                checkbox.setAttribute(
                    "aria-label",
                    `Select maintenance ${
                        row
                            .querySelector(".maintenance-number")
                            ?.textContent?.trim() || id
                    }`,
                );
            }
        }

        row.classList.toggle("is-selected", isSelected);
    });
    const visibleRows = dataRows.filter((row) => row.style.display !== "none");
    const selectedVisibleCount = visibleRows.filter((row) => {
        const id = getMaintenanceRecordId(row);
        return id && selectedMaintenanceIds.has(id);
    }).length;
    const totalSelected = selectedMaintenanceIds.size;
    const allVisibleSelected =
        visibleRows.length > 0 && selectedVisibleCount === visibleRows.length;
    const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
    if (selectedCount) {
        selectedCount.textContent =
            totalSelected === 1
                ? "1 maintenance selected"
                : `${totalSelected} maintenance records selected`;
    }
    if (toolbar) {
        toolbar.classList.toggle("show", totalSelected > 0);
    }
    if (archiveButton) {
        archiveButton.disabled =
            totalSelected === 0 || archiveButton.dataset.processing === "true";
    }

    if (selectAll) {
        selectAll.hidden = false;
        selectAll.disabled = visibleRows.length === 0;
        selectAll.checked = allVisibleSelected;
        selectAll.indeterminate = someVisibleSelected;
    }
}

function refreshMaintenanceBulkState() {
    syncMaintenanceSelectionUI();
}

/* ==========================================
   Clear
========================================== */

function clearMaintenanceSelection() {
    selectedMaintenanceIds.clear();
    syncMaintenanceSelectionUI();
}

function setMaintenanceRowSelected(row, selected) {
    const id = ensureMaintenanceRecordId(row);
    if (!id) {
        return;
    }
    if (selected) {
        selectedMaintenanceIds.add(id);
    } else {
        selectedMaintenanceIds.delete(id);
    }
}

function removeMaintenanceSelectionId(id) {
    const key = String(id || "").trim();
    if (!key) {
        return;
    }
    selectedMaintenanceIds.delete(key);
}

/* ==========================================
   Request Bulk Archive
========================================== */

function requestBulkArchiveMaintenance(opener) {
    const ids = Array.from(selectedMaintenanceIds);

    if (ids.length === 0) {
        return;
    }
    const validIds = ids.filter((id) => /^\d+$/.test(String(id)));
    if (validIds.length === 0) {
        return;
    }
    if (typeof openBulkArchiveMaintenanceModal === "function") {
        openBulkArchiveMaintenanceModal(validIds, opener || null);

        return;
    }
    if (typeof showToast === "function") {
        showToast("Archive confirmation is unavailable.", "error");
    }
}

/* ==========================================
   Initialize
========================================== */
function initMaintenanceBulkSelection() {
    const tableBody = document.getElementById("maintenanceTableBody");
    const selectAll = document.getElementById("selectAllMaintenance");
    const toolbar = document.getElementById("maintenanceBulkToolbar");
    const selectedCount = document.getElementById("maintenanceSelectedCount");
    const clearButton = document.getElementById("clearMaintenanceSelection");
    const archiveButton = document.getElementById("archiveSelectedMaintenance");

    if (!tableBody || !selectAll || !toolbar || !selectedCount) {
        return;
    }

    if (tableBody.dataset.maintenanceBulkInitialized === "true") {
        syncMaintenanceSelectionUI();

        return;
    }

    tableBody.dataset.maintenanceBulkInitialized = "true";

    maintenanceBulkState = {
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
            document.getElementById("showArchivedMaintenances")?.checked ===
            true;
        if (showArchived) {
            selectAll.checked = false;

            return;
        }
        const shouldSelect = selectAll.checked;
        const visibleRows = getVisibleMaintenanceBulkRows();
        visibleRows.forEach((row) => {
            setMaintenanceRowSelected(row, shouldSelect);
        });
        syncMaintenanceSelectionUI();
    });

    /*
    |--------------------------------------------------------------------------
    | Individual Checkbox
    |--------------------------------------------------------------------------
    */
    tableBody.addEventListener("change", (event) => {
        const checkbox = event.target;
        if (!checkbox?.classList?.contains("maintenance-checkbox")) {
            return;
        }
        const row = checkbox.closest("tr");
        if (!row) {
            return;
        }
        setMaintenanceRowSelected(row, checkbox.checked);
        syncMaintenanceSelectionUI();
    });

    /*
    |--------------------------------------------------------------------------
    | Clear
    |--------------------------------------------------------------------------
    */
    clearButton?.addEventListener("click", (event) => {
        event.preventDefault();
        clearMaintenanceSelection();
    });

    /*
    |--------------------------------------------------------------------------
    | Bulk Archive
    |--------------------------------------------------------------------------
    */
    archiveButton?.addEventListener("click", (event) => {
        event.preventDefault();

        if (archiveButton.disabled) {
            return;
        }
        archiveButton.dataset.processing = "true";
        requestBulkArchiveMaintenance(archiveButton);
    });
    syncMaintenanceSelectionUI();
}


document.addEventListener("DOMContentLoaded", () => {
    initMaintenanceBulkSelection();
});
