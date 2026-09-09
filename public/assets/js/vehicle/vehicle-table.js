/* ==========================================
   Vehicle Table 
========================================== */

let vehicleLiveUpdateInterval = null;
let vehicleLiveUpdateRunning = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadVehicles();
    startVehicleLiveUpdates();
});

async function loadVehicles() {
    try {
        const response = await fetch("/fleet", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to load vehicles.");
        }
        const vehicles = Array.isArray(data.vehicles)
            ? data.vehicles
            : Array.isArray(data)
              ? data
              : [];
        renderVehicleTable(vehicles);
        if (typeof updateVehicleStats === "function") {
            updateVehicleStats();
        }
        return vehicles;
    } catch (error) {
        console.error("VEHICLE LOAD ERROR:", error);

        return [];
    }
}

function startVehicleLiveUpdates() {
    if (vehicleLiveUpdateInterval) {
        return;
    }
    vehicleLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (vehicleLiveUpdateRunning) {
            return;
        }
        vehicleLiveUpdateRunning = true;
        try {
            await loadVehicles();
        } catch (error) {
            console.error("Vehicle live update failed:", error);
        } finally {
            vehicleLiveUpdateRunning = false;
        }
    }, 10000);
}

function getVehicleStatusClass(status) {
    const value = (status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "");

    if (value === "available") return "available";
    if (value === "ontrip") return "trip";
    if (value === "maintenance") return "maintenance";

    return "out";
}

function getVehicleIcon(type) {
    switch (type) {
        case "Ambulance":
            return "ph-fill ph-ambulance";

        case "Patient Van":
        case "Van":
            return "ph-fill ph-van";

        case "Motorcycle":
            return "ph-fill ph-motorcycle";

        case "SUV":
        case "Car":
            return "ph-fill ph-car";

        default:
            return "ph-fill ph-car";
    }
}

function getVehicleDriverInitials(driverName) {
    if (!driverName || driverName === "Not Assigned") {
        return "";
    }

    return driverName
        .split(" ")
        .filter(Boolean)
        .map((name) => name.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

function formatVehicleLastService(date) {
    if (!date) {
        return "---";
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return "---";
    }
    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/* ==========================================
   Fuel Level
========================================== */

function calculateVehicleFuelLevel(currentFuel, tankCapacity) {
    const fuel = Number(currentFuel);
    const tank = Number(tankCapacity);

    if (Number.isNaN(fuel) || Number.isNaN(tank) || tank <= 0) {
        return null;
    }

    return Math.max(0, Math.min(100, (fuel / tank) * 100));
}

function formatVehicleFuelLevel(currentFuel, tankCapacity) {
    const level = calculateVehicleFuelLevel(currentFuel, tankCapacity);

    if (level === null) {
        return "N/A";
    }

    return `${level.toFixed(0)}%`;
}

/* ==========================================
   Render Table
========================================== */

function renderVehicleTable(vehicles) {
    const tableBody = document.getElementById("vehicleTableBody");

    if (!tableBody) return;

    const canUpdate =
        window.FleetRBAC?.hasPermission("vehicles", "canUpdate") === true;
    const canDelete =
        window.FleetRBAC?.hasPermission("vehicles", "canDelete") === true;
    const canBulkDelete =
        window.FleetRBAC?.hasPermission("vehicles", "canBulkDelete") === true;

    let html = "";

    vehicles.forEach((vehicle) => {
        const badgeClass = getVehicleStatusClass(vehicle.status);
        const vehicleIcon = getVehicleIcon(vehicle.vehicle_type);
        const driverName = vehicle.driver_name ?? "Not Assigned";
        const initials = getVehicleDriverInitials(driverName);
        const tankCapacity = vehicle.tank_capacity ?? "";
        const currentFuel = vehicle.current_fuel ?? "";
        const currentOdometer = vehicle.current_odometer ?? "";
        const fuelLevel = formatVehicleFuelLevel(currentFuel, tankCapacity);
        html += `
            <tr
                data-id="${vehicle.id ?? ""}"
                data-brand="${vehicle.brand ?? ""}"
                data-model="${vehicle.model ?? ""}"
                data-plate-number="${vehicle.plate_number ?? ""}"
                data-vehicle-type="${vehicle.vehicle_type ?? ""}"
                data-department="${vehicle.department ?? ""}"
                data-driver-name="${driverName}"
                data-driver-license="${vehicle.driver_license ?? ""}"
                data-status="${vehicle.status ?? ""}"
                data-capacity="${vehicle.capacity ?? ""}"
                data-fuel-type="${vehicle.fuel_type ?? ""}"
                data-tank-capacity="${tankCapacity}"
                data-current-fuel="${currentFuel}"
                data-fuel-level="${fuelLevel}"
                data-current-odometer="${currentOdometer}"
                data-last-service="${formatVehicleLastService(vehicle.last_service)}"
                data-notes="${vehicle.notes ?? ""}"
            >
                <td>
                    ${
                        canBulkDelete
                            ? `
                                <input
                                    type="checkbox"
                                    class="vehicle-checkbox"
                                    data-id="${vehicle.id ?? ""}"
                                >
                            `
                            : ""
                    }
                </td>
                <td>
                    <div class="vehicle-info">
                        <div class="vehicle-avatar">
                            <i class="${vehicleIcon}"></i>
                        </div>
                        <div>
                            <div class="vehicle-name">
                                ${vehicle.brand ?? ""}
                                ${vehicle.model ?? ""}
                            </div>
                            <small>
                                Emergency Response Unit
                            </small>
                        </div>
                    </div>
                </td>
                <td>
                    ${vehicle.plate_number ?? ""}
                </td>
                <td>
                    ${vehicle.vehicle_type ?? ""}
                </td>
                <td>
                    <div class="driver-info">
                        <div class="driver-avatar">
                            ${initials}
                        </div>
                        <span>
                            ${driverName}
                        </span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        ${vehicle.status ?? ""}
                    </span>
                </td>
                <td>
                    <div class="fuel-progress">
                        <div class="fuel-progress-bar">
                            <div
                                class="fuel-progress-fill"
                                style="width: ${fuelLevel === "N/A" ? 0 : fuelLevel}"
                            ></div>
                        </div>
                        <span>${fuelLevel}</span>
                    </div>
                </td>
                <td>
                    ${formatVehicleLastService(vehicle.last_service)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="action-btn view"
                            data-id="${vehicle.id}"
                            title="View">
                            <i class="ph ph-eye"></i>
                        </button>
                        ${
                            canUpdate
                                ? `
                                    <button
                                        type="button"
                                        class="action-btn edit"
                                        data-id="${vehicle.id}"
                                        title="Edit">
                                        <i class="ph ph-pencil-simple"></i>
                                    </button>
                                `
                                : ""
                        }
                        ${
                            canDelete
                                ? `
                                    <button
                                        type="button"
                                        class="action-btn delete"
                                        data-id="${vehicle.id}"
                                        title="Delete">
                                        <i class="ph ph-trash"></i>
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

    if (typeof refreshVehicleBulkState === "function") {
        refreshVehicleBulkState();
    }

    if (typeof initVehiclePagination === "function") {
        initVehiclePagination();
    }

    if (typeof applyVehicleFilters === "function") {
        applyVehicleFilters();
    }
}
