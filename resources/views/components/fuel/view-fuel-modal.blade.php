<div
  id="viewFuelModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="viewFuelModalTitle"
  aria-describedby="viewFuelModalDescription"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="viewFuelModalTitle">Fuel Record Details</h2>
        <p id="viewFuelModalDescription">
          View complete fuel transaction information.
        </p>
      </div>
      <button
        type="button"
        class="modal-close"
        id="closeViewFuelModal"
        aria-label="Close fuel details"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <div class="view-fuel-summary">
        <div class="view-fuel-summary-item">
          <span class="view-fuel-summary-label">Fuel Record No.</span>
          <span class="view-fuel-summary-value" id="viewFuelNumber"></span>
        </div>
        <div class="view-fuel-summary-item">
          <span class="view-fuel-summary-label">Vehicle</span>
          <span class="view-fuel-summary-value" id="viewFuelVehicle"></span>
        </div>
        <div class="view-fuel-summary-item">
          <span class="view-fuel-summary-label">Fuel Type</span>
          <span class="view-fuel-summary-value" id="viewFuelType"></span>
        </div>
        <div class="view-fuel-summary-item">
          <span class="view-fuel-summary-label">Total Cost</span>
          <span class="view-fuel-summary-value" id="viewFuelTotalCost"></span>
        </div>
      </div>

      <div class="view-fuel-details">
        <div class="view-fuel-detail-item">
          <label>Refueling Date</label>
          <p id="viewFuelDate"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Refueling Time</label>
          <p id="viewFuelTime"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Plate Number</label>
          <p id="viewFuelPlate"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Driver</label>
          <p id="viewFuelDriver"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Quantity</label>
          <p id="viewFuelQuantity"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Cost per Liter</label>
          <p id="viewFuelCostPerLiter"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Odometer</label>
          <p id="viewFuelOdometer"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Fuel Station</label>
          <p id="viewFuelStation"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Receipt / Reference</label>
          <p id="viewFuelReceipt"></p>
        </div>
        <div class="view-fuel-detail-item">
          <label>Payment Method</label>
          <p id="viewFuelPayment"></p>
        </div>
      </div>

      <div class="view-fuel-notes">
        <label>Notes</label>
        <p id="viewFuelNotes"></p>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-outline" id="closeViewFuelBtn">Close</button>
      @if($fuelPermissions['canUpdate'] ?? false)
        <button type="button" class="btn-primary" id="editFuelFromViewBtn">
          <i class="ph ph-pencil-simple"></i>
          Edit Fuel Record
        </button>
      @endif
    </div>
  </div>
</div>
