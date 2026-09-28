<div
    id="addReservationModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="addReservationModalTitle"
>
    <div class="custom-modal">

        <!-- Header -->
        <div class="modal-header">
            <div>
                <h2 id="addReservationModalTitle">
                    Request New Reservation
                </h2>
                <p>
                    Create a hospital transport reservation request.
                </p>
            </div>

            <button
                type="button"
                class="modal-close"
                id="closeAddReservationModal"
                aria-label="Close add reservation modal"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">

            <form
                id="reservationForm"
                class="reservation-form"
            >
                <div class="form-grid">

                    <!-- Reservation Number -->
                    <div class="form-group">
                        <label for="reservationNumber">
                            Reservation Number *
                        </label>

                        <input
                            type="text"
                            id="reservationNumber"
                            readonly
                        />
                    </div>

                    <!-- Patient Name -->
                    <div class="form-group">
                        <label for="reservationPatient" id="reservationPatientLabel">
                            Patient Name
                        </label>

                        <input
                            type="text"
                            id="reservationPatient"
                            placeholder="Enter patient name"
                        />
                    </div>

                    <!-- Request Type -->
                    <div class="form-group">
                        <label for="reservationType">
                            Request Type *
                        </label>

                        <select
                            id="reservationType"
                            required
                        >
                            <option value="">
                                Select Request Type
                            </option>

                            <option value="Patient Transport">
                                Patient Transport
                            </option>

                            <option value="Emergency Transfer">
                                Emergency Transfer
                            </option>

                            <option value="Medical Appointment">
                                Medical Appointment
                            </option>

                            <option value="Laboratory Transport">
                                Laboratory Transport
                            </option>

                            <option value="Staff Transport">
                                Staff Transport
                            </option>

                            <option value="Supply Delivery">
                                Supply Delivery
                            </option>
                        </select>

                        <small
                            class="form-hint"
                            id="reservationTypeHint"
                        >
                            Select the type of transportation request.
                        </small>
                    </div>

                    <!-- Vehicle -->
                    <div class="form-group">
                        <label for="reservationVehicle">
                            Vehicle *
                        </label>

                        <select
                            id="reservationVehicle"
                            required
                        >
                            <option value="">
                                Loading vehicles...
                            </option>
                        </select>

                        <small class="form-hint">
                            Available vehicles are loaded automatically.
                        </small>
                    </div>

                    <!-- Driver -->
                    <div class="form-group">
                        <label for="reservationDriver">
                            Driver *
                        </label>

                        <select
                            id="reservationDriver"
                            required
                            disabled
                        >
                            <option value="">
                                Select Vehicle First
                            </option>
                        </select>

                        <small class="form-hint">
                            Driver is based on the selected vehicle.
                        </small>
                    </div>

                    <!-- Pickup Location -->
                     <div class="form-group">
                        <label for="reservationPickup">Pickup Location *</label>

                        <div class="facility-autocomplete">
                            <input
                                type="text"
                                id="reservationPickup"
                                class="form-control"
                                placeholder="Search hospital or facility..."
                                autocomplete="off"
                                required
                            />

                            <div
                                id="reservationPickupSuggestions"
                                class="facility-suggestions"
                                hidden
                            ></div>
                        </div>
                        <small
                            class="form-hint"
                            id="reservationPickupHint"
                        >
                            Hospital, facility, address, or other pickup location.
                        </small>
                    </div>
                    

                    <!-- Destination -->
                    <div class="form-group">
                        <label for="reservationDestination">Destination *</label>

                        <div class="facility-autocomplete">
                            <input
                                type="text"
                                id="reservationDestination"
                                class="form-control"
                                placeholder="Search hospital or facility..."
                                autocomplete="off"
                                required
                            />

                            <div
                                id="reservationDestinationSuggestions"
                                class="facility-suggestions"
                                hidden
                            ></div>
                        </div>
                        <small
                            class="form-hint"
                            id="reservationDestinationHint"
                        >
                            Hospital, facility, address, or other destination location.
                        </small>
                    </div>

                        <!-- Logistics Integration -->
                        <div
                            class="form-group full-width"
                            id="reservationLogisticsSection"
                            hidden
                        >
                            <div class="section-header">
                                <h3>Logistics Information</h3>
                                <p>
                                    Shipment details from the external Logistics system.
                                </p>
                            </div>

                            <div class="form-group full-width">
                            <label for="reservationShipment">Logistics Shipment</label>

                            <select
                                id="reservationShipment"
                                name="shipment_id"
                                class="form-control"
                                disabled
                            >
                                <option value="">Select Logistics Shipment</option>
                            </select>

                            <small class="form-hint">
                                Select an active shipment from the centralized Logistics system.
                            </small>
                        </div>

                        <div class="form-grid">

                            <!-- External Logistics ID -->
                            <div class="form-group">
                                <label for="logisticsExternalId">
                                    Logistics Reference
                                </label>

                                <input
                                    type="text"
                                    id="logisticsExternalId"
                                    placeholder="Waiting for Logistics integration"
                                    readonly
                                />
                            </div>

                            <!-- PO Number -->
                            <div class="form-group">
                                <label for="logisticsPoNumber">
                                    PO Number
                                </label>

                                <input
                                    type="text"
                                    id="logisticsPoNumber"
                                    placeholder="Waiting for Logistics integration"
                                    readonly
                                />
                            </div>

                            <!-- Supplier -->
                            <div class="form-group">
                                <label for="logisticsSupplier">
                                    Supplier
                                </label>

                                <input
                                    type="text"
                                    id="logisticsSupplier"
                                    placeholder="Waiting for Logistics integration"
                                    readonly
                                />
                            </div>

                            <!-- Tracking -->
                            <div class="form-group">
                                <label for="logisticsTrackingNumber">
                                    Tracking / AWB Number
                                </label>

                                <input
                                    type="text"
                                    id="logisticsTrackingNumber"
                                    placeholder="Waiting for Logistics integration"
                                    readonly
                                />
                            </div>

                            <!-- External Status -->
                            <div class="form-group">
                                <label for="logisticsStatus">
                                    Logistics Status
                                </label>

                                <input
                                    type="text"
                                    id="logisticsStatus"
                                    value="Not Synced"
                                    readonly
                                />
                            </div>

                            <!-- ETA -->
                            <div class="form-group">
                                <label for="logisticsEta">
                                    External ETA
                                </label>

                                <input
                                    type="text"
                                    id="logisticsEta"
                                    placeholder="Waiting for Logistics integration"
                                    readonly
                                />
                            </div>

                        </div>

                        <small class="form-hint">
                            Logistics information will be populated automatically
                            once the external Logistics system is integrated.
                        </small>
                    </div>

                    <!-- Schedule Date -->
                    <div class="form-group">
                        <label for="reservationDate">
                            Schedule Date *
                        </label>

                        <input
                            type="date"
                            id="reservationDate"
                            required
                        />

                        <small
                            class="form-hint"
                            id="reservationDateHint"
                        >
                            Date is controlled by Reservation Settings.
                        </small>
                    </div>

                    <!-- Schedule Time -->
                    <div class="form-group">
                        <label for="reservationTime">
                            Schedule Time *
                        </label>

                        <input
                            type="time"
                            id="reservationTime"
                            required
                        />

                        <small
                            class="form-hint"
                            id="reservationTimeHint"
                        >
                            Enter the scheduled pickup time.
                        </small>
                    </div>

                    <!-- Priority -->
                    <div class="form-group">
                        <label for="reservationPriority">
                            Priority *
                        </label>

                        <select
                            id="reservationPriority"
                            required
                        >
                            <option value="">
                                Select Priority
                            </option>

                            <option value="Low">
                                Low
                            </option>

                            <option value="Normal">
                                Normal
                            </option>

                            <option value="High">
                                High
                            </option>

                            <option value="Emergency">
                                Emergency
                            </option>
                        </select>

                        <small
                            class="form-hint"
                            id="reservationPriorityHint"
                        >
                            Emergency priority is reserved for Emergency Transfer requests.
                        </small>
                    </div>

                    <!-- Status -->
                    <div class="form-group">
                        <label for="reservationStatus">
                            Status *
                        </label>

                        <select
                            id="reservationStatus"
                            disabled
                        >
                            <option value="Pending">
                                Pending
                            </option>

                            <option value="Approved">
                                Approved
                            </option>
                        </select>

                        <small
                            class="form-hint"
                            id="reservationStatusHint"
                        >
                            Initial status is controlled by Reservation Settings.
                        </small>
                    </div>

                    <!-- Contact Number -->
                    <div class="form-group">
                        <label for="reservationContact">
                            Contact Number
                        </label>

                        <input
                            type="tel"
                            id="reservationContact"
                            placeholder="Enter contact number"
                            autocomplete="tel"
                        />
                    </div>

                    <!-- Notes -->
                    <div class="form-group full-width">
                        <label for="reservationNotes">
                            Notes
                        </label>

                        <textarea
                            id="reservationNotes"
                            rows="4"
                            placeholder="Enter additional instructions or remarks..."
                        ></textarea>
                    </div>

                </div>

                <!-- Footer -->
                <div class="modal-footer">

                    <button
                        type="button"
                        class="btn-outline"
                        id="cancelAddReservation"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn-primary"
                        id="saveReservationBtn"
                    >
                        Save Reservation
                    </button>

                </div>

            </form>

        </div>
    </div>
</div>