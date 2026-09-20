/* ==========================================
   Reservation Archive / Restore
   Filename intentionally kept as:
   reservation-delete.js
========================================== */

function openDeleteReservationModal(modal, action = "archive") {
    if (!modal) return;

    if (!modal.classList.contains("show")) {
        modal.dataset.previousBodyOverflow = document.body.style.overflow;
    }

    modal.dataset.action = action;
    const titleElement = document.getElementById("deleteReservationTitle");
    const nameElement = document.getElementById("deleteReservationName");
    const messageTextElement = document.getElementById(
        "deleteReservationMessageText",
    );
    const noteElement = modal.querySelector(".delete-note");
    const confirmButton = document.getElementById("confirmDeleteReservation");

    if (action === "restore") {
        if (titleElement) {
            titleElement.textContent = "Restore Reservation";
        }
        if (messageTextElement) {
            messageTextElement.textContent =
                "Are you sure you want to restore ";
        }
        if (noteElement) {
            noteElement.textContent =
                "The reservation will be returned to the active reservation list.";
        }
        if (confirmButton) {
            confirmButton.innerHTML =
                '<i class="ph ph-arrow-counter-clockwise"></i> Restore';

            confirmButton.classList.remove("btn-danger");
            confirmButton.classList.add("btn-primary");
        }
    } else {
        if (titleElement) {
            titleElement.textContent = "Archive Reservation";
        }

        if (messageTextElement) {
            messageTextElement.textContent =
                "Are you sure you want to archive ";
        }

        if (noteElement) {
            noteElement.textContent =
                "The reservation will be removed from the active list while its records and history are preserved.";
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

function closeDeleteReservationModal(modal) {
    if (!modal || !modal.classList.contains("show")) {
        return;
    }

    modal.classList.remove("show");

    document.body.style.overflow = modal.dataset.previousBodyOverflow || "";

    delete modal.dataset.previousBodyOverflow;
    delete modal.dataset.action;
    delete modal.dataset.reservationId;
}

function showReservationArchiveError(message) {
    if (typeof window.showToast === "function") {
        window.showToast(
            message || "Unable to complete the reservation action.",
            "error",
        );
    }
}

function initDeleteReservationModal() {
    const modal = document.getElementById("deleteReservationModal");
    const cancelButton = document.getElementById("cancelDeleteReservation");
    const confirmButton = document.getElementById("confirmDeleteReservation");
    const reservationNameElement = document.getElementById(
        "deleteReservationName",
    );
    if (!modal || modal.dataset.deleteReservationModalInitialized === "true") {
        return;
    }
    modal.dataset.deleteReservationModalInitialized = "true";
    document.body.addEventListener("click", async (event) => {
        const archiveButton = event.target.closest(
            ".action-btn.archive-reservation",
        );
        const restoreButton = event.target.closest(
            ".action-btn.restore-reservation",
        );
        if (!archiveButton && !restoreButton) {
            return;
        }
        const action = archiveButton ? "archive" : "restore";
        const button = archiveButton || restoreButton;
        const reservationId = button.dataset.id;
        if (!reservationId) {
            return;
        }
        const row = button.closest("tr");
        const reservationNumber = row
            ?.querySelector(".reservation-number")
            ?.textContent.trim();
        modal.dataset.reservationId = reservationId;
        if (reservationNameElement) {
            reservationNameElement.textContent =
                reservationNumber || "Reservation";
        }
        openDeleteReservationModal(modal, action);
    });
    cancelButton?.addEventListener("click", () =>
        closeDeleteReservationModal(modal),
    );
    confirmButton?.addEventListener("click", async () => {
        const reservationId = modal.dataset.reservationId;
        const action = modal.dataset.action || "archive";
        if (!reservationId) {
            return;
        }
        const endpoint =
            action === "restore"
                ? `/reservation/${reservationId}/restore`
                : `/reservation/${reservationId}/archive`;
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
                    data.message ||
                        "Unable to complete the reservation action.",
                );
            }

            closeDeleteReservationModal(modal);

            if (typeof window.showToast === "function") {
                window.showToast(
                    data.message ||
                        (action === "restore"
                            ? "Reservation restored successfully."
                            : "Reservation archived successfully."),
                    "success",
                );
            }

            await loadReservations();

            if (typeof updateReservationStatistics === "function") {
                updateReservationStatistics();
            }
        } catch (error) {
            console.error("RESERVATION ARCHIVE/RESTORE ERROR:", error);

            showReservationArchiveError(error.message);
        } finally {
            confirmButton.disabled = false;
        }
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeDeleteReservationModal(modal);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeDeleteReservationModal(modal);
        }
    });
}

document.addEventListener("DOMContentLoaded", initDeleteReservationModal);
