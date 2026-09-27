<div
  id="addFuelModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="addFuelModalTitle"
  aria-describedby="addFuelModalDescription"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="addFuelModalTitle">Request Fuel Record</h2>
        <p id="addFuelModalDescription">
          Log a refueling transaction for a hospital fleet vehicle.
        </p>
      </div>
      <button
        type="button"
        class="modal-close"
        id="closeAddFuelModal"
        aria-label="Close add fuel modal"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <form id="fuelForm">
        <div class="form-grid">
          <div class="form-group">
            <label for="fuelNumber">Fuel Record Number *</label>
            <input type="text" id="fuelNumber" readonly required />
          </div>

          <div class="form-group">
            <label for="fuelRefuelDate">Refueling Date *</label>
            <input type="date" id="fuelRefuelDate" required />
          </div>

          <div class="form-group">
            <label for="fuelRefuelTime">Refueling Time</label>
            <input type="time" id="fuelRefuelTime" />
          </div>

          <div class="form-group">
            <label for="fuelVehicle">Vehicle *</label>
            <select id="fuelVehicle" required>
              <option value="">Select Vehicle</option>
            
            </select>
          </div>

          <div class="form-group">
            <label for="fuelPlate">Plate Number</label>
            <input type="text" id="fuelPlate" readonly placeholder="Auto-filled from vehicle" />
          </div>

          <div class="form-group">
            <label for="fuelDriver">Driver *</label>
            <input
              type="text"
              id="fuelDriver"
              placeholder="Assigned driver"
              readonly
              required
            />
            <input type="hidden" id="fuelDriverId" />
          </div>

          <div class="form-group">
            <label for="fuelTankCapacity">Tank Capacity</label>
            <input
              type="text"
              id="fuelTankCapacity"
              readonly
              placeholder="Auto-filled from vehicle"
            />
          </div>

          <div class="form-group">
            <label for="fuelCurrentFuel">Current Fuel</label>
            <input
              type="text"
              id="fuelCurrentFuel"
              readonly
              placeholder="Auto-filled from vehicle"
            />
          </div>

          <div class="form-group">
            <label for="fuelType">Fuel Type *</label>
            <select id="fuelType" required disabled>
              <option value="">Select Fuel Type</option>
              <option value="Diesel">Diesel</option>
              <option value="Gasoline">Gasoline</option>
              <option value="Premium Gasoline">Premium Gasoline</option>
            </select>
          </div>

          <div class="form-group">
            <label for="fuelQuantity">Quantity (Liters) *</label>
            <input
              type="number"
              id="fuelQuantity"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div class="form-group">
            <label for="fuelCostPerLiter">Cost per Liter *</label>
            <input
              type="number"
              id="fuelCostPerLiter"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div class="form-group">
            <label for="fuelTotalCost">Total Cost *</label>
            <input type="number" id="fuelTotalCost" min="0" step="0.01" readonly required />
            <small
                id="fuelHighCostWarning"
                class="form-hint"
                hidden
            ></small>
          </div>

          <div class="form-group">
            <label for="fuelOdometer">
                Odometer Reading
                <span id="fuelOdometerRequiredMark">*</span>
            </label>
            <input
              type="number"
              id="fuelOdometer"
              min="0"
              step="1"
              placeholder="Kilometers"
            />
          </div>

          <div class="form-group">
            <label for="fuelStation">
                Fuel Station
                <span id="fuelStationRequiredMark">*</span>
            </label>
            <select id="fuelStation">
              <option value="">Select Fuel Station</option>
            </select>
          </div>

          <div class="form-group">
            <label for="fuelReceipt">Receipt / Reference Number</label>
            <input type="text" id="fuelReceipt" placeholder="Optional" maxlength="40" />
          </div>

          <div class="form-group">
            <label for="fuelPayment">Payment Method</label>
            <select id="fuelPayment">
              <option value="">Select payment method</option>
              <option value="Fleet Card">Fleet Card</option>
              <option value="Cash">Cash</option>
              <option value="Company Account">Company Account</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label for="fuelNotes">Notes</label>
            <textarea id="fuelNotes" rows="3" placeholder="Add optional notes"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-outline" id="cancelAddFuel">Cancel</button>
          <button type="submit" class="btn-primary" id="saveFuelBtn">Save Fuel Record</button>
        </div>
      </form>
    </div>
  </div>
</div>
