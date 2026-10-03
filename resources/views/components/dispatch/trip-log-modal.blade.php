<div
    id="tripLogModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tripLogModalTitle"
    aria-describedby="tripLogModalDescription"
    hidden
>
    <div class="custom-modal trip-log-modal">

        <div class="modal-header">
            <div>
                <h2 id="tripLogModalTitle">
                    Submit Trip Log
                </h2>

                <p id="tripLogModalDescription">
                    Record the trip details and upload the required proof photos.
                </p>
            </div>

            <button
                type="button"
                class="modal-close"
                id="closeTripLogModal"
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
                        id="tripLogDispatchNumber"
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
                        id="tripLogVehicle"
                        class="trip-log-summary-value"
                    >
                        —
                    </strong>
                </div>

                <div class="trip-log-summary-item">
                    <span class="trip-log-summary-label">
                        Route
                    </span>

                    <strong
                        id="tripLogRoute"
                        class="trip-log-summary-value"
                    >
                        —
                    </strong>
                </div>

            </div>

            <form id="tripLogForm">

                <input
                    type="hidden"
                    id="tripLogDispatchId"
                    name="dispatch_id"
                />

                <div class="form-grid">

                    <div class="form-group">
                        <label for="tripLogStartOdometer">
                            Start Odometer
                        </label>

                        <input
                            type="number"
                            id="tripLogStartOdometer"
                            name="start_odometer"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="tripLogEndOdometer">
                            End Odometer
                        </label>

                        <input
                            type="number"
                            id="tripLogEndOdometer"
                            name="end_odometer"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="tripLogDistance">
                            Distance
                        </label>

                        <input
                            type="number"
                            id="tripLogDistance"
                            name="distance"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="tripLogFuelUsed">
                            Fuel Used
                        </label>

                        <input
                            type="number"
                            id="tripLogFuelUsed"
                            name="fuel_used"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div class="form-group full-width">
                        <label for="tripLogLogbookPhoto">
                            Logbook Photo
                        </label>

                        <input
                            type="file"
                            id="tripLogLogbookPhoto"
                            name="logbook_photo"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            required
                        />

                        <small class="field-hint">
                            Upload a clear photo of the completed hospital logbook.
                        </small>

                        <div
                            class="trip-log-image-preview"
                            id="tripLogLogbookPreview"
                            hidden
                        >
                            <img
                                src=""
                                alt="Logbook photo preview"
                            />
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label for="tripLogArrivalPhoto">
                            Proof of Arrival
                        </label>

                        <input
                            type="file"
                            id="tripLogArrivalPhoto"
                            name="arrival_proof_photo"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            required
                        />

                        <small class="field-hint">
                            Upload a clear photo showing proof of arrival.
                        </small>

                        <div
                            class="trip-log-image-preview"
                            id="tripLogArrivalPreview"
                            hidden
                        >
                            <img
                                src=""
                                alt="Arrival proof preview"
                            />
                        </div>
                    </div>

                    <div
                        class="form-group full-width"
                        id="tripLogDeliveryPhotoGroup"
                    >
                        <label for="tripLogDeliveryPhoto">
                            Proof of Delivery
                        </label>

                        <input
                            type="file"
                            id="tripLogDeliveryPhoto"
                            name="delivery_proof_photo"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                        />

                        <small class="field-hint">
                            Upload a clear photo showing proof of delivery.
                        </small>

                        <div
                            class="trip-log-image-preview"
                            id="tripLogDeliveryPreview"
                            hidden
                        >
                            <img
                                src=""
                                alt="Delivery proof preview"
                            />
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label for="tripLogNotes">
                            Notes
                        </label>

                        <textarea
                            id="tripLogNotes"
                            name="notes"
                            rows="4"
                            maxlength="5000"
                            placeholder="Add any relevant trip notes."
                        ></textarea>
                    </div>

                </div>

                <div class="modal-footer">

                    <button
                        type="button"
                        class="btn-outline"
                        id="cancelTripLog"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn-primary"
                        id="submitTripLog"
                    >
                        <i class="ph ph-paper-plane-tilt"></i>
                        Submit Trip Log
                    </button>

                </div>

            </form>

        </div>
    </div>
</div>