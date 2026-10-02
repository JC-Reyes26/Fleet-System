<div
  id="viewDispatchModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="viewDispatchModalTitle"
  aria-describedby="viewDispatchModalDescription"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="viewDispatchModalTitle">Dispatch Details</h2>

        <p id="viewDispatchModalDescription">
          View complete hospital transport dispatch information.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeViewDispatchModal"
        aria-label="Close dispatch details"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <div class="view-dispatch-summary">
        <div class="view-dispatch-summary-item">
          <span class="view-dispatch-summary-label">Dispatch Number</span>
          <span class="view-dispatch-summary-value" id="viewDispatchNumber"></span>
        </div>

        <div class="view-dispatch-summary-item">
          <span class="view-dispatch-summary-label">Reservation Number</span>
          <span class="view-dispatch-summary-value" id="viewDispatchReservation"></span>
        </div>

        <div class="view-dispatch-summary-item">
          <span class="view-dispatch-summary-label">Status</span>
          <span id="viewDispatchStatus"></span>
        </div>

        <div class="view-dispatch-summary-item">
          <span class="view-dispatch-summary-label">Priority</span>
          <span class="view-dispatch-summary-value" id="viewDispatchPriority"></span>
        </div>
      </div>

      <div class="view-dispatch-details">
        <div class="view-dispatch-detail-item">
          <label>Patient Name</label>
          <p id="viewDispatchPatient"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Request Type</label>
          <p id="viewDispatchRequestType"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Assigned Vehicle</label>
          <p id="viewDispatchVehicle"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Assigned Driver</label>
          <p id="viewDispatchDriver"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Pickup Location</label>
          <p id="viewDispatchPickup"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Destination</label>
          <p id="viewDispatchDestination"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Schedule</label>
          <p id="viewDispatchSchedule"></p>
        </div>

        <div class="view-dispatch-detail-item">
          <label>Contact Number</label>
          <p id="viewDispatchContact"></p>
        </div>
      </div>

      <div class="view-dispatch-assignment-section">
        <div class="view-dispatch-section-header">
            <h3>Assignment History</h3>
            <p>
                Original assignment, AI recommendation, and final reassignment.
            </p>
        </div>
        <div class="view-dispatch-details">
            <div class="view-dispatch-detail-item">
                <label>Original Vehicle</label>
                <p id="viewDispatchOriginalVehicle">
                    Not reassigned
                </p>
            </div>

            <div class="view-dispatch-detail-item">
                <label>Original Driver</label>
                <p id="viewDispatchOriginalDriver">
                    Not reassigned
                </p>
            </div>

            <div class="view-dispatch-detail-item">
                <label>AI Recommended Vehicle</label>
                <p id="viewDispatchRecommendedVehicle">
                    No recommendation
                </p>
            </div>

            <div class="view-dispatch-detail-item">
                <label>AI Recommended Driver</label>
                <p id="viewDispatchRecommendedDriver">
                    No recommendation
                </p>
            </div>

            <div class="view-dispatch-detail-item">
                <label>Reassigned Vehicle</label>
                <p id="viewDispatchReassignedVehicle">
                    Not reassigned
                </p>
            </div>

            <div class="view-dispatch-detail-item">
                <label>Reassigned Driver</label>
                <p id="viewDispatchReassignedDriver">
                    Not reassigned
                </p>
            </div>
        </div>
    </div>

      <div class="view-dispatch-notes">
        <label>Notes</label>
        <p id="viewDispatchNotes"></p>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-outline" id="closeViewDispatchBtn">
        Close
      </button>

      <button type="button" class="btn-primary" id="editDispatchFromViewBtn">
        <i class="ph ph-pencil-simple"></i>
        Edit Dispatch
      </button>
    </div>
  </div>
</div>
