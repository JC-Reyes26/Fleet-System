<div
    id="reservationConfirmationModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reservationConfirmationModalTitle"
    aria-describedby="reservationConfirmationModalDescription"
>
    <div class="custom-modal delete-modal reservation-confirmation-modal">

        <button
            type="button"
            class="modal-close"
            id="closeReservationConfirmation"
            aria-label="Close"
        >
            <i class="ph ph-x"></i>
        </button>

        <div class="delete-icon" id="reservationConfirmationIcon">
            <i class="ph-fill ph-warning-circle"></i>
        </div>

        <h2 id="reservationConfirmationModalTitle">
            Confirm Action
        </h2>

        <p id="reservationConfirmationModalDescription">
            Are you sure you want to continue with
            <strong id="reservationConfirmationName">
                this reservation
            </strong>?
        </p>

        <p
            class="delete-note"
            id="reservationConfirmationMessageText"
        >
            Please review the action before continuing.
        </p>

        <div class="modal-footer">

            <button
                type="button"
                class="btn-outline"
                id="cancelReservationConfirmation"
            >
                Cancel
            </button>

            <button
                type="button"
                class="btn-danger"
                id="confirmReservationAction"
            >
                <i
                    class="ph ph-check"
                    id="confirmReservationActionIcon"
                ></i>

                <span id="confirmReservationActionText">
                    Confirm
                </span>
            </button>

        </div>

    </div>
</div>