/* ==========================================
   Maintenance Table :)
========================================== */

let maintenanceLiveUpdateInterval = null;
let maintenanceLiveUpdateRunning = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadMaintenances();
    startMaintenanceLiveUpdates();
});

async function loadMaintenances() {
    try {
        const response = await fetch("/maintenance", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load maintenance records.",
            );
        }
        const maintenances = Array.isArray(data.maintenances)
            ? data.maintenances
            : Array.isArray(data)
              ? data
              : [];
        renderMaintenanceTable(maintenances);
        if (typeof updateMaintenanceStatistics === "function") {
            updateMaintenanceStatistics();
        }
        if (typeof updateMaintenancePagination === "function") {
            updateMaintenancePagination();
        }
        return maintenances;
    } catch (error) {
        console.error("MAINTENANCE LOAD ERROR:", error);

        return [];
    }
}

function startMaintenanceLiveUpdates() {
    if (maintenanceLiveUpdateInterval) {
        return;
    }

    maintenanceLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (maintenanceLiveUpdateRunning) {
            return;
        }
        maintenanceLiveUpdateRunning = true;
        try {
            await loadMaintenances();
        } catch (error) {
            console.error("Maintenance live update failed:", error);
        } finally {
            maintenanceLiveUpdateRunning = false;
        }
    }, 10000);
}

function getMaintenanceStatusClass(status) {
    const value = (status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "");

    if (value === "scheduled") {
        return "scheduled";
    }

    if (value === "inprogress") {
        return "trip";
    }

    if (value === "completed") {
        return "completed";
    }

    if (value === "cancelled") {
        return "cancelled";
    }

    return "out";
}


function formatMaintenanceDate(date) {
    if (!date) {
        return "—";
    }

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}


function formatMaintenanceCost(cost) {
    const value = Number(cost);

    if (isNaN(value)) {
        return "₱0.00";
    }

    return (
        "₱" +
        value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    );
}


function formatMaintenanceVehicle(vehicle) {
    if (!vehicle) {
        return "Unassigned";
    }

    const vehicleName = [vehicle.brand, vehicle.model]
        .filter(Boolean)
        .join(" ");
    const vehicleType = vehicle.vehicle_type || "";

    return (
        [vehicleName, vehicleType].filter(Boolean).join(" - ") || "Unassigned"
    );
}


function renderMaintenanceTable(maintenances) {
    const tableBody = document.getElementById("maintenanceTableBody");

    if (!tableBody) {
        return;
    }

    const canUpdate =
        window.FleetRBAC?.hasPermission?.("maintenance", "canUpdate") === true;
    const canDelete =
        window.FleetRBAC?.hasPermission?.("maintenance", "canDelete") === true;
    const canBulkDelete =
        window.FleetRBAC?.hasPermission?.("maintenance", "canBulkDelete") ===
        true;

    let html = "";

    maintenances.forEach((maintenance) => {
        const vehicle = maintenance.vehicle || null;
        const vehicleName = formatMaintenanceVehicle(vehicle);
        const status = maintenance.status || "";
        const statusClass = getMaintenanceStatusClass(status);
        const scheduledDate = maintenance.maintenance_date || "";
        const completionDate = maintenance.completion_date || "";
        const cost = formatMaintenanceCost(maintenance.cost);

        html += `
                <tr
                    data-id="${maintenance.id ?? ""}"
                    data-vehicle-id="${maintenance.vehicle_id ?? ""}"
                    data-maintenance-number="${maintenance.maintenance_number ?? ""}"
                    data-scheduled-date="${scheduledDate}"
                    data-completion-date="${completionDate}"
                    data-priority="${maintenance.priority ?? ""}"
                    data-odometer="${maintenance.odometer ?? ""}"
                    data-description="${maintenance.description ?? ""}"
                    data-parts-used="${maintenance.parts_used ?? ""}"
                    data-notes="${maintenance.notes ?? ""}"
                    data-cost="${maintenance.cost ?? 0}"
                    data-status="${status}"
                >

                    <!-- Checkbox -->
                    <td>
                        ${
                            canBulkDelete
                                ? `
                                    <input
                                        type="checkbox"
                                        class="maintenance-checkbox"
                                        data-id="${maintenance.id ?? ""}"
                                        aria-label="Select ${maintenance.maintenance_number ?? ""}"
                                    />
                                `
                                : ""
                        }
                    </td>

                    <!-- Maintenance Number -->
                    <td>
                        <span class="maintenance-number">
                            ${maintenance.maintenance_number ?? ""}
                        </span>
                    </td>

                    <!-- Vehicle -->
                    <td>
                        <span class="maintenance-vehicle">
                            ${vehicleName}
                        </span>
                    </td>

                    <!-- Service Type -->
                    <td>
                        <span class="maintenance-service-type">
                            ${maintenance.maintenance_type ?? ""}
                        </span>
                    </td>

                    <!-- Technician -->
                    <td>
                        <span class="maintenance-technician">
                            ${maintenance.technician ?? "Not provided"}
                        </span>
                    </td>

                    <!-- Scheduled Date -->
                    <td>
                        <span class="maintenance-scheduled-date">
                            ${formatMaintenanceDate(scheduledDate)}
                        </span>
                    </td>

                    <!-- Completion Date -->
                    <td>
                        <span class="maintenance-completion-date">
                            ${
                                completionDate
                                    ? formatMaintenanceDate(completionDate)
                                    : "—"
                            }
                        </span>
                    </td>

                    <!-- Cost -->
                    <td>
                        <span class="maintenance-cost">
                            ${cost}
                        </span>
                    </td>

                    <!-- Priority -->
                    <td>
                        <span class="maintenance-priority">
                            ${maintenance.priority ?? ""}
                        </span>
                    </td>

                    <!-- Status -->
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${status}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="action-btn view-maintenance"
                                data-id="${maintenance.id ?? ""}"
                                aria-label="View ${maintenance.maintenance_number ?? ""}"
                            >
                                <i class="ph ph-eye"></i>
                            </button>
                            ${
                                canUpdate
                                    ? `
                                        <button
                                            type="button"
                                            class="action-btn edit-maintenance"
                                            data-id="${maintenance.id ?? ""}"
                                            aria-label="Edit ${maintenance.maintenance_number ?? ""}"
                                        >
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
                                            class="action-btn delete-maintenance"
                                            data-id="${maintenance.id ?? ""}"
                                            aria-label="Delete ${maintenance.maintenance_number ?? ""}"
                                        >
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

    if (typeof refreshMaintenanceBulkState === "function") {
        refreshMaintenanceBulkState();
    }
    if (typeof initMaintenancePagination === "function") {
        initMaintenancePagination();
    }
    if (typeof updateMaintenanceStatistics === "function") {
        updateMaintenanceStatistics();
    }
}
