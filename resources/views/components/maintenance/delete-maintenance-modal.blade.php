<div
    id="deleteMaintenanceModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="deleteMaintenanceModalTitle"
    aria-describedby="deleteMaintenanceModalDescription"
>
    <div class="custom-modal delete-modal">

        <button
            type="button"
            class="modal-close"
            id="closeDeleteMaintenanceModal"
            aria-label="Close maintenance action modal"
        >
            <i class="ph ph-x"></i>
        </button>

        <div class="delete-icon">
            <i class="ph-fill ph-warning-circle"></i>
        </div>

        <h2 id="deleteMaintenanceModalTitle">
            Archive Maintenance Record
        </h2>

        <p id="deleteMaintenanceModalDescription">
            Are you sure you want to archive
            <strong id="deleteMaintenanceNumber">
                this maintenance record
            </strong>
            for
            <strong id="deleteMaintenanceVehicle">
                this vehicle
            </strong>?

            <span id="deleteMaintenanceMessageText"></span>
        </p>

        <p class="delete-note">
            This record will be moved to Archived and can be restored later.
        </p>

        <div class="modal-footer">

            <button
                type="button"
                class="btn-outline"
                id="cancelDeleteMaintenance"
            >
                Cancel
            </button>

            <button
                type="button"
                class="btn-danger"
                id="confirmDeleteMaintenance"
            >
                <i class="ph ph-archive"></i>
                Archive Maintenance
            </button>

        </div>
    </div>
</div>