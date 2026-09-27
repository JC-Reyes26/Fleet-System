/* ==========================================
   Add Fuel Record
========================================== */

/* ==========================================
   Fuel Module Settings
========================================== */

window.getFuelModuleSettings =
    window.getFuelModuleSettings ||
    async function () {
        const defaults = {
            requireOdometer: true,
            requireStation: false,
            highCostAlert: 5000,
            fuelStations: [],
        };

        try {
            const response = await fetch(
                "/settings/data",
                {
                    headers: {
                        Accept: "application/json",
                    },
                    credentials: "same-origin",
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Unable to load Fuel settings."
                );
            }
            const data =
                await response.json();
            const settings =
                data?.settings?.fuel;
            if (
                !settings ||
                typeof settings !== "object"
            ) {
                return defaults;
            }
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
                requireOdometer: settings.requireOdometer !== false,
                requireStation: settings.requireStation === true,
                highCostAlert: Math.max(
                    0,
                    Number(settings.highCostAlert ?? 5000),
                ),
                fuelStations,
            };
        } catch (error) {
            console.error(
                "Fuel settings load error:",
                error
            );
            return defaults;
        }
    };

function populateFuelStationSelect(stations, selectedValue = "") {
    const select = document.getElementById("fuelStation");
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
        selectedValue &&
        Array.from(select.options).some(
            (option) => option.value === selectedValue,
        )
    ) {
        select.value = selectedValue;
    }
}

function applyFuelAddSettings(settings) {
    const odometer = document.getElementById("fuelOdometer");
    const odometerMark = document.getElementById("fuelOdometerRequiredMark");
    const station = document.getElementById("fuelStation");
    const stationMark = document.getElementById("fuelStationRequiredMark");
    const requireOdometer = settings.requireOdometer === true;
    const requireStation = settings.requireStation === true;
    /*
    |--------------------------------------------------------------------------
    | Fuel Station
    |--------------------------------------------------------------------------
    */
    const currentStation = station?.value || "";
    populateFuelStationSelect(settings.fuelStations || [], currentStation);
    /*
    |--------------------------------------------------------------------------
    | Odometer
    |--------------------------------------------------------------------------
    */
    if (odometer) {
        odometer.required = requireOdometer;
    }
    if (odometerMark) {
        odometerMark.hidden = !requireOdometer;
    }
    /*
    |--------------------------------------------------------------------------
    | Fuel Station requirement
    |--------------------------------------------------------------------------
    */
    if (station) {
        station.required = requireStation;
    }
    if (stationMark) {
        stationMark.hidden = !requireStation;
    }
}

function updateFuelHighCostWarning(settings) {
    const total = Number(document.getElementById("fuelTotalCost")?.value);
    const warning = document.getElementById("fuelHighCostWarning");
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
function getFuelRole() {
    return window.FleetRBAC?.getRole?.() || "";
}
function canCreateFuelRecord() {
    return window.FleetRBAC?.hasPermission?.("fuel", "canCreate") === true;
}
function isDriverFuelUser() {
    return getFuelRole() === "driver";
}
function setFuelFieldVisibility(fieldId, visible) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const wrapper = field.closest(".form-group");
    if (wrapper) {
        wrapper.hidden = !visible;
    }
    field.disabled = !visible;
}
function applyFuelAddRbac() {
    if (!isDriverFuelUser()) {
        return;
    }
    [
        "fuelVehicle",
        "fuelDriver",
        "fuelDriverId",
        "fuelPlate",
        "fuelCurrentFuel",
        "fuelTankCapacity",
    ].forEach((id) => {
        setFuelFieldVisibility(id, false);
    });
}

let fuelAddInitialized = false;
let availableFuelVehicles = [];

function formatFuelVehicleName(vehicle) {
    const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

    return [name, vehicle.vehicle_type].filter(Boolean).join(" - ");
}

function formatFuelLiters(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return "Not available";
    }

    return `${number.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} L`;
}

function formatFuelLevel(currentFuel, tankCapacity) {
    const fuel = Number(currentFuel);
    const tank = Number(tankCapacity);

    if (Number.isNaN(fuel) || Number.isNaN(tank) || tank <= 0) {
        return "Not available";
    }

    const percentage = Math.max(0, Math.min(100, (fuel / tank) * 100));

    return `${percentage.toFixed(0)}%`;
}


