/* ==========================================
   Fuel Table
========================================== */

let fuelLiveUpdateInterval = null;
let fuelLiveUpdateRunning = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadFuelRecords();
    startFuelLiveUpdates();
});


async function loadFuelRecords() {
    try {
        const response = await fetch("/fuel-records", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to load fuel records.");
        }
        const fuelLogs = Array.isArray(data.fuelLogs)
            ? data.fuelLogs
            : Array.isArray(data)
              ? data
              : [];
        renderFuelTable(fuelLogs);
        if (typeof updateFuelStatistics === "function") {
            updateFuelStatistics(fuelLogs);
        }
        if (typeof refreshFuelBulkState === "function") {
            refreshFuelBulkState();
        }
        return fuelLogs;
    } catch (error) {
        console.error("FUEL LOAD ERROR:", error);

        return [];
    }
}

function startFuelLiveUpdates() {
    if (fuelLiveUpdateInterval) {
        return;
    }
    fuelLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (fuelLiveUpdateRunning) {
            return;
        }
        fuelLiveUpdateRunning = true;
        try {
            await loadFuelRecords();
        } catch (error) {
            console.error("Fuel live update failed:", error);
        } finally {
            fuelLiveUpdateRunning = false;
        }
    }, 10000);
}

function formatFuelTableDate(date) {
    if (!date) {
        return "—";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatFuelTableQuantity(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return "0.00 L";
    }

    return (
        number.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }) + " L"
    );
}

function formatFuelTableCurrency(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return "₱0.00";
    }

    return (
        "₱" +
        number.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    );
}

function formatFuelTableOdometer(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return "0 km";
    }

    return (
        number.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }) + " km"
    );
}

function getFuelVehicleName(vehicle) {
    if (!vehicle) {
        return "";
    }

    return [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
}

function getFuelVehicleType(vehicle) {
    return vehicle?.vehicle_type || "";
}

function formatFuelDriverName(driver) {
    if (!driver) {
        return "Not Assigned";
    }

    return (
        [driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
        "Not Assigned"
    );
}

function renderFuelTable(fuelLogs) {
    const tableBody = document.getElementById("fuelTableBody");

    if (!tableBody) {
        return;
    }

    const canUpdate =
        window.FleetRBAC?.hasPermission?.("fuel", "canUpdate") === true;

    let html = "";

    fuelLogs.forEach((fuel) => {
        const vehicle = fuel.vehicle || null;
        const driver = fuel.driver || null;
        const vehicleName = getFuelVehicleName(vehicle);
        const vehicleType = getFuelVehicleType(vehicle);
        const driverName = formatFuelDriverName(driver);
        const plateNumber = vehicle?.plate_number || "—";
        const refuelDate = fuel.date || "";
        const refuelTime = fuel.refuel_time || "";
        const fuelNumber = fuel.fuel_number || "";
        const fuelAmount = fuel.fuel_amount ?? 0;
        const costPerLiter = fuel.cost_per_liter ?? 0;
        const totalCost = fuel.cost ?? 0;
        const odometer = fuel.odometer ?? 0;
        const fuelType = fuel.fuel_type || "";
        const station = fuel.fuel_station || "Not provided";
        const receipt = fuel.receipt_number || "";
        const payment = fuel.payment_method || "";
        const notes = fuel.notes || "";
        const fuelId = fuel.id ?? "";

        html += `
                <tr
                    data-id="${fuelId}"
                    data-fuel-id="${fuelId}"
                    data-fuel-number="${fuelNumber}"
                    data-refuel-date="${refuelDate}"
                    data-refuel-time="${refuelTime}"
                    data-vehicle-id="${fuel.vehicle_id ?? ""}"
                    data-driver-id="${fuel.driver_id ?? ""}"
                    data-vehicle="${vehicleName}"
                    data-vehicle-type="${vehicleType}"
                    data-plate="${plateNumber}"
                    data-driver="${driverName}"
                    data-fuel-type="${fuelType}"
                    data-quantity="${fuelAmount}"
                    data-cost-per-liter="${costPerLiter}"
                    data-total-cost="${totalCost}"
                    data-odometer="${odometer}"
                    data-station="${station}"
                    data-receipt="${receipt}"
                    data-payment="${payment}"
                    data-notes="${notes}"
                    data-fuel-matches-filter="true"
                    data-matches-filter="true"
                >

                    <!-- Checkbox -->
                    <td>
                        
                    </td>

                    <!-- Fuel Record Number -->
                    <td>
                        <span class="fuel-number">
                            ${fuelNumber}
                        </span>
                    </td>

                    <!-- Date -->
                    <td>
                        <span class="fuel-date">
                            ${formatFuelTableDate(refuelDate)}
                        </span>
                    </td>

                    <!-- Vehicle -->
                    <td>
                        <span class="fuel-vehicle">
                            <span class="fuel-vehicle-name">${vehicleName}</span>
                            <small class="fuel-vehicle-type">${vehicleType}</small>
                        </span>
                    </td>

                    <!-- Plate -->
                    <td>
                        <span class="fuel-plate">
                            ${plateNumber}
                        </span>
                    </td>

                    <!-- Driver -->
                    <td>
                        <span class="fuel-driver">
                            ${driverName}
                        </span>
                    </td>

                    <!-- Fuel Type -->
                    <td>
                        <span class="fuel-type">
                            ${fuelType}
                        </span>
                    </td>

                    <!-- Quantity -->
                    <td>
                        <span class="fuel-quantity">
                            ${formatFuelTableQuantity(fuelAmount)}
                        </span>
                    </td>

                    <!-- Cost / Liter -->
                    <td>
                        <span class="fuel-cost-per-liter">
                            ${formatFuelTableCurrency(costPerLiter)}
                        </span>
                    </td>

                    <!-- Total Cost -->
                    <td>
                        <span class="fuel-total-cost">
                            ${formatFuelTableCurrency(totalCost)}
                        </span>
                    </td>

                    <!-- Odometer -->
                    <td>
                        <span class="fuel-odometer">
                            ${formatFuelTableOdometer(odometer)}
                        </span>
                    </td>

                    <!-- Fuel Station -->
                    <td>
                        <span class="fuel-station">
                            ${station}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="action-btn view-fuel"
                                data-id="${fuelId}"
                                data-fuel-id="${fuelId}"
                                aria-label="View ${fuelNumber}"
                            >
                                <i class="ph ph-eye"></i>
                            </button>

                            ${
                                canUpdate
                                    ? `
                                        <button
                                            type="button"
                                            class="action-btn edit-fuel"
                                            data-id="${fuelId}"
                                            data-fuel-id="${fuelId}"
                                            aria-label="Edit ${fuelNumber}"
                                        >
                                            <i class="ph ph-pencil-simple"></i>
                                        </button>
                                    `
                                    : ""
                            }
                        </div>
                    </td>

                </tr>
            `;
    });

    tableBody.innerHTML = html;

    if (typeof populateFuelVehicleFilter === "function") {
        populateFuelVehicleFilter();
    }

    if (typeof refreshFuelTable === "function") {
        refreshFuelTable({
            resetPage: true,
            refreshStatistics: false,
            reason: "load",
        });
    }

    if (typeof refreshFuelBulkState === "function") {
        refreshFuelBulkState();
    }
    /*
    if (typeof updateFuelStatistics === "function") {
        updateFuelStatistics();
    }
    */
}


function refreshFuelRecords() {
    return loadFuelRecords();
}
