/* ==========================================
   Maintenance Archive / Restore
========================================== */

let maintenanceActionInitialized = false;

const maintenanceActionModal = {
    currentRow: null,
    opener: null,
    mode: "single", // single | bulk
    action: "archive",
    bulkIds: [],
};

function getMaintenanceDatabaseId(row) {
    if (!row) {
        return "";
    }
    const id = (row.dataset.id || "").trim();
    if (!id || !/^\d+$/.test(id)) {
        return "";
    }
    return id;
}

/* ==========================================
   Populate Single Archive / Restore Modal
========================================== */

function populateMaintenanceAction(row, action) {
    const number =
        row?.querySelector(".maintenance-number")?.textContent?.trim() ||
        "this maintenance record";
    const vehicle =
        row?.querySelector(".maintenance-vehicle")?.textContent?.trim() ||
        "this vehicle";
    const title = document.getElementById("deleteMaintenanceModalTitle");
    const description = document.getElementById(
        "deleteMaintenanceModalDescription",
    );
    const note = document.getElementById("deleteMaintenanceMessageText");
    const numberElement = document.getElementById("deleteMaintenanceNumber");
    const vehicleElement = document.getElementById("deleteMaintenanceVehicle");
    const confirmButton = document.getElementById("confirmDeleteMaintenance");
    if (numberElement) {
        numberElement.textContent = number;
    }
    if (vehicleElement) {
        vehicleElement.textContent = vehicle;
    }
    if (action === "restore") {
        if (title) {
            title.textContent = "Restore Maintenance Record";
        }
        if (description) {
            description.innerHTML =
                "Are you sure you want to restore " +
                `<strong>${number}</strong> ` +
                "for " +
                `<strong>${vehicle}</strong>?`;
        }
        if (note) {
            note.textContent =
                "This maintenance record will become active again.";
        }
        if (confirmButton) {
            confirmButton.classList.remove("btn-danger");
            confirmButton.classList.add("btn-primary");
            confirmButton.innerHTML =
                '<i class="ph ph-arrow-counter-clockwise"></i> Restore Maintenance';
        }

        return;
    }

    if (title) {
        title.textContent = "Archive Maintenance Record";
    }

    if (description) {
        description.innerHTML =
            "Are you sure you want to archive " +
            `<strong>${number}</strong> ` +
            "for " +
            `<strong>${vehicle}</strong>?`;
    }

    if (note) {
        note.textContent =
            "The maintenance record will be archived and preserved in the system.";
    }

    if (confirmButton) {
        confirmButton.classList.remove("btn-primary");
        confirmButton.classList.add("btn-danger");
        confirmButton.innerHTML =
            '<i class="ph ph-archive"></i> Archive Maintenance';
    }
}

/* ==========================================
   Populate Bulk Archive Modal
========================================== */

function populateBulkArchiveMaintenance(count) {
    const title = document.getElementById("deleteMaintenanceModalTitle");
    const description = document.getElementById(
        "deleteMaintenanceModalDescription",
    );
    const note = document.getElementById("deleteMaintenanceMessageText");
    const confirmButton = document.getElementById("confirmDeleteMaintenance");
    const safeCount = Number(count) || 0;

    if (title) {
        title.textContent = "Archive Selected Maintenance Records";
    }
    if (description) {
        description.textContent =
            "Archive " +
            safeCount +
            " selected maintenance record" +
            (safeCount === 1 ? "" : "s") +
            "?";
    }
    if (note) {
        note.textContent =
            "Selected records will be archived and preserved in the system. In-progress records cannot be archived.";
    }

    if (confirmButton) {
        confirmButton.classList.remove("btn-primary");
        confirmButton.classList.add("btn-danger");
        confirmButton.innerHTML =
            '<i class="ph ph-archive"></i> Archive Selected';
    }
}

/* ==========================================
   Open Single Modal
========================================== */

