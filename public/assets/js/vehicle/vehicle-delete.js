/* ==========================================
   Vehicle Archive / Restore Modal
   Filename intentionally kept as:
   vehicle-delete.js
========================================== */

function openDeleteVehicleModal(modal, action = "archive") {
    if (!modal) return;
    if (!modal.classList.contains("show")) {
        modal.dataset.previousBodyOverflow = document.body.style.overflow;
    }
    modal.dataset.action = action;
    const titleElement = document.getElementById("deleteVehicleTitle");
    const vehicleNameElement = document.getElementById("deleteVehicleName");
    const noteElement = modal.querySelector(".delete-note");
    const confirmButton = document.getElementById("confirmDeleteVehicle");
    const messageElement = modal.querySelector("#deleteVehicleMessage");

    if (action === "restore") {
        if (titleElement) {
            titleElement.textContent = "Restore Vehicle";
        }

        if (messageElement) {
            messageElement.childNodes[0].textContent =
                "Are you sure you want to restore ";
        }

        if (noteElement) {
            noteElement.textContent =
                "The vehicle will be returned to the active fleet.";
        }

        if (confirmButton) {
            confirmButton.innerHTML =
                '<i class="ph ph-arrow-counter-clockwise"></i> Restore';

            confirmButton.classList.remove("btn-danger");
            confirmButton.classList.add("btn-primary");
        }
    } else {
        if (titleElement) {
            titleElement.textContent = "Archive Vehicle";
        }

        if (messageElement) {
            messageElement.childNodes[0].textContent =
                "Are you sure you want to archive ";
        }

        if (noteElement) {
            noteElement.textContent =
                "The vehicle will be removed from the active fleet list but its records and history will be preserved.";
        }

        if (confirmButton) {
            confirmButton.innerHTML = '<i class="ph ph-archive"></i> Archive';

            confirmButton.classList.remove("btn-primary");
            confirmButton.classList.add("btn-danger");
        }
    }
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeDeleteVehicleModal(modal) {
    if (!modal || !modal.classList.contains("show")) {
        return;
    }

    modal.classList.remove("show");

    document.body.style.overflow = modal.dataset.previousBodyOverflow || "";

    delete modal.dataset.previousBodyOverflow;
    delete modal.dataset.action;
    delete modal.dataset.vehicleId;
}

function refreshVehicleAfterDelete() {
    if (typeof updateVehicleStats === "function") {
        updateVehicleStats();
    }

    if (typeof applyVehicleFilters === "function") {
        applyVehicleFilters();
    } else if (typeof refreshVehiclePagination === "function") {
        refreshVehiclePagination();
    }

    if (typeof refreshVehicleBulkState === "function") {
        refreshVehicleBulkState();
    }
}

function showVehicleArchiveError(message) {
    if (typeof window.showToast === "function") {
        window.showToast(
            message || "Unable to complete the vehicle action.",
            "error",
        );
    }
}

function initDeleteVehicleModal() {
    const modal = document.getElementById("deleteVehicleModal");
    const cancelButton = document.getElementById("cancelDeleteVehicle");
    const confirmButton = document.getElementById("confirmDeleteVehicle");
    const vehicleNameElement = document.getElementById("deleteVehicleName");
    if (!modal || modal.dataset.deleteVehicleModalInitialized === "true") {
        return;
    }

    modal.dataset.deleteVehicleModalInitialized = "true";

    /*
    |--------------------------------------------------------------------------
    | Archive / Restore Button
    |--------------------------------------------------------------------------
    */

    document.addEventListener("click", async (event) => {
        if (!event.target || typeof event.target.closest !== "function") {
            return;
        }
        const archiveButton = event.target.closest(".action-btn.archive");
        const restoreButton = event.target.closest(".action-btn.restore");
        if (!archiveButton && !restoreButton) {
            return;
        }
        const action = archiveButton ? "archive" : "restore";
        const button = archiveButton || restoreButton;
        const vehicleId = button.dataset.id;
        if (!vehicleId) {
            console.error("No vehicle ID found.");
            return;
        }
        try {
            const response = await fetch(`/fleet/${vehicleId}`, {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load vehicle.");
            }

            const vehicle = data.vehicle;

            if (!vehicle) {
                throw new Error("Vehicle data not found.");
            }

            modal.dataset.vehicleId = vehicle.id;

            if (vehicleNameElement) {
                vehicleNameElement.textContent =
                    `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() ||
                    vehicle.plate_number ||
                    "Vehicle";
            }

            openDeleteVehicleModal(modal, action);
        } catch (error) {
            console.error("VEHICLE ARCHIVE/RESTORE LOAD ERROR:", error);

            showVehicleArchiveError(error.message || "Unable to load vehicle.");
        }
    });

    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    */

    cancelButton?.addEventListener("click", () =>
        closeDeleteVehicleModal(modal),
    );

    /*
    |--------------------------------------------------------------------------
    | Confirm Archive / Restore
    |--------------------------------------------------------------------------
    */

    confirmButton?.addEventListener("click", async () => {
        const vehicleId = modal.dataset.vehicleId;

        const action = modal.dataset.action || "archive";

        if (!vehicleId) {
            console.error("No vehicle ID found.");
            return;
        }

        const endpoint =
            action === "restore"
                ? `/fleet/${vehicleId}/restore`
                : `/fleet/${vehicleId}/archive`;

        confirmButton.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: "POST",

                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN":
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to complete the action.",
                );
            }

            closeDeleteVehicleModal(modal);

            if (typeof window.showToast === "function") {
                window.showToast(
                    data.message ||
                        (action === "restore"
                            ? "Vehicle restored successfully."
                            : "Vehicle archived successfully."),
                    "success",
                );
            }

            if (typeof loadVehicles === "function") {
                await loadVehicles();
            } else {
                refreshVehicleAfterDelete();
            }
        } catch (error) {
            console.error("VEHICLE ARCHIVE/RESTORE ERROR:", error);

            showVehicleArchiveError(
                error.message ||
                    (action === "restore"
                        ? "Unable to restore vehicle."
                        : "Unable to archive vehicle."),
            );
        } finally {
            confirmButton.disabled = false;
        }
    });

    /*
    |--------------------------------------------------------------------------
    | Click Outside
    |--------------------------------------------------------------------------
    */

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeDeleteVehicleModal(modal);
        }
    });

    /*
    |--------------------------------------------------------------------------
    | Escape Key
    |--------------------------------------------------------------------------
    */

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeDeleteVehicleModal(modal);
        }
    });
}

document.addEventListener("DOMContentLoaded", initDeleteVehicleModal);
