/* ==========================================
   HIMS Fleet - Dispatch Edit

   Lifecycle:
   Pending
      ↓
   Assigned
      ↓
   En Route
      ↓
   Arrived
      ↓
   Completed

   Cancellation:
   Pending / Assigned / En Route
      ↓
   Cancelled

   Backend remains authoritative for:
   - Reservation status
   - Vehicle status
   - Driver status
   - RoutePlan completion
========================================== */

function canEditDispatchRecords() {
    return window.FleetRBAC?.hasPermission?.("dispatch", "canUpdate") === true;
}

let editDispatchInitialized = false;

function getEditDispatchCsrfToken() {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
}

async function editDispatchApiRequest(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };
    if (options.body !== undefined && options.body !== null) {
        headers["Content-Type"] = "application/json";
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const token = getEditDispatchCsrfToken();
        if (token) {
            headers["X-CSRF-TOKEN"] = token;
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
        const requestError = new Error(
            data.message || "Dispatch request failed.",
        );
        requestError.status = response.status;
        requestError.errors = data.errors || {};
        requestError.data = data;
        throw requestError;
    }

    return data;
}

/**
 * Support Laravel relationship JSON naming.
 */
function getEditReservationRoutePlan(reservation) {
    return reservation?.route_plan || reservation?.routePlan || null;
}

function getEditFormValues() {
    return {
        dispatch_number:
            document.getElementById("editDispatchNumber")?.value.trim() || "",
        trip_status: document.getElementById("editDispatchStatus")?.value || "",
        remarks:
            document.getElementById("editDispatchNotes")?.value.trim() || null,
    };
}

function validateEditDispatchForm(form) {
    let isValid = true;
    const invalidFields = [];
    const dispatchNumber = document.getElementById("editDispatchNumber");
    const status = document.getElementById("editDispatchStatus");

    if (dispatchNumber) {
        const value = dispatchNumber.value.trim();
        if (value.length < 5) {
            dispatchNumber.classList.add("is-invalid");
            isValid = false;
            invalidFields.push(dispatchNumber);
        } else {
            dispatchNumber.classList.remove("is-invalid");
        }
    }

    if (status) {
        const value = status.value.trim();
        if (!value) {
            status.classList.add("is-invalid");
            isValid = false;
            invalidFields.push(status);
        } else {
            status.classList.remove("is-invalid");
        }
    }

    if (invalidFields.length > 0) {
        invalidFields[0].focus();
    }
    return isValid;
}