function openMaintenanceActionModal(row, opener, action = "archive") {
    const modal = document.getElementById("deleteMaintenanceModal");
    if (!modal || !row) {
        return;
    }
    const maintenanceId = getMaintenanceDatabaseId(row);
    if (!maintenanceId) {
        if (typeof showToast === "function") {
            showToast("Invalid maintenance record ID.", "error");
        }
        return;
    }

    maintenanceActionModal.mode = "single";
    maintenanceActionModal.action =
        action === "restore" ? "restore" : "archive";
    maintenanceActionModal.bulkIds = [];
    maintenanceActionModal.currentRow = row;
    maintenanceActionModal.opener = opener || null;
    modal.dataset.maintenanceId = maintenanceId;
    populateMaintenanceAction(row, maintenanceActionModal.action);
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    document.getElementById("cancelDeleteMaintenance")?.focus();
}

/* ==========================================
   Open Bulk Archive Modal
========================================== */

function openBulkArchiveMaintenanceModal(ids, opener = null) {
    const modal = document.getElementById("deleteMaintenanceModal");
    if (!modal) {
        return;
    }
    const bulkIds = Array.isArray(ids)
        ? ids.map((id) => String(id).trim()).filter((id) => /^\d+$/.test(id))
        : [];
    const uniqueIds = [...new Set(bulkIds)];

    if (uniqueIds.length === 0) {
        return;
    }

    maintenanceActionModal.mode = "bulk";
    maintenanceActionModal.action = "archive";
    maintenanceActionModal.bulkIds = uniqueIds;
    maintenanceActionModal.currentRow = null;
    maintenanceActionModal.opener = opener || null;
    delete modal.dataset.maintenanceId;

    populateBulkArchiveMaintenance(uniqueIds.length);

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    document.getElementById("cancelDeleteMaintenance")?.focus();
}

/* ==========================================
   Close Modal
========================================== */

function closeDeleteMaintenanceModal(opener = null) {
    const modal = document.getElementById("deleteMaintenanceModal");
    if (!modal || !modal.classList.contains("show")) {
        return;
    }
    modal.classList.remove("show");
    document.body.style.overflow = "";
    delete modal.dataset.maintenanceId;
    const focusTarget = opener || maintenanceActionModal.opener;
    maintenanceActionModal.currentRow = null;
    maintenanceActionModal.opener = null;
    maintenanceActionModal.mode = "single";
    maintenanceActionModal.action = "archive";
    maintenanceActionModal.bulkIds = [];
    if (focusTarget && focusTarget.isConnected) {
        focusTarget.focus();
    }
}

/* ==========================================
   Single Archive / Restore
========================================== */

