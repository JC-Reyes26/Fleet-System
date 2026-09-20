/* ==========================================
   HIMS Fleet - Dispatch Add

   Flow:
   Approved Reservation
   + RoutePlan = Ready For Dispatch
          ↓
   Create Dispatch = Pending
          ↓
   Schedule comes from RoutePlan
========================================== */

//    RBAC
function canCreateDispatch() {
    return window.FleetRBAC?.hasPermission?.("dispatch", "canCreate") === true;
}
function canUpdateDispatch() {
    return window.FleetRBAC?.hasPermission?.("dispatch", "canUpdate") === true;
}
function canArchiveDispatch() {
    return window.FleetRBAC?.hasPermission?.("dispatch", "canArchive") === true;
}
function canBulkArchiveDispatch() {
    return (
        window.FleetRBAC?.hasPermission?.("dispatch", "canBulkArchive") === true
    );
}

let availableReservations = [];

let dispatchRecommendationRequestToken = 0;
let latestDispatchRecommendation = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!canCreateDispatch()) {
        return;
    }
    initDispatchAdd();
    await loadAvailableReservations();
});


function getDispatchCsrfToken() {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
}

async function dispatchAddApiRequest(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };
    if (options.body !== undefined && options.body !== null) {
        headers["Content-Type"] = "application/json";
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrfToken = getDispatchCsrfToken();
        if (csrfToken) {
            headers["X-CSRF-TOKEN"] = csrfToken;
        }
    }
    const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: "same-origin",
    });

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        const error = new Error(data.message || "Dispatch request failed.");
        error.status = response.status;
        error.errors = data.errors || {};
        error.data = data;
        throw error;
    }

    return data;
}

async function loadNextDispatchNumber() {
    const numberInput = document.getElementById("dispatchNumber");
    const saveButton = document.querySelector("#dispatchForm [type='submit']");
    if (!numberInput) {
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Loading State
    |--------------------------------------------------------------------------
    */
    numberInput.value = "Generating...";
    numberInput.classList.add("is-generating");
    if (saveButton) {
        saveButton.disabled = true;
    }
    try {
        const data = await dispatchAddApiRequest("/dispatch/next-number", {
            method: "GET",
        });
        numberInput.value = data.dispatch_number || "";
        if (!numberInput.value) {
            throw new Error("Dispatch number was not generated.");
        }
    } catch (error) {
        console.error("Unable to load next dispatch number:", error);
        numberInput.value = "Unable to generate";
        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to generate dispatch number.",
                "error",
            );
        }
    } finally {
        numberInput.classList.remove("is-generating");

        if (saveButton) {
            saveButton.disabled =
                !numberInput.value ||
                numberInput.value === "Unable to generate";
        }
    }
}
function getReservationRoutePlan(reservation) {
    return reservation?.route_plan || reservation?.routePlan || null;
}

function getDispatchVehicleLabel(vehicle) {
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

function getDispatchDriverLabel(driver) {
    if (!driver) {
        return "Unassigned";
    }
    const name = [driver.first_name, driver.last_name]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ")
        .trim();
    return name || driver.name || "Unassigned";
}

async function loadAvailableReservations() {
    try {
        const data = await dispatchAddApiRequest(
            "/dispatch/available-reservations",
            {
                method: "GET",
            },
        );
        availableReservations = Array.isArray(data.reservations)
            ? data.reservations
            : [];

        populateReservationSelect(availableReservations);
    } catch (error) {
        console.error("Error loading Dispatch reservations:", error);
        availableReservations = [];
        populateReservationSelect([]);
        if (typeof showToast === "function") {
            showToast(
                error.message ||
                    "Unable to load reservations ready for dispatch.",
                "error",
            );
        }
    }
}


function populateReservationSelect(reservations) {
    const select = document.getElementById("dispatchReservation");

    if (!select) {
        return;
    }
    select.innerHTML = '<option value="">Select Reservation</option>';
    reservations.forEach((reservation) => {
        const option = document.createElement("option");
        option.value = String(reservation.id);
        const number =
            reservation.reservation_number || `Reservation #${reservation.id}`;
        const patient = reservation.patient_name
            ? ` — ${reservation.patient_name}`
            : "";
        option.textContent = number + patient;
        select.appendChild(option);
    });

    if (reservations.length === 0) {
        select.innerHTML =
            '<option value="">No routes ready for dispatch</option>';
    }
}

function handleReservationChange() {
    const select = document.getElementById("dispatchReservation");
    if (!select) {
        return;
    }
    const reservationId = select.value;
    if (!reservationId) {
        clearReservationDetails();
        clearDispatchAiRecommendation();
        return;
    }
    const reservation = availableReservations.find(
        (item) => String(item.id) === String(reservationId),
    );
    if (!reservation) {
        clearReservationDetails();
        clearDispatchAiRecommendation();
        return;
    }
    fillReservationDetails(reservation);
    void loadDispatchRecommendation(reservation.id);
}

function fillReservationDetails(reservation) {
    const routePlan = getReservationRoutePlan(reservation);

    const setValue = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.value = value ?? "";
        }
    };


    setValue("dispatchPatient", reservation.patient_name);
    setValue("dispatchRequestType", reservation.request_type);
    setValue("dispatchContact", reservation.contact_number);
    setValue("dispatchVehicle", getDispatchVehicleLabel(reservation.vehicle));
    setValue("dispatchDriver", getDispatchDriverLabel(reservation.driver));
    /*
    |--------------------------------------------------------------------------
    | FINAL ROUTE
    |--------------------------------------------------------------------------
    |
    | Route Planning may have changed the initial
    | Reservation route, so Dispatch uses RoutePlan.
    |
    */
    setValue(
        "dispatchPickup",
        routePlan?.origin || reservation.pickup_location || "",
    );
    setValue(
        "dispatchDestination",
        routePlan?.destination || reservation.destination || "",
    );
    /*
    |--------------------------------------------------------------------------
    | FINAL DISPATCH SCHEDULE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Dispatch date/time comes from RoutePlan,
    | NOT Reservation.schedule_date/time.
    |
    */
    setValue(
        "dispatchDate",
        String(routePlan?.departure_date || "").slice(0, 10),
    );
    setValue(
        "dispatchTime",
        String(routePlan?.departure_time || "").slice(0, 5),
    );
    setValue(
        "dispatchPriority",
        routePlan?.priority || reservation.priority || "",
    );
    setValue("dispatchNotes", "");
}

