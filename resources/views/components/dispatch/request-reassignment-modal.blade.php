<div
    id="requestReassignmentModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="requestReassignmentModalTitle"
    hidden
>
    <div class="custom-modal">

        <div class="modal-header">
            <div>
                <h2 id="requestReassignmentModalTitle">
                    Request Reassignment
                </h2>

                <p>
                    Provide a reason for requesting a different driver.
                </p>
            </div>

            <button
                type="button"
                class="modal-close"
                id="closeRequestReassignmentModal"
                aria-label="Close modal"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>

        <div class="modal-body">

            <form id="requestReassignmentForm">

                <input
                    type="hidden"
                    id="reassignmentDispatchId"
                />

                <div class="form-group">
                    <label for="reassignmentReason">
                        Reason
                    </label>

                    <textarea
                        id="reassignmentReason"
                        rows="5"
                        required
                        minlength="10"
                        maxlength="2000"
                        placeholder="Explain why this dispatch should be reassigned."
                    ></textarea>

                    <small class="field-hint">
                        Minimum 10 characters.
                    </small>
                </div>

                <div class="modal-footer">

                    <button
                        type="button"
                        class="btn-outline"
                        id="cancelRequestReassignment"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn-primary"
                        id="submitRequestReassignment"
                    >
                        <i class="ph ph-paper-plane-tilt"></i>
                        Submit Request
                    </button>

                </div>

            </form>

        </div>
    </div>
</div>