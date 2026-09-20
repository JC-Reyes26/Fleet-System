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
            <label for="editReservationPatient">Patient Name *</label>
            <input
              type="text"
              id="editReservationPatient"
              required
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
          </div>

          <div class="form-group">
            <label for="editReservationVehicle">Vehicle *</label>
            <select id="editReservationVehicle" required>
              
            </select>
          </div>

          <div class="form-group">
            <label for="editReservationDriver">Driver *</label>
            <select id="editReservationDriver" required>
              <option value="">Select Vehicle First</option>
            </select>
          </div>

          <div class="form-group">
            <label for="editReservationPickup">Pickup Location *</label>
            <input
              type="text"
              id="editReservationPickup"
              required
            />
          </div>

          <div class="form-group">
            <label for="editReservationDestination">Destination *</label>
            <input
              type="text"
              id="editReservationDestination"
              required
            />
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
