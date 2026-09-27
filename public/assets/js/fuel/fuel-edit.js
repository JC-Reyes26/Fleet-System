/* ==========================================
   Edit Fuel Record
========================================== */

async function getEditFuelSettings() {
    if (typeof window.getFuelModuleSettings === "function") {
        return await window.getFuelModuleSettings();
    }
    try {
        const response = await fetch("/settings/data", {
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        });
        if (!response.ok) {
            throw new Error();
        }
        const data = await response.json();
        const settings = data?.settings?.fuel || {};
        const fuelStations = Array.isArray(settings.fuelStations)
            ? settings.fuelStations
                  .filter(
                      (station) =>
                          station &&
                          station.id &&
                          station.name &&
                          station.contractType === "Contractual" &&
                          station.active !== false,
                  )
                  .map((station) => ({
                      id: String(station.id),
                      name: String(station.name).trim(),
                      contractType: "Contractual",
                  }))
                  .filter((station) => station.name !== "")
            : [];

        return {
            requireStation: settings.requireStation === true,
            highCostAlert: Math.max(0, Number(settings.highCostAlert ?? 5000)),
            fuelStations,
        };
    } catch {
        return {
            requireStation: false,
            highCostAlert: 5000,
            fuelStations: [],
        };
    }
}

function populateEditFuelStationSelect(stations, currentStation = "") {
    const select = document.getElementById("editFuelStation");
    if (!select) {
        return;
    }
    select.innerHTML = '<option value="">Select Fuel Station</option>';
    stations.forEach((station) => {
        const option = document.createElement("option");
        option.value = station.name;
        option.textContent = `${station.name} — Contractual`;
        option.dataset.stationId = station.id;
        option.dataset.contractType = "Contractual";
        select.appendChild(option);
    });

    if (
        currentStation &&
        Array.from(select.options).some(
            (option) => option.value === currentStation,
        )
    ) {
        select.value = currentStation;
    }
}

function applyEditFuelSettings(settings) {
    const station = document.getElementById("editFuelStation");
    const mark = document.getElementById("editFuelStationRequiredMark");
    const required = settings.requireStation === true;
    const currentStation = station?.value || "";
    populateEditFuelStationSelect(settings.fuelStations || [], currentStation);
    if (station) {
        station.required = required;
    }
    if (mark) {
        mark.hidden = !required;
    }
}

function updateEditFuelHighCostWarning(settings) {
    const total = Number(document.getElementById("editFuelTotalCost")?.value);
    const warning = document.getElementById("editFuelHighCostWarning");
    if (!warning) {
        return;
    }
    const threshold = Number(settings.highCostAlert || 0);
    if (threshold > 0 && !Number.isNaN(total) && total >= threshold) {
        warning.hidden = false;
        warning.textContent = `High-cost fuel transaction: total has reached the ₱${threshold.toLocaleString()} alert threshold.`;
    } else {
        warning.hidden = true;
        warning.textContent = "";
    }
}

//  RBAC
function canEditFuelRecords() {
    return window.FleetRBAC?.hasPermission?.("fuel", "canUpdate") === true;
}

let editFuelInitialized = false;
let editFuelSettings = {
    requireStation: false,
    highCostAlert: 5000,
    fuelStations: [],
};