/* ==========================================
   CLEAR AUTO-FILLED DETAILS
========================================== */

function clearReservationDetails() {
    const fields = [
        "dispatchPatient",
        "dispatchRequestType",
        "dispatchVehicle",
        "dispatchDriver",
        "dispatchPickup",
        "dispatchDestination",
        "dispatchDate",
        "dispatchTime",
        "dispatchPriority",
        "dispatchContact",
        "dispatchNotes",
    ];

    fields.forEach((id) => {
        const element = document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });
}

function clearDispatchAiRecommendation() {
    dispatchRecommendationRequestToken += 1;
    latestDispatchRecommendation = null;
    const panel = document.getElementById("dispatchAiRecommendation");
    const loading = document.getElementById("dispatchAiLoading");
    if (panel) {
        panel.hidden = true;
    }
    if (loading) {
        loading.hidden = true;
    }
    const set = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    set("dispatchAiScoreBadge", "—");
    set("dispatchAiVehicle", "—");
    set("dispatchAiDriver", "—");
    set("dispatchAiDistance", "—");
    set("dispatchAiGps", "—");
    const reasons = document.getElementById("dispatchAiReasons");
    if (reasons) {
        reasons.replaceChildren();
    }
    const message = document.getElementById("dispatchAiMessage");
    if (message) {
        message.textContent = "";
    }
    const applyButton = document.getElementById(
        "applyDispatchAiRecommendation",
    );
    if (applyButton) {
        applyButton.hidden = true;
        applyButton.disabled = false;
        applyButton.innerHTML =
            '<i class="ph ph-magic-wand"></i> Use Recommendation';
    }
    const geminiPanel = document.getElementById("dispatchAiGemini");
    const geminiSummary = document.getElementById("dispatchAiGeminiSummary");
    const geminiFactors = document.getElementById("dispatchAiGeminiFactors");
    const geminiFactorsSection = document.getElementById(
        "dispatchAiGeminiFactorsSection",
    );
    const geminiLimitations = document.getElementById(
        "dispatchAiGeminiLimitations",
    );
    const geminiLimitationsSection = document.getElementById(
        "dispatchAiGeminiLimitationsSection",
    );
    if (geminiPanel) {
        geminiPanel.hidden = true;
    }
    if (geminiSummary) {
        geminiSummary.textContent = "";
    }
    if (geminiFactors) {
        geminiFactors.replaceChildren();
    }
    if (geminiFactorsSection) {
        geminiFactorsSection.hidden = true;
    }
    if (geminiLimitations) {
        geminiLimitations.replaceChildren();
    }
    if (geminiLimitationsSection) {
        geminiLimitationsSection.hidden = true;
    }
    const scoreBreakdown = document.getElementById("dispatchAiScoreBreakdown");
    const scoreBreakdownList = document.getElementById(
        "dispatchAiScoreBreakdownList",
    );
    const scoreBreakdownTotal = document.getElementById(
        "dispatchAiBreakdownTotal",
    );
    const scoreBreakdownButton = document.getElementById(
        "toggleDispatchAiScoreBreakdown",
    );
    if (scoreBreakdown) {
        scoreBreakdown.hidden = true;
    }
    if (scoreBreakdownList) {
        scoreBreakdownList.replaceChildren();
    }
    if (scoreBreakdownTotal) {
        scoreBreakdownTotal.textContent = "0/100";
    }
    if (scoreBreakdownButton) {
        scoreBreakdownButton.setAttribute("aria-expanded", "false");
        scoreBreakdownButton.innerHTML =
            '<i class="ph ph-chart-bar"></i> View Score Breakdown';
    }
}

