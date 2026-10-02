<div
    class="modal fade"
    id="reassignmentReviewModal"
    tabindex="-1"
    aria-labelledby="reassignmentReviewModalTitle"
    aria-hidden="true"
>
    <div
        class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
    >
        <div class="modal-content">

            <!-- =========================================================
                 HEADER
                 ========================================================= -->
            <div class="modal-header">
                <div>
                    <h2
                        class="modal-title"
                        id="reassignmentReviewModalTitle"
                    >
                        Review Reassignment Request
                    </h2>

                    <p>
                        Review the driver's reassignment request and select
                        an available replacement vehicle and driver.
                    </p>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-bs-dismiss="modal"
                    aria-label="Close modal"
                >
                    <i class="ph ph-x"></i>
                </button>
            </div>


            <!-- =========================================================
                 BODY
                 ========================================================= -->
            <div class="modal-body">

                <input
                    type="hidden"
                    id="reviewReassignmentId"
                />

                <div class="form-grid">

                    <!-- =====================================================
                         DISPATCH NUMBER
                         ===================================================== -->
                    <div class="form-group">
                        <label for="reviewDispatchNumber">
                            Dispatch Number
                        </label>

                        <input
                            type="text"
                            id="reviewDispatchNumber"
                            readonly
                        />
                    </div>


                    <!-- =====================================================
                         RESERVATION
                         ===================================================== -->
                    <div class="form-group">
                        <label for="reviewReservationNumber">
                            Reservation
                        </label>

                        <input
                            type="text"
                            id="reviewReservationNumber"
                            readonly
                        />
                    </div>


                    <!-- =====================================================
                         CURRENT DRIVER
                         ===================================================== -->
                    <div class="form-group">
                        <label for="reviewCurrentDriver">
                            Current Driver
                        </label>

                        <input
                            type="text"
                            id="reviewCurrentDriver"
                            readonly
                        />
                    </div>


                    <!-- =====================================================
                         CURRENT VEHICLE
                         ===================================================== -->
                    <div class="form-group">
                        <label for="reviewVehicle">
                            Vehicle
                        </label>

                        <input
                            type="text"
                            id="reviewVehicle"
                            readonly
                        />
                    </div>


                    <!-- =====================================================
                         REASSIGNMENT REASON
                         ===================================================== -->
                    <div class="form-group full-width">
                        <label for="reviewReason">
                            Reassignment Reason
                        </label>

                        <textarea
                            id="reviewReason"
                            rows="4"
                            readonly
                        ></textarea>
                    </div>


                    <!-- =====================================================
                         REPLACEMENT VEHICLE + DRIVER
                         ===================================================== -->
                    <div class="form-group full-width">
                        <label for="reviewNewDriver">
                            Replacement Vehicle &amp; Driver
                        </label>

                        <select
                            id="reviewNewDriver"
                        >
                            <option value="">
                                Loading available vehicle and driver combinations...
                            </option>
                        </select>

                        <small class="field-hint">
                            Select a vehicle and driver combination manually
                            or use the system recommendation below.
                        </small>
                    </div>


                    <!-- =====================================================
                         AI RECOMMENDATION
                         ===================================================== -->
                    <div class="form-group full-width">

                        <div
                            id="reviewAiRecommendation"
                            class="dispatch-ai-recommendation"
                            hidden
                            aria-live="polite"
                        >

                            <!-- AI HEADER -->
                            <div
                                class="dispatch-ai-recommendation-header"
                            >
                                <div>
                                    <strong>
                                        AI Vehicle &amp; Driver Recommendation
                                    </strong>

                                    <small>
                                        System-generated recommendation
                                        based on current fleet data.
                                    </small>
                                </div>

                                <span
                                    id="reviewAiScoreBadge"
                                    class="status-badge scheduled"
                                >
                                    —
                                </span>
                            </div>


                            <!-- AI ASSIGNMENT + METRICS -->
                            <div
                                class="dispatch-ai-assignment-grid"
                            >

                                <div>
                                    <label>
                                        Recommended Vehicle
                                    </label>

                                    <strong
                                        id="reviewAiVehicle"
                                    >
                                        —
                                    </strong>
                                </div>

                                <div>
                                    <label>
                                        Recommended Driver
                                    </label>

                                    <strong
                                        id="reviewAiDriver"
                                    >
                                        —
                                    </strong>
                                </div>

                                <div>
                                    <label>
                                        Distance to Pickup
                                    </label>

                                    <strong
                                        id="reviewAiDistance"
                                    >
                                        —
                                    </strong>
                                </div>

                                <div>
                                    <label>
                                        Traffic ETA
                                    </label>

                                    <strong
                                        id="reviewAiEta"
                                    >
                                        —
                                    </strong>
                                </div>

                                <div>
                                    <label>
                                        Traffic Delay
                                    </label>

                                    <strong
                                        id="reviewAiTrafficDelay"
                                    >
                                        —
                                    </strong>
                                </div>

                                <div>
                                    <label>
                                        Traffic
                                    </label>

                                    <strong
                                        id="reviewAiTraffic"
                                    >
                                        —
                                    </strong>
                                </div>

                                <div>
                                    <label>
                                        GPS Status
                                    </label>

                                    <strong
                                        id="reviewAiGps"
                                    >
                                        —
                                    </strong>
                                </div>

                            </div>


                            <!-- AI REASONS -->
                            <div class="dispatch-ai-reasons">

                                <label>
                                    Recommendation Reasons
                                </label>

                                <ul
                                    id="reviewAiReasons"
                                ></ul>

                            </div>


                            <!-- SCORE BREAKDOWN TOGGLE -->
                            <div
                                class="dispatch-ai-score-breakdown-toggle"
                            >
                                <button
                                    type="button"
                                    class="btn-outline"
                                    id="toggleReviewAiScoreBreakdown"
                                    aria-expanded="false"
                                    aria-controls="reviewAiScoreBreakdown"
                                >
                                    <i class="ph ph-chart-bar"></i>
                                    View Score Breakdown
                                </button>
                            </div>


                            <!-- SCORE BREAKDOWN -->
                            <div
                                id="reviewAiScoreBreakdown"
                                class="dispatch-ai-score-breakdown"
                                hidden
                            >

                                <div
                                    class="dispatch-ai-score-breakdown-header"
                                >
                                    <div>

                                        <strong>
                                            Recommendation Score
                                        </strong>

                                        <small>
                                            How the system calculated the
                                            replacement recommendation.
                                        </small>

                                    </div>

                                    <span
                                        id="reviewAiBreakdownTotal"
                                    >
                                        0/100
                                    </span>

                                </div>

                                <div
                                    id="reviewAiScoreBreakdownList"
                                    class="dispatch-ai-score-breakdown-list"
                                ></div>

                            </div>


                            <!-- AI MESSAGE -->
                            <div
                                id="reviewAiMessage"
                                class="dispatch-ai-message"
                            ></div>


                            <!-- =================================================
                                 GEMINI AI EXPLANATION
                                 ================================================= -->
                            <div
                                id="reviewAiGemini"
                                class="dispatch-ai-gemini"
                                hidden
                            >

                                <!-- Gemini Header -->
                                <div
                                    class="dispatch-ai-gemini-header"
                                >

                                    <div
                                        class="dispatch-ai-gemini-title"
                                    >
                                        <i
                                            class="ph ph-sparkle"
                                        ></i>

                                        <div>
                                            <strong>
                                                Gemini AI Explanation
                                            </strong>

                                            <small>
                                                AI-generated explanation
                                                of the system recommendation.
                                            </small>
                                        </div>
                                    </div>

                                    <span
                                        class="dispatch-ai-gemini-badge"
                                    >
                                        AI
                                    </span>

                                </div>


                                <!-- Summary -->
                                <div
                                    class="dispatch-ai-gemini-section"
                                >

                                    <div
                                        class="dispatch-ai-gemini-section-label"
                                    >
                                        <i
                                            class="ph ph-info"
                                        ></i>

                                        Summary
                                    </div>

                                    <p
                                        id="reviewAiGeminiSummary"
                                        class="dispatch-ai-gemini-summary"
                                    ></p>

                                </div>


                                <!-- Key Factors -->
                                <div
                                    id="reviewAiGeminiFactorsSection"
                                    class="dispatch-ai-gemini-section"
                                    hidden
                                >

                                    <div
                                        class="dispatch-ai-gemini-section-label"
                                    >
                                        <i
                                            class="ph ph-check-circle"
                                        ></i>

                                        Key Factors
                                    </div>

                                    <ul
                                        id="reviewAiGeminiFactors"
                                        class="dispatch-ai-gemini-list"
                                    ></ul>

                                </div>


                                <!-- Limitations -->
                                <div
                                    id="reviewAiGeminiLimitationsSection"
                                    class="dispatch-ai-gemini-section"
                                    hidden
                                >

                                    <div
                                        class="dispatch-ai-gemini-section-label"
                                    >
                                        <i
                                            class="ph ph-warning"
                                        ></i>

                                        Limitations
                                    </div>

                                    <ul
                                        id="reviewAiGeminiLimitations"
                                        class="dispatch-ai-gemini-list dispatch-ai-gemini-limitations"
                                    ></ul>

                                </div>

                            </div>


                            <!-- USE RECOMMENDATION -->
                            <div
                                class="dispatch-ai-actions"
                            >

                                <button
                                    type="button"
                                    class="btn-outline"
                                    id="applyReviewAiRecommendation"
                                    hidden
                                >
                                    <i
                                        class="ph ph-magic-wand"
                                    ></i>

                                    Use Recommendation
                                </button>

                            </div>

                        </div>


                        <!-- AI LOADING -->
                        <div
                            id="reviewAiLoading"
                            class="dispatch-ai-loading"
                            hidden
                        >
                            <i class="ph ph-spinner"></i>

                            Evaluating available vehicle and driver combinations...
                        </div>

                    </div>

                </div>

            </div>


            <!-- =========================================================
                 FOOTER
                 ========================================================= -->
            <div class="modal-footer">

                <button
                    type="button"
                    class="btn-outline"
                    data-bs-dismiss="modal"
                >
                    Close
                </button>

                <button
                    type="button"
                    class="btn-danger"
                    id="btnRejectReassignment"
                >
                    <i class="ph ph-x-circle"></i>
                    Reject
                </button>

                <button
                    type="button"
                    class="btn-primary"
                    id="btnApproveReassignment"
                    disabled
                >
                    <i class="ph ph-check-circle"></i>
                    Approve
                </button>

            </div>

        </div>
    </div>