function populateEditFuelForm(row) {
    if (!row) {
        return;
    }

    const setValue = (id, value) => {
        const field = document.getElementById(id);

        if (!field) {
            return;
        }

        field.value = value == null ? "" : value;
    };

    const setSelect = (id, value) => {
        const field = document.getElementById(id);

        if (!field) {
            return;
        }

        const candidate = value == null ? "" : String(value);
        const exists = Array.from(field.options).some(
            (option) => option.value === candidate,
        );

        if (exists) {
            field.value = candidate;
        } else {
            field.value = "";
        }
    };

    const number =
        (row.dataset.fuelNumber || "").trim() ||
        row.querySelector(".fuel-number")?.textContent?.trim() ||
        "";
    const refuelDate = (row.dataset.refuelDate || "").trim();
    const refuelTime = (row.dataset.refuelTime || "").trim();
    const vehicle =
        (row.dataset.vehicle || "").trim() ||
        row.querySelector(".fuel-vehicle")?.textContent?.trim() ||
        "";
    const plate =
        (row.dataset.plate || "").trim() ||
        row.querySelector(".fuel-plate")?.textContent?.trim() ||
        "";
    const driver =
        (row.dataset.driver || "").trim() ||
        row.querySelector(".fuel-driver")?.textContent?.trim() ||
        "";
    const driverId = (row.dataset.driverId || "").trim();
    const fuelType =
        (row.dataset.fuelType || "").trim() ||
        row.querySelector(".fuel-type")?.textContent?.trim() ||
        "";
    const quantity = (row.dataset.quantity || "").trim();
    const costPerLiter = (row.dataset.costPerLiter || "").trim();
    const totalCost =
        (row.dataset.totalCost || "").trim() ||
        normalizeFuelTotal(quantity, costPerLiter);
    const odometer = (row.dataset.odometer || "").trim();
    const station =
        (row.dataset.station || "").trim() ||
        row.querySelector(".fuel-station")?.textContent?.trim() ||
        "";
    const receipt = (row.dataset.receipt || "").trim();
    const payment = (row.dataset.payment || "").trim();
    const notes = (row.dataset.notes || "").trim();

    setValue("editFuelNumber", number);
    // Refueling Date
    const editDate = refuelDate ? String(refuelDate).substring(0, 10) : "";

    setValue("editFuelRefuelDate", editDate);
    // Refueling Time
    const editTime = refuelTime ? String(refuelTime).substring(0, 5) : "";

    setValue("editFuelRefuelTime", editTime);
    // Vehicle
    const vehicleSelect = document.getElementById("editFuelVehicle");
    const vehicleId = (row.dataset.vehicleId || "").trim();
    if (vehicleSelect) {
        vehicleSelect.innerHTML = "";
        const vehicleOption = document.createElement("option");
        vehicleOption.value = vehicleId;
        const vehicleType = (row.dataset.vehicleType || "").trim();
        vehicleOption.textContent = vehicleType
            ? `${vehicle} - ${vehicleType}`
            : vehicle || "Vehicle";
        vehicleOption.selected = true;
        vehicleSelect.appendChild(vehicleOption);
    }
    setValue("editFuelPlate", plate === "—" ? "" : plate);
    setValue("editFuelDriver", driver);
    setValue("editFuelDriverId", driverId);
    // Fuel Type
    const fuelTypeSelect = document.getElementById("editFuelType");
    if (fuelTypeSelect) {
        fuelTypeSelect.value = fuelType;
        fuelTypeSelect.disabled = true;
    }
    setValue("editFuelQuantity", quantity);
    setValue("editFuelCostPerLiter", costPerLiter);
    setValue("editFuelTotalCost", totalCost);
    setValue("editFuelOdometer", odometer);
    const stationSelect = document.getElementById("editFuelStation");

    if (stationSelect) {
        const stationValue = String(station || "").trim();
    /*
    |--------------------------------------------------------------------------
    | Try active station first
    |--------------------------------------------------------------------------
    */
        stationSelect.value = stationValue;
    /*
    |--------------------------------------------------------------------------
    | Preserve existing inactive station
    |--------------------------------------------------------------------------
    */
        if (stationValue && stationSelect.value !== stationValue) {
            const option = document.createElement("option");
            option.value = stationValue;
            option.textContent = `${stationValue} — Contractual (Current Record)`;
            option.dataset.current = "true";
            stationSelect.appendChild(option);
            stationSelect.value = stationValue;
        }
    }
    setValue("editFuelReceipt", receipt);
    setSelect("editFuelPayment", payment);
    setValue("editFuelNotes", notes);

    /*
    |--------------------------------------------------------------------------
    | Keep read-only fields disabled
    |--------------------------------------------------------------------------
    */

    const vehicleField = document.getElementById("editFuelVehicle");
    const fuelTypeField = document.getElementById("editFuelType");

    if (vehicleField) {
        vehicleField.disabled = true;
    }

    if (fuelTypeField) {
        fuelTypeField.disabled = true;
    }

    syncFuelTotalCostFields("editFuel");

    document
        .getElementById("editFuelCostPerLiter")
        ?.dispatchEvent(new Event("input"));
}

function openEditFuelModal(row) {
    const modal = document.getElementById("editFuelModal");

    if (!modal || !row || !document.body.contains(row)) {
        return false;
    }

    const fuelId = row.dataset.id || row.dataset.fuelId;

    if (!fuelId || !/^\d+$/.test(String(fuelId))) {
        console.error("Invalid fuel database ID:", fuelId);

        showToast?.("Invalid fuel record ID.", "error");

        return false;
    }

    modal.currentRow = row;
    modal.currentFuelId = String(fuelId);

    populateEditFuelForm(row);

    const form = document.getElementById("editFuelForm");

    if (form) {
        clearAllFuelErrors(form);
    }

    modal.classList.add("show");

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        document.getElementById("editFuelRefuelDate")?.focus();
    });

    return true;
}