function updateEditDispatchStatusOptions(currentStatus) {
    const statusElement = document.getElementById("editDispatchStatus");
    if (!statusElement) {
        return;
    }
    const allowedTransitions = {
        Pending: ["Assigned", "Cancelled"],
        Assigned: ["En Route", "Cancelled"],
        "En Route": ["Arrived", "Cancelled"],
        Arrived: ["Completed"],
        Completed: [],
        Cancelled: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    Array.from(statusElement.options).forEach((option) => {
        const optionStatus = option.value;
        if (!optionStatus) {
            option.disabled = true;

            return;
        }
        if (optionStatus === currentStatus) {
            option.disabled = false;

            return;
        }
        option.disabled = !allowed.includes(optionStatus);
    });
    statusElement.value = currentStatus;
    statusElement.disabled = ["Completed", "Cancelled"].includes(currentStatus);
}

function formatEditVehicle(vehicle) {
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

function formatEditDriver(driver) {
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

async function populateEditDispatchForm(dispatchId) {
    try {
        const data = await editDispatchApiRequest(
            `/dispatch/${encodeURIComponent(dispatchId)}`,
            {
                method: "GET",
            },
        );

        const dispatch = data.dispatch;

        if (!dispatch) {
            throw new Error("Dispatch information not found.");
        }

        const reservation = dispatch.reservation || {};
        const routePlan = getEditReservationRoutePlan(reservation);
        const vehicle = reservation.vehicle || null;
        const driver = reservation.driver || null;
        const numberElement = document.getElementById("editDispatchNumber");

        if (numberElement) {
            numberElement.value = dispatch.dispatch_number || "";
        }
        const reservationElement = document.getElementById(
            "editDispatchReservation",
        );
        if (reservationElement) {
            reservationElement.value = reservation.reservation_number || "";
        }
        const patientElement = document.getElementById("editDispatchPatient");
        if (patientElement) {
            patientElement.value = reservation.patient_name || "";
        }
        const requestTypeElement = document.getElementById(
            "editDispatchRequestType",
        );
        if (requestTypeElement) {
            requestTypeElement.value = reservation.request_type || "";
        }
        const vehicleElement = document.getElementById("editDispatchVehicle");
        if (vehicleElement) {
            vehicleElement.value = formatEditVehicle(vehicle);
        }
        const driverElement = document.getElementById("editDispatchDriver");
        if (driverElement) {
            driverElement.value = formatEditDriver(driver);
        }
        /*
        |--------------------------------------------------------------------------
        | Final Planned Route
        |--------------------------------------------------------------------------
        |
        | Dispatch uses RoutePlan origin/destination.
        |
        */
        const pickupElement = document.getElementById("editDispatchPickup");
        if (pickupElement) {
            pickupElement.value =
                routePlan?.origin || reservation.pickup_location || "";
        }
        const destinationElement = document.getElementById(
            "editDispatchDestination",
        );
        if (destinationElement) {
            destinationElement.value =
                routePlan?.destination || reservation.destination || "";
        }
        /*
        |--------------------------------------------------------------------------
        | Dispatch Schedule
        |--------------------------------------------------------------------------
        |
        | First priority:
        | dispatch.dispatch_date / departure_time
        |
        | Fallback:
        | RoutePlan departure_date / departure_time
        |
        | Never use Reservation schedule as authoritative here.
        |
        */
        const dateElement = document.getElementById("editDispatchDate");
        if (dateElement) {
            dateElement.value = String(
                dispatch.dispatch_date || routePlan?.departure_date || "",
            ).slice(0, 10);
        }
        const timeElement = document.getElementById("editDispatchTime");
        if (timeElement) {
            timeElement.value = String(
                dispatch.departure_time || routePlan?.departure_time || "",
            ).slice(0, 5);
        }
        const priorityElement = document.getElementById("editDispatchPriority");
        if (priorityElement) {
            priorityElement.value =
                routePlan?.priority || reservation.priority || "";
        }
        const statusElement = document.getElementById("editDispatchStatus");

        if (statusElement) {
            const currentStatus = dispatch.trip_status || "Pending";
            updateEditDispatchStatusOptions(currentStatus);
        }
        const contactElement = document.getElementById("editDispatchContact");
        if (contactElement) {
            contactElement.value = reservation.contact_number || "";
        }
        const notesElement = document.getElementById("editDispatchNotes");
        if (notesElement) {
            notesElement.value = dispatch.remarks || "";
        }
        return dispatch;
    } catch (error) {
        console.error("Error loading dispatch for edit:", error);
        if (typeof showToast === "function") {
            showToast(
                error.message || "Failed to load dispatch details.",
                "error",
            );
        }
        return null;
    }
}

function openEditDispatchModal() {
    const modal = document.getElementById("editDispatchModal");
    if (!modal) {
        return;
    }
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeEditDispatchModal() {
    const modal = document.getElementById("editDispatchModal");
    if (!modal) {
        return;
    }
    modal.classList.remove("show");
    document.body.style.overflow = "";
    modal.currentDispatchId = null;
}

async function submitEditDispatch(form, dispatchId) {
    const values = getEditFormValues();

    try {
        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        |
        | Frontend only requests the Dispatch status change.
        |
        | Backend performs operational side effects:
        |
        | Pending → Assigned
        | Reservation → Scheduled
        |
        | Assigned → En Route
        | Vehicle → On Trip
        | Driver → On Duty
        |
        | Arrived → Completed
        | Reservation → Completed
        | RoutePlan → Completed
        | Vehicle → Available
        | Driver → Available
        |
        */
        const data = await editDispatchApiRequest(
            `/dispatch/${encodeURIComponent(dispatchId)}`,
            {
                method: "PUT",

                body: JSON.stringify(values),
            },
        );

        closeEditDispatchModal();

        if (typeof loadDispatches === "function") {
            await loadDispatches();
        }
        if (typeof updateDispatchStatistics === "function") {
            updateDispatchStatistics();
        }
        if (typeof refreshDispatchPagination === "function") {
            refreshDispatchPagination();
        } else if (typeof updateDispatchPagination === "function") {
            updateDispatchPagination();
        }
        if (typeof refreshDispatchBulkState === "function") {
            refreshDispatchBulkState();
        }
        if (
            canCreateDispatch() &&
            typeof loadAvailableReservations === "function"
        ) {
            await loadAvailableReservations();
        }
        if (typeof showToast === "function") {
            showToast(
                data.message || "Dispatch updated successfully.",
                "success",
            );
        }

        return true;
    } catch (error) {
        console.error("Dispatch update error:", error);
        if (typeof showToast === "function") {
            showToast(
                error.message ||
                    "Something went wrong while updating the dispatch.",
                "error",
            );
        }
        return false;
    }
}

function initEditDispatchModal() {
    if (!canEditDispatchRecords()) {
        return;
    }
    if (editDispatchInitialized) {
        return;
    }
    const modal = document.getElementById("editDispatchModal");
    if (!modal) {
        return;
    }
    editDispatchInitialized = true;
    document.body.addEventListener("click", async (event) => {
        const editButton = event.target.closest(".action-btn.edit-dispatch");
        if (!editButton) {
            return;
        }
        const row = editButton.closest("tr");
        if (!row) {
            return;
        }
        const status = String(
            row.dataset.status ||
                row.querySelector(".status-badge")?.textContent ||
                "",
        ).trim();
        /*
         * Completed / Cancelled dispatches are lifecycle-locked.
         * Keep the Edit button clickable so the user receives
         * a clear toast instead of silently doing nothing.
         */
        if (["Completed", "Cancelled"].includes(status)) {
            if (typeof showToast === "function") {
                showToast(
                    `This dispatch cannot be edited because it is already ${status}.`,
                    "error",
                );
            }
            return;
        }
        const dispatchId = editButton.dataset.id;
        if (!dispatchId) {
            console.error("Dispatch ID not found.");
            return;
        }
        modal.currentDispatchId = dispatchId;
        const dispatch = await populateEditDispatchForm(dispatchId);
        if (!dispatch) {
            modal.currentDispatchId = null;
            return;
        }
        openEditDispatchModal();
    });
    document
        .getElementById("closeEditDispatchModal")
        ?.addEventListener("click", closeEditDispatchModal);
    document
        .getElementById("cancelEditDispatch")
        ?.addEventListener("click", closeEditDispatchModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeEditDispatchModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeEditDispatchModal();
        }
    });

    const form = document.getElementById("editDispatchForm");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!validateEditDispatchForm(form)) {
                return;
            }
            const dispatchId = modal.currentDispatchId;
            if (!dispatchId) {
                console.error("Dispatch ID not found.");
                return;
            }
            const submitButton = document.getElementById("updateDispatchBtn");
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Updating...";
            }
            try {
                await submitEditDispatch(form, dispatchId);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Update Dispatch";
                }
            }
        });

        form.querySelectorAll("input, select, textarea").forEach((input) => {
            input.addEventListener("input", () => {
                input.classList.remove("is-invalid");
            });
            input.addEventListener("change", () => {
                input.classList.remove("is-invalid");
            });
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initEditDispatchModal();
});
