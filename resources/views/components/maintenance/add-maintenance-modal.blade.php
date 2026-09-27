<div
  id="addMaintenanceModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="addMaintenanceModalTitle"
  aria-describedby="addMaintenanceModalDescription"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="addMaintenanceModalTitle">Request Maintenance</h2>
        <p id="addMaintenanceModalDescription">
          Create a maintenance record for a hospital fleet vehicle.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeAddMaintenanceModal"
        aria-label="Close add maintenance modal"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <form id="maintenanceForm">
        <div class="form-grid">

          <!-- Maintenance Number -->
          <div class="form-group">
            <label for="maintenanceNumber">
              Maintenance Number *
            </label>

            <input
              type="text"
              id="maintenanceNumber"
              required
              readonly
            />
          </div>

          <!-- Vehicle -->
          <div class="form-group">
            <label for="maintenanceVehicle">
              Vehicle *
            </label>

            <select
              id="maintenanceVehicle"
              required
            >
              <option value="">
                Select Vehicle
              </option>
            </select>
          </div>

          <!-- Request Type -->
          <div class="form-group">
            <label for="maintenanceRequestType">
              Request Type *
            </label>

            <select
              id="maintenanceRequestType"
              required
            >
              <option value="">
                Select Request Type
              </option>
              <option value="Normal">
                Normal Maintenance
              </option>
              <option value="Emergency">
                Emergency Maintenance
              </option>
            </select>
          </div>

          <!-- Service Type -->
          <div class="form-group">
            <label for="maintenanceServiceType">
              Service Type *
            </label>

            <select
              id="maintenanceServiceType"
              required
            >
              <option value="">
                Select Service Type
              </option>
            </select>
          </div>

          <!-- Technician / Workshop -->
          <div class="form-group">
            <label for="maintenanceTechnician">
              Technician / Workshop *
            </label>

            <select
              id="maintenanceTechnician"
              required
            >
              <option value="">
                Select Technician / Workshop
              </option>
            </select>
          </div>

          <!-- Scheduled Date -->
          <div class="form-group">
            <label for="maintenanceScheduledDate">
              Scheduled Date *
            </label>

            <input
              type="date"
              id="maintenanceScheduledDate"
              required
            />
          </div>

          <!-- Completion Date -->
          <div class="form-group">
            <label for="maintenanceCompletionDate">
              Completion Date
            </label>

            <input
              type="date"
              id="maintenanceCompletionDate"
            />
          </div>

          <!-- Cost -->
          <div class="form-group">
            <label for="maintenanceCost">
              Cost
              <span
                id="maintenanceCostRequiredMark"
              >*</span>
            </label>

            <input
              type="number"
              id="maintenanceCost"
              min="0"
              step="0.01"
              placeholder="0.00"
              readonly
            />
          </div>

          <!-- Priority -->
          <div class="form-group">
            <label for="maintenancePriority">
              Priority *
            </label>

            <select
              id="maintenancePriority"
              required
            >
              <option value="">
                Select Priority
              </option>
              <option value="Emergency">
                Emergency
              </option>
              <option value="High">
                High
              </option>
              <option value="Normal">
                Normal
              </option>
              <option value="Low">
                Low
              </option>
            </select>
          </div>

          <!-- Status -->
          <div class="form-group">
            <label for="maintenanceStatus">
              Status *
            </label>

            <select
              id="maintenanceStatus"
              required
            >
              <option value="">
                Select Status
              </option>
              <option value="Scheduled">
                Scheduled
              </option>
              <option value="In Progress">
                In Progress
              </option>
              <option value="Completed">
                Completed
              </option>
              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <!-- Odometer -->
          <div class="form-group">
            <label for="maintenanceOdometer">
              Odometer Reading
            </label>

            <input
              type="number"
              id="maintenanceOdometer"
              min="0"
              placeholder="Enter kilometer reading"
            />
          </div>

          <!-- Description -->
          <div class="form-group full-width">
            <label for="maintenanceDescription">
              Description *
            </label>

            <textarea
              id="maintenanceDescription"
              rows="4"
              placeholder="Describe the required service or repair"
              required
            ></textarea>
          </div>

          <!-- Parts Used -->
          <div class="form-group full-width">
            <label for="maintenancePartsUsed">
              Parts Used
            </label>

            <textarea
              id="maintenancePartsUsed"
              rows="3"
              placeholder="List parts used, if any"
            ></textarea>
          </div>

          <!-- Notes -->
          <div class="form-group full-width">
            <label for="maintenanceNotes">
              Notes
            </label>

            <textarea
              id="maintenanceNotes"
              rows="3"
              placeholder="Add additional notes"
            ></textarea>
          </div>

        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-outline"
            id="cancelAddMaintenance"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn-primary"
            id="saveMaintenanceBtn"
          >
            Save Maintenance
          </button>
        </div>
      </form>
    </div>
  </div>
</div>