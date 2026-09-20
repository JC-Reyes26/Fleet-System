/* ==========================================
Reservation Table
========================================== */
let reservationLiveUpdateInterval = null;
let reservationLiveUpdateRunning = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadReservations();

    startReservationLiveUpdates();
});
document.addEventListener("DOMContentLoaded", () => {
    const showArchived = document.getElementById("showArchivedReservations");

    showArchived?.addEventListener("change", async () => {
        await loadReservations();
    });
});

async function loadReservations() {
    try {
        const showArchived =
            document.getElementById("showArchivedReservations")?.checked ===
            true;
        const url = showArchived
            ? "/reservation?show_archived=1"
            : "/reservation";
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to load reservations.");
        }
        const reservations = Array.isArray(data.reservations)
            ? data.reservations
            : [];
        renderReservationTable(reservations);
        updateReservationBulkSelectionVisibility();
        return reservations;
    } catch (error) {
        console.error("RESERVATION LOAD ERROR:", error);

        return [];
    }
}

function startReservationLiveUpdates() {
    if (reservationLiveUpdateInterval) {
        return;
    }
    reservationLiveUpdateInterval = window.setInterval(async () => {
        /*
            |--------------------------------------------------------------------------
            | Do not poll while tab is hidden
            |--------------------------------------------------------------------------
            */
        if (document.hidden) {
            return;
        }
        /*
            |--------------------------------------------------------------------------
            | Prevent overlapping requests
            |--------------------------------------------------------------------------
            */
        if (reservationLiveUpdateRunning) {
            return;
        }
        reservationLiveUpdateRunning = true;
        try {
            await loadReservations();
        } catch (error) {
            console.error("Reservation live update failed:", error);
        } finally {
            reservationLiveUpdateRunning = false;
        }
    }, 10000);
}

function getReservationStatusClass(status) {
    const value = (status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "");

    if (value === "pending") return "pending";
    if (value === "approved") return "trip";
    if (value === "scheduled") return "scheduled";
    if (value === "completed") return "completed";
    if (value === "rejected") return "rejected";
    if (value === "cancelled") return "cancelled";

    return "out";
}