async function confirmSingleMaintenanceAction() {
    const modal = document.getElementById("deleteMaintenanceModal");
    const row = maintenanceActionModal.currentRow;
    if (!modal || !row) {
        closeDeleteMaintenanceModal();

        return;
    }
    const maintenanceId = getMaintenanceDatabaseId(row);
    if (!maintenanceId) {
        closeDeleteMaintenanceModal();
        if (typeof showToast === "function") {
            showToast("Invalid maintenance record ID.", "error");
        }
        return;
    }
    const action =
        maintenanceActionModal.action === "restore" ? "restore" : "archive";
    const confirmButton = document.getElementById("confirmDeleteMaintenance");
    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.innerHTML =
            action === "restore"
                ? '<i class="ph ph-spinner"></i> Restoring...'
                : '<i class="ph ph-spinner"></i> Archiving...';
    }

    try {
        const endpoint =
            action === "restore"
                ? `/maintenance/${encodeURIComponent(maintenanceId)}/restore`
                : `/maintenance/${encodeURIComponent(maintenanceId)}/archive`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "X-CSRF-TOKEN":
                    document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content") || "",
            },
            credentials: "same-origin",
        });
        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }
        if (!response.ok) {
            throw new Error(
                data.message ||
                    (action === "restore"
                        ? "Failed to restore maintenance record."
                        : "Failed to archive maintenance record."),
            );
        }

        const opener = maintenanceActionModal.opener;
        closeDeleteMaintenanceModal(opener);
        if (typeof loadMaintenances === "function") {
            await loadMaintenances();
        }
        if (typeof loadAvailableMaintenanceVehicles === "function") {
            await loadAvailableMaintenanceVehicles();
        }
        if (typeof updateMaintenanceStatistics === "function") {
            updateMaintenanceStatistics();
        }
        if (typeof refreshMaintenancePagination === "function") {
            refreshMaintenancePagination();
        } else if (typeof updateMaintenancePagination === "function") {
            updateMaintenancePagination();
        }
        if (typeof refreshMaintenanceBulkState === "function") {
            refreshMaintenanceBulkState();
        }
        if (typeof showToast === "function") {
            showToast(
                data.message ||
                    (action === "restore"
                        ? "Maintenance record restored successfully."
                        : "Maintenance record archived successfully."),
                "success",
            );
        }
    } catch (error) {
        console.error(`Maintenance ${action} error:`, error);

        if (typeof showToast === "function") {
            showToast(
                error.message ||
                    (action === "restore"
                        ? "Failed to restore maintenance record."
                        : "Failed to archive maintenance record."),
                "error",
            );
        }
    } finally {
        if (confirmButton) {
            confirmButton.disabled = false;

            if (action === "restore") {
                confirmButton.classList.remove("btn-danger");
                confirmButton.classList.add("btn-primary");
                confirmButton.innerHTML =
                    '<i class="ph ph-arrow-counter-clockwise"></i> Restore Maintenance';
            } else {
                confirmButton.classList.remove("btn-primary");
                confirmButton.classList.add("btn-danger");
                confirmButton.innerHTML =
                    '<i class="ph ph-archive"></i> Archive Maintenance';
            }
        }
    }
}

/* ==========================================
   Bulk Archive
========================================== */

async function confirmBulkMaintenanceArchive() {
    const opener = maintenanceActionModal.opener;
    const bulkIds = [
        ...new Set(
            maintenanceActionModal.bulkIds
                .map((id) => String(id).trim())
                .filter((id) => /^\d+$/.test(id)),
        ),
    ];

    if (bulkIds.length === 0) {
        closeDeleteMaintenanceModal(opener);
        return;
    }

    const confirmButton = document.getElementById("confirmDeleteMaintenance");

    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<i class="ph ph-spinner"></i> Archiving...';
    }

    try {
        const response = await fetch("/maintenance/bulk-archive", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRF-TOKEN":
                    document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content") || "",
            },
            credentials: "same-origin",
            body: JSON.stringify({
                maintenance_ids: bulkIds,
            }),
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to archive maintenance records.",
            );
        }

        const archivedIds = Array.isArray(data.archived_ids)
            ? data.archived_ids.map((id) => String(id))
            : [];
        const skippedIds = Array.isArray(data.skipped_in_progress_ids)
            ? data.skipped_in_progress_ids.map((id) => String(id))
            : [];
        const focusTarget = opener;

        /*
        |--------------------------------------------------------------------------
        | Remove only successfully archived IDs
        |--------------------------------------------------------------------------
        */
        if (typeof removeMaintenanceSelectionId === "function") {
            archivedIds.forEach((id) => removeMaintenanceSelectionId(id));
        }

        closeDeleteMaintenanceModal(focusTarget);

        if (typeof loadMaintenances === "function") {
            await loadMaintenances();
        }
        if (typeof loadAvailableMaintenanceVehicles === "function") {
            await loadAvailableMaintenanceVehicles();
        }
        if (typeof updateMaintenanceStatistics === "function") {
            updateMaintenanceStatistics();
        }
        if (typeof refreshMaintenancePagination === "function") {
            refreshMaintenancePagination();
        } else if (typeof updateMaintenancePagination === "function") {
            updateMaintenancePagination();
        }
        if (typeof refreshMaintenanceBulkState === "function") {
            refreshMaintenanceBulkState();
        }

        /*
        |--------------------------------------------------------------------------
        | Toast
        |--------------------------------------------------------------------------
        */
        if (typeof showToast === "function") {
            if (archivedIds.length > 0) {
                showToast(
                    data.message ||
                        `${archivedIds.length} maintenance record${
                            archivedIds.length === 1 ? "" : "s"
                        } archived successfully.`,
                    "success",
                );
            } else if (skippedIds.length > 0) {
                showToast(
                    "In-progress maintenance records cannot be archived.",
                    "error",
                );
            } else {
                showToast(
                    "No selected maintenance records could be archived.",
                    "error",
                );
            }
        }
    } catch (error) {
        console.error("Bulk maintenance archive error:", error);

        if (typeof showToast === "function") {
            showToast(
                error.message || "Failed to archive maintenance records.",
                "error",
            );
        }
    } finally {
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.classList.remove("btn-primary");
            confirmButton.classList.add("btn-danger");
            confirmButton.innerHTML =
                '<i class="ph ph-archive"></i> Archive Selected';
        }
    }
}