function updateDispatchRecommendationButton() {
    const button = document.getElementById("applyDispatchAiRecommendation");
    if (!button) {
        return;
    }
    const recommendation = latestDispatchRecommendation;
    if (
        !recommendation ||
        !recommendation.vehicle_id ||
        !recommendation.driver_id
    ) {
        button.hidden = true;
        button.disabled = false;
        button.innerHTML =
            '<i class="ph ph-magic-wand"></i> Use Recommendation';
        return;
    }
    if (recommendation.is_current_assignment === true) {
        button.hidden = true;
        button.disabled = false;
        button.innerHTML = '<i class="ph ph-check"></i> Already Applied';
        return;
    }
    button.hidden = false;
    button.disabled = false;
    button.innerHTML = '<i class="ph ph-magic-wand"></i> Use Recommendation';
}

async function loadDispatchRecommendation(reservationId) {
    const panel = document.getElementById("dispatchAiRecommendation");
    const loading = document.getElementById("dispatchAiLoading");
    if (!reservationId) {
        clearDispatchAiRecommendation();
        return null;
    }
    const requestToken = ++dispatchRecommendationRequestToken;
    latestDispatchRecommendation = null;
    if (panel) {
        panel.hidden = true;
    }

    if (loading) {
        loading.hidden = false;
    }

    try {
        const data = await dispatchAddApiRequest(
            `/dispatch/recommendation/${encodeURIComponent(reservationId)}`,
            {
                method: "GET",
            },
        );
        if (requestToken !== dispatchRecommendationRequestToken) {
            return null;
        }
        latestDispatchRecommendation = data?.recommended || null;
        renderDispatchRecommendation(data);
        return data;
    } catch (error) {
        if (requestToken !== dispatchRecommendationRequestToken) {
            return null;
        }
        console.error("Dispatch AI recommendation failed:", error);
        clearDispatchAiRecommendation();
        if (panel) {
            panel.hidden = false;
        }
        const message = document.getElementById("dispatchAiMessage");
        if (message) {
            message.textContent =
                error.message || "Unable to generate dispatch recommendation.";
        }
        return null;
    } finally {
        if (requestToken === dispatchRecommendationRequestToken) {
            if (loading) {
                loading.hidden = true;
            }
        }
    }
}

function formatDispatchAiDistance(distanceKm) {
    const value = Number(distanceKm);

    if (!Number.isFinite(value)) {
        return "Unavailable";
    }
    return `${value.toFixed(1)} km`;
}

function getDispatchAiGpsLabel(candidate) {
    if (!candidate?.has_live_location) {
        return "No live GPS";
    }
    const age = Number(candidate.location_age_seconds);
    if (Number.isFinite(age) && age <= 120) {
        return Number.isFinite(age)
            ? `Live GPS · ${Math.floor(age)}s old`
            : "Live GPS";
    }
    return "GPS data is stale";
}

function renderDispatchRecommendation(data) {
    const panel = document.getElementById("dispatchAiRecommendation");
    if (!panel) {
        return;
    }
    panel.hidden = false;
    const recommended = data?.recommended || null;
    const assigned = data?.assigned || null;
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    /*
    |--------------------------------------------------------------------------
    | No recommendation
    |--------------------------------------------------------------------------
    */
    if (!recommended) {
        setText("dispatchAiScoreBadge", "No Match");
        setText("dispatchAiVehicle", "—");
        setText("dispatchAiDriver", "—");
        setText("dispatchAiDistance", "—");
        setText("dispatchAiEta", "—");
        setText("dispatchAiTrafficDelay", "—");
        setText("dispatchAiTraffic", "Unavailable");
        setText("dispatchAiGps", "Unavailable");
        updateDispatchRecommendationButton();
        renderDispatchAiScoreBreakdown(data);
        renderDispatchGeminiExplanation(data);

        const reasons = document.getElementById("dispatchAiReasons");
        if (reasons) {
            reasons.replaceChildren();
        }
        const message = document.getElementById("dispatchAiMessage");
        if (message) {
            message.textContent =
                data?.message ||
                "No suitable vehicle and driver combination is currently available.";
        }
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Score
    |--------------------------------------------------------------------------
    */
    setText("dispatchAiScoreBadge", `${Number(recommended.score || 0)}/100`);
    /*
    |--------------------------------------------------------------------------
    | Recommended Vehicle / Driver
    |--------------------------------------------------------------------------
    */
    setText("dispatchAiVehicle", recommended.vehicle_label || "—");
    setText("dispatchAiDriver", recommended.driver_name || "—");
    /*
    |--------------------------------------------------------------------------
    | GPS Distance
    |--------------------------------------------------------------------------
    */
    setText(
        "dispatchAiDistance",
        formatDispatchAiDistance(recommended.distance_to_pickup_km),
    );
    /*
    |--------------------------------------------------------------------------
    | Traffic ETA
    |--------------------------------------------------------------------------
    */
    const etaMinutes = Number(recommended.traffic_eta_minutes);
    setText(
        "dispatchAiEta",
        Number.isFinite(etaMinutes)
            ? `${etaMinutes.toFixed(1)} min`
            : "Unavailable",
    );
    /*
    |--------------------------------------------------------------------------
    | Traffic Delay
    |--------------------------------------------------------------------------
    */
    const delayMinutes = Number(recommended.traffic_delay_minutes);
    setText(
        "dispatchAiTrafficDelay",
        Number.isFinite(delayMinutes)
            ? `${delayMinutes.toFixed(1)} min`
            : "Unavailable",
    );
    /*
    |--------------------------------------------------------------------------
    | Traffic Provider / Condition
    |--------------------------------------------------------------------------
    */
    let trafficLabel = "Unavailable";
    if (recommended.traffic_provider === "TomTom") {
        if (Number.isFinite(delayMinutes) && delayMinutes > 0) {
            trafficLabel = `TomTom · ${delayMinutes.toFixed(1)} min delay`;
        } else {
            trafficLabel = "TomTom · Low traffic delay";
        }
    }
    setText("dispatchAiTraffic", trafficLabel);
    /*
    |--------------------------------------------------------------------------
    | GPS Status
    |--------------------------------------------------------------------------
    */
    setText("dispatchAiGps", getDispatchAiGpsLabel(recommended));
    /*
    |--------------------------------------------------------------------------
    | Reasons
    |--------------------------------------------------------------------------
    */
    const reasons = document.getElementById("dispatchAiReasons");
    if (reasons) {
        reasons.replaceChildren();
        const items = Array.isArray(recommended.reasons)
            ? recommended.reasons
            : [];
        items.forEach((reason) => {
            const li = document.createElement("li");
            li.textContent = String(reason);
            reasons.appendChild(li);
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Message
    |--------------------------------------------------------------------------
    */
    const message = document.getElementById("dispatchAiMessage");
    if (message) {
        if (recommended.is_current_assignment === true) {
            message.textContent =
                "AI recommendation matches the Reservation's current vehicle and driver.";
        } else if (assigned) {
            message.textContent =
                "AI recommends a different available vehicle/driver combination than the current Reservation assignment.";
        } else {
            message.textContent =
                "AI generated a recommendation from currently available fleet resources.";
        }
    }
    updateDispatchRecommendationButton();
    renderDispatchAiScoreBreakdown(data);
    renderDispatchGeminiExplanation(data);
}

async function applyDispatchAiRecommendation() {
    const select = document.getElementById("dispatchReservation");
    const button = document.getElementById("applyDispatchAiRecommendation");
    const reservationId = select?.value;
    if (!reservationId) {
        if (typeof showToast === "function") {
            showToast("Please select a reservation first.", "error");
        }
        return;
    }
    const recommendation = latestDispatchRecommendation;
    if (
        !recommendation ||
        !recommendation.vehicle_id ||
        !recommendation.driver_id
    ) {
        if (typeof showToast === "function") {
            showToast("No valid AI recommendation is available.", "error");
        }
        return;
    }
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="ph ph-spinner"></i> Applying...';
    }
    try {
        const data = await dispatchAddApiRequest(
            `/reservation/${encodeURIComponent(
                reservationId,
            )}/apply-dispatch-recommendation`,
            {
                method: "POST",
                body: JSON.stringify({
                    vehicle_id: Number(recommendation.vehicle_id),
                    driver_id: Number(recommendation.driver_id),
                }),
            },
        );
        const updatedReservation = data?.reservation || null;
        /*
        |--------------------------------------------------------------------------
        | Update currently selected reservation in memory
        |--------------------------------------------------------------------------
        */
        const reservationIndex = availableReservations.findIndex(
            (item) => String(item.id) === String(reservationId),
        );
        if (reservationIndex !== -1 && updatedReservation) {
            availableReservations[reservationIndex] = updatedReservation;
        }
        /*
        |--------------------------------------------------------------------------
        | Refresh Dispatch form fields
        |--------------------------------------------------------------------------
        */
        if (updatedReservation) {
            fillReservationDetails(updatedReservation);
        } else {
            const currentReservation = availableReservations.find(
                (item) => String(item.id) === String(reservationId),
            );
            if (currentReservation) {
                currentReservation.vehicle_id = recommendation.vehicle_id;
                currentReservation.driver_id = recommendation.driver_id;
                currentReservation.vehicle = currentReservation.vehicle || {};
                currentReservation.driver = currentReservation.driver || {};
                fillReservationDetails(currentReservation);
            }
        }
        /*
        |--------------------------------------------------------------------------
        | Mark recommendation as applied
        |--------------------------------------------------------------------------
        */
        latestDispatchRecommendation = {
            ...recommendation,
            is_current_assignment: true,
        };
        renderDispatchRecommendation({
            recommended: latestDispatchRecommendation,
            assigned: latestDispatchRecommendation,
        });

        if (typeof showToast === "function") {
            showToast(
                data.message ||
                    "AI dispatch recommendation applied successfully.",
                "success",
            );
        }
    } catch (error) {
        console.error("Failed to apply AI dispatch recommendation:", error);

        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to apply the AI recommendation.",
                "error",
            );
        }
    } finally {
        updateDispatchRecommendationButton();
    }
}

function renderDispatchGeminiExplanation(data) {
    const container = document.getElementById("dispatchAiGemini");
    const summaryElement = document.getElementById("dispatchAiGeminiSummary");
    const factorsSection = document.getElementById(
        "dispatchAiGeminiFactorsSection",
    );
    const factorsList = document.getElementById("dispatchAiGeminiFactors");
    const limitationsSection = document.getElementById(
        "dispatchAiGeminiLimitationsSection",
    );
    const limitationsList = document.getElementById(
        "dispatchAiGeminiLimitations",
    );
    if (
        !container ||
        !summaryElement ||
        !factorsSection ||
        !factorsList ||
        !limitationsSection ||
        !limitationsList
    ) {
        return;
    }
    const explanation = data?.gemini_explanation || null;
    if (
        data?.gemini_available !== true ||
        !explanation ||
        typeof explanation !== "object"
    ) {
        container.hidden = true;
        summaryElement.textContent = "";
        factorsList.replaceChildren();
        limitationsList.replaceChildren();
        factorsSection.hidden = true;
        limitationsSection.hidden = true;
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */
    const summary = String(explanation.summary || "").trim();
    if (summary) {
        summaryElement.textContent = summary;
    } else {
        summaryElement.textContent = "No Gemini summary was returned.";
    }
    /*
    |--------------------------------------------------------------------------
    | Key Factors
    |--------------------------------------------------------------------------
    */
    factorsList.replaceChildren();
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
        factorsList.appendChild(li);
    });
    factorsSection.hidden = factors.length === 0;
    /*
    |--------------------------------------------------------------------------
    | Limitations
    |--------------------------------------------------------------------------
    */
    limitationsList.replaceChildren();
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
        limitationsList.appendChild(li);
    });
    limitationsSection.hidden = limitations.length === 0;
    /*
    |--------------------------------------------------------------------------
    | Show Gemini Panel
    |--------------------------------------------------------------------------
    */
    container.hidden = false;
}

function renderDispatchAiScoreBreakdown(data) {
    const breakdown = document.getElementById("dispatchAiScoreBreakdown");
    const list = document.getElementById("dispatchAiScoreBreakdownList");
    const total = document.getElementById("dispatchAiBreakdownTotal");
    if (!breakdown || !list || !total) {
        return;
    }
    const recommendation = data?.recommended || null;
    if (!recommendation) {
        breakdown.hidden = true;
        list.replaceChildren();
        total.textContent = "0/100";
        return;
    }
    const scores = [
        {
            label: "Availability",
            score: Number(recommendation.availability_score ?? 0),
            max: 25,
            description: "Current vehicle availability",
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
            description: "Match with current reservation assignment",
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
            description: Number.isFinite(Number(recommendation.fuel_percentage))
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
                recommendation.maintenance_status || "Maintenance condition",
        },
    ];
    list.replaceChildren();
    scores.forEach((item) => {
        const safeScore = Math.max(0, Math.min(item.score, item.max));

        const row = document.createElement("div");
        row.className = "dispatch-ai-score-row";

        const label = document.createElement("div");
        label.className = "dispatch-ai-score-row-label";

        const strong = document.createElement("strong");
        strong.textContent = item.label;

        const small = document.createElement("small");
        small.textContent = item.description;

        label.appendChild(strong);
        label.appendChild(small);

        const value = document.createElement("div");
        value.className = "dispatch-ai-score-row-value";
        value.textContent = `${safeScore}/${item.max}`;

        const track = document.createElement("div");
        track.className = "dispatch-ai-score-track";

        const fill = document.createElement("div");
        fill.className = "dispatch-ai-score-fill";

        fill.style.width = `${(safeScore / item.max) * 100}%`;

        track.appendChild(fill);

        row.appendChild(label);
        row.appendChild(value);
        row.appendChild(track);

        list.appendChild(row);
    });

    total.textContent = `${Number(recommendation.score || 0)}/100`;
    const totalRow = document.createElement("div");
    totalRow.className = "dispatch-ai-score-total";
    const totalLabel = document.createElement("span");
    totalLabel.textContent = "Overall Recommendation Score";
    const totalValue = document.createElement("span");
    totalValue.textContent = `${Number(recommendation.score || 0)}/100`;
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    list.appendChild(totalRow);
}

function initDispatchAiScoreBreakdown() {
    const button = document.getElementById("toggleDispatchAiScoreBreakdown");
    const breakdown = document.getElementById("dispatchAiScoreBreakdown");
    if (!button || !breakdown) {
        return;
    }
    if (button.dataset.initialized === "true") {
        return;
    }
    button.dataset.initialized = "true";
    button.addEventListener("click", () => {
        const isHidden = breakdown.hidden;
        breakdown.hidden = !isHidden;
        button.setAttribute("aria-expanded", String(isHidden));
        button.innerHTML = isHidden
            ? '<i class="ph ph-chart-bar"></i> Hide Score Breakdown'
            : '<i class="ph ph-chart-bar"></i> View Score Breakdown';
    });
}

function createDispatchRow(dispatch) {
    //rbac
    const canUpdate = canUpdateDispatch();
    const canArchivePermission = canArchiveDispatch();
    const canBulkArchive = canBulkArchiveDispatch();
    const canRestore =
        window.FleetRBAC?.hasPermission?.("dispatch", "canRestore") === true;

    const reservation = dispatch.reservation || null;
    const routePlan = getReservationRoutePlan(reservation);
    const vehicle = reservation?.vehicle || null;
    const driver = reservation?.driver || null;
    const vehicleName = getDispatchVehicleLabel(vehicle);
    const driverName = getDispatchDriverLabel(driver);
    const scheduleText = formatDispatchSchedule(
        dispatch.dispatch_date || routePlan?.departure_date,
        dispatch.departure_time || routePlan?.departure_time,
    );
    const routeOrigin = routePlan?.origin || reservation?.pickup_location || "";
    const routeDestination =
        routePlan?.destination || reservation?.destination || "";
    const priority = routePlan?.priority || reservation?.priority || "";
    const status = dispatch.trip_status || "Pending";
    const statusClassMap = {
        Pending: "pending",
        Assigned: "scheduled",
        "En Route": "trip",
        Arrived: "approved",
        Completed: "completed",
        Cancelled: "cancelled",
    };
    const statusClass =
        statusClassMap[status] || status.toLowerCase().replace(/\s+/g, "-");
    const tr = document.createElement("tr");
    tr.dataset.id = dispatch.id;
    tr.dataset.archivedAt = dispatch.archived_at || "";
    tr.dataset.pickup = routeOrigin;
    tr.dataset.destination = routeDestination;
    tr.dataset.scheduleDate = String(
        dispatch.dispatch_date || routePlan?.departure_date || "",
    ).slice(0, 10);
    tr.dataset.scheduleTime = String(
        dispatch.departure_time || routePlan?.departure_time || "",
    ).slice(0, 5);
    tr.dataset.priority = priority;
    tr.dataset.contact = reservation?.contact_number ?? "";
    tr.dataset.notes = dispatch.remarks ?? "";
    tr.dataset.requestType = reservation?.request_type ?? "";

    const tdCheckbox = document.createElement("td");
    if (canBulkArchive && !dispatch.archived_at) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "dispatch-checkbox";
        checkbox.dataset.id = dispatch.id;
        checkbox.setAttribute(
            "aria-label",
            `Select ${dispatch.dispatch_number}`,
        );
        tdCheckbox.appendChild(checkbox);
    }
    /*
    |--------------------------------------------------------------------------
    | Dispatch Number
    |--------------------------------------------------------------------------
    */
    const tdNumber = document.createElement("td");
    const numberSpan = document.createElement("span");
    numberSpan.className = "dispatch-number";
    numberSpan.textContent = dispatch.dispatch_number || "—";
    tdNumber.appendChild(numberSpan);
    /*
    |--------------------------------------------------------------------------
    | Reservation Number
    |--------------------------------------------------------------------------
    */
    const tdReservation = document.createElement("td");
    const reservationSpan = document.createElement("span");
    reservationSpan.className = "dispatch-reservation-number";
    reservationSpan.textContent = reservation?.reservation_number ?? "—";
    tdReservation.appendChild(reservationSpan);
    /*
    |--------------------------------------------------------------------------
    | Patient
    |--------------------------------------------------------------------------
    */
    const tdPatient = document.createElement("td");
    const patientInfo = document.createElement("div");
    patientInfo.className = "dispatch-patient-info";
    const patientName = document.createElement("div");
    patientName.className = "dispatch-patient-name";
    patientName.textContent = reservation?.patient_name ?? "—";
    const requestType = document.createElement("div");
    requestType.className = "dispatch-request-type";
    requestType.textContent = reservation?.request_type ?? "—";
    patientInfo.appendChild(patientName);
    patientInfo.appendChild(requestType);
    tdPatient.appendChild(patientInfo);
    /*
    |--------------------------------------------------------------------------
    | Vehicle
    |--------------------------------------------------------------------------
    */
    const tdVehicle = document.createElement("td");
    const vehicleSpan = document.createElement("span");
    vehicleSpan.className = "dispatch-vehicle";
    vehicleSpan.textContent = vehicleName;
    tdVehicle.appendChild(vehicleSpan);
    /*
    |--------------------------------------------------------------------------
    | Driver
    |--------------------------------------------------------------------------
    */
    const tdDriver = document.createElement("td");
    const driverSpan = document.createElement("span");
    driverSpan.className = "dispatch-driver";
    driverSpan.textContent = driverName;
    tdDriver.appendChild(driverSpan);
    /*
    |--------------------------------------------------------------------------
    | Final Planned Route
    |--------------------------------------------------------------------------
    */
    const tdRoute = document.createElement("td");
    const routeSpan = document.createElement("span");
    routeSpan.className = "dispatch-route";
    routeSpan.textContent =
        routeOrigin && routeDestination
            ? `${routeOrigin} → ${routeDestination}`
            : "—";
    tdRoute.appendChild(routeSpan);
    /*
    |--------------------------------------------------------------------------
    | Schedule
    |--------------------------------------------------------------------------
    */
    const tdSchedule = document.createElement("td");
    const scheduleSpan = document.createElement("span");
    scheduleSpan.className = "dispatch-schedule";
    scheduleSpan.textContent = scheduleText || "—";
    tdSchedule.appendChild(scheduleSpan);
    /*
    |--------------------------------------------------------------------------
    | Priority
    |--------------------------------------------------------------------------
    */
    const tdPriority = document.createElement("td");
    const prioritySpan = document.createElement("span");
    prioritySpan.className = "dispatch-priority";
    prioritySpan.textContent = priority || "—";
    tdPriority.appendChild(prioritySpan);
    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */
    const tdStatus = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.className = `status-badge ${statusClass}`;
    statusSpan.textContent = status;
    tdStatus.appendChild(statusSpan);
    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */
    const tdActions = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "action-buttons";
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "action-btn view-dispatch";
    viewBtn.dataset.id = dispatch.id;
    viewBtn.setAttribute("aria-label", `View ${dispatch.dispatch_number}`);
    viewBtn.innerHTML = '<i class="ph ph-eye"></i>';
    if (canUpdate) {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "action-btn edit-dispatch";
        editBtn.dataset.id = dispatch.id;
        editBtn.setAttribute("aria-label", `Edit ${dispatch.dispatch_number}`);
        editBtn.innerHTML = '<i class="ph ph-pencil-simple"></i>';
        if (
            dispatch.archived_at ||
            ["Completed", "Cancelled"].includes(status)
        ) {
            editBtn.disabled = true;
        }
        actionsWrap.appendChild(editBtn);
    }
    if (canArchivePermission && !dispatch.archived_at) {
        const archiveBtn = document.createElement("button");
        archiveBtn.type = "button";
        archiveBtn.className = "action-btn archive-dispatch";
        archiveBtn.dataset.id = dispatch.id;
        archiveBtn.setAttribute(
            "aria-label",
            `Archive ${dispatch.dispatch_number}`,
        );
        archiveBtn.title = ["Pending", "Assigned"].includes(status)
            ? "Archive Dispatch"
            : "Only Pending or Assigned dispatches can be archived";
        archiveBtn.innerHTML = '<i class="ph ph-archive"></i>';
        if (!["Pending", "Assigned"].includes(status)) {
            archiveBtn.disabled = true;
        }
        actionsWrap.appendChild(archiveBtn);
    }
    if (canRestore && dispatch.archived_at) {
        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "action-btn restore-dispatch";
        restoreBtn.dataset.id = dispatch.id;
        restoreBtn.setAttribute(
            "aria-label",
            `Restore ${dispatch.dispatch_number}`,
        );
        restoreBtn.title = "Restore Dispatch";
        restoreBtn.innerHTML = '<i class="ph ph-arrow-counter-clockwise"></i>';
        actionsWrap.appendChild(restoreBtn);
    }
    actionsWrap.appendChild(viewBtn);
    tdActions.appendChild(actionsWrap);
    
    tr.appendChild(tdCheckbox);
    tr.appendChild(tdNumber);
    tr.appendChild(tdReservation);
    tr.appendChild(tdPatient);
    tr.appendChild(tdVehicle);
    tr.appendChild(tdDriver);
    tr.appendChild(tdRoute);
    tr.appendChild(tdSchedule);
    tr.appendChild(tdPriority);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);
    return tr;
}

