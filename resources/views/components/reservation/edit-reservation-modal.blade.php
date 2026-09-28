<div
  id="editReservationModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="editReservationModalTitle"
  aria-describedby="editReservationModalDescription"
>
  <div class="custom-modal">
    <!-- Header -->
    <div class="modal-header">
      <div>
        <h2 id="editReservationModalTitle">Edit Reservation</h2>

        <p id="editReservationModalDescription">
          Update transport reservation information.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeEditReservationModal"
        aria-label="Close edit reservation modal"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <!-- Body -->
    <div class="modal-body">
      <form id="editReservationForm" class="reservation-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="editReservationNumber">Reservation Number *</label>
            <input
              type="text"
              id="editReservationNumber"
              required
            />
          </div>

          <div class="form-group">
            <label
                for="editReservationPatient"
                id="editReservationPatientLabel"
            >
                Patient Name
            </label>
            <input
                type="text"
                id="editReservationPatient"
            />
          </div>

          <div class="form-group">
            <label for="editReservationType">Request Type *</label>
            <select id="editReservationType" required>
              <option value="">Select Request Type</option>
              <option value="Patient Transport">Patient Transport</option>
              <option value="Emergency Transfer">Emergency Transfer</option>
              <option value="Medical Appointment">Medical Appointment</option>
              <option value="Laboratory Transport">Laboratory Transport</option>
              <option value="Staff Transport">Staff Transport</option>
              <option value="Supply Delivery">Supply Delivery</option>
            </select>

            <small
                class="form-hint"
                id="reservationTypeHint"
            >
                Select the type of transportation request.
            </small>
          </div>

          <div class="form-group">
            <label for="editReservationVehicle">Vehicle *</label>
            <select id="editReservationVehicle">
              
            </select>
          </div>

          <div class="form-group">
            <label for="editReservationDriver">Driver *</label>
            <select id="editReservationDriver">
              <option value="">Select Vehicle First</option>
            </select>
            <small class="form-hint">
                Driver is based on the selected vehicle.
            </small>
          </div>

          <!-- Pickup Location -->
          <div class="form-group">
              <label for="editReservationPickup">
                  Pickup Location *
              </label>

              <div class="facility-autocomplete">
                  <input
                      type="text"
                      id="editReservationPickup"
                      class="form-control"
                      placeholder="Search hospital or facility..."
                      autocomplete="off"
                      required
                  />

                  <div
                      id="editReservationPickupSuggestions"
                      class="facility-suggestions"
                      hidden
                  ></div>
              </div>

              <small class="form-hint">
                  Hospital, facility, address, or other pickup location.
              </small>
          </div>

          <!-- Destination -->
          <div class="form-group">
              <label for="editReservationDestination">
                  Destination *
              </label>

              <div class="facility-autocomplete">
                  <input
                      type="text"
                      id="editReservationDestination"
                      class="form-control"
                      placeholder="Search hospital or facility..."
                      autocomplete="off"
                      required
                  />

                  <div
                      id="editReservationDestinationSuggestions"
                      class="facility-suggestions"
                      hidden
                  ></div>
              </div>

              <small class="form-hint">
                  Hospital, facility, address, or other destination location.
              </small>
          </div>

          <!-- Logistics Integration -->
          <div
              class="form-group full-width"
              id="editReservationLogisticsSection"
              hidden
          >
              <div class="section-header">
                  <h3>Logistics Information</h3>
                  <p>
                      Shipment details from the external Logistics system.
                  </p>
              </div>

              <div class="form-group">
                  <label for="editReservationShipment">
                      Logistics Shipment
                  </label>

                  <input
                      type="text"
                      id="editReservationShipment"
                      class="form-control"
                      placeholder="Waiting for Logistics integration"
                      readonly
                      disabled
                  />

                  <small class="form-hint">
                      Select an active shipment from the centralized Logistics system.
                  </small>
              </div>

              <div class="form-grid">
                  <div class="form-group">
                      <label for="editLogisticsExternalId">
                          Logistics Reference
                      </label>
                      <input
                          type="text"
                          id="editLogisticsExternalId"
                          placeholder="Waiting for Logistics integration"
                          readonly
                      />
                  </div>

                  <div class="form-group">
                      <label for="editLogisticsPoNumber">
                          PO Number
                      </label>
                      <input
                          type="text"
                          id="editLogisticsPoNumber"
                          placeholder="Waiting for Logistics integration"
                          readonly
                      />
                  </div>

                  <div class="form-group">
                      <label for="editLogisticsSupplier">
                          Supplier
                      </label>
                      <input
                          type="text"
                          id="editLogisticsSupplier"
                          placeholder="Waiting for Logistics integration"
                          readonly
                      />
                  </div>

                  <div class="form-group">
                      <label for="editLogisticsTrackingNumber">
                          Tracking / AWB Number
                      </label>
                      <input
                          type="text"
                          id="editLogisticsTrackingNumber"
                          placeholder="Waiting for Logistics integration"
                          readonly
                      />
                  </div>

                  <div class="form-group">
                      <label for="editLogisticsStatus">
                          Logistics Status
                      </label>
                      <input
                          type="text"
                          id="editLogisticsStatus"
                          value="Not Synced"
                          readonly
                      />
                  </div>

                  <div class="form-group">
                      <label for="editLogisticsEta">
                          External ETA
                      </label>
                      <input
                          type="text"
                          id="editLogisticsEta"
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

          <div class="form-group">
            <label for="editReservationDate">Schedule Date *</label>
            <input
              type="date"
              id="editReservationDate"
              required
            />
          </div>

          <div class="form-group">
            <label for="editReservationTime">Schedule Time *</label>
            <input
              type="time"
              id="editReservationTime"
              required
            />
          </div>

          <div class="form-group">
            <label for="editReservationPriority">Priority *</label>
            <select id="editReservationPriority" required>
              <option value="">Select Priority</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Emergency">Emergency</option>
            </select>

            <small
                class="form-hint"
                id="reservationPriorityHint"
            >
                Emergency priority is reserved for Emergency Transfer requests.
            </small>
          </div>

          <div class="form-group">
            <label for="editReservationStatus">Status *</label>
            <select id="editReservationStatus" required>
              <option value="">Select Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <!--<option value="Scheduled">Scheduled</option>-->
              <!--<option value="Completed">Completed</option>-->
              <option value="Rejected">Rejected</option>
              <!--<option value="Cancelled">Cancelled</option>-->
            </select>
          </div>

          <div class="form-group">
            <label for="editReservationContact">Contact Number</label>
            <input
              type="tel"
              id="editReservationContact"
            />
          </div>

          <div class="form-group full-width">
            <label for="editReservationNotes">Notes</label>
            <textarea
              id="editReservationNotes"
              rows="4"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-outline" id="cancelEditReservation">
            Cancel
          </button>

          <button type="submit" class="btn-primary" id="updateReservationBtn">
            Update Reservation
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