/* ==========================================
   Initialize Modal
========================================== */

function initDeleteMaintenanceModal() {
    if (maintenanceActionInitialized) {
        return;
    }
    const modal = document.getElementById("deleteMaintenanceModal");
    if (!modal || modal.dataset.deleteMaintenanceModalInitialized === "true") {
        return;
    }
    modal.dataset.deleteMaintenanceModalInitialized = "true";

    /*
    |--------------------------------------------------------------------------
    | Single Archive / Restore
    |--------------------------------------------------------------------------
    */
    document.addEventListener("click", (event) => {
        const archiveButton = event.target.closest(
            ".action-btn.archive-maintenance",
        );
        const restoreButton = event.target.closest(
            ".action-btn.restore-maintenance",
        );
        const actionButton = archiveButton || restoreButton;
        if (!actionButton) {
            return;
        }
        const row = actionButton.closest("tr");
        if (!row) {
            return;
        }
        const action = archiveButton ? "archive" : "restore";

        /*
            |--------------------------------------------------------------------------
            | In Progress Protection
            |--------------------------------------------------------------------------
            */
        if (
            action === "archive" &&
            String(row.dataset.status || "").trim() === "In Progress"
        ) {
            if (typeof showToast === "function") {
                showToast(
                    "This maintenance record cannot be archived while In Progress.",
                    "error",
                );
            }

            return;
        }

        openMaintenanceActionModal(row, actionButton, action);
    });

    /*
    |--------------------------------------------------------------------------
    | Confirm Button
    |--------------------------------------------------------------------------
    */
    document
        .getElementById("confirmDeleteMaintenance")
        ?.addEventListener("click", async () => {
            if (maintenanceActionModal.mode === "bulk") {
                await confirmBulkMaintenanceArchive();

                return;
            }

            await confirmSingleMaintenanceAction();
        });

    /*
    |--------------------------------------------------------------------------
    | Close button
    |--------------------------------------------------------------------------
    */
    document
        .getElementById("closeDeleteMaintenanceModal")
        ?.addEventListener("click", () => closeDeleteMaintenanceModal());

    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    */
    document
        .getElementById("cancelDeleteMaintenance")
        ?.addEventListener("click", () => closeDeleteMaintenanceModal());

    /*
    |--------------------------------------------------------------------------
    | Click outside
    |--------------------------------------------------------------------------
    */
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeDeleteMaintenanceModal();
        }
    });

    /*
    |--------------------------------------------------------------------------
    | ESC
    |--------------------------------------------------------------------------
    */
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeDeleteMaintenanceModal();
        }
    });

    maintenanceActionInitialized = true;
}

document.addEventListener("DOMContentLoaded", () => {
    initDeleteMaintenanceModal();
});