function formatDispatchSchedule(date, time) {
    if (!date) {
        return "";
    }
    const cleanDate = String(date).slice(0, 10);
    const cleanTime = String(time || "").slice(0, 5);
    const iso = cleanTime ? `${cleanDate}T${cleanTime}` : `${cleanDate}T00:00`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }
    const datePart = parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    if (!cleanTime) {
        return datePart;
    }
    const timePart = parsed.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
    return `${datePart}, ${timePart}`;
}


function initDispatchAdd() {
    if (!canCreateDispatch()) {
        return;
    }
    const modal = document.getElementById("addDispatchModal");
    const form = document.getElementById("dispatchForm");
    if (!modal || !form) {
        return;
    }
    if (form.dataset.dispatchAddInitialized === "true") {
        return;
    }
    form.dataset.dispatchAddInitialized = "true";
    initDispatchAiScoreBreakdown();
    const reservationSelect = document.getElementById("dispatchReservation");
    /*
    |--------------------------------------------------------------------------
    | Reservation Change
    |--------------------------------------------------------------------------
    */
    reservationSelect?.addEventListener("change", handleReservationChange);
    /*
    |--------------------------------------------------------------------------
    | Apply AI Recommendation
    |--------------------------------------------------------------------------
    */
    const applyAiRecommendationButton = document.getElementById(
        "applyDispatchAiRecommendation",
    );
    applyAiRecommendationButton?.addEventListener(
        "click",
        applyDispatchAiRecommendation,
    );
    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (
            typeof validateDispatchForm === "function" &&
            !validateDispatchForm(form)
        ) {
            return;
        }
        const reservationId = reservationSelect?.value;
        if (!reservationId) {
            if (typeof showToast === "function") {
                showToast("Please select a reservation.", "error");
            }
            return;
        }
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
        }
        /*
            |--------------------------------------------------------------------------
            | IMPORTANT
            |--------------------------------------------------------------------------
            | Do NOT send dispatch_date / departure_time.
            | DispatchController gets those values from:
            | Reservation → RoutePlan
            */

        const payload = {
            dispatch_number:
                document.getElementById("dispatchNumber")?.value.trim() || null,
            reservation_id: Number(reservationId),
            arrival_time: null,
            remarks:
                document.getElementById("dispatchNotes")?.value.trim() || null,
        };

        try {
            const data = await dispatchAddApiRequest("/dispatch", {
                method: "POST",

                body: JSON.stringify(payload),
            });

            /*
                |--------------------------------------------------------------------------
                | Refresh table
                |--------------------------------------------------------------------------
                */
            const tableBody = document.getElementById("dispatchTableBody");
            if (tableBody && data.dispatch) {
                const row = createDispatchRow(data.dispatch);
                tableBody.insertBefore(row, tableBody.firstChild);
            }
            /*
                |--------------------------------------------------------------------------
                | Remove reservation from available selector
                |--------------------------------------------------------------------------
                */
            availableReservations = availableReservations.filter(
                (reservation) =>
                    String(reservation.id) !== String(reservationId),
            );
            populateReservationSelect(availableReservations);
            /*
                |--------------------------------------------------------------------------
                | Reset Form
                |--------------------------------------------------------------------------
                */
            form.reset();
            clearReservationDetails();
            clearDispatchAiRecommendation();
            form.querySelectorAll(".is-invalid").forEach((element) =>
                element.classList.remove("is-invalid"),
            );
            modal.classList.remove("show");
            document.body.style.overflow = "";
            /*
                |--------------------------------------------------------------------------
                | Refresh Supporting UI
                |--------------------------------------------------------------------------
                */
            if (typeof updateDispatchStatistics === "function") {
                updateDispatchStatistics();
            }
            if (typeof updateDispatchPagination === "function") {
                updateDispatchPagination();
            }
            if (typeof refreshDispatchBulkState === "function") {
                refreshDispatchBulkState();
            }
            if (typeof showToast === "function") {
                showToast(
                    data.message || "Dispatch created successfully.",
                    "success",
                );
            }
        } catch (error) {
            console.error("Dispatch creation error:", error);
            if (typeof showToast === "function") {
                showToast(
                    error.message ||
                        "Something went wrong while creating the dispatch.",
                    "error",
                );
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}
