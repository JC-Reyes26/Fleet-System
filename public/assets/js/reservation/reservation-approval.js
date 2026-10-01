(function () {
    "use strict";

    const modalElement = document.getElementById(
        "reservationConfirmationModal",
    );

    if (!modalElement) {
        return;
    }

    const idInput = document.createElement("input");
    idInput.type = "hidden";
    idInput.id = "reservationConfirmationId";
    modalElement.appendChild(idInput);

    const titleElement = document.getElementById(
        "reservationConfirmationModalTitle",
    );

    const descriptionElement = document.getElementById(
        "reservationConfirmationModalDescription",
    );

    const reservationNameElement = document.getElementById(
        "reservationConfirmationName",
    );

    const messageElement = document.getElementById(
        "reservationConfirmationMessageText",
    );

    const confirmButton = document.getElementById("confirmReservationAction");

    const confirmButtonText = document.getElementById(
        "confirmReservationActionText",
    );

    const confirmButtonIcon = document.getElementById(
        "confirmReservationActionIcon",
    );

    const cancelButton = document.getElementById(
        "cancelReservationConfirmation",
    );

    const closeButton = document.getElementById("closeReservationConfirmation");

    let action = null;

    function getCsrfToken() {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    }

    function showMessage(message, type = "success") {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);
            return;
        }

        alert(message);
    }

    function openModal() {
        modalElement.classList.add("show");

        document.body.classList.add("modal-open");

        setTimeout(() => {
            confirmButton?.focus();
        }, 50);
    }

    function closeModal() {
        modalElement.classList.remove("show");

        document.body.classList.remove("modal-open");

        action = null;

        idInput.value = "";

        if (confirmButton) {
            confirmButton.disabled = false;
        }
    }

    function openAction(reservationId, reservationNumber, selectedAction) {
        action = selectedAction;

        idInput.value = reservationId || "";

        const displayNumber = reservationNumber || "this reservation";

        if (reservationNameElement) {
            reservationNameElement.textContent = displayNumber;
        }

        if (selectedAction === "approve") {
            if (titleElement) {
                titleElement.textContent = "Approve Reservation";
            }

            if (descriptionElement) {
                descriptionElement.innerHTML =
                    `Are you sure you want to approve ` +
                    `<strong id="reservationConfirmationName">` +
                    `${escapeHtml(displayNumber)}` +
                    `</strong>?`;
            }

            if (messageElement) {
                messageElement.textContent =
                    "This reservation will be approved and can proceed to Route Planning.";
            }

            if (confirmButton) {
                confirmButton.className = "btn-primary";
            }

            if (confirmButtonIcon) {
                confirmButtonIcon.className = "ph ph-check";
            }

            if (confirmButtonText) {
                confirmButtonText.textContent = "Approve Reservation";
            }
        } else if (selectedAction === "reject") {
            if (titleElement) {
                titleElement.textContent = "Reject Reservation";
            }

            if (descriptionElement) {
                descriptionElement.innerHTML =
                    `Are you sure you want to reject ` +
                    `<strong id="reservationConfirmationName">` +
                    `${escapeHtml(displayNumber)}` +
                    `</strong>?`;
            }

            if (messageElement) {
                messageElement.textContent =
                    "This reservation will be marked as rejected and will not proceed to Route Planning.";
            }

            if (confirmButton) {
                confirmButton.className = "btn-danger";
            }

            if (confirmButtonIcon) {
                confirmButtonIcon.className = "ph ph-x";
            }

            if (confirmButtonText) {
                confirmButtonText.textContent = "Reject Reservation";
            }
        } else {
            return;
        }

        openModal();
    }

    async function submitAction() {
        const reservationId = idInput.value;

        if (!reservationId || !action) {
            return;
        }

        if (!confirmButton) {
            return;
        }

        confirmButton.disabled = true;

        try {
            const endpoint =
                action === "approve"
                    ? `/reservation/${reservationId}/approve`
                    : `/reservation/${reservationId}/reject`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                credentials: "same-origin",
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    payload?.message || "Unable to process reservation.",
                );
            }

            closeModal();

            showMessage(
                payload?.message ||
                    (action === "approve"
                        ? "Reservation approved successfully."
                        : "Reservation rejected successfully."),
                "success",
            );

            if (typeof window.loadReservations === "function") {
                await window.loadReservations();
            } else if (typeof loadReservations === "function") {
                await loadReservations();
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error("Reservation approval/rejection error:", error);

            showMessage(
                error.message || "Unable to process reservation.",
                "error",
            );

            confirmButton.disabled = false;
        }
    }

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }

    document.addEventListener("click", function (event) {
        const approveButton = event.target.closest(".approve-reservation");

        if (approveButton) {
            openAction(
                approveButton.dataset.id,
                approveButton.dataset.reservationNumber || "N/A",
                "approve",
            );

            return;
        }

        const rejectButton = event.target.closest(".reject-reservation");

        if (rejectButton) {
            openAction(
                rejectButton.dataset.id,
                rejectButton.dataset.reservationNumber || "N/A",
                "reject",
            );
        }
    });

    confirmButton?.addEventListener("click", submitAction);

    cancelButton?.addEventListener("click", closeModal);

    closeButton?.addEventListener("click", closeModal);

    modalElement.addEventListener("click", function (event) {
        if (event.target === modalElement) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modalElement.classList.contains("show")) {
            closeModal();
        }
    });
})();