</div>


<!-- ========================================================= -->
<!-- REASSIGNMENT ACTION CONFIRMATION MODAL -->
<!-- ========================================================= -->

<!-- ========================================================= -->
<!-- REASSIGNMENT ACTION CONFIRMATION MODAL -->
<!-- Same visual pattern as Delete Modal -->
<!-- ========================================================= -->

<div
    id="dispatchActionConfirmModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dispatchActionConfirmTitle"
    aria-describedby="dispatchActionConfirmMessage"
>
    <div class="custom-modal delete-modal dispatch-confirm-modal">
        <div
            id="dispatchActionConfirmIcon"
            class="delete-icon dispatch-confirm-icon-approve"
            aria-hidden="true"
        >
            <i class="ph-fill ph-warning-circle"></i>
        </div>

        <h2 id="dispatchActionConfirmTitle">
            Approve Reassignment?
        </h2>

        <p id="dispatchActionConfirmMessage">
            Approve this reassignment and assign the selected vehicle
            and driver?
        </p>

        <p
            id="dispatchActionConfirmNote"
            class="delete-note"
        >
            Please review the selected vehicle and driver before continuing.
        </p>

        <div class="modal-footer">

            <button
                type="button"
                class="btn-outline"
                id="dispatchActionConfirmCancel"
            >
                Cancel
            </button>

            <button
                type="button"
                class="btn-primary"
                id="dispatchActionConfirmConfirm"
            >
                <i class="ph ph-check-circle"></i>
                <span>Approve</span>
            </button>

        </div>
    </div>
</div>