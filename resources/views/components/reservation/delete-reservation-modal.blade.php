<div
  id="deleteReservationModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="deleteReservationModalTitle"
  aria-describedby="deleteReservationModalDescription"
>
  <div class="custom-modal delete-modal">
    <div class="delete-icon">
      <i class="ph-fill ph-warning-circle"></i>
    </div>

    <h2 id="deleteReservationModalTitle">
      Archive Reservation
    </h2>

    <p id="deleteReservationModalDescription">
      <span id="deleteReservationMessageText">
        Are you sure you want to archive
      </span>
      <strong id="deleteReservationName">
        this reservation
      </strong>?
    </p>

    <p class="delete-note">
      The reservation will be removed from the active list while its records and history are preserved.
    </p>

    <div class="modal-footer">
      <button
        type="button"
        class="btn-outline"
        id="cancelDeleteReservation"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn-danger"
        id="confirmDeleteReservation"
      >
        <i class="ph ph-archive"></i>
        Archive Reservation
      </button>
    </div>
  </div>
</div>