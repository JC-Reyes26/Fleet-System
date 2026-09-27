<div
  id="editMaintenanceModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="editMaintenanceModalTitle"
  aria-describedby="editMaintenanceModalDescription"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="editMaintenanceModalTitle">
          Edit Maintenance
        </h2>

        <p id="editMaintenanceModalDescription">
          Update vehicle maintenance record information.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeEditMaintenanceModal"
        aria-label="Close edit maintenance modal"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <form id="editMaintenanceForm">
        <div class="form-grid">

          <!-- Maintenance Number -->
          <div class="form-group">
            <label for="editMaintenanceNumber">
              Maintenance Number *
            </label>

            <input
              type="text"
              id="editMaintenanceNumber"
              placeholder="MNT-2026-001"
              required
            />
          </div>

          <!-- Vehicle -->
          <div class="form-group">
            <label for="editMaintenanceVehicle">
              Vehicle *
            </label>

            <select
              id="editMaintenanceVehicle"
              required
            >
              <option value="">
                Select Vehicle
              </option>
            </select>
          </div>

          <!-- Service Type -->
          <div class="form-group">
            <label for="editMaintenanceServiceType">
              Service Type *
            </label>

            <select
              id="editMaintenanceServiceType"
              required
            >
              <option value="">
                Select Service Type
              </option>
            </select>
          </div>

          <!-- Technician / Workshop -->
          <div class="form-group">
            <label for="editMaintenanceTechnician">
              Technician / Workshop *
            </label>

            <select
              id="editMaintenanceTechnician"
              required
            >
              <option value="">
                Select Technician / Workshop
              </option>
            </select>
          </div>

          <!-- Scheduled Date -->
          <div class="form-group">
            <label for="editMaintenanceScheduledDate">
              Scheduled Date *
            </label>

            <input
              type="date"
              id="editMaintenanceScheduledDate"
              required
            />
          </div>

          <!-- Completion Date -->
          <div class="form-group">
            <label for="editMaintenanceCompletionDate">
              Completion Date
            </label>

            <input
              type="date"
              id="editMaintenanceCompletionDate"
            />
          </div>

          <!-- Cost -->
          <div class="form-group">
            <label for="editMaintenanceCost">
              Cost
              <span
                id="editMaintenanceCostRequiredMark"
              >*</span>
            </label>

            <input
              type="number"
              id="editMaintenanceCost"
              min="0"
              step="0.01"
              placeholder="0.00"
              readonly
            />
          </div>

          <!-- Priority -->
          <div class="form-group">
            <label for="editMaintenancePriority">
              Priority *
            </label>

            <select
              id="editMaintenancePriority"
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
            <label for="editMaintenanceStatus">
              Status *
            </label>

            <select
              id="editMaintenanceStatus"
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
            <label for="editMaintenanceOdometer">
              Odometer Reading
            </label>

            <input
              type="number"
              id="editMaintenanceOdometer"
              min="0"
              placeholder="Enter kilometer reading"
            />
          </div>

          <!-- Description -->
          <div class="form-group full-width">
            <label for="editMaintenanceDescription">
              Description *
            </label>

            <textarea
              id="editMaintenanceDescription"
              rows="4"
              placeholder="Describe the required service or repair"
              required
            ></textarea>
          </div>

          <!-- Parts Used -->
          <div class="form-group full-width">
            <label for="editMaintenancePartsUsed">
              Parts Used
            </label>

            <textarea
              id="editMaintenancePartsUsed"
              rows="3"
              placeholder="List parts used, if any"
            ></textarea>
          </div>

          <!-- Notes -->
          <div class="form-group full-width">
            <label for="editMaintenanceNotes">
              Notes
            </label>

            <textarea
              id="editMaintenanceNotes"
              rows="3"
              placeholder="Add additional notes"
            ></textarea>
          </div>

        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-outline"
            id="cancelEditMaintenance"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn-primary"
            id="updateMaintenanceBtn"
          >
            Update Maintenance
          </button>
        </div>
      </form>
    </div>
  </div>
</div>