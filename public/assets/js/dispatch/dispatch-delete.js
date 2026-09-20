/*
 * ==========================================
 * HIMS Fleet - Dispatch Archive / Restore
 * ==========================================
 */

let deleteDispatchModal = null;

function getDeleteDispatchCsrfToken() {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
}

async function deleteDispatchApiRequest(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrfToken = getDeleteDispatchCsrfToken();

        if (csrfToken) {
            headers["X-CSRF-TOKEN"] = csrfToken;
        }
    }

    const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: "same-origin",
    });

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        const requestError = new Error(
            data.message || "Failed to update dispatch.",
        );

        requestError.status = response.status;
        requestError.data = data;

        throw requestError;
    }

    return data;
}

/*
 * ==========================================
 * Open Archive / Restore Modal
 * ==========================================
 */

function openDeleteDispatchModal(
    row,
    dispatchId,
    dispatchNumber,
    action = "archive",
) {
    if (!deleteDispatchModal) {
        return;
    }

    const nameElement = deleteDispatchModal.querySelector(
        "#deleteDispatchName",
    );

    const titleElement = deleteDispatchModal.querySelector(
        "#deleteDispatchModalTitle",
    );

    const descriptionElement = deleteDispatchModal.querySelector(
        "#deleteDispatchModalDescription",
    );

    const messageElement = deleteDispatchModal.querySelector(
        "#deleteDispatchMessageText",
    );

    const confirmButton = deleteDispatchModal.querySelector(
        "#confirmDeleteDispatch",
    );

    const normalizedAction = action === "restore" ? "restore" : "archive";

    deleteDispatchModal.currentRow = row;
    deleteDispatchModal.currentDispatchId = dispatchId;
    deleteDispatchModal.currentAction = normalizedAction;

    if (nameElement) {
        nameElement.textContent = dispatchNumber || "this dispatch";
    }

    if (titleElement) {
        titleElement.textContent =
            normalizedAction === "restore"
                ? "Restore Dispatch"
                : "Archive Dispatch";
    }

    if (descriptionElement) {
        descriptionElement.textContent =
            normalizedAction === "restore"
                ? "Restore this dispatch and make it active again?"
                : "Archive this dispatch? The record will be preserved.";
    }

    if (messageElement) {
        messageElement.textContent =
            normalizedAction === "restore"
                ? "This dispatch will become active again."
                : "The dispatch will be archived and preserved in the system.";
    }

    if (confirmButton) {
        confirmButton.classList.remove("btn-danger", "btn-primary");

        if (normalizedAction === "restore") {
            confirmButton.classList.add("btn-primary");

            confirmButton.innerHTML = `
                <i class="ph ph-arrow-counter-clockwise"></i>
                Restore Dispatch
            `;
        } else {
            confirmButton.classList.add("btn-danger");

            confirmButton.innerHTML = `
                <i class="ph ph-archive"></i>
                Archive Dispatch
            `;
        }
    }

    deleteDispatchModal.classList.add("show");
    document.body.style.overflow = "hidden";
}

/*
 * ==========================================
 * Close Modal
 * ==========================================
 */

function closeDeleteDispatchModal() {
    if (!deleteDispatchModal) {
        return;
    }

    deleteDispatchModal.classList.remove("show");
    document.body.style.overflow = "";

    delete deleteDispatchModal.currentRow;
    delete deleteDispatchModal.currentDispatchId;
    delete deleteDispatchModal.currentAction;
}

/*
 * ==========================================
 * Confirm Archive / Restore
 * ==========================================
 */

