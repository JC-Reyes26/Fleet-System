/* ==========================================
   HIMS Fleet - Dispatch Table

   Purpose:
   - Load Dispatch records from Laravel/MySQL
   - Display final planned route from RoutePlan
   - Display actual Dispatch schedule
   - Preserve existing filters / pagination / bulk tools
========================================== */

let dispatchLiveUpdateInterval = null;
let dispatchLiveUpdateRunning = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadDispatches();
    startDispatchLiveUpdates();
});

document.addEventListener("DOMContentLoaded", () => {
    const showArchived = document.getElementById("showArchivedDispatches");
    showArchived?.addEventListener("change", async () => {
        await loadDispatches();
    });
});

async function loadDispatches() {
    try {
        const showArchived =
            document.getElementById("showArchivedDispatches")?.checked === true;
        const url = showArchived ? "/dispatch?show_archived=1" : "/dispatch";
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }
        if (!response.ok) {
            throw new Error(data.message || "Failed to load dispatches.");
        }
        const dispatches = Array.isArray(data.dispatches)
            ? data.dispatches
            : [];
        renderDispatchTable(dispatches);
        if (typeof updateDispatchStatistics === "function") {
            updateDispatchStatistics(dispatches);
        }
        if (typeof refreshDispatchPagination === "function") {
            refreshDispatchPagination();
        }
        updateDispatchBulkSelectionVisibility();
        return dispatches;
    } catch (error) {
        console.error("Error loading dispatches:", error);
        const tableBody = document.getElementById("dispatchTableBody");
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11">
                        Unable to load dispatch records.
                    </td>
                </tr>
            `;
        }
        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to load dispatch records.",
                "error",
            );
        }
        return [];
    }
}

function startDispatchLiveUpdates() {
    if (dispatchLiveUpdateInterval) {
        return;
    }
    dispatchLiveUpdateInterval = window.setInterval(async () => {
        if (document.hidden) {
            return;
        }
        if (dispatchLiveUpdateRunning) {
            return;
        }
        dispatchLiveUpdateRunning = true;
        try {
            await loadDispatches();
        } catch (error) {
            console.error("Dispatch live update failed:", error);
        } finally {
            dispatchLiveUpdateRunning = false;
        }
    }, 10000);
}

/* ==========================================
   RELATIONSHIP HELPERS
========================================== */

function getDispatchRoutePlan(reservation) {
    return reservation?.route_plan || reservation?.routePlan || null;
}

function getDispatchTableVehicleLabel(vehicle) {
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

function getDispatchTableDriverLabel(driver) {
    if (!driver) {
        return "Unassigned";
    }

    const fullName = [driver.first_name, driver.last_name]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || driver.name || "Unassigned";
}

/* ==========================================
   STATUS CLASS
========================================== */

function getDispatchStatusClass(status) {
    const value = String(status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "");

    if (value === "pending") {
        return "pending";
    }

    if (value === "assigned") {
        return "scheduled";
    }

    if (value === "enroute") {
        return "trip";
    }

    if (value === "arrived") {
        return "approved";
    }

    if (value === "completed") {
        return "completed";
    }

    if (value === "cancelled") {
        return "cancelled";
    }

    return "out";
}

/* ==========================================
   SCHEDULE FORMATTER
========================================== */

function formatDispatchSchedule(date, time) {
    if (!date) {
        return "—";
    }
    const cleanDate = String(date).slice(0, 10);
    const cleanTime = String(time || "").slice(0, 5);
    const iso = cleanTime ? `${cleanDate}T${cleanTime}` : `${cleanDate}T00:00`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return "—";
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

function updateDispatchBulkSelectionVisibility() {
    const selectAll = document.getElementById("selectAllDispatches");
    const toolbar = document.getElementById("dispatchBulkToolbar");
    const showArchived =
        document.getElementById("showArchivedDispatches")?.checked === true;
    if (selectAll) {
        selectAll.hidden = showArchived;
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }
    if (showArchived) {
        if (typeof clearDispatchSelection === "function") {
            clearDispatchSelection();
        }
        if (toolbar) {
            toolbar.classList.remove("show");
        }
    }
}

function escapeDispatchHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderDispatchTable(dispatches) {
    const tableBody = document.getElementById("dispatchTableBody");

    if (!tableBody) {
        return;
    }

    const canUpdate =
        window.FleetRBAC?.hasPermission?.("dispatch", "canUpdate") === true;
    const canArchive =
        window.FleetRBAC?.hasPermission?.("dispatch", "canArchive") === true;
    const canBulkArchive =
        window.FleetRBAC?.hasPermission?.("dispatch", "canBulkArchive") ===
        true;
    const canRestore =
        window.FleetRBAC?.hasPermission?.("dispatch", "canRestore") === true;

    if (!Array.isArray(dispatches) || dispatches.length === 0) {
        tableBody.innerHTML = "";
        if (typeof applyDispatchFilters === "function") {
            applyDispatchFilters({
                resetPage: false,
            });
        }
        if (typeof refreshDispatchBulkState === "function") {
            refreshDispatchBulkState();
        }
        if (typeof initDispatchPagination === "function") {
            initDispatchPagination();
        }
        if (typeof refreshDispatchPagination === "function") {
            refreshDispatchPagination({
                reset: false,
            });
        } else if (typeof updateDispatchPagination === "function") {
            updateDispatchPagination();
        }
        return;
    }

    let html = "";

    dispatches.forEach((dispatch) => {
        const reservation = dispatch.reservation || {};
        const routePlan = getDispatchRoutePlan(reservation);
        const vehicle = reservation.vehicle || null;
        const driver = reservation.driver || null;
        const patientName = reservation.patient_name || "N/A";
        const requestType = reservation.request_type || "N/A";
        const reservationNumber = reservation.reservation_number || "N/A";
        const vehicleText = getDispatchTableVehicleLabel(vehicle);
        const driverText = getDispatchTableDriverLabel(driver);
        const pickup = routePlan?.origin || reservation.pickup_location || "";
        const destination =
            routePlan?.destination || reservation.destination || "";
        const scheduleDate = String(
            dispatch.dispatch_date || routePlan?.departure_date || "",
        ).slice(0, 10);
        const scheduleTime = String(
            dispatch.departure_time || routePlan?.departure_time || "",
        ).slice(0, 5);
        const priority = routePlan?.priority || reservation.priority || "";
        const status = dispatch.trip_status || "Pending";
        const remarks = dispatch.remarks || "";
        const contact = reservation.contact_number || "";
        const statusClass = getDispatchStatusClass(status);
        const canEdit =
            canUpdate &&
            !dispatch.archived_at &&
            !["Completed", "Cancelled"].includes(status);
        const isArchived = Boolean(dispatch.archived_at);
        const canArchiveThisDispatch = canArchive && !isArchived;
        const safeDispatchNumber = escapeDispatchHtml(
            dispatch.dispatch_number || "N/A",
        );
        const safeReservationNumber = escapeDispatchHtml(reservationNumber);
        const safePatientName = escapeDispatchHtml(patientName);
        const safeRequestType = escapeDispatchHtml(requestType);
        const safeVehicleText = escapeDispatchHtml(vehicleText);
        const safeDriverText = escapeDispatchHtml(driverText);
        const safePickup = escapeDispatchHtml(pickup);
        const safeDestination = escapeDispatchHtml(destination);
        const safePriority = escapeDispatchHtml(priority || "—");
        const safeStatus = escapeDispatchHtml(status);
        const safeSchedule = escapeDispatchHtml(
            formatDispatchSchedule(scheduleDate, scheduleTime),
        );

        html += `
                <tr
                    data-id="${escapeDispatchHtml(dispatch.id)}"
                    data-dispatch-number="${safeDispatchNumber}"
                    data-reservation-number="${safeReservationNumber}"
                    data-patient="${safePatientName}"
                    data-request-type="${safeRequestType}"
                    data-pickup="${safePickup}"
                    data-destination="${safeDestination}"
                    data-schedule-date="${escapeDispatchHtml(scheduleDate)}"
                    data-schedule-time="${escapeDispatchHtml(scheduleTime)}"
                    data-priority="${safePriority}"
                    data-status="${safeStatus}"
                    data-contact="${escapeDispatchHtml(contact)}"
                    data-notes="${escapeDispatchHtml(remarks)}"
                    data-archived-at="${escapeDispatchHtml(
                        dispatch.archived_at || "",
                    )}"
                >
                    <!-- Checkbox -->
                    <td>
                        ${
                            canBulkArchive && !dispatch.archived_at
                                ? `
                                    <input
                                        type="checkbox"
                                        class="dispatch-checkbox"
                                        data-id="${escapeDispatchHtml(dispatch.id)}"
                                        aria-label="Select ${safeDispatchNumber}"
                                    >
                                `
                                : ""
                        }
                    </td>

                    <!-- Dispatch Number -->
                    <td>
                        <span class="dispatch-number">
                            ${safeDispatchNumber}
                        </span>
                    </td>

                    <!-- Reservation Number -->
                    <td>
                        <span class="dispatch-reservation-number">
                            ${safeReservationNumber}
                        </span>
                    </td>

                    <!-- Patient -->
                    <td>
                        <div class="dispatch-patient-info">

                            <div class="dispatch-patient-name">
                                ${safePatientName}
                            </div>

                            <div class="dispatch-request-type">
                                ${safeRequestType}
                            </div>

                        </div>
                    </td>

                    <!-- Vehicle -->
                    <td>
                        <div class="vehicle-info">

                            <span class="dispatch-vehicle">
                                ${safeVehicleText}
                            </span>

                        </div>
                    </td>

                    <!-- Driver -->
                    <td>
                        <span class="dispatch-driver">
                            ${safeDriverText}
                        </span>
                    </td>

                    <!-- Final Planned Route -->
                    <td>
                        <span class="dispatch-route">
                            ${
                                pickup && destination
                                    ? `${safePickup} → ${safeDestination}`
                                    : "—"
                            }
                        </span>
                    </td>

                    <!-- Dispatch Schedule -->
                    <td>
                        <span class="dispatch-schedule">
                            ${safeSchedule}
                        </span>
                    </td>

                    <!-- Priority -->
                    <td>
                        <span class="dispatch-priority">
                            ${safePriority}
                        </span>
                    </td>

                    <!-- Status -->
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${safeStatus}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="action-btn view-dispatch"
                                data-id="${escapeDispatchHtml(dispatch.id)}"
                                aria-label="View ${safeDispatchNumber}"
                                title="View Dispatch"
                            >
                                <i class="ph ph-eye"></i>
                            </button>
                            ${
                                canUpdate && !isArchived
                                    ? `
                                        <button
                                            type="button"
                                            class="action-btn edit-dispatch"
                                            data-id="${escapeDispatchHtml(dispatch.id)}"
                                            aria-label="Edit ${safeDispatchNumber}"
                                            title="${
                                                canEdit
                                                    ? "Edit Dispatch"
                                                    : "This dispatch can no longer be edited"
                                            }"
                                            ${canEdit ? "" : "disabled"}
                                        >
                                            <i class="ph ph-pencil-simple"></i>
                                        </button>
                                    `
                                    : ""
                            }

                            ${
                                canArchive && !isArchived
                                    ? `
                                        <button
                                            type="button"
                                            class="action-btn archive-dispatch"
                                            data-id="${escapeDispatchHtml(dispatch.id)}"
                                            aria-label="Archive ${safeDispatchNumber}"
                                            title="Archive Dispatch"
                                        >
                                            <i class="ph ph-archive"></i>
                                        </button>
                                    `
                                    : ""
                            }
                            ${
                                canRestore && dispatch.archived_at
                                    ? `
                                        <button
                                            type="button"
                                            class="action-btn restore-dispatch"
                                            data-id="${escapeDispatchHtml(dispatch.id)}"
                                            aria-label="Restore ${safeDispatchNumber}"
                                            title="Restore Dispatch"
                                        >
                                            <i class="ph ph-arrow-counter-clockwise"></i>
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

    if (typeof applyDispatchFilters === "function") {
        applyDispatchFilters({
            resetPage: false,
        });
    }
    if (typeof refreshDispatchBulkState === "function") {
        refreshDispatchBulkState();
    }
    if (typeof initDispatchPagination === "function") {
        initDispatchPagination();
    }

    updateDispatchBulkSelectionVisibility();
}