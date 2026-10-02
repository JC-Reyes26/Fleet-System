(function () {
    "use strict";

    const modalElement = document.getElementById("reassignmentReviewModal");

    if (!modalElement) {
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Bootstrap Modal
    |--------------------------------------------------------------------------
    */
    if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
        console.error("Bootstrap Modal is not available.");
        return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    /*
    |--------------------------------------------------------------------------
    | Review Form Elements
    |--------------------------------------------------------------------------
    */
    const reassignmentIdInput = document.getElementById("reviewReassignmentId");
    const dispatchNumberInput = document.getElementById("reviewDispatchNumber");
    const reservationNumberInput = document.getElementById(
        "reviewReservationNumber",
    );
    const currentDriverInput = document.getElementById("reviewCurrentDriver");
    const vehicleInput = document.getElementById("reviewVehicle");
    const reasonInput = document.getElementById("reviewReason");
    const newDriverSelect = document.getElementById("reviewNewDriver");
    const approveButton = document.getElementById("btnApproveReassignment");
    const rejectButton = document.getElementById("btnRejectReassignment");
    /*
    |--------------------------------------------------------------------------
    | Action Confirmation Modal
    |--------------------------------------------------------------------------
    */
    const actionConfirmModal = document.getElementById(
        "dispatchActionConfirmModal",
    );
    const actionConfirmIcon = document.getElementById(
        "dispatchActionConfirmIcon",
    );
    const actionConfirmTitle = document.getElementById(
        "dispatchActionConfirmTitle",
    );
    const actionConfirmMessage = document.getElementById(
        "dispatchActionConfirmMessage",
    );
    const actionConfirmCancel = document.getElementById(
        "dispatchActionConfirmCancel",
    );
    const actionConfirmConfirm = document.getElementById(
        "dispatchActionConfirmConfirm",
    );
    let pendingConfirmationAction = null;

    /*
    |--------------------------------------------------------------------------
    | AI Recommendation Elements
    |--------------------------------------------------------------------------
    */
    const reviewAiPanel = document.getElementById("reviewAiRecommendation");
    const reviewAiLoading = document.getElementById("reviewAiLoading");
    const reviewAiScoreBadge = document.getElementById("reviewAiScoreBadge");
    const reviewAiVehicle = document.getElementById("reviewAiVehicle");
    const reviewAiDriver = document.getElementById("reviewAiDriver");
    const reviewAiDistance = document.getElementById("reviewAiDistance");
    const reviewAiEta = document.getElementById("reviewAiEta");
    const reviewAiTrafficDelay = document.getElementById(
        "reviewAiTrafficDelay",
    );

    const reviewAiTraffic = document.getElementById("reviewAiTraffic");
    const reviewAiGps = document.getElementById("reviewAiGps");
    const reviewAiReasons = document.getElementById("reviewAiReasons");
    const reviewAiMessage = document.getElementById("reviewAiMessage");

    /*
    |--------------------------------------------------------------------------
    | AI Score Breakdown
    |--------------------------------------------------------------------------
    */
    const toggleReviewAiScoreBreakdown = document.getElementById(
        "toggleReviewAiScoreBreakdown",
    );

    const reviewAiScoreBreakdown = document.getElementById(
        "reviewAiScoreBreakdown",
    );

    const reviewAiScoreBreakdownList = document.getElementById(
        "reviewAiScoreBreakdownList",
    );

    const reviewAiBreakdownTotal = document.getElementById(
        "reviewAiBreakdownTotal",
    );

    /*
    |--------------------------------------------------------------------------
    | Gemini AI
    |--------------------------------------------------------------------------
    */
    const reviewAiGemini = document.getElementById("reviewAiGemini");

    const reviewAiGeminiSummary = document.getElementById(
        "reviewAiGeminiSummary",
    );

    const reviewAiGeminiFactorsSection = document.getElementById(
        "reviewAiGeminiFactorsSection",
    );

    const reviewAiGeminiFactors = document.getElementById(
        "reviewAiGeminiFactors",
    );

    const reviewAiGeminiLimitationsSection = document.getElementById(
        "reviewAiGeminiLimitationsSection",
    );

    const reviewAiGeminiLimitations = document.getElementById(
        "reviewAiGeminiLimitations",
    );

    /*
    |--------------------------------------------------------------------------
    | AI Action
    |--------------------------------------------------------------------------
    */
    const applyReviewAiRecommendation = document.getElementById(
        "applyReviewAiRecommendation",
    );

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */
    let currentReassignment = null;
    let currentDispatch = null;
    let currentRecommendation = null;

    /*
    |--------------------------------------------------------------------------
    | CSRF
    |--------------------------------------------------------------------------
    */
    function getCsrfToken() {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Message
    |--------------------------------------------------------------------------
    */
    function showMessage(message, type = "success") {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);

            return;
        }

        window.alert(message);
    }

    /*
    |--------------------------------------------------------------------------
    | Loading State
    |--------------------------------------------------------------------------
    */
    function setLoading(button, loading, loadingText) {
        if (!button) {
            return;
        }

        if (loading) {
            button.dataset.originalHtml = button.innerHTML;

            button.disabled = true;

            button.innerHTML = `
                <span
                    class="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                ></span>
                ${escapeHtml(loadingText)}
            `;
        } else {
            button.disabled = false;

            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;

                delete button.dataset.originalHtml;
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | HTML Escape
    |--------------------------------------------------------------------------
    */
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /*
    |--------------------------------------------------------------------------
    | Driver Name
    |--------------------------------------------------------------------------
    */
    function getDriverName(driver) {
        if (!driver) {
            return "Unassigned";
        }

        const fullName = [driver.first_name, driver.last_name]
            .filter(Boolean)
            .map((value) => String(value).trim())
            .filter(Boolean)
            .join(" ")
            .trim();

        if (fullName) {
            return fullName;
        }

        if (driver.user?.name) {
            return driver.user.name;
        }

        if (driver.driver_name) {
            return driver.driver_name;
        }

        if (driver.name) {
            return driver.name;
        }

        return "Unknown Driver";
    }

    /*
    |--------------------------------------------------------------------------
    | Vehicle Name
    |--------------------------------------------------------------------------
    */
    function getVehicleName(vehicle) {
        if (!vehicle) {
            return "Unassigned";
        }

        const brandModel = [vehicle.brand, vehicle.model]
            .filter(Boolean)
            .map((value) => String(value).trim())
            .filter(Boolean)
            .join(" ")
            .trim();

        const vehicleType = String(
            vehicle.vehicle_type || vehicle.type || "",
        ).trim();

        if (brandModel && vehicleType) {
            return `${brandModel} - ${vehicleType}`;
        }

        if (brandModel) {
            return brandModel;
        }

        if (vehicleType) {
            return vehicleType;
        }

        return (
            vehicle.vehicle_name ||
            vehicle.name ||
            vehicle.plate_number ||
            "Unassigned"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Dispatch Response
    |--------------------------------------------------------------------------
    */
    function normalizeDispatchResponse(payload) {
        return payload?.dispatch || payload?.data || payload || null;
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Driver ID
    |--------------------------------------------------------------------------
    */
    function getDriverId(driver) {
        return driver?.driver_id ?? driver?.id ?? null;
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Driver Name
    |--------------------------------------------------------------------------
    */
    function normalizeDriver(driver) {
        const driverId = getDriverId(driver);

        if (!driverId) {
            return null;
        }

        return {
            ...driver,

            driver_id: driverId,

            driver_name:
                driver?.driver_name || driver?.name || getDriverName(driver),
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Reset Modal
    |--------------------------------------------------------------------------
    */
    function resetModal() {
        currentReassignment = null;
        currentDispatch = null;
        currentRecommendation = null;

        if (reassignmentIdInput) {
            reassignmentIdInput.value = "";
        }

        if (dispatchNumberInput) {
            dispatchNumberInput.value = "";
        }

        if (reservationNumberInput) {
            reservationNumberInput.value = "";
        }

        if (currentDriverInput) {
            currentDriverInput.value = "";
        }

        if (vehicleInput) {
            vehicleInput.value = "";
        }

        if (reasonInput) {
            reasonInput.value = "";
        }

        if (newDriverSelect) {
            newDriverSelect.innerHTML = `
                <option value="">
                    Loading available vehicle and driver combinations...
                </option>
            `;
        }

        /*
        |--------------------------------------------------------------------------
        | AI Panel
        |--------------------------------------------------------------------------
        */
        if (reviewAiPanel) {
            reviewAiPanel.hidden = true;
        }

        if (reviewAiLoading) {
            reviewAiLoading.hidden = true;
        }

        if (reviewAiScoreBadge) {
            reviewAiScoreBadge.textContent = "—";
        }

        if (reviewAiVehicle) {
            reviewAiVehicle.textContent = "—";
        }

        if (reviewAiDriver) {
            reviewAiDriver.textContent = "—";
        }

        if (reviewAiDistance) {
            reviewAiDistance.textContent = "—";
        }

        if (reviewAiEta) {
            reviewAiEta.textContent = "—";
        }

        if (reviewAiTrafficDelay) {
            reviewAiTrafficDelay.textContent = "—";
        }

        if (reviewAiTraffic) {
            reviewAiTraffic.textContent = "Unavailable";
        }

        if (reviewAiGps) {
            reviewAiGps.textContent = "Unavailable";
        }

        if (reviewAiReasons) {
            reviewAiReasons.replaceChildren();
        }

        if (reviewAiMessage) {
            reviewAiMessage.textContent = "";
        }

        /*
        |--------------------------------------------------------------------------
        | Score Breakdown
        |--------------------------------------------------------------------------
        */
        if (reviewAiScoreBreakdown) {
            reviewAiScoreBreakdown.hidden = true;
        }

        if (reviewAiScoreBreakdownList) {
            reviewAiScoreBreakdownList.replaceChildren();
        }

        if (reviewAiBreakdownTotal) {
            reviewAiBreakdownTotal.textContent = "0/100";
        }

        if (toggleReviewAiScoreBreakdown) {
            toggleReviewAiScoreBreakdown.setAttribute("aria-expanded", "false");

            toggleReviewAiScoreBreakdown.innerHTML =
                '<i class="ph ph-chart-bar"></i> View Score Breakdown';
        }

        /*
        |--------------------------------------------------------------------------
        | Gemini
        |--------------------------------------------------------------------------
        */
        if (reviewAiGemini) {
            reviewAiGemini.hidden = true;
        }

        if (reviewAiGeminiSummary) {
            reviewAiGeminiSummary.textContent = "";
        }

        if (reviewAiGeminiFactors) {
            reviewAiGeminiFactors.replaceChildren();
        }

        if (reviewAiGeminiFactorsSection) {
            reviewAiGeminiFactorsSection.hidden = true;
        }

        if (reviewAiGeminiLimitations) {
            reviewAiGeminiLimitations.replaceChildren();
        }

        if (reviewAiGeminiLimitationsSection) {
            reviewAiGeminiLimitationsSection.hidden = true;
        }

        /*
        |--------------------------------------------------------------------------
        | Use Recommendation
        |--------------------------------------------------------------------------
        */
        if (applyReviewAiRecommendation) {
            applyReviewAiRecommendation.hidden = true;

            applyReviewAiRecommendation.disabled = false;

            applyReviewAiRecommendation.innerHTML =
                '<i class="ph ph-magic-wand"></i> Use Recommendation';
        }

        if (approveButton) {
            approveButton.disabled = true;
        }

        if (rejectButton) {
            rejectButton.disabled = false;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | GET Dispatch
    |--------------------------------------------------------------------------
    */
    async function fetchDispatch(dispatchId) {
        const response = await fetch(
            `/dispatch/${encodeURIComponent(dispatchId)}`,
            {
                method: "GET",

                headers: {
                    Accept: "application/json",

                    "X-Requested-With": "XMLHttpRequest",
                },

                credentials: "same-origin",

                cache: "no-store",
            },
        );

        let payload = {};

        try {
            payload = await response.json();
        } catch (error) {
            payload = {};
        }

        if (!response.ok) {
            throw new Error(
                payload?.message || "Unable to load dispatch details.",
            );
        }

        const dispatch = normalizeDispatchResponse(payload);

        if (!dispatch) {
            throw new Error("Dispatch data was not returned by the server.");
        }

        return dispatch;
    }

    /*
    |--------------------------------------------------------------------------
    | GET Replacement Driver Recommendation
    |--------------------------------------------------------------------------
    */
    async function fetchReplacementDriverRecommendation(reassignmentId) {
        const response = await fetch(
            `/dispatch/reassignments/${encodeURIComponent(
                reassignmentId,
            )}/recommendation`,
            {
                method: "GET",

                headers: {
                    Accept: "application/json",

                    "X-Requested-With": "XMLHttpRequest",
                },

                credentials: "same-origin",

                cache: "no-store",
            },
        );

        let payload = {};

        try {
            payload = await response.json();
        } catch (error) {
            payload = {};
        }

        if (!response.ok) {
            throw new Error(
                payload?.message ||
                    "Unable to generate replacement-driver recommendation.",
            );
        }

        return {
            recommended: payload?.recommended || null,

            candidates: Array.isArray(payload?.candidates)
                ? payload.candidates
                : [],

            message:
                payload?.message ||
                "Replacement-driver recommendation generated.",

            gemini_available: payload?.gemini_available === true,

            gemini_explanation: payload?.gemini_explanation || null,

            gemini_summary: payload?.gemini_summary || null,

            gemini_factors: Array.isArray(payload?.gemini_factors)
                ? payload.gemini_factors
                : [],

            gemini_limitations: Array.isArray(payload?.gemini_limitations)
                ? payload.gemini_limitations
                : [],

            gemini_error: payload?.gemini_error || null,
        };
    }

    /*
    |--------------------------------------------------------------------------
    | GET Available Vehicle + Driver Pairs
    |--------------------------------------------------------------------------
    */
    async function fetchAvailableReassignmentPairs(reassignmentId) {
        const response = await fetch(
            `/dispatch/reassignments/${encodeURIComponent(
                reassignmentId,
            )}/available-pairs`,
            {
                method: "GET",

                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },

                credentials: "same-origin",
                cache: "no-store",
            },
        );

        let payload = {};

        try {
            payload = await response.json();
        } catch (error) {
            payload = {};
        }

        if (!response.ok) {
            throw new Error(
                payload?.message ||
                    "Unable to load available vehicle and driver combinations.",
            );
        }

        return {
            current_vehicle_id:
                payload?.current_vehicle_id || null,

            current_driver_id:
                payload?.current_driver_id || null,

            pairs: Array.isArray(payload?.pairs)
                ? payload.pairs
                : [],
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Find Reassignment
    |--------------------------------------------------------------------------
    */
    function findReassignment(dispatch, reassignmentId) {
        const reassignments = Array.isArray(dispatch?.reassignments)
            ? dispatch.reassignments
            : [];

        return (
            reassignments.find(
                (item) => String(item?.id) === String(reassignmentId),
            ) || null
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Render Review Details
    |--------------------------------------------------------------------------
    */
    function renderReviewDetails(dispatch, reassignment) {
        const reservation = dispatch?.reservation || {};

        const currentDriver = reservation?.driver || null;

        const vehicle = reservation?.vehicle || null;

        if (reassignmentIdInput) {
            reassignmentIdInput.value = reassignment?.id || "";
        }

        if (dispatchNumberInput) {
            dispatchNumberInput.value = dispatch?.dispatch_number || "—";
        }

        if (reservationNumberInput) {
            reservationNumberInput.value =
                reservation?.reservation_number || "—";
        }

        if (currentDriverInput) {
            currentDriverInput.value = getDriverName(currentDriver);
        }

        if (vehicleInput) {
            vehicleInput.value = getVehicleName(vehicle);
        }

        if (reasonInput) {
            reasonInput.value = reassignment?.reason || "No reason provided.";
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Render Vehicle + Driver Options
    |--------------------------------------------------------------------------
    |
    | AI candidates and manually available vehicle + driver
    | combinations are displayed in the same dropdown.
    |
    */
    function renderDriverOptions(
        candidates,
        availablePairs,
        currentDriverId,
        currentVehicleId,
        recommendedVehicleId,
        recommendedDriverId,
    ) {
        if (!newDriverSelect) {
            return;
        }

        const aiCandidates =
            Array.isArray(candidates)
                ? candidates
                : [];

        const manualPairs =
            Array.isArray(availablePairs)
                ? availablePairs
                : [];

        /*
        |--------------------------------------------------------------------------
        | Merge Pairs
        |--------------------------------------------------------------------------
        */
        const pairMap = new Map();

        /*
        |--------------------------------------------------------------------------
        | Add AI Candidates
        |--------------------------------------------------------------------------
        */
        aiCandidates.forEach((candidate) => {
            const vehicleId =
                candidate?.vehicle_id ?? null;

            const driverId =
                candidate?.driver_id ?? null;

            if (!vehicleId || !driverId) {
                return;
            }

            /*
            | Exclude current driver
            */
            if (
                currentDriverId &&
                Number(driverId) ===
                    Number(currentDriverId)
            ) {
                return;
            }

            const key =
                `${vehicleId}:${driverId}`;

            pairMap.set(key, {
                ...candidate,

                vehicle_id:
                    vehicleId,

                driver_id:
                    driverId,

                vehicle_label:
                    candidate?.vehicle_label ||
                    "Unknown Vehicle",

                driver_name:
                    candidate?.driver_name ||
                    "Unknown Driver",
            });
        });

        /*
        |--------------------------------------------------------------------------
        | Add Manual Available Pairs
        |--------------------------------------------------------------------------
        */
        manualPairs.forEach((pair) => {
            const vehicleId =
                pair?.vehicle_id ?? null;

            const driverId =
                pair?.driver_id ?? null;

            if (!vehicleId || !driverId) {
                return;
            }

            /*
            | Exclude current driver
            */
            if (
                currentDriverId &&
                Number(driverId) ===
                    Number(currentDriverId)
            ) {
                return;
            }

            const key =
                `${vehicleId}:${driverId}`;

            /*
            | Keep AI version when the same
            | vehicle + driver pair already exists.
            */
            if (pairMap.has(key)) {
                return;
            }

            pairMap.set(key, {
                vehicle_id:
                    vehicleId,

                vehicle_label:
                    pair?.vehicle_label ||
                    "Unknown Vehicle",

                driver_id:
                    driverId,

                driver_name:
                    pair?.driver_name ||
                    "Unknown Driver",

                license_number:
                    pair?.license_number ||
                    null,

                score:
                    null,
            });
        });

        const pairs =
            Array.from(pairMap.values());

        /*
        |--------------------------------------------------------------------------
        | Reset Dropdown
        |--------------------------------------------------------------------------
        */
        newDriverSelect.innerHTML = `
            <option value="">
                Select vehicle and driver
            </option>
        `;

        if (pairs.length === 0) {
            newDriverSelect.innerHTML = `
                <option value="">
                    No available vehicle and driver combination
                </option>
            `;

            if (approveButton) {
                approveButton.disabled = true;
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Render Options
        |--------------------------------------------------------------------------
        */
        pairs.forEach((pair) => {
            const option =
                document.createElement("option");

            const vehicleId =
                pair.vehicle_id;

            const driverId =
                pair.driver_id;

            const vehicleLabel =
                pair.vehicle_label ||
                "Unknown Vehicle";

            const driverName =
                pair.driver_name ||
                "Unknown Driver";

            const score =
                Number(pair.score);

            const hasScore =
                Number.isFinite(score);

            const isRecommended =
                recommendedVehicleId &&
                recommendedDriverId &&
                Number(vehicleId) ===
                    Number(recommendedVehicleId) &&
                Number(driverId) ===
                    Number(recommendedDriverId);

            /*
            |--------------------------------------------------------------------------
            | Store IDs
            |--------------------------------------------------------------------------
            */
            option.value =
                String(driverId);

            option.dataset.vehicleId =
                String(vehicleId);

            option.dataset.driverId =
                String(driverId);

            /*
            |--------------------------------------------------------------------------
            | Display Label
            |--------------------------------------------------------------------------
            */
            if (
                isRecommended &&
                hasScore
            ) {
                option.textContent =
                    `${vehicleLabel} - ${driverName} — AI Recommended (${score}/100)`;
            } else {
                option.textContent =
                    `${vehicleLabel} - ${driverName}`;
            }

            if (isRecommended) {
                option.dataset.recommended =
                    "true";
            }

            newDriverSelect.appendChild(
                option
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Auto-select AI Recommendation
        |--------------------------------------------------------------------------
        */
        const recommendedOption =
            Array.from(
                newDriverSelect.options
            ).find(
                (option) =>
                    Number(
                        option.dataset.vehicleId
                    ) ===
                        Number(
                            recommendedVehicleId
                        ) &&
                    Number(
                        option.dataset.driverId
                    ) ===
                        Number(
                            recommendedDriverId
                        )
            );

        if (recommendedOption) {
            newDriverSelect.value =
                recommendedOption.value;
        }

        /*
        |--------------------------------------------------------------------------
        | Enable Approve
        |--------------------------------------------------------------------------
        */
        const selectedOption =
            newDriverSelect.selectedOptions?.[0];

        if (approveButton) {
            approveButton.disabled =
                !selectedOption?.dataset?.vehicleId ||
                !selectedOption?.dataset?.driverId;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Format Distance
    |--------------------------------------------------------------------------
    */
    function formatReviewAiDistance(distanceKm) {
        const value = Number(distanceKm);

        if (!Number.isFinite(value)) {
            return "Unavailable";
        }

        return `${value.toFixed(1)} km`;
    }

    /*
    |--------------------------------------------------------------------------
    | GPS Status
    |--------------------------------------------------------------------------
    */
    function getReviewAiGpsLabel(candidate) {
        if (!candidate?.has_live_location) {
            return "No live GPS";
        }

        const age = Number(candidate.location_age_seconds);

        if (Number.isFinite(age) && age <= 120) {
            return `Live GPS · ${Math.floor(age)}s old`;
        }

        return "GPS data is stale";
    }

    /*
    |--------------------------------------------------------------------------
    | Traffic Label
    |--------------------------------------------------------------------------
    */
    function getReviewAiTrafficLabel(candidate) {
        const provider = String(candidate?.traffic_provider || "").trim();

        const delay = Number(candidate?.traffic_delay_minutes);

        if (provider === "TomTom") {
            if (Number.isFinite(delay) && delay > 0) {
                return `TomTom · ${delay.toFixed(1)} min delay`;
            }

            return "TomTom · Low traffic delay";
        }

        return "Unavailable";
    }

    /*
    |--------------------------------------------------------------------------
    | Render AI Recommendation
    |--------------------------------------------------------------------------
    */
    function renderReviewAiRecommendation(data) {
        if (!reviewAiPanel) {
            return;
        }

        reviewAiPanel.hidden = false;

        const recommended = data?.recommended || null;

        /*
        |--------------------------------------------------------------------------
        | No Recommendation
        |--------------------------------------------------------------------------
        */
        if (!recommended) {
            currentRecommendation = null;

            if (reviewAiScoreBadge) {
                reviewAiScoreBadge.textContent = "No Match";
            }

            if (reviewAiVehicle) {
                reviewAiVehicle.textContent = "—";
            }

            if (reviewAiDriver) {
                reviewAiDriver.textContent = "—";
            }

            if (reviewAiDistance) {
                reviewAiDistance.textContent = "—";
            }

            if (reviewAiEta) {
                reviewAiEta.textContent = "—";
            }

            if (reviewAiTrafficDelay) {
                reviewAiTrafficDelay.textContent = "—";
            }

            if (reviewAiTraffic) {
                reviewAiTraffic.textContent = "Unavailable";
            }

            if (reviewAiGps) {
                reviewAiGps.textContent = "Unavailable";
            }

            if (reviewAiReasons) {
                reviewAiReasons.replaceChildren();
            }

            if (reviewAiMessage) {
                reviewAiMessage.textContent =
                    data?.message ||
                    "No suitable replacement vehicle and driver combination is currently available.";
            }

            if (applyReviewAiRecommendation) {
                applyReviewAiRecommendation.hidden = true;
            }

            renderReviewAiScoreBreakdown(data);

            renderReviewAiGeminiExplanation(data);

            return;
        }

        currentRecommendation = recommended;

        const score = Number(recommended.score ?? 0);

        /*
        |--------------------------------------------------------------------------
        | Score
        |--------------------------------------------------------------------------
        */
        if (reviewAiScoreBadge) {
            reviewAiScoreBadge.textContent = `${score}/100`;
        }

        /*
        |--------------------------------------------------------------------------
        | Vehicle
        |--------------------------------------------------------------------------
        */
        if (reviewAiVehicle) {
            reviewAiVehicle.textContent = recommended.vehicle_label || "—";
        }

        /*
        |--------------------------------------------------------------------------
        | Driver
        |--------------------------------------------------------------------------
        */
        if (reviewAiDriver) {
            reviewAiDriver.textContent = recommended.driver_name || "—";
        }

        /*
        |--------------------------------------------------------------------------
        | Distance
        |--------------------------------------------------------------------------
        */
        if (reviewAiDistance) {
            reviewAiDistance.textContent = formatReviewAiDistance(
                recommended.distance_to_pickup_km,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Traffic ETA
        |--------------------------------------------------------------------------
        */
        const etaMinutes = Number(recommended.traffic_eta_minutes);

        if (reviewAiEta) {
            reviewAiEta.textContent = Number.isFinite(etaMinutes)
                ? `${etaMinutes.toFixed(1)} min`
                : "Unavailable";
        }

        /*
        |--------------------------------------------------------------------------
        | Traffic Delay
        |--------------------------------------------------------------------------
        */
        const delayMinutes = Number(recommended.traffic_delay_minutes);

        if (reviewAiTrafficDelay) {
            reviewAiTrafficDelay.textContent = Number.isFinite(delayMinutes)
                ? `${delayMinutes.toFixed(1)} min`
                : "Unavailable";
        }

        /*
        |--------------------------------------------------------------------------
        | Traffic
        |--------------------------------------------------------------------------
        */
        if (reviewAiTraffic) {
            reviewAiTraffic.textContent = getReviewAiTrafficLabel(recommended);
        }

        /*
        |--------------------------------------------------------------------------
        | GPS
        |--------------------------------------------------------------------------
        */
        if (reviewAiGps) {
            reviewAiGps.textContent = getReviewAiGpsLabel(recommended);
        }

        /*
        |--------------------------------------------------------------------------
        | Reasons
        |--------------------------------------------------------------------------
        */
        if (reviewAiReasons) {
            reviewAiReasons.replaceChildren();

            const reasons = Array.isArray(recommended.reasons)
                ? recommended.reasons
                : [];

            reasons.forEach((reason) => {
                const li = document.createElement("li");

                li.textContent = String(reason);

                reviewAiReasons.appendChild(li);
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Message
        |--------------------------------------------------------------------------
        */
        if (reviewAiMessage) {
            reviewAiMessage.textContent =
                "AI generated a replacement vehicle and driver recommendation from currently available fleet data.";
        }

        /*
        |--------------------------------------------------------------------------
        | Use Recommendation
        |--------------------------------------------------------------------------
        */
        if (applyReviewAiRecommendation) {
            const recommendedVehicleId = recommended.vehicle_id;
            const recommendedDriverId = recommended.driver_id;
            const optionExists =
                newDriverSelect &&
                Array.from(newDriverSelect.options).some(
                    (option) =>
                        String(option.dataset.vehicleId) ===
                            String(recommendedVehicleId) &&
                        String(option.dataset.driverId) ===
                            String(recommendedDriverId),
                );
            applyReviewAiRecommendation.hidden = !optionExists;
            applyReviewAiRecommendation.disabled = !optionExists;
        }

        /*
        |--------------------------------------------------------------------------
        | Score Breakdown
        |--------------------------------------------------------------------------
        */
        renderReviewAiScoreBreakdown(data);

        /*
        |--------------------------------------------------------------------------
        | Gemini
        |--------------------------------------------------------------------------
        */
        renderReviewAiGeminiExplanation(data);
    }

    /*
    |--------------------------------------------------------------------------
    | Score Breakdown
    |--------------------------------------------------------------------------
    */
    function renderReviewAiScoreBreakdown(data) {
        if (
            !reviewAiScoreBreakdown ||
            !reviewAiScoreBreakdownList ||
            !reviewAiBreakdownTotal
        ) {
            return;
        }

        const recommendation = data?.recommended || null;

        if (!recommendation) {
            reviewAiScoreBreakdown.hidden = true;

            reviewAiScoreBreakdownList.replaceChildren();

            reviewAiBreakdownTotal.textContent = "0/100";

            return;
        }

        const scores = [
            {
                label: "Availability",

                score: Number(recommendation.availability_score ?? 0),

                max: 25,

                description: "Current vehicle and driver availability",
            },

            {
                label: "GPS Proximity",

                score: Number(recommendation.proximity_score ?? 0),

                max: 15,

                description: "Distance from vehicle to pickup",
            },

            {
                label: "Assigned Fit",

                score: Number(recommendation.assigned_fit_score ?? 0),

                max: 10,

                description: "Match with the reservation assignment",
            },

            {
                label: "Priority Suitability",

                score: Number(recommendation.priority_score ?? 0),

                max: 10,

                description: "Suitability for reservation priority",
            },

            {
                label: "GPS Freshness",

                score: Number(recommendation.gps_freshness_score ?? 0),

                max: 5,

                description: "Recency of vehicle GPS position",
            },

            {
                label: "Traffic ETA",

                score: Number(recommendation.traffic_score ?? 0),

                max: 15,

                description: "Traffic-aware ETA and delay",
            },

            {
                label: "Fuel Level",

                score: Number(recommendation.fuel_score ?? 0),

                max: 10,

                description: Number.isFinite(
                    Number(recommendation.fuel_percentage),
                )
                    ? `Current fuel: ${Number(
                          recommendation.fuel_percentage,
                      ).toFixed(0)}%`
                    : "Fuel level availability",
            },

            {
                label: "Vehicle Suitability",

                score: Number(recommendation.vehicle_suitability_score ?? 0),

                max: 5,

                description: "Vehicle type suitability",
            },

            {
                label: "Maintenance Status",

                score: Number(recommendation.maintenance_score ?? 0),

                max: 5,

                description:
                    recommendation.maintenance_status ||
                    "Maintenance condition",
            },
        ];

        reviewAiScoreBreakdownList.replaceChildren();

        scores.forEach((item) => {
            const safeScore = Math.max(0, Math.min(item.score, item.max));

            /*
                |--------------------------------------------------------------------------
                | Row
                |--------------------------------------------------------------------------
                */
            const row = document.createElement("div");

            row.className = "dispatch-ai-score-row";

            /*
                |--------------------------------------------------------------------------
                | Label
                |--------------------------------------------------------------------------
                */
            const label = document.createElement("div");

            label.className = "dispatch-ai-score-row-label";

            const strong = document.createElement("strong");

            strong.textContent = item.label;

            const small = document.createElement("small");

            small.textContent = item.description;

            label.appendChild(strong);

            label.appendChild(small);

            /*
                |--------------------------------------------------------------------------
                | Value
                |--------------------------------------------------------------------------
                */
            const value = document.createElement("div");

            value.className = "dispatch-ai-score-row-value";

            value.textContent = `${safeScore}/${item.max}`;

            /*
                |--------------------------------------------------------------------------
                | Progress Track
                |--------------------------------------------------------------------------
                */
            const track = document.createElement("div");

            track.className = "dispatch-ai-score-track";

            const fill = document.createElement("div");

            fill.className = "dispatch-ai-score-fill";

            fill.style.width = `${(safeScore / item.max) * 100}%`;

            track.appendChild(fill);

            /*
                |--------------------------------------------------------------------------
                | Append Row
                |--------------------------------------------------------------------------
                */
            row.appendChild(label);

            row.appendChild(value);

            row.appendChild(track);

            reviewAiScoreBreakdownList.appendChild(row);
        });

        /*
        |--------------------------------------------------------------------------
        | Total
        |--------------------------------------------------------------------------
        */
        const total = Number(recommendation.score || 0);

        reviewAiBreakdownTotal.textContent = `${total}/100`;

        const totalRow = document.createElement("div");

        totalRow.className = "dispatch-ai-score-total";

        const totalLabel = document.createElement("span");

        totalLabel.textContent = "Overall Recommendation Score";

        const totalValue = document.createElement("span");

        totalValue.textContent = `${total}/100`;

        totalRow.appendChild(totalLabel);

        totalRow.appendChild(totalValue);

        reviewAiScoreBreakdownList.appendChild(totalRow);
    }

    /*
    |--------------------------------------------------------------------------
    | Gemini Explanation
    |--------------------------------------------------------------------------
    */
    function renderReviewAiGeminiExplanation(data) {
        if (
            !reviewAiGemini ||
            !reviewAiGeminiSummary ||
            !reviewAiGeminiFactorsSection ||
            !reviewAiGeminiFactors ||
            !reviewAiGeminiLimitationsSection ||
            !reviewAiGeminiLimitations
        ) {
            return;
        }

        const explanation = data?.gemini_explanation || null;

        /*
        |--------------------------------------------------------------------------
        | Gemini Not Available
        |--------------------------------------------------------------------------
        */
        if (
            data?.gemini_available !== true ||
            !explanation ||
            typeof explanation !== "object"
        ) {
            reviewAiGemini.hidden = true;

            reviewAiGeminiSummary.textContent = "";

            reviewAiGeminiFactors.replaceChildren();

            reviewAiGeminiLimitations.replaceChildren();

            reviewAiGeminiFactorsSection.hidden = true;

            reviewAiGeminiLimitationsSection.hidden = true;

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */
        const summary = String(explanation.summary || "").trim();

        reviewAiGeminiSummary.textContent =
            summary || "No Gemini summary was returned.";

        /*
        |--------------------------------------------------------------------------
        | Key Factors
        |--------------------------------------------------------------------------
        */
        reviewAiGeminiFactors.replaceChildren();

        const factors = Array.isArray(explanation.key_factors)
            ? explanation.key_factors
            : [];

        factors.forEach((factor) => {
            const li = document.createElement("li");

            const icon = document.createElement("i");

            icon.className = "ph-fill ph-check-circle";

            const text = document.createElement("span");

            text.textContent = String(factor);

            li.appendChild(icon);

            li.appendChild(text);

            reviewAiGeminiFactors.appendChild(li);
        });

        reviewAiGeminiFactorsSection.hidden = factors.length === 0;

        /*
        |--------------------------------------------------------------------------
        | Limitations
        |--------------------------------------------------------------------------
        */
        reviewAiGeminiLimitations.replaceChildren();

        const limitations = Array.isArray(explanation.limitations)
            ? explanation.limitations
            : [];

        limitations.forEach((limitation) => {
            const li = document.createElement("li");

            const icon = document.createElement("i");

            icon.className = "ph-fill ph-warning";

            const text = document.createElement("span");

            text.textContent = String(limitation);

            li.appendChild(icon);

            li.appendChild(text);

            reviewAiGeminiLimitations.appendChild(li);
        });

        reviewAiGeminiLimitationsSection.hidden = limitations.length === 0;

        /*
        |--------------------------------------------------------------------------
        | Show Panel
        |--------------------------------------------------------------------------
        */
        reviewAiGemini.hidden = false;
    }

    /*
    |--------------------------------------------------------------------------
    | Use AI Recommendation
    |--------------------------------------------------------------------------
    |
    | This ONLY selects the recommended driver.
    | It does NOT approve the reassignment.
    |
    */
    function useReviewAiRecommendation() {
        if (
            !currentRecommendation ||
            !currentRecommendation.vehicle_id ||
            !currentRecommendation.driver_id
        ) {
            showMessage(
                "No valid AI vehicle and driver recommendation is available.",
                "error",
            );

            return;
        }

        if (!newDriverSelect) {
            return;
        }
        const recommendedVehicleId = String(currentRecommendation.vehicle_id);
        const recommendedDriverId = String(currentRecommendation.driver_id);
        const option = Array.from(newDriverSelect.options).find(
            (item) =>
                String(item.dataset.vehicleId) === recommendedVehicleId &&
                String(item.dataset.driverId) === recommendedDriverId,
        );

        if (!option) {
            showMessage(
                "The recommended vehicle and driver combination is no longer available.",
                "error",
            );

            return;
        }

        newDriverSelect.value = option.value;

        newDriverSelect.dispatchEvent(
            new Event("change", {
                bubbles: true,
            }),
        );

        if (approveButton) {
            approveButton.disabled = false;
        }

        showMessage(
            "AI recommended vehicle and driver selected. Review the request before approving.",
            "success",
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Open Review
    |--------------------------------------------------------------------------
    */
    async function openReview(reassignmentId, dispatchId) {
        resetModal();

        modal.show();

        if (reviewAiLoading) {
            reviewAiLoading.hidden = false;
        }

        try {
            const [dispatch, recommendation, availablePairsResponse] =
                await Promise.all([
                    fetchDispatch(dispatchId),

                    fetchReplacementDriverRecommendation(reassignmentId).catch(
                        (error) => {
                            console.warn(
                                "AI replacement recommendation unavailable:",
                                error,
                            );

                            return {
                                recommended: null,
                                candidates: [],
                                message:
                                    "AI recommendation is currently unavailable.",
                                gemini_available: false,
                                gemini_explanation: null,
                                gemini_summary: null,
                                gemini_factors: [],
                                gemini_limitations: [],
                                gemini_error: error?.message || null,
                            };
                        },
                    ),

                    fetchAvailableReassignmentPairs(reassignmentId).catch(
                        (error) => {
                            console.warn(
                                "Available vehicle and driver pairs unavailable:",
                                error,
                            );

                            return {
                                current_vehicle_id: null,
                                current_driver_id: null,
                                pairs: [],
                                error: error?.message || null,
                            };
                        },
                    ),
                ]);

            /*
            |--------------------------------------------------------------------------
            | Validate Dispatch
            |--------------------------------------------------------------------------
            */
            if (!dispatch) {
                throw new Error("Dispatch details were not found.");
            }

            /*
            |--------------------------------------------------------------------------
            | Find Reassignment
            |--------------------------------------------------------------------------
            */
            const reassignment = findReassignment(dispatch, reassignmentId);

            if (!reassignment) {
                throw new Error("Reassignment request was not found.");
            }

            /*
            |--------------------------------------------------------------------------
            | Validate Request Status
            |--------------------------------------------------------------------------
            */
            if (String(reassignment.status) !== "Requested") {
                throw new Error(
                    "This reassignment request has already been reviewed.",
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Validate Dispatch Status
            |--------------------------------------------------------------------------
            */
            if (String(dispatch.trip_status) !== "Pending") {
                throw new Error(
                    "Reassignment review is only allowed while the dispatch is Pending.",
                );
            }

            currentDispatch = dispatch;

            currentReassignment = reassignment;

            /*
            |--------------------------------------------------------------------------
            | Render Request Details
            |--------------------------------------------------------------------------
            */
            renderReviewDetails(dispatch, reassignment);

            const currentDriverId =
                dispatch?.reservation?.driver_id ||
                dispatch?.reservation?.driver?.id ||
                null;

            const currentVehicleId =
                dispatch?.reservation?.vehicle_id ||
                dispatch?.reservation?.vehicle?.id ||
                null;

            const recommendedVehicleId =
                recommendation?.recommended?.vehicle_id || null;

            const recommendedDriverId =
                recommendation?.recommended?.driver_id || null;

            /*
            |--------------------------------------------------------------------------
            | Render Driver Dropdown
            |--------------------------------------------------------------------------
            */
            renderDriverOptions(
                recommendation?.candidates || [],
                availablePairsResponse?.pairs || [],
                currentDriverId,
                currentVehicleId,
                recommendedVehicleId,
                recommendedDriverId,
            );

            /*
            |--------------------------------------------------------------------------
            | Render AI
            |--------------------------------------------------------------------------
            */
            renderReviewAiRecommendation(recommendation);
        } catch (error) {
            console.error("Reassignment review load error:", error);

            showMessage(
                error?.message || "Unable to load reassignment request.",
                "error",
            );

            modal.hide();
        } finally {
            if (reviewAiLoading) {
                reviewAiLoading.hidden = true;
            }
        }
    }
    /*
    |--------------------------------------------------------------------------
    | Open Action Confirmation
    |--------------------------------------------------------------------------
    */
    function openActionConfirmation({
        type = "approve",
        title,
        message,
        confirmLabel,
    }) {
        if (
            !actionConfirmModal ||
            !actionConfirmIcon ||
            !actionConfirmTitle ||
            !actionConfirmMessage ||
            !actionConfirmConfirm
        ) {
            console.error(
                "Dispatch action confirmation modal elements were not found.",
            );
            return false;
        }
        pendingConfirmationAction = type;
        actionConfirmTitle.textContent =
            title || "Confirm Action";
        actionConfirmMessage.textContent =
            message ||
            "Are you sure you want to continue?";
        actionConfirmIcon.classList.remove(
            "dispatch-confirm-icon-approve",
            "dispatch-confirm-icon-reject",
        );
        if (type === "reject") {
            actionConfirmIcon.classList.add(
                "dispatch-confirm-icon-reject",
            );
            actionConfirmIcon.innerHTML =
                '<i class="ph-fill ph-warning-circle"></i>';
            actionConfirmConfirm.className =
                "btn-danger";
            actionConfirmConfirm.innerHTML = `
                <i class="ph ph-x-circle"></i>
                <span>
                    ${escapeHtml(confirmLabel || "Reject")}
                </span>
            `;
        } else {
            actionConfirmIcon.classList.add(
                "dispatch-confirm-icon-approve",
            );

            actionConfirmIcon.innerHTML =
                '<i class="ph-fill ph-warning-circle"></i>';

            actionConfirmConfirm.className =
                "btn-primary";

            actionConfirmConfirm.innerHTML = `
                <i class="ph ph-check-circle"></i>
                <span>
                    ${escapeHtml(confirmLabel || "Approve")}
                </span>
            `;
        }

        actionConfirmModal.classList.add("show");

        return true;
    }
    /*
    |--------------------------------------------------------------------------
    | Close Action Confirmation
    |--------------------------------------------------------------------------
    */
    function closeActionConfirmation() {
        if (!actionConfirmModal) {
            return;
        }
        actionConfirmModal.classList.remove("show");
        pendingConfirmationAction = null;
    }
    /*
    |--------------------------------------------------------------------------
    | Approve Reassignment
    |--------------------------------------------------------------------------
    */
    async function approveReassignment() {
        if (!currentReassignment) {
            showMessage(
                "No reassignment request is currently selected.",
                "error",
            );

            return;
        }
        const newDriverId = newDriverSelect?.value || "";
        if (!newDriverId) {
            showMessage("Please select a replacement driver.", "error");
            return;
        }
        const currentDriverId =
            currentDispatch?.reservation?.driver_id ||
            currentDispatch?.reservation?.driver?.id ||
            null;
        if (
            currentDriverId &&
            Number(newDriverId) === Number(currentDriverId)
        ) {
            showMessage(
                "The selected driver is already assigned to this dispatch.",
                "error",
            );

            return;
        }
        openActionConfirmation({
            type: "approve",
            title: "Approve Reassignment?",
            message:
                "Approve this reassignment and assign the selected vehicle and driver?",
            confirmLabel: "Approve",
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Submit Approve Reassignment
    |--------------------------------------------------------------------------
    */
    async function submitApproveReassignment() {
        if (!currentReassignment) {
            showMessage(
                "No reassignment request is currently selected.",
                "error",
            );

            return;
        }
        const selectedOption = newDriverSelect?.selectedOptions?.[0] || null;
        const newVehicleId = selectedOption?.dataset?.vehicleId || "";
        const newDriverId = selectedOption?.dataset?.driverId || "";
        if (!newVehicleId || !newDriverId) {
            showMessage(
                "Please select a replacement vehicle and driver combination.",
                "error",
            );
            return;
        }
        closeActionConfirmation();
        setLoading(
            approveButton,
            true,
            "Approving...",
        );
        try {
            const response = await fetch(
                `/dispatch/reassignments/${currentReassignment.id}/approve`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        new_vehicle_id: Number(newVehicleId),
                        new_driver_id: Number(newDriverId),
                    }),
                },
            );
            const payload =
                await response
                    .json()
                    .catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    payload?.message ||
                        "Unable to approve reassignment.",
                );
            }
            modal.hide();
            showMessage(
                payload?.message ||
                    "Reassignment request approved.",
                "success",
            );
            setTimeout(() => {
                window.location.reload();
            }, 700);
        } catch (error) {
            console.error(
                "Approve reassignment error:",
                error,
            );
            showMessage(
                error?.message ||
                    "Unable to approve reassignment.",
                "error",
            );
            setLoading(
                approveButton,
                false,
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Reject Reassignment
    |--------------------------------------------------------------------------
    */
    async function rejectReassignment() {
        if (!currentReassignment) {
            showMessage(
                "No reassignment request is currently selected.",
                "error",
            );

            return;
        }
        openActionConfirmation({
            type: "reject",
            title: "Reject Reassignment?",
            message:
                "Are you sure you want to reject this reassignment request?",
            confirmLabel: "Reject",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Submit Reject Reassignment
    |--------------------------------------------------------------------------
    */
    async function submitRejectReassignment() {
        if (!currentReassignment) {
            showMessage(
                "No reassignment request is currently selected.",
                "error",
            );
            return;
        }
        closeActionConfirmation();
        setLoading(
            rejectButton,
            true,
            "Rejecting...",
        );
        try {
            const response = await fetch(
                `/dispatch/reassignments/${currentReassignment.id}/reject`,
                {
                    method: "POST",
                    headers: {
                        Accept:
                            "application/json",
                        "X-Requested-With":
                            "XMLHttpRequest",
                        "X-CSRF-TOKEN":
                            getCsrfToken(),
                    },
                    credentials:
                        "same-origin",
                },
            );
            const payload =
                await response
                    .json()
                    .catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    payload?.message ||
                        "Unable to reject reassignment.",
                );
            }
            modal.hide();
            showMessage(
                payload?.message ||
                    "Reassignment request rejected.",
                "success",
            );
            setTimeout(() => {
                window.location.reload();
            }, 700);
        } catch (error) {
            console.error(
                "Reject reassignment error:",
                error,
            );
            showMessage(
                error?.message ||
                    "Unable to reject reassignment.",
                "error",
            );
            setLoading(
                rejectButton,
                false,
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Review Button
    |--------------------------------------------------------------------------
    */
    document.addEventListener("click", function (event) {
        const reviewButton = event.target.closest(".btn-review-reassignment");

        if (!reviewButton) {
            return;
        }
        const reassignmentId = reviewButton.dataset.id;
        const dispatchId = reviewButton.dataset.dispatchId;
        if (!reassignmentId || !dispatchId) {
            showMessage("Invalid reassignment request.", "error");
            return;
        }
        openReview(reassignmentId, dispatchId);
    });

    /*
    |--------------------------------------------------------------------------
    | Approve Button
    |--------------------------------------------------------------------------
    */
    if (approveButton) {
        approveButton.addEventListener("click", approveReassignment);
    }
    /*
    |--------------------------------------------------------------------------
    | Reject Button
    |--------------------------------------------------------------------------
    */
    if (rejectButton) {
        rejectButton.addEventListener("click", rejectReassignment);
    }
    /*
    |--------------------------------------------------------------------------
    | Use Recommendation
    |--------------------------------------------------------------------------
    */
    if (applyReviewAiRecommendation) {
        applyReviewAiRecommendation.addEventListener(
            "click",
            useReviewAiRecommendation,
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Score Breakdown Toggle
    |--------------------------------------------------------------------------
    */
    if (toggleReviewAiScoreBreakdown && reviewAiScoreBreakdown) {
        toggleReviewAiScoreBreakdown.addEventListener("click", function () {
            const isHidden = reviewAiScoreBreakdown.hidden;
            reviewAiScoreBreakdown.hidden = !isHidden;
            toggleReviewAiScoreBreakdown.setAttribute(
                "aria-expanded",
                String(isHidden),
            );
            toggleReviewAiScoreBreakdown.innerHTML = isHidden
                ? '<i class="ph ph-chart-bar"></i> Hide Score Breakdown'
                : '<i class="ph ph-chart-bar"></i> View Score Breakdown';
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Driver Selection Change
    |--------------------------------------------------------------------------
    */
    if (newDriverSelect) {
        newDriverSelect.addEventListener("change", function () {
            const option = newDriverSelect.selectedOptions?.[0];
            const vehicleId = option?.dataset?.vehicleId || "";
            const driverId = option?.dataset?.driverId || "";
            if (approveButton) {
                approveButton.disabled = !vehicleId || !driverId;
            }
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Confirmation Cancel
    |--------------------------------------------------------------------------
    */
    if (actionConfirmCancel) {
        actionConfirmCancel.addEventListener(
            "click",
            closeActionConfirmation,
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Confirmation Confirm
    |--------------------------------------------------------------------------
    */
    if (actionConfirmConfirm) {
        actionConfirmConfirm.addEventListener(
            "click",
            async () => {
                if (
                    pendingConfirmationAction ===
                    "approve"
                ) {
                    await submitApproveReassignment();
                    return;
                }
                if (
                    pendingConfirmationAction ===
                    "reject"
                ) {
                    await submitRejectReassignment();
                }
            },
        );
    }
    if (actionConfirmModal) {
        actionConfirmModal.addEventListener("click", (event) => {
            if (event.target === actionConfirmModal) {
                closeActionConfirmation();
            }
        });
    }
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            actionConfirmModal?.classList.contains("show")
        ) {
            closeActionConfirmation();
        }
    });
    /*
    |--------------------------------------------------------------------------
    | Modal Hidden
    |--------------------------------------------------------------------------
    */
    modalElement.addEventListener("hidden.bs.modal", function () {
        resetModal();
    });
})();