function closeEditFuelModal() {
    const modal = document.getElementById("editFuelModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    document.body.style.overflow = "";

    modal.currentRow = null;
    modal.currentFuelId = null;
}

async function updateFuelRecord(form, fuelId) {
    const getValue = (id) => {
        const field = document.getElementById(id);

        return field ? field.value : "";
    };

    const payload = {
        date: getValue("editFuelRefuelDate"),

        refuel_time: getValue("editFuelRefuelTime") || null,
        cost_per_liter: getValue("editFuelCostPerLiter"),
        fuel_station: getValue("editFuelStation") || null,
        receipt_number: getValue("editFuelReceipt").trim() || null,
        payment_method: getValue("editFuelPayment") || null,
        notes: getValue("editFuelNotes").trim() || null,
    };

    const response = await fetch(`/fuel-records/${fuelId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",

            "X-CSRF-TOKEN": document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content"),
        },

        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        const firstError = data.errors
            ? Object.values(data.errors).flat()[0]
            : null;

        throw new Error(
            firstError || data.message || "Failed to update fuel record.",
        );
    }

    return data.fuelLog;
}

async function initEditFuelModal() {
    if (!canEditFuelRecords()) {
        return;
    }
    if (editFuelInitialized) {
        return;
    }

    const modal = document.getElementById("editFuelModal");

    if (!modal) {
        return;
    }

    editFuelSettings = await getEditFuelSettings();
    applyEditFuelSettings(editFuelSettings);

    editFuelInitialized = true;

    document.addEventListener("click", (event) => {
        const editBtn = event.target.closest(".action-btn.edit-fuel");

        if (!editBtn) {
            return;
        }

        const row = editBtn.closest("tr");

        if (!row) {
            return;
        }

        openEditFuelModal(row);
    });

    document
        .getElementById("closeEditFuelModal")
        ?.addEventListener("click", closeEditFuelModal);
    document
        .getElementById("cancelEditFuel")
        ?.addEventListener("click", closeEditFuelModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeEditFuelModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeEditFuelModal();
        }
    });

    bindFuelTotalCostCalculation("editFuel");

    document
        .getElementById("editFuelCostPerLiter")
        ?.addEventListener("input", () => {
            requestAnimationFrame(() => {
                updateEditFuelHighCostWarning(editFuelSettings);
            });
        });
}

function initFuelEdit() {
    const form = document.getElementById("editFuelForm");
    const modal = document.getElementById("editFuelModal");
    const updateButton = document.getElementById("updateFuelBtn");

    if (!form || !modal || !updateButton) {
        console.warn("Fuel Edit: required elements not found.");
        return;
    }

    if (form.dataset.fuelEditInitialized === "true") {
        return;
    }

    form.dataset.fuelEditInitialized = "true";

    const handleUpdate = async (event) => {
        event.preventDefault();

        console.log("Fuel Edit: Update button clicked.");

        if (!modal.currentFuelId) {
            showToast?.("Fuel record ID not found.", "error");
            return;
        }

        /*
    |--------------------------------------------------------------------------
    | Client-side permission check
    |--------------------------------------------------------------------------
    */
        if (!canEditFuelRecords()) {
            showToast?.(
                "You do not have permission to update fuel records.",
                "error",
            );
            return;
        }

        /*
    |--------------------------------------------------------------------------
    | Native form validation
    |--------------------------------------------------------------------------
    */
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        updateButton.disabled = true;
        updateButton.textContent = "Updating...";

        try {
            console.log("Fuel Edit: sending update request.", {
                fuelId: modal.currentFuelId,
            });

            await updateFuelRecord(form, modal.currentFuelId);

            closeEditFuelModal();

            if (typeof loadFuelRecords === "function") {
                await loadFuelRecords();
            }

            if (typeof updateFuelStatistics === "function") {
                updateFuelStatistics();
            }

            if (typeof refreshFuelTable === "function") {
                await refreshFuelTable({
                    resetPage: false,
                    refreshStatistics: true,
                    reason: "edit",
                });
            }

            showToast?.("Fuel record updated successfully.", "success");
        } catch (error) {
            console.error("FUEL UPDATE ERROR:", error);

            showToast?.(
                error?.message || "Unable to update fuel record.",
                "error",
            );
        } finally {
            updateButton.disabled = false;
            updateButton.textContent = "Update Fuel Record";
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Direct button click
    |--------------------------------------------------------------------------
    */
    updateButton.addEventListener("click", handleUpdate);

    /*
    |--------------------------------------------------------------------------
    | Prevent double submit from form
    |--------------------------------------------------------------------------
    */
    form.addEventListener("submit", (event) => {
        event.preventDefault();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initEditFuelModal();
    initFuelEdit();
});
