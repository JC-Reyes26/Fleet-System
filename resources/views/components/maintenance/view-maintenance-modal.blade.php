<div
  id="viewMaintenanceModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="viewMaintenanceModalTitle"
  aria-describedby="viewMaintenanceModalDescription"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="viewMaintenanceModalTitle">Maintenance Details</h2>

        <p id="viewMaintenanceModalDescription">
          View complete vehicle maintenance record information.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeViewMaintenanceModal"
        aria-label="Close maintenance details"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <div class="view-maintenance-summary">
        <div class="view-maintenance-summary-item">
          <span class="view-maintenance-summary-label">Maintenance Number</span>
          <span class="view-maintenance-summary-value" id="viewMaintenanceNumber"></span>
        </div>

        <div class="view-maintenance-summary-item">
          <span class="view-maintenance-summary-label">Vehicle</span>
          <span class="view-maintenance-summary-value" id="viewMaintenanceVehicle"></span>
        </div>

        <div class="view-maintenance-summary-item">
          <span class="view-maintenance-summary-label">Status</span>
          <span id="viewMaintenanceStatus"></span>
        </div>

        <div class="view-maintenance-summary-item">
          <span class="view-maintenance-summary-label">Priority</span>
          <span class="view-maintenance-summary-value" id="viewMaintenancePriority"></span>
        </div>
      </div>

      <div class="view-maintenance-details">
        <div class="view-maintenance-detail-item">
          <label>Service Type</label>
          <p id="viewMaintenanceServiceType"></p>
        </div>

        <div class="view-maintenance-detail-item">
          <label>Request Type</label>
          <p id="viewMaintenanceRequestType"></p>
        </div>

        <div class="view-maintenance-detail-item">
          <label>Technician / Workshop</label>
          <p id="viewMaintenanceTechnician"></p>
        </div>

        <div class="view-maintenance-detail-item">
          <label>Scheduled Date</label>
          <p id="viewMaintenanceScheduledDate"></p>
        </div>

        <div class="view-maintenance-detail-item">
          <label>Completion Date</label>
          <p id="viewMaintenanceCompletionDate"></p>
        </div>

        <div class="view-maintenance-detail-item">
          <label>Cost</label>
          <p id="viewMaintenanceCost"></p>
        </div>

        <div class="view-maintenance-detail-item">
          <label>Odometer Reading</label>
          <p id="viewMaintenanceOdometer"></p>
        </div>
      </div>

      <div class="view-maintenance-notes">
        <label>Description</label>
        <p id="viewMaintenanceDescription"></p>

        <label>Parts Used</label>
        <p id="viewMaintenancePartsUsed"></p>

        <label>Notes</label>
        <p id="viewMaintenanceNotes"></p>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-outline" id="closeViewMaintenanceBtn">
        Close
      </button>

      @if($maintenancePermissions['canUpdate'] ?? false)
          <button
              type="button"
              class="btn-primary"
              id="editMaintenanceFromViewBtn"
          >
              <i class="ph ph-pencil-simple"></i>
              Edit Maintenance
          </button>
      @endif
    </div>
  </div>
</div>