async function handleConfirmDeleteDispatch() {
    if (!deleteDispatchModal) {
        return;
    }

    const dispatchId = deleteDispatchModal.currentDispatchId;

    const action =
        deleteDispatchModal.currentAction === "restore" ? "restore" : "archive";

    if (!dispatchId) {
        return;
    }

    const confirmButton = deleteDispatchModal.querySelector(
        "#confirmDeleteDispatch",
    );

    if (confirmButton) {
        confirmButton.disabled = true;

        if (action === "restore") {
            confirmButton.innerHTML = `
                <i class="ph ph-spinner"></i>
                Restoring...
            `;
        } else {
            confirmButton.innerHTML = `
                <i class="ph ph-spinner"></i>
                Archiving...
            `;
        }
    }

    try {
        const endpoint =
            action === "restore"
                ? `/dispatch/${encodeURIComponent(dispatchId)}/restore`
                : `/dispatch/${encodeURIComponent(dispatchId)}/archive`;

        const data = await deleteDispatchApiRequest(endpoint, {
            method: "POST",
        });

        closeDeleteDispatchModal();

        /*
         * ------------------------------------------
         * Reload authoritative backend state
         * ------------------------------------------
         *
         * Backend may update:
         * Reservation status
         * Vehicle state
         * Driver state
         * Dispatch archived state
         */
        if (typeof loadDispatches === "function") {
            await loadDispatches();
        }

        /*
         * ------------------------------------------
         * Refresh available reservations
         * ------------------------------------------
         *
         * Archiving an eligible dispatch may make
         * its reservation available again.
         *
         * Restoring it may remove it again.
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

        if (typeof refreshDispatchBulkState === "function") {
            refreshDispatchBulkState();
        }

        if (typeof showToast === "function") {
            showToast(
                data.message ||
                    (action === "restore"
                        ? "Dispatch restored successfully."
                        : "Dispatch archived successfully."),
                "success",
            );
        }
    } catch (error) {
        console.error(`Dispatch ${action} error:`, error);

        if (typeof showToast === "function") {
            showToast(
                error.message ||
                    (action === "restore"
                        ? "Something went wrong while restoring the dispatch."
                        : "Something went wrong while archiving the dispatch."),
                "error",
            );
        }
    } finally {
        if (confirmButton) {
            confirmButton.disabled = false;

            if (action === "restore") {
                confirmButton.classList.remove("btn-danger");
                confirmButton.classList.add("btn-primary");

                confirmButton.innerHTML = `
                    <i class="ph ph-arrow-counter-clockwise"></i>
                    Restore Dispatch
                `;
            } else {
                confirmButton.classList.remove("btn-primary");
                confirmButton.classList.add("btn-danger");

                confirmButton.innerHTML = `
                    <i class="ph ph-archive"></i>
                    Archive Dispatch
                `;
            }
        }
    }
}

/*
 * ==========================================
 * Modal Initialization
 * ==========================================
 */

function initDeleteDispatchModal() {
    if (initDeleteDispatchModal.initialized) {
        return;
    }

    deleteDispatchModal = document.getElementById("deleteDispatchModal");

    if (!deleteDispatchModal) {
        return;
    }

    initDeleteDispatchModal.initialized = true;

    /*
     * ------------------------------------------
     * Archive / Restore button delegation
     * ------------------------------------------
     */
    document.addEventListener("click", (event) => {
        const archiveButton = event.target.closest(
            ".action-btn.archive-dispatch",
        );

        const restoreButton = event.target.closest(
            ".action-btn.restore-dispatch",
        );

        const actionButton = archiveButton || restoreButton;

        if (!actionButton || actionButton.disabled) {
            return;
        }

        const row = actionButton.closest("tr");

        if (!row) {
            return;
        }

        const dispatchId = row.dataset.id;

        if (!dispatchId) {
            console.error("Dispatch ID not found.");
            return;
        }

        const action = archiveButton ? "archive" : "restore";

        /*
         * Archive rules:
         * Only Pending / Assigned can be archived.
         */
        if (action === "archive") {
            const status = String(
                row.dataset.status ||
                    row.querySelector(".status-badge")?.textContent ||
                    "",
            ).trim();

            const archivableStatuses = ["Pending", "Assigned"];

            if (!archivableStatuses.includes(status)) {
                if (typeof showToast === "function") {
                    showToast(
                        "Only Pending or Assigned dispatches can be archived.",
                        "error",
                    );
                }

                return;
            }

            /*
             * Do not archive an already archived row.
             */
            if (row.dataset.archivedAt) {
                if (typeof showToast === "function") {
                    showToast("This dispatch is already archived.", "error");
                }

                return;
            }
        }

        const dispatchNumber =
            row.querySelector(".dispatch-number")?.textContent?.trim() ||
            "this dispatch";

        openDeleteDispatchModal(row, dispatchId, dispatchNumber, action);
    });

    /*
     * ------------------------------------------
     * Click outside modal
     * ------------------------------------------
     */
    deleteDispatchModal.addEventListener("click", (event) => {
        if (event.target === deleteDispatchModal) {
            closeDeleteDispatchModal();
        }
    });

    /*
     * ------------------------------------------
     * Cancel
     * ------------------------------------------
     */
    deleteDispatchModal
        .querySelector("#cancelDeleteDispatch")
        ?.addEventListener("click", closeDeleteDispatchModal);

    /*
     * ------------------------------------------
     * Confirm
     * ------------------------------------------
     */
    deleteDispatchModal
        .querySelector("#confirmDeleteDispatch")
        ?.addEventListener("click", handleConfirmDeleteDispatch);

    /*
     * ------------------------------------------
     * ESC
     * ------------------------------------------
     */
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            deleteDispatchModal.classList.contains("show")
        ) {
            closeDeleteDispatchModal();
        }
    });
}

/*
 * ==========================================
 * Bulk Archive
 * ==========================================
 */

async function handleArchiveSelected() {
    const tableBody = document.getElementById("dispatchTableBody");

    if (!tableBody) {
        return;
    }

    if (typeof getSelectedDispatchRows !== "function") {
        return;
    }

    const rowsToArchive = getSelectedDispatchRows();

    if (rowsToArchive.length === 0) {
        return;
    }

    /*
     * Only active rows should be bulk archived.
     */
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

        const selectAll = document.getElementById("selectAllDispatches");

        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }

        /*
         * ------------------------------------------
         * Reload authoritative backend state
         * ------------------------------------------
         */
        if (typeof loadDispatches === "function") {
            await loadDispatches();
        }

        /*
         * ------------------------------------------
         * Refresh available reservations
         * ------------------------------------------
         */
        if (typeof loadAvailableReservations === "function") {
            await loadAvailableReservations();
        }

        if (typeof refreshDispatchBulkState === "function") {
            refreshDispatchBulkState();
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
    }
}

/*
 * ==========================================
 * Init
 * ==========================================
 */

document.addEventListener("DOMContentLoaded", () => {
    initDeleteDispatchModal();
});