function formatReservationSchedule(date, time) {
    if (!date && !time) {
        return "";
    }
    if (date && time) {
        const dateObj = new Date(
            `${date}T${time}`
        );

        if (!isNaN(dateObj.getTime())) {

            return dateObj.toLocaleString(
                undefined,
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
        }
    }

    if (date) return date;
    if (time) return time;

    return "";
}

function updateReservationBulkSelectionVisibility() {
    const selectAll = document.getElementById("selectAllReservations");
    const toolbar = document.getElementById("reservationBulkToolbar");
    const showArchived =
        document.getElementById("showArchivedReservations")?.checked === true;

    if (selectAll) {
        selectAll.hidden = showArchived;
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }

    if (showArchived) {
        if (typeof clearReservationSelection === "function") {
            clearReservationSelection();
        }

        if (toolbar) {
            toolbar.classList.remove("show");
        }
    }
}

function renderReservationTable(reservations) {

    const tableBody =
        document.getElementById("reservationTableBody");

    if (!tableBody) return;

    const role = window.FleetRBAC?.getRole?.() || "";
    const canArchive =
        window.FleetRBAC?.hasPermission?.("reservations", "canArchive") ===
        true;
    const canBulkArchive =
        window.FleetRBAC?.hasPermission?.("reservations", "canBulkArchive") ===
        true;
    const canRestore =
        window.FleetRBAC?.hasPermission?.("reservations", "canRestore") ===
        true;
    const canUpdate =
        window.FleetRBAC?.hasPermission?.("reservations", "canUpdate") === true;

    let html = "";

    reservations.forEach(reservation => {

        const canEditThisReservation =
            canUpdate &&
            (role === "fleet_manager" ||
                role === "dispatcher" ||
                (role === "department_head" &&
                    reservation.status === "Pending"));

        const statusClass =
            getReservationStatusClass(
                reservation.status
            );
        const vehicle = reservation.vehicle;
        const driver = reservation.driver;
        const vehicleName = vehicle
            ? `${[vehicle.brand, vehicle.model]
                  .filter(Boolean)
                  .join(" ")} - ${vehicle.vehicle_type ?? ""}`
            : "Unassigned";
        const driverName = driver
            ? `${driver.first_name} ${driver.last_name}`
            : "Unassigned";
        const schedule = formatReservationSchedule(
            reservation.schedule_date,
            reservation.schedule_time
        );

        html += `
            <tr
                data-id="${reservation.id}"
                data-reservation-number="${reservation.reservation_number ?? ""}"
                data-patient-name="${reservation.patient_name ?? ""}"
                data-request-type="${reservation.request_type ?? ""}"
                data-vehicle-id="${reservation.vehicle_id ?? ""}"
                data-driver-id="${reservation.driver_id ?? ""}"
                data-pickup-location="${reservation.pickup_location ?? ""}"
                data-destination="${reservation.destination ?? ""}"
                data-schedule-date="${reservation.schedule_date ?? ""}"
                data-schedule-time="${reservation.schedule_time ?? ""}"
                data-priority="${reservation.priority ?? ""}"
                data-status="${reservation.status ?? ""}"
                data-contact-number="${reservation.contact_number ?? ""}"
                data-notes="${reservation.notes ?? ""}"
                data-archived-at="${reservation.archived_at ?? ""}"
            >

                <td>
                    ${
                        canBulkArchive && !reservation.archived_at
                            ? `
                                <input
                                    type="checkbox"
                                    class="reservation-checkbox"
                                    data-id="${reservation.id}"
                                    aria-label="Select ${reservation.reservation_number}"
                                >
                            `
                            : ""
                    }
                </td>

                <td>
                    <span class="reservation-number">
                        ${reservation.reservation_number ?? ""}
                    </span>
                </td>

                <td>
                    <div class="patient-info">
                        <div class="patient-name">
                            ${reservation.patient_name ?? ""}
                        </div>

                        <small>
                            ${reservation.request_type ?? ""}
                        </small>
                    </div>
                </td>

                <td>
                    <span class="reservation-vehicle">
                        ${vehicleName}
                    </span>
                </td>

                <td>
                    <span class="reservation-driver">
                        ${driverName}
                    </span>
                </td>

                <td>
                    <span class="reservation-pickup">
                        ${reservation.pickup_location ?? ""}
                    </span>
                </td>

                <td>
                    <span class="reservation-destination">
                        ${reservation.destination ?? ""}
                    </span>
                </td>

                <td>
                    <span class="reservation-schedule">
                        ${schedule}
                    </span>
                </td>

                <td>
                    <span class="status-badge ${statusClass}">
                        ${reservation.status ?? ""}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="action-btn view-reservation"
                            data-id="${reservation.id}"
                            aria-label="View ${reservation.reservation_number}"
                        >
                            <i class="ph ph-eye"></i>
                        </button>
                        ${
                            canEditThisReservation && !reservation.archived_at
                                ? `
                                    <button
                                        type="button"
                                        class="action-btn edit-reservation"
                                        data-id="${reservation.id}"
                                        aria-label="Edit ${reservation.reservation_number}"
                                    >
                                        <i class="ph ph-pencil-simple"></i>
                                    </button>
                                `
                                : ""
                        }
                        ${
                            canArchive && !reservation.archived_at
                                ? `
                                    <button
                                        type="button"
                                        class="action-btn archive-reservation"
                                        data-id="${reservation.id}"
                                        aria-label="Archive ${reservation.reservation_number}"
                                        title="Archive"
                                    >
                                        <i class="ph ph-archive"></i>
                                    </button>
                                `
                                : ""
                        }
                        ${
                            canRestore && reservation.archived_at
                                ? `
                                    <button
                                        type="button"
                                        class="action-btn restore-reservation"
                                        data-id="${reservation.id}"
                                        aria-label="Restore ${reservation.reservation_number}"
                                        title="Restore"
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

    if (typeof window.applyReservationFilters === "function") {
        window.applyReservationFilters();
    }

    if (typeof refreshReservationBulkState === "function") {
        refreshReservationBulkState();
    }
   
    if (typeof updateReservationStatistics === "function") {
        updateReservationStatistics();
    }
    
    updateReservationBulkSelectionVisibility();
}