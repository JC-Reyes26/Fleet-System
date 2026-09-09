/* ==========================================
   Driver Table 
========================================== */
let driverLiveUpdateInterval = null;
let driverLiveUpdateRunning = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadDrivers();
    startDriverLiveUpdates();
});

async function loadDrivers() {
    try {
        const response = await fetch("/drivers", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to load drivers.");
        }
        const drivers = Array.isArray(data)
            ? data
            : Array.isArray(data.drivers)
              ? data.drivers
              : [];
        renderDriverTable(drivers);
        if (typeof updateDriverStats === "function") {
            updateDriverStats();
        }
        return drivers;
    } catch (error) {
        console.error("DRIVER LOAD ERROR:", error);
        return [];
    }
}

function startDriverLiveUpdates() {
    if (driverLiveUpdateInterval) {
        return;
    }
    driverLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (driverLiveUpdateRunning) {
            return;
        }
        driverLiveUpdateRunning = true;
        try {
            await loadDrivers();
        } catch (error) {
            console.error("Driver live update failed:", error);
        } finally {
            driverLiveUpdateRunning = false;
        }
    }, 10000);
}

function getDriverStatusClass(status) {
    const value = (status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "");

    if (value === "available") return "available";
    if (value === "onduty") return "trip";
    if (value === "onleave") return "maintenance";

    return "out";

}

function getDriverInitials(firstName, lastName) {

    return (
        (firstName?.charAt(0) || "") +
        (lastName?.charAt(0) || "")
    ).toUpperCase();

}

function renderDriverTable(drivers) {
    const canUpdate =
        window.FleetRBAC?.hasPermission?.("drivers", "canUpdate") === true;
    const canDelete =
        window.FleetRBAC?.hasPermission?.("drivers", "canDelete") === true;
    const canBulkDelete =
        window.FleetRBAC?.hasPermission?.("drivers", "canBulkDelete") === true;

    const tableBody = document.getElementById("driverTableBody");

    if (!tableBody) return;

    let html = "";
    drivers.forEach(driver => {

        const badgeClass = getDriverStatusClass(driver.status);

        html += `
        <tr
            data-id="${driver.id}"
            data-driver-number="${driver.driver_number ?? ""}"
            data-first-name="${driver.first_name ?? ""}"
            data-last-name="${driver.last_name ?? ""}"
            data-license-number="${driver.license_number ?? ""}"
            data-license-class="${driver.license_class ?? ""}"
            data-license-expiry="${driver.license_expiry ?? ""}"
            data-contact-number="${driver.contact_number ?? ""}"
            data-email="${driver.email ?? ""}"
            data-experience="${driver.experience ?? ""}"
            data-address="${driver.address ?? ""}"
            data-emergency-contact="${driver.emergency_contact ?? ""}"
            data-notes="${driver.notes ?? ""}"
            data-status="${driver.status ?? ""}"
            data-assigned-vehicle-id="${driver.assigned_vehicle_id ?? ""}"
            data-vehicle="${driver.vehicle ? `${driver.vehicle.brand ?? ""} ${driver.vehicle.model ?? ""} — ${driver.vehicle.vehicle_type ?? ""}`.trim() : "Unassigned"}"
            data-photo="${driver.photo ?? ""}"
        >
            <td>
                ${
                    canBulkDelete
                        ? `
                            <input
                                type="checkbox"
                                class="driver-checkbox"
                                data-id="${driver.id}"
                            >
                        `
                        : ""
                }
            </td>

            <td>
                <div class="driver-info">
                    <div class="driver-avatar">
                        ${getDriverInitials(
                            driver.first_name,
                            driver.last_name,
                        )}
                    </div>
                    <div>
                        <div class="driver-name">
                            ${driver.first_name}
                            ${driver.last_name}
                        </div>
                        <small>
                            Fleet Driver
                        </small>
                    </div>
                </div>
            </td>

            <td>
                ${driver.driver_number ?? "—"}
            </td>

            <td>
                ${driver.license_number}
            </td>

            <td>
                ${driver.license_class}
            </td>

            <td>
                ${
                    driver.vehicle
                        ? `
                    <span class="fuel-vehicle">
                            <span class="fuel-vehicle-name">
                                ${driver.vehicle.brand ?? ""}
                                ${driver.vehicle.model ?? ""}
                            </span>
                            <small class="fuel-vehicle-type">
                                ${driver.vehicle.vehicle_type ?? ""}
                            </small>
                    </span>
                `
                        : "Unassigned"
                }
            </td>

            <td>
                <span class="status-badge ${badgeClass}">
                    ${driver.status}
                </span>
            </td>

            <td>
                ${driver.contact_number}
            </td>

            <td>
                <div class="action-buttons">
                    <button
                        type="button"
                        class="action-btn view"
                        data-id="${driver.id}"
                        title="View Driver"
                    >
                        <i class="ph ph-eye"></i>
                    </button>
                    ${
                        canUpdate
                            ? `
                                <button
                                    type="button"
                                    class="action-btn edit"
                                    data-id="${driver.id}"
                                    title="Edit Driver"
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
                                    class="action-btn delete"
                                    data-id="${driver.id}"
                                    title="Delete Driver"
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

    if (typeof applyDriverFilters === "function") {
        applyDriverFilters();
    }
    if (typeof refreshDriverPagination === "function") {
        refreshDriverPagination();
    }

    if (typeof refreshDriverBulkState === "function") {
        refreshDriverBulkState();
    }
    else if (typeof initDriverPagination === "function") {
        initDriverPagination();
    }

}

