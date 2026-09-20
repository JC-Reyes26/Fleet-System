<div
  class="modal-overlay"
  id="deleteVehicleModal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="deleteVehicleTitle"
>
  <div class="custom-modal delete-modal">
    <div class="delete-icon">
      <i class="ph-fill ph-warning-circle"></i>
    </div>

    <h2 id="deleteVehicleTitle">Archive Vehicle</h2>

    <p id="deleteVehicleMessage">
      Are you sure you want to archive
      <strong id="deleteVehicleName">Vehicle</strong>?
    </p>

    <p class="delete-note">
      The vehicle will be removed from the active fleet list but its records and history will be preserved.
    </p>

    <div class="modal-footer">
      <button
        type="button"
        class="btn-outline"
        id="cancelDeleteVehicle"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn-danger"
        id="confirmDeleteVehicle"
      >
        <i class="ph ph-archive"></i>
        Archive Vehicle
      </button>
    </div>
  </div>
</div>