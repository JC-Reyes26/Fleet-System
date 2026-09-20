<div
  id="deleteDispatchModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="deleteDispatchModalTitle"
  aria-describedby="deleteDispatchModalDescription"
>
  <div class="custom-modal delete-modal">

    <div class="delete-icon">
      <i class="ph-fill ph-warning-circle"></i>
    </div>

    <h2 id="deleteDispatchModalTitle">
      Archive Dispatch
    </h2>

    <p id="deleteDispatchModalDescription">
      Are you sure you want to archive
      <strong id="deleteDispatchName">this dispatch</strong>?
    </p>

    <p class="delete-note" id="deleteDispatchMessageText">
      The dispatch will be archived and preserved in the system.
    </p>

    <div class="modal-footer">

      <button
        type="button"
        class="btn-outline"
        id="cancelDeleteDispatch"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn-danger"
        id="confirmDeleteDispatch"
      >
        <i class="ph ph-archive"></i>
        Archive Dispatch
      </button>

    </div>

  </div>
</div>