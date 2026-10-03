<div
    id="viewTripLogModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="viewTripLogModalTitle"
    hidden
>
    <div class="custom-modal view-trip-log-modal">

        <div class="modal-header">
            <div>
                <h2 id="viewTripLogModalTitle">
                    Trip Log
                </h2>

                <p>
                    Review the submitted trip details and proof photos.
                </p>
            </div>

            <button
                type="button"
                class="modal-close"
                id="closeViewTripLogModal"
                aria-label="Close modal"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>

        <div class="modal-body">

            <div class="trip-log-dispatch-summary">

                <div class="trip-log-summary-item">
                    <span class="trip-log-summary-label">
                        Dispatch
                    </span>

                    <strong
                        id="viewTripLogDispatchNumber"
                        class="trip-log-summary-value"
                    >
                        —
                    </strong>
                </div>

                <div class="trip-log-summary-item">
                    <span class="trip-log-summary-label">
                        Driver
                    </span>

                    <strong
                        id="viewTripLogDriver"
                        class="trip-log-summary-value"
                    >
                        —
                    </strong>
                </div>

                <div class="trip-log-summary-item">
                    <span class="trip-log-summary-label">
                        Vehicle
                    </span>

                    <strong
                        id="viewTripLogVehicle"
                        class="trip-log-summary-value"
                    >
                        —
                    </strong>
                </div>

                <div class="trip-log-summary-item">
                    <span class="trip-log-summary-label">
                        Submitted At
                    </span>

                    <strong
                        id="viewTripLogSubmittedAt"
                        class="trip-log-summary-value"
                    >
                        —
                    </strong>
                </div>

            </div>

            <div class="view-trip-log-details">

                <div class="view-trip-log-detail-item">
                    <label>
                        Start Odometer
                    </label>

                    <p id="viewTripLogStartOdometer">
                        —
                    </p>
                </div>

                <div class="view-trip-log-detail-item">
                    <label>
                        End Odometer
                    </label>

                    <p id="viewTripLogEndOdometer">
                        —
                    </p>
                </div>

                <div class="view-trip-log-detail-item">
                    <label>
                        Distance
                    </label>

                    <p id="viewTripLogDistance">
                        —
                    </p>
                </div>

                <div class="view-trip-log-detail-item">
                    <label>
                        Fuel Used
                    </label>

                    <p id="viewTripLogFuelUsed">
                        —
                    </p>
                </div>

                <div class="view-trip-log-detail-item full-width">
                    <label>
                        Route
                    </label>

                    <p id="viewTripLogRoute">
                        —
                    </p>
                </div>

            </div>

            <div class="view-trip-log-proof-section">

                <h3>
                    Proof Photos
                </h3>

                <div class="view-trip-log-proof-grid">

                    <div class="view-trip-log-proof-item">
                        <span class="view-trip-log-proof-label">
                            Logbook Photo
                        </span>

                        <div
                            class="view-trip-log-proof-image"
                            id="viewTripLogbookPhotoContainer"
                        >
                            <span class="view-trip-log-proof-empty">
                                No photo available.
                            </span>
                        </div>
                    </div>

                    <div class="view-trip-log-proof-item">
                        <span class="view-trip-log-proof-label">
                            Proof of Arrival
                        </span>

                        <div
                            class="view-trip-log-proof-image"
                            id="viewTripArrivalPhotoContainer"
                        >
                            <span class="view-trip-log-proof-empty">
                                No photo available.
                            </span>
                        </div>
                    </div>

                    <div
                        class="view-trip-log-proof-item"
                        id="viewTripDeliveryProofItem"
                    >
                        <span class="view-trip-log-proof-label">
                            Proof of Delivery
                        </span>

                        <div
                            class="view-trip-log-proof-image"
                            id="viewTripDeliveryPhotoContainer"
                        >
                            <span class="view-trip-log-proof-empty">
                                No photo available.
                            </span>
                        </div>
                    </div>

                </div>

            </div>

            <div class="view-trip-log-notes">

                <label>
                    Notes
                </label>

                <p id="viewTripLogNotes">
                    —
                </p>

            </div>

        </div>

        <div class="modal-footer">

            <button
                type="button"
                class="btn-outline"
                id="closeViewTripLogFooter"
            >
                Close
            </button>

        </div>

    </div>
</div>