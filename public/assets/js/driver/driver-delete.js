/* ==========================================
   Driver Archive / Restore Modal
========================================== */

function openDeleteDriverModal(modal, action = "archive") {
    if (!modal) {
        return;
    }
    const normalizedAction = action === "restore" ? "restore" : "archive";
    if (!modal.classList.contains("show")) {
        modal.dataset.previousBodyOverflow = document.body.style.overflow;
    }
    modal.dataset.driverAction = normalizedAction;
    const titleElement = document.getElementById("deleteDriverModalTitle");
    const descriptionElement = document.getElementById(
        "deleteDriverModalDescription",
    );
    const noteElement = document.getElementById("deleteDriverMessageText");
    const confirmButton = document.getElementById("confirmDeleteDriver");
    if (titleElement) {
        titleElement.textContent =
            normalizedAction === "restore"
                ? "Restore Driver"
                : "Archive Driver";
    }
    if (descriptionElement) {
        descriptionElement.innerHTML =
            normalizedAction === "restore"
                ? `Are you sure you want to restore
                   <strong id="deleteDriverName">
                       this driver
                   </strong>?`
                : `Are you sure you want to archive
                   <strong id="deleteDriverName">
                       this driver
                   </strong>?`;
    }
    if (noteElement) {
        noteElement.textContent =
            normalizedAction === "restore"
                ? "This driver will become active again."
                : "The driver record will be archived and preserved in the system.";
    }

    if (confirmButton) {
        confirmButton.classList.remove("btn-danger", "btn-primary");

        if (normalizedAction === "restore") {
            confirmButton.classList.add("btn-primary");

            confirmButton.innerHTML = `
                <i class="ph ph-arrow-counter-clockwise"></i>
                Restore Driver
            `;
        } else {
            confirmButton.classList.add("btn-danger");

            confirmButton.innerHTML = `
                <i class="ph ph-archive"></i>
                Archive Driver
            `;
        }
    }

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeDeleteDriverModal(modal) {
    if (!modal) {
        return;
    }

    if (!modal.classList.contains("show")) {
        return;
    }

    modal.classList.remove("show");

    document.body.style.overflow = modal.dataset.previousBodyOverflow || "";

    delete modal.dataset.previousBodyOverflow;
    delete modal.dataset.driverId;
    delete modal.dataset.driverAction;

    modal.currentRow = null;
}

function getDriverCsrfToken() {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
}

async function driverArchiveRequest(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrfToken = getDriverCsrfToken();

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
            data.message || "Failed to update driver.",
        );
        requestError.status = response.status;
        requestError.data = data;
        throw requestError;
    }
    return data;
}

async function handleConfirmDeleteDriver() {
    const modal = document.getElementById("deleteDriverModal");

    if (!modal) {
        return;
    }
    const driverId = modal.dataset.driverId;
    const action =
        modal.dataset.driverAction === "restore" ? "restore" : "archive";

    if (!driverId) {
        return;
    }
    const confirmButton = document.getElementById("confirmDeleteDriver");
    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.innerHTML =
            action === "restore"
                ? `
                    <i class="ph ph-spinner"></i>
                    Restoring...
                `
                : `
                    <i class="ph ph-spinner"></i>
                    Archiving...
                `;
    }

    try {
        const endpoint =
            action === "restore"
                ? `/drivers/${encodeURIComponent(driverId)}/restore`
                : `/drivers/${encodeURIComponent(driverId)}/archive`;

        const data = await driverArchiveRequest(endpoint, {
            method: "POST",
        });
        closeDeleteDriverModal(modal);
        /*
        |--------------------------------------------------------------------------
        | Reload authoritative driver state
        |--------------------------------------------------------------------------
        */
        if (typeof loadDrivers === "function") {
            await loadDrivers();
        }
        /*
        |--------------------------------------------------------------------------
        | Refresh vehicle assignment options
        |--------------------------------------------------------------------------
        */
        if (typeof loadDriverVehicleOptions === "function") {
            await loadDriverVehicleOptions();
        }
        if (typeof window.showToast === "function") {
            window.showToast(
                data.message ||
                    (action === "restore"
                        ? "Driver restored successfully."
                        : "Driver archived successfully."),
                "success",
            );
        }
    } catch (error) {
        console.error(`Driver ${action} error:`, error);

        if (typeof window.showToast === "function") {
            window.showToast(
                error.message ||
                    (action === "restore"
                        ? "Failed to restore driver."
                        : "Failed to archive driver."),
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
                    Restore Driver
                `;
            } else {
                confirmButton.classList.remove("btn-primary");
                confirmButton.classList.add("btn-danger");
                confirmButton.innerHTML = `
                    <i class="ph ph-archive"></i>
                    Archive Driver
                `;
            }
        }
    }
}

function initDeleteDriverModal() {
    const modal = document.getElementById("deleteDriverModal");
    const cancelButton = document.getElementById("cancelDeleteDriver");
    const confirmButton = document.getElementById("confirmDeleteDriver");
    const driverNameElement = document.getElementById("deleteDriverName");
    if (!modal || modal.dataset.deleteDriverModalInitialized === "true") {
        return;
    }
    modal.dataset.deleteDriverModalInitialized = "true";
    /*
    |--------------------------------------------------------------------------
    | Archive / Restore button delegation
    |--------------------------------------------------------------------------
    */
    document.addEventListener("click", (event) => {
        if (!event.target || typeof event.target.closest !== "function") {
            return;
        }
        const archiveButton = event.target.closest(".action-btn.archive");
        const restoreButton = event.target.closest(".action-btn.restore");
        const actionButton = archiveButton || restoreButton;
        if (!actionButton) {
            return;
        }
        const row = actionButton.closest("tr");
        if (!row) {
            return;
        }
        const driverId = row.dataset.id;
        if (!driverId) {
            return;
        }
        const action = archiveButton ? "archive" : "restore";
        const status = String(row.dataset.status || "").trim();
        /*
            |--------------------------------------------------------------------------
            | On Duty drivers cannot be archived.
            |--------------------------------------------------------------------------
            */
        if (action === "archive" && status === "On Duty") {
            if (typeof window.showToast === "function") {
                window.showToast(
                    "This driver cannot be archived while On Duty.",
                    "error",
                );
            }
            return;
        }

        const name =
            `${row.dataset.firstName || ""} ${
                row.dataset.lastName || ""
            }`.trim() || "this driver";

        modal.dataset.driverId = driverId;
        modal.dataset.driverAction = action;
        modal.currentRow = row;
        if (driverNameElement) {
            driverNameElement.textContent = name;
        }
        openDeleteDriverModal(modal, action);
    });

    /*
    |--------------------------------------------------------------------------
    | Click outside modal
    |--------------------------------------------------------------------------
    */
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeDeleteDriverModal(modal);
        }
    });

    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    */
    cancelButton?.addEventListener("click", () =>
        closeDeleteDriverModal(modal),
    );

    /*
    |--------------------------------------------------------------------------
    | Confirm
    |--------------------------------------------------------------------------
    */
    confirmButton?.addEventListener("click", handleConfirmDeleteDriver);

    /*
    |--------------------------------------------------------------------------
    | ESC
    |--------------------------------------------------------------------------
    */
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeDeleteDriverModal(modal);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initDeleteDriverModal();
});
