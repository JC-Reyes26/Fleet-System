
function initViewReservationModal() {
    const modal = document.getElementById("viewReservationModal");

    if (
        !modal ||
        modal.dataset.viewReservationModalInitialized === "true"
    ) {
        return;
    }

    modal.dataset.viewReservationModalInitialized = "true";

    const NOT_PROVIDED = "Not provided";
    const statusClassMap = {
        Pending: "pending",
        Approved: "trip",
        Scheduled: "scheduled",
        Completed: "completed",
        Rejected: "rejected",
        Cancelled: "cancelled",
    };

    const setText = (id, value) => {
        const element = document.getElementById(id);

        if (!element) return;

        element.textContent = value !== null && value !== undefined && String(value).trim() !== ""
          ? value
          : NOT_PROVIDED;
    };

    const formatSchedule = (date, time) => {
        if (!date && !time) {
            return NOT_PROVIDED;
        }

        if (date && time) {
            const dateObject = new Date(`${date}T${time}`);

            if (!isNaN(dateObject.getTime())) {
                return dateObject.toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
            }
        }

        if (date) return date;
        if (time) return time;

        return NOT_PROVIDED;
    };

    const populateViewReservation = (reservation) => {
        if (!reservation) return;

        const vehicle = reservation.vehicle;
        const driver = reservation.driver;
        const vehicleName = vehicle
            ? `${[vehicle.brand, vehicle.model]
                  .filter(Boolean)
                  .join(" ")} - ${vehicle.vehicle_type ?? ""}`
            : null;
        const driverName = driver
            ? `${driver.first_name} ${driver.last_name}`
            : null;

        setText("viewReservationNumber", reservation.reservation_number);
        setText("viewReservationType", reservation.request_type);
        setText("viewReservationPatient", reservation.patient_name);
        setText("viewReservationVehicle", vehicleName);
        setText("viewReservationDriver", driverName);
        setText("viewReservationPickup", reservation.pickup_location);
        setText("viewReservationDestination", reservation.destination);
        setText("viewReservationSchedule", formatSchedule(reservation.schedule_date, reservation.schedule_time));
        setText("viewReservationPriority", reservation.priority);
        setText("viewReservationContact", reservation.contact_number);
        setText("viewReservationNotes", reservation.notes);

        const statusElement = document.getElementById("viewReservationStatusSummary");

        const editButton = document.getElementById(
            "editReservationFromViewBtn",
        );
        if (editButton) {
            const role =
                window.FleetRBAC?.getRole?.() || window.FLEET_RBAC?.role || "";
            const canUpdate =
                window.FleetRBAC?.hasPermission?.(
                    "reservations",
                    "canUpdate",
                ) === true;
            const roleCanEdit =
                role === "dispatcher" || role === "department_head";
            const canEdit = canUpdate && roleCanEdit;
            const isStatusLocked = reservation.status !== "Pending";
            const isArchived = Boolean(reservation.archived_at);
            editButton.hidden = !canEdit || isArchived;
            editButton.disabled = canEdit && !isArchived && isStatusLocked;
            editButton.title = isStatusLocked
                ? "Only Pending reservations can be edited."
                : "Edit Reservation";
        }
    };

    const openViewReservation = async (reservationId) => {
        if (!reservationId) return;

        try {
            const response = await fetch(`/reservation/${reservationId}`,
                {
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load reservation."
                );
            }

            populateViewReservation(
                data.reservation
            );

            modal.currentReservation =
                data.reservation;

            openReservationModal(modal);
        } catch (error) {
            window.showToast(
                "Failed to load reservation details.",
                "error"
            );
        }
    };

    document.body.addEventListener("click", (event) => {
        const button = event.target.closest(".action-btn.view-reservation");

        if (!button) return;

        const row = button.closest("tr");

        if (!row) return;

        const reservationId = row.dataset.id;

        openViewReservation(reservationId);
    });

    document.getElementById("closeViewReservationModal")
        ?.addEventListener("click", () => {
            closeReservationModal(modal);
          }
        );

    document.getElementById("closeViewReservationBtn")
        ?.addEventListener("click", () => {
            closeReservationModal(modal);
          }
        );

    document.getElementById("editReservationFromViewBtn")
        ?.addEventListener("click", () => {
            const reservation = modal.currentReservation;

            if (
                !reservation ||
                typeof openEditReservationModal !== "function"
            ) {
                return;
            }

            const row = document.querySelector(
                `#reservationTableBody tr[data-id="${reservation.id}"]`,
            );

            if (!row) {
                window.showToast(
                    "Reservation record could not be found.",
                    "error",
                );
                return;
            }

            closeReservationModal(modal);
            openEditReservationModal(row);
        });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeReservationModal(modal);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeReservationModal(modal);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initViewReservationModal();
});