async function generateFuelRecordNumber() {
    try {
        const response = await fetch("/fuel-records/next-number", {
            headers: {
                Accept: "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to generate fuel record number.",
            );
        }

        return data.fuel_number || "";
    } catch (error) {
        console.error("FUEL NUMBER GENERATION ERROR:", error);

        return "";
    }
}


async function loadFuelVehicles() {
    if (isDriverFuelUser()) {
        return;
    }
    const vehicleSelect = document.getElementById("fuelVehicle");

    if (!vehicleSelect) {
        return;
    }

    vehicleSelect.innerHTML = '<option value="">Loading vehicles...</option>';

    try {
        const response = await fetch("/fleet", {
            headers: {
                Accept: "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load vehicles.");
        }

        const vehicles = data.vehicles || [];
        /*
        |--------------------------------------------------------------------------
        | Fuel Management currently handles liquid fuel vehicles.
        |--------------------------------------------------------------------------
        */
       // Just add Hybrid if needed
        availableFuelVehicles = vehicles.filter(
            (vehicle) =>
                ["Diesel", "Gasoline", "Premium Gasoline"].includes(
                    vehicle.fuel_type,
                ) &&
                Array.isArray(vehicle.drivers) &&
                vehicle.drivers.length > 0,
        );

        vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';

        availableFuelVehicles.forEach((vehicle) => {
            const option = document.createElement("option");

            option.value = vehicle.id;

            option.textContent = formatFuelVehicleName(vehicle);

            vehicleSelect.appendChild(option);
        });
    } catch (error) {
        console.error("FUEL VEHICLE LOAD ERROR:", error);

        vehicleSelect.innerHTML =
            '<option value="">Failed to load vehicles</option>';

        if (typeof showToast === "function") {
            showToast("Failed to load fuel vehicles.", "error");
        }
    }
}

function populateFuelVehicleDetails(vehicle) {
    const plateInput = document.getElementById("fuelPlate");
    const driverInput = document.getElementById("fuelDriver");
    const driverIdInput = document.getElementById("fuelDriverId");
    const fuelTypeSelect = document.getElementById("fuelType");
    const currentFuelInput = document.getElementById("fuelCurrentFuel");
    const tankCapacityInput = document.getElementById("fuelTankCapacity");
    const odometerInput = document.getElementById("fuelOdometer");

    if (!vehicle) {
        if (plateInput) {
            plateInput.value = "";
        }
        if (driverInput) {
            driverInput.value = "";
        }
        if (driverIdInput) {
            driverIdInput.value = "";
        }

        if (fuelTypeSelect) {
            fuelTypeSelect.value = "";
        }
        if (currentFuelInput) {
            currentFuelInput.value = "";
        }
        if (tankCapacityInput) {
            tankCapacityInput.value = "";
        }
        if (odometerInput) {
            odometerInput.value = "";
        }

        return;
    }

    plateInput.value = vehicle.plate_number || "";

    const driver = vehicle.drivers?.[0];

    if (driver) {
        driverInput.value = [driver.first_name, driver.last_name]
            .filter(Boolean)
            .join(" ");

        driverIdInput.value = driver.id;
    } else {
        driverInput.value = "No assigned driver";

        driverIdInput.value = "";
    }

    fuelTypeSelect.value = vehicle.fuel_type || "";
    fuelTypeSelect.disabled = true;
    currentFuelInput.value = formatFuelLiters(vehicle.current_fuel);
    tankCapacityInput.value = formatFuelLiters(vehicle.tank_capacity);

    /*
    |--------------------------------------------------------------------------
    | Use latest vehicle mileage as starting value.
    | User can only enter the new reading.
    |--------------------------------------------------------------------------
    */
    if (
        vehicle.current_odometer !== null &&
        vehicle.current_odometer !== undefined
    ) {
        odometerInput.placeholder = `Current: ${Number(
            vehicle.current_odometer,
        ).toLocaleString()} km`;
    }
}

function updateFuelTotalCost() {
    const quantity = Number(document.getElementById("fuelQuantity")?.value);

    const costPerLiter = Number(
        document.getElementById("fuelCostPerLiter")?.value,
    );

    const totalCostInput = document.getElementById("fuelTotalCost");

    if (!totalCostInput) {
        return;
    }

    if (Number.isNaN(quantity) || Number.isNaN(costPerLiter)) {
        totalCostInput.value = "";

        return;
    }

    totalCostInput.value = (quantity * costPerLiter).toFixed(2);
}

async function initFuelAdd() {
    if (!canCreateFuelRecord()) {
        return;
    }
    const form = document.getElementById("fuelForm");

    if (!form || form.dataset.fuelAddInitialized === "true") {
        return;
    }

    const fuelSettings = await window.getFuelModuleSettings();

    applyFuelAddSettings(fuelSettings);
    applyFuelAddRbac();

    fuelAddInitialized = true;
    form.dataset.fuelAddInitialized = "true";
    const vehicleSelect = document.getElementById("fuelVehicle");
    const quantityInput = document.getElementById("fuelQuantity");
    const costPerLiterInput = document.getElementById("fuelCostPerLiter");
    /*
    |--------------------------------------------------------------------------
    | Generate record number
    |--------------------------------------------------------------------------
    */
    const fuelNumberInput = document.getElementById("fuelNumber");
    /*
    |--------------------------------------------------------------------------
    | Load Vehicles
    |--------------------------------------------------------------------------
    */
    loadFuelVehicles();
    /*
    |--------------------------------------------------------------------------
    | Vehicle change
    |--------------------------------------------------------------------------
    */
    vehicleSelect?.addEventListener("change", () => {
        const vehicleId = vehicleSelect.value;

        const vehicle = availableFuelVehicles.find(
            (item) => String(item.id) === String(vehicleId),
        );

        populateFuelVehicleDetails(vehicle || null);
    });
    /*
    |--------------------------------------------------------------------------
    | Cost calculation
    |--------------------------------------------------------------------------
    */
    const recalculateFuelCost = () => {
        updateFuelTotalCost();
        updateFuelHighCostWarning(fuelSettings);
    };
    quantityInput?.addEventListener("input", recalculateFuelCost);
    costPerLiterInput?.addEventListener("input", recalculateFuelCost);
    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (form.dataset.submitting === "true") {
            return;
        }
        if (typeof validateFuelForm === "function" && !validateFuelForm(form)) {
            return;
        }

        const role = getFuelRole();
        const vehicleId = vehicleSelect?.value || null;
        const driverId = document.getElementById("fuelDriverId")?.value || null;
        if (role !== "driver") {
            if (!vehicleId) {
                showToast?.("Please select a vehicle.", "error");
                return;
            }
            if (!driverId) {
                showToast?.(
                    "The selected vehicle has no assigned driver.",
                    "error",
                );
                return;
            }
        }

        form.dataset.submitting = "true";

        const saveButton = document.getElementById("saveFuelBtn");

        if (saveButton) {
            saveButton.disabled = true;

            saveButton.textContent = "Saving...";
        }

        try {
            const payload = {
                fuel_number: document
                    .getElementById("fuelNumber")
                    ?.value.trim(),
                fuel_amount: document.getElementById("fuelQuantity")?.value,
                cost_per_liter:
                    document.getElementById("fuelCostPerLiter")?.value,
                odometer:
                    document.getElementById("fuelOdometer")?.value || null,
                date: document.getElementById("fuelRefuelDate")?.value,
                refuel_time:
                    document.getElementById("fuelRefuelTime")?.value || null,
                fuel_station:
                    document.getElementById("fuelStation")?.value || null,
                receipt_number:
                    document.getElementById("fuelReceipt")?.value.trim() ||
                    null,
                payment_method:
                    document.getElementById("fuelPayment")?.value || null,
                notes:
                    document.getElementById("fuelNotes")?.value.trim() || null,
            };
            if (role !== "driver") {
                payload.vehicle_id = vehicleId;
                payload.driver_id = driverId;
                payload.fuel_type = document.getElementById("fuelType")?.value;
            }

            const response = await fetch("/fuel-records", {
                method: "POST",
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
                    firstError || data.message || "Failed to save fuel record.",
                );
            }
            /*
                |--------------------------------------------------------------------------
                | Reload real database records
                |--------------------------------------------------------------------------
                */
            if (typeof loadFuelRecords === "function") {
                await loadFuelRecords();
            }
            if (typeof loadFuelVehicles === "function") {
                await loadFuelVehicles();
            }

            form.reset();

            applyFuelAddSettings(fuelSettings);
            applyFuelAddRbac();

            updateFuelHighCostWarning(fuelSettings);

            populateFuelVehicleDetails(null);
            updateFuelTotalCost();

            clearAllFuelErrors?.(form);
            /*
                |--------------------------------------------------------------------------
                | Generate a new number for the next record
                |--------------------------------------------------------------------------
                */

            if (typeof closeAddFuelModal === "function") {
                closeAddFuelModal();
            }

            if (typeof refreshFuelTable === "function") {
                refreshFuelTable({
                    resetPage: false,
                    refreshStatistics: true,
                    reason: "add",
                });
            }
            if (typeof updateFuelStatistics === "function") {
                updateFuelStatistics();
            }

            showToast?.(
                data.message || "Fuel record saved successfully.",
                "success",
            );
        } catch (error) {
            console.error("FUEL CREATE ERROR:", error);

            showToast?.(
                error.message || "Unable to save fuel record.",
                "error",
            );
        } finally {
            form.dataset.submitting = "false";

            if (saveButton) {
                saveButton.disabled = false;

                saveButton.textContent = "Save Fuel Record";
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initFuelAdd();
});
