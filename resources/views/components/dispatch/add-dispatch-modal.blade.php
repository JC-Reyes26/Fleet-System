<div
  id="addDispatchModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="addDispatchModalTitle"
>
  <div class="custom-modal">
    <div class="modal-header">
      <div>
        <h2 id="addDispatchModalTitle">Create Dispatch</h2>
        <p>Create a hospital transport dispatch request.</p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeAddDispatchModal"
        aria-label="Close modal"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <div class="modal-body">
      <form id="dispatchForm">
        <div class="form-grid">
          <!-- Dispatch Number -->
          <div class="form-group">
            <label for="dispatchNumber">Dispatch Number</label>
            <input
              type="text"
              id="dispatchNumber"
              name="dispatchNumber"
              readonly
            />
          </div>

          <!-- Reservation -->
          <div class="form-group">
            <label for="dispatchReservation">Reservation</label>

            <select
              id="dispatchReservation"
              name="dispatchReservation"
              required
            >
              <option value="">Select reservation</option>
            </select>
          </div>

          <!-- Patient -->
          <div class="form-group">
            <label for="dispatchPatient">Patient Name</label>
            <input
              type="text"
              id="dispatchPatient"
              name="dispatchPatient"
              readonly
            />
          </div>

          <!-- Request Type -->
          <div class="form-group">
            <label for="dispatchRequestType">Request Type</label>
            <input
              type="text"
              id="dispatchRequestType"
              name="dispatchRequestType"
              readonly
            />
          </div>

          <!-- Vehicle -->
          <div class="form-group">
            <label for="dispatchVehicle">Vehicle</label>
            <input
              type="text"
              id="dispatchVehicle"
              name="dispatchVehicle"
              readonly
              placeholder="Automatically assigned from reservation"
            />
          </div>

          <!-- Driver -->
          <div class="form-group">
            <label for="dispatchDriver">Driver</label>
            <input
              type="text"
              id="dispatchDriver"
              name="dispatchDriver"
              readonly
              placeholder="Automatically assigned from reservation"
            />
          </div>

          <!-- AI Recommendation -->
          <div class="form-group full-width">
            <div
                id="dispatchAiRecommendation"
                class="dispatch-ai-recommendation"
                hidden
                aria-live="polite"
            >
                <div class="dispatch-ai-recommendation-header">
                    <div>
                        <strong>AI Dispatch Recommendation</strong>
                        <small>
                            System-generated recommendation based on current fleet data.
                        </small>
                    </div>

                    <span
                        id="dispatchAiScoreBadge"
                        class="status-badge scheduled"
                    >
                        —
                    </span>
                </div>

                <div class="dispatch-ai-assignment-grid">
                    <div>
                        <label>Recommended Vehicle</label>
                        <strong id="dispatchAiVehicle">—</strong>
                    </div>

                    <div>
                        <label>Recommended Driver</label>
                        <strong id="dispatchAiDriver">—</strong>
                    </div>

                    <div>
                        <label>Distance to Pickup</label>
                        <strong id="dispatchAiDistance">—</strong>
                    </div>

                    <div>
                        <label>Traffic ETA</label>
                        <strong id="dispatchAiEta">—</strong>
                    </div>

                    <div>
                        <label>Traffic Delay</label>
                        <strong id="dispatchAiTrafficDelay">—</strong>
                    </div>

                    <div>
                        <label>Traffic</label>
                        <strong id="dispatchAiTraffic">—</strong>
                    </div>

                    <div>
                        <label>GPS Status</label>
                        <strong id="dispatchAiGps">—</strong>
                    </div>
                </div>

                <div class="dispatch-ai-reasons">
                    <label>Recommendation Reasons</label>
                    <ul id="dispatchAiReasons"></ul>
                </div>

                <!-- Score Breakdown -->
                <div class="dispatch-ai-score-breakdown-toggle">
                    <button
                        type="button"
                        class="btn-outline"
                        id="toggleDispatchAiScoreBreakdown"
                        aria-expanded="false"
                        aria-controls="dispatchAiScoreBreakdown"
                    >
                        <i class="ph ph-chart-bar"></i>
                        View Score Breakdown
                    </button>
                </div>

                <div
                    id="dispatchAiScoreBreakdown"
                    class="dispatch-ai-score-breakdown"
                    hidden
                >
                    <div class="dispatch-ai-score-breakdown-header">
                        <div>
                            <strong>Recommendation Score</strong>
                            <small>
                                How the system calculated the overall recommendation.
                            </small>
                        </div>

                        <span id="dispatchAiBreakdownTotal">0/100</span>
                    </div>

                    <div
                        id="dispatchAiScoreBreakdownList"
                        class="dispatch-ai-score-breakdown-list"
                    ></div>
                </div>

                <div
                    id="dispatchAiMessage"
                    class="dispatch-ai-message"
                ></div>

                <!-- Gemini AI Explanation -->
                <div
                    id="dispatchAiGemini"
                    class="dispatch-ai-gemini"
                    hidden
                >
                    <div class="dispatch-ai-gemini-header">
                        <div class="dispatch-ai-gemini-title">
                            <i class="ph ph-sparkle"></i>

                            <div>
                                <strong>Gemini AI Explanation</strong>
                                <small>
                                    AI-generated explanation of the system recommendation.
                                </small>
                            </div>
                        </div>

                        <span class="dispatch-ai-gemini-badge">
                            AI
                        </span>
                    </div>

                    <!-- Summary -->
                    <div class="dispatch-ai-gemini-section">
                        <div class="dispatch-ai-gemini-section-label">
                            <i class="ph ph-info"></i>
                            Summary
                        </div>

                        <p
                            id="dispatchAiGeminiSummary"
                            class="dispatch-ai-gemini-summary"
                        ></p>
                    </div>

                    <!-- Key Factors -->
                    <div
                        id="dispatchAiGeminiFactorsSection"
                        class="dispatch-ai-gemini-section"
                        hidden
                    >
                        <div class="dispatch-ai-gemini-section-label">
                            <i class="ph ph-check-circle"></i>
                            Key Factors
                        </div>

                        <ul
                            id="dispatchAiGeminiFactors"
                            class="dispatch-ai-gemini-list"
                        ></ul>
                    </div>

                    <!-- Limitations -->
                    <div
                        id="dispatchAiGeminiLimitationsSection"
                        class="dispatch-ai-gemini-section"
                        hidden
                    >
                        <div class="dispatch-ai-gemini-section-label">
                            <i class="ph ph-warning"></i>
                            Limitations
                        </div>

                        <ul
                            id="dispatchAiGeminiLimitations"
                            class="dispatch-ai-gemini-list dispatch-ai-gemini-limitations"
                        ></ul>
                    </div>
                </div>

                <div class="dispatch-ai-actions">
                    <button
                        type="button"
                        class="btn-outline"
                        id="applyDispatchAiRecommendation"
                        hidden
                    >
                        <i class="ph ph-magic-wand"></i>
                        Use Recommendation
                    </button>
                </div>
            </div>

            <div
                id="dispatchAiLoading"
                class="dispatch-ai-loading"
                hidden
            >
                <i class="ph ph-spinner"></i>
                Evaluating available fleet resources...
            </div>
        </div>

          <!-- Pickup -->
          <div class="form-group">
            <label for="dispatchPickup">Pickup Location</label>
            <input
              type="text"
              id="dispatchPickup"
              name="dispatchPickup"
              readonly
            />
          </div>

          <!-- Destination -->
          <div class="form-group">
            <label for="dispatchDestination">Destination</label>
            <input
              type="text"
              id="dispatchDestination"
              name="dispatchDestination"
              readonly
            />
          </div>

          <!-- Schedule Date -->
          <div class="form-group">
            <label for="dispatchDate">Schedule Date</label>
            <input
              type="date"
              id="dispatchDate"
              name="dispatchDate"
              readonly
            />
          </div>

          <!-- Schedule Time -->
          <div class="form-group">
            <label for="dispatchTime">Schedule Time</label>
            <input
              type="time"
              id="dispatchTime"
              name="dispatchTime"
              readonly
            />
          </div>

          <!-- Priority -->
          <div class="form-group">
            <label for="dispatchPriority">Priority</label>
            <input
              type="text"
              id="dispatchPriority"
              name="dispatchPriority"
              readonly
            />
          </div>

          <!-- Status -->
          <div class="form-group">
            <label for="dispatchStatus">Status</label>
            <select
              id="dispatchStatus"
              name="dispatchStatus"
              required
            >
              <option value="">Select status</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="En Route">En Route</option>
            </select>
          </div>

          <!-- Contact -->
          <div class="form-group">
            <label for="dispatchContact">Contact Number</label>
            <input
              type="tel"
              id="dispatchContact"
              name="dispatchContact"
              readonly
            />
          </div>

          <!-- Notes -->
          <div class="form-group full-width">
            <label for="dispatchNotes">Notes</label>
            <textarea
              id="dispatchNotes"
              name="dispatchNotes"
              rows="3"
              readonly
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-outline"
            id="cancelAddDispatch"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn-primary"
            id="saveDispatch"
          >
            Save Dispatch
          </button>

        </div>
      </form>
    </div>
  </div>
</div>
