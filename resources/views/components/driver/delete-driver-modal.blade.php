<div
  id="deleteDriverModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="deleteDriverModalTitle"
  aria-describedby="deleteDriverModalDescription"
>
  <div class="custom-modal delete-modal">

    <div class="delete-icon">
      <i class="ph-fill ph-warning-circle"></i>
    </div>

    <h2 id="deleteDriverModalTitle">
      Archive Driver
    </h2>

    <p id="deleteDriverModalDescription">
      Are you sure you want to archive
      <strong id="deleteDriverName">
        this driver
      </strong>?
    </p>

    <p
      class="delete-note"
      id="deleteDriverMessageText"
    >
      The driver record will be archived and preserved in the system.
    </p>

    <div class="modal-footer">

      <button
        type="button"
        class="btn-outline"
        id="cancelDeleteDriver"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn-danger"
        id="confirmDeleteDriver"
      >
        <i class="ph ph-archive"></i>
        Archive Driver
      </button>

    </div>

  </div>
</div>