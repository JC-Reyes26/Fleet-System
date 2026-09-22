
async function getEditReservationSettings() {
    if (typeof window.getReservationModuleSettings === "function") {
        return await window.getReservationModuleSettings();
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
        const settings = data?.settings?.reservations || {};
        return {
            allowSameDay: settings.allowSameDay !== false,
            maxAdvanceDays: Math.max(
                1,
                Math.min(365, Number(settings.maxAdvanceDays ?? 30)),
            ),
        };
    } catch {
        return {
            allowSameDay: true,
            maxAdvanceDays: 30,
        };
    }
}

function applyEditReservationDateSettings(settings) {
    const dateInput = document.getElementById("editReservationDate");
    if (!dateInput) {
        return;
    }
    const today = new Date();
    const minimumDate = new Date(today);
    if (!settings.allowSameDay) {
        minimumDate.setDate(minimumDate.getDate() + 1);
    }
    const maximumDate = new Date(today);
    maximumDate.setDate(maximumDate.getDate() + settings.maxAdvanceDays);
    dateInput.min = reservationFormatDate(minimumDate);
    dateInput.max = reservationFormatDate(maximumDate);
}

//  RBAC
function getReservationEditRole() {
    return window.FleetRBAC?.getRole?.() || "";
}
function canEditReservations() {
    return (
        window.FleetRBAC?.hasPermission?.("reservations", "canUpdate") === true
    );
}
function setReservationEditFieldAccess(id, visible) {
    const field = document.getElementById(id);
    if (!field) return;
    const wrapper = field.closest(".form-group");
    if (wrapper) {
        wrapper.hidden = !visible;
    }
    field.disabled = !visible;
}
function applyReservationEditRbac() {
    const role = getReservationEditRole();
    /*
    |--------------------------------------------------------------------------
    | Fleet Manager
    |--------------------------------------------------------------------------
    | Fleet Manager can edit reservation approval status.
    */
    if (role === "fleet_manager") {
        setReservationEditFieldAccess("editReservationStatus", true);

        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Dispatcher
    |--------------------------------------------------------------------------
    | Dispatcher can edit reservation information but cannot
    | modify the reservation approval status.
    */
    if (role === "dispatcher") {
        setReservationEditFieldAccess("editReservationStatus", false);

        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Department Head
    |--------------------------------------------------------------------------
    | Department Head cannot modify operational fields/status.
    */
    if (role === "department_head") {
        [
            "editReservationNumber",
            "editReservationVehicle",
            "editReservationDriver",
            "editReservationStatus",
        ].forEach((id) => {
            setReservationEditFieldAccess(id, false);
        });
    }
}

const RESERVATION_STATUS_TRANSITIONS = {
    Pending: ["Approved", "Rejected"],
    Approved: [],
    Rejected: [],

    // Lifecycle statuses cannot be changed from Reservation Edit.
    Scheduled: [],
    Completed: [],
    Cancelled: [],
};

function applyReservationStatusTransitions(selectElement, currentStatus) {
    if (!selectElement) {
        return;
    }
    const allowedStatuses = RESERVATION_STATUS_TRANSITIONS[currentStatus] || [];
    // Make sure the current status exists in the dropdown.
    let currentOption = Array.from(selectElement.options).find(
        (option) => option.value === currentStatus,
    );
    if (!currentOption && currentStatus) {
        currentOption = document.createElement("option");
        currentOption.value = currentStatus;
        currentOption.textContent = currentStatus;

        selectElement.appendChild(currentOption);
    }
    Array.from(selectElement.options).forEach((option) => {
        if (!option.value) {
            option.hidden = false;
            option.disabled = false;
            return;
        }

        // Always display the current status.
        if (option.value === currentStatus) {
            option.hidden = false;
            option.disabled = false;
            return;
        }

        // Only show statuses allowed from the current status.
        const isAllowed = allowedStatuses.includes(option.value);

        option.hidden = !isAllowed;
        option.disabled = !isAllowed;
    });

    // Keep the current status selected.
    selectElement.value = currentStatus;
}

async function loadEditReservationOptions(selectedVehicleId = null) {
    const vehicleSelect = document.getElementById("editReservationVehicle");
    const driverSelect = document.getElementById("editReservationDriver");

    if (!vehicleSelect || !driverSelect) return;
    vehicleSelect.innerHTML =
        '<option value="">Loading vehicles...</option>';
    driverSelect.innerHTML =
        '<option value="">Select Driver</option>';
    try {
        const response = await fetch("/fleet/available", {
            headers: {
                Accept: "application/json",
            },
        });
        if (!response.ok) {
            throw new Error("Failed to load vehicles.");
        }
        const vehicles = await response.json();
        vehicleSelect.innerHTML =
            '<option value="">Select Vehicle</option>';
        vehicles.forEach((vehicle) => {
            const option = document.createElement("option");
            option.value = vehicle.id;
            option.textContent =
                `${vehicle.brand} ${vehicle.model} - ${vehicle.vehicle_type}`;
            vehicleSelect.appendChild(option);
        });
        vehicleSelect.addEventListener("change", () => {
            updateEditReservationDriver(
                vehicles,
                vehicleSelect.value,
                driverSelect
            );
        });
        if (selectedVehicleId) {
            vehicleSelect.value = String(selectedVehicleId);
            updateEditReservationDriver(
                vehicles,
                selectedVehicleId,
                driverSelect
            );
        }

    } catch (error) {
        vehicleSelect.innerHTML =
            '<option value="">Failed to load vehicles</option>';
        driverSelect.innerHTML =
            '<option value="">Failed to load driver</option>';
    }
}

function updateEditReservationDriver(vehicles, vehicleId, driverSelect) {
    driverSelect.innerHTML =
        "";
    driverSelect.disabled = false;

    if (!vehicleId) return;

    const selectedVehicle = vehicles.find(
        (vehicle) =>
            String(vehicle.id) === String(vehicleId)
    );

    if (
        !selectedVehicle ||
        !selectedVehicle.drivers ||
        !selectedVehicle.drivers.length
    ) {
        driverSelect.innerHTML =
            '<option value="">No assigned driver</option>';
        driverSelect.disabled = true;

        return;
    }

    const driver = selectedVehicle.drivers[0];
    const option = document.createElement("option");

    option.value = driver.id;
    option.textContent =
        `${driver.first_name} ${driver.last_name}`;
    option.selected = true;

    driverSelect.appendChild(option);
}

async function initEditReservationModal() {
  if (!canEditReservations()) {
      return;
  }

  const modal = document.getElementById("editReservationModal");
  if (!modal || modal.dataset.editReservationModalInitialized === "true") {
    return;
  }

  const reservationSettings = await getEditReservationSettings();

  applyEditReservationDateSettings(reservationSettings);

  modal.dataset.editReservationModalInitialized = "true";
  const getRowText = (row, selector) => {
    const el = row.querySelector(selector);
    return el ? el.textContent.trim() : "";
  };
  const getRowData = (row, key) => {
    return row.dataset[key] || "";
  };

  populateEditReservationForm = (row) => {
    const form = document.getElementById("editReservationForm");
    if (!form) return;

    const setValue = (id, value) => {
      const field = form.querySelector("#" + id);
      if (field) {
        field.value = value;
      }
    };
    setValue("editReservationNumber", getRowText(row, ".reservation-number"));
    setValue("editReservationPatient", getRowText(row, ".patient-name"));
    setValue("editReservationType", getRowData(row, "requestType"));

    if (getReservationEditRole() !== "department_head") {
        const vehicleId = getRowData(row, "vehicleId");
        loadEditReservationOptions(vehicleId);
    }

    setValue("editReservationPickup", getRowText(row, ".reservation-pickup"));
    setValue("editReservationDestination", getRowText(row, ".reservation-destination"));
    setValue("editReservationDate", getRowData(row, "scheduleDate"));
    setValue("editReservationTime", getRowData(row, "scheduleTime"));
    setValue("editReservationPriority", getRowData(row, "priority"));
    if (getReservationEditRole() === "fleet_manager") {
        const currentStatus = getRowText(row, ".status-badge");
        setValue("editReservationStatus", currentStatus);
        const statusSelect = document.getElementById("editReservationStatus");
        applyReservationStatusTransitions(statusSelect, currentStatus);
    }
    setValue("editReservationContact", getRowData(row, "contactNumber"));
    setValue("editReservationNotes", getRowData(row, "notes"));
  };

  openEditReservationModal = (row) => {
    modal.currentRow = row;
    populateEditReservationForm(row);
    applyReservationEditRbac();
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  };

  const closeEditReservationModal = () => {
    modal.classList.remove("show");
    document.body.style.overflow = "";
    modal.currentRow = null;
  };
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest(".action-btn.edit-reservation");
    if (button) {
      const row = button.closest("tr");
      openEditReservationModal(row);
    }
  });
  document
    .getElementById("closeEditReservationModal")
    ?.addEventListener("click", closeEditReservationModal);
  document
    .getElementById("cancelEditReservation")
    ?.addEventListener("click", closeEditReservationModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeEditReservationModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("show")) {
      closeEditReservationModal();
    }
  });

  const form = document.getElementById("editReservationForm");
  if (form && !form.dataset.editReservationFormInitialized) {
    form.dataset.editReservationFormInitialized = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!modal.currentRow) return;

      clearAllReservationErrors(form);

      const reservationNumber = document.getElementById("editReservationNumber");
      const reservationPatient = document.getElementById("editReservationPatient");
      const reservationType = document.getElementById("editReservationType");
      const reservationVehicle = document.getElementById("editReservationVehicle");
      const reservationDriver = document.getElementById("editReservationDriver");
      const reservationPickup = document.getElementById("editReservationPickup");
      const reservationDestination = document.getElementById("editReservationDestination");
      const reservationDate = document.getElementById("editReservationDate");
      const reservationTime = document.getElementById("editReservationTime");
      const reservationPriority = document.getElementById("editReservationPriority");
      const reservationStatus = document.getElementById("editReservationStatus");
      const reservationContact = document.getElementById("editReservationContact");

      let firstInvalid = null;
      let isValid = true;

      const role = getReservationEditRole();
      const isOperationalEditor =
          role === "fleet_manager" || role === "dispatcher";
      if (
          isOperationalEditor &&
          (!reservationNumber ||
              !reservationNumber.value.trim() ||
              reservationNumber.value.trim().length < 5)
      ) {
          showReservationFieldError(
              reservationNumber,
              "Reservation Number must be at least 5 characters.",
          );
          if (!firstInvalid) {
              firstInvalid = reservationNumber;
          }
          isValid = false;
      }

      if (!reservationPatient || !reservationPatient.value.trim()) {
        showReservationFieldError(reservationPatient, "Patient Name is required.");
        if (!firstInvalid) firstInvalid = reservationPatient;
        isValid = false;
      }

      if (!reservationType || !reservationType.value) {
        showReservationFieldError(reservationType, "Request Type is required.");
        if (!firstInvalid) firstInvalid = reservationType;
        isValid = false;
      }
      /*
      if (
          isOperationalEditor &&
          (!reservationVehicle || !reservationVehicle.value)
      ) {
          showReservationFieldError(reservationVehicle, "Vehicle is required.");
          if (!firstInvalid) firstInvalid = reservationVehicle;
          isValid = false;
      }

      if (
          isOperationalEditor &&
          (!reservationDriver || !reservationDriver.value)
      ) {
          showReservationFieldError(reservationDriver, "Driver is required.");
          if (!firstInvalid) firstInvalid = reservationDriver;
          isValid = false;
      }
      */
      if (!reservationPickup || !reservationPickup.value.trim()) {
        showReservationFieldError(
          reservationPickup,
          "Pickup Location is required.",
        );
        if (!firstInvalid) firstInvalid = reservationPickup;
        isValid = false;
      }

      if (!reservationDestination || !reservationDestination.value.trim()) {
        showReservationFieldError(
          reservationDestination,
          "Destination is required.",
        );
        if (!firstInvalid) firstInvalid = reservationDestination;
        isValid = false;
      }

      if (!reservationDate || !reservationDate.value) {
        showReservationFieldError(reservationDate, "Schedule Date is required.");
        if (!firstInvalid) firstInvalid = reservationDate;
        isValid = false;
      } else {
        if (
            reservationDate.value &&
            reservationDate.min &&
            reservationDate.value < reservationDate.min
        ) {
            showReservationFieldError(
                reservationDate,
                reservationSettings.allowSameDay
                    ? "Schedule Date cannot be in the past."
                    : "Same-day reservations are disabled. Please select a future date.",
            );
            if (!firstInvalid) {
                firstInvalid = reservationDate;
            }
            isValid = false;
        }
        if (
            reservationDate.value &&
            reservationDate.max &&
            reservationDate.value > reservationDate.max
        ) {
            showReservationFieldError(
                reservationDate,
                `Reservation cannot be scheduled more than ${reservationSettings.maxAdvanceDays} days in advance.`,
            );
            if (!firstInvalid) {
                firstInvalid = reservationDate;
            }
            isValid = false;
        }
      }

      if (!reservationTime || !reservationTime.value) {
        showReservationFieldError(reservationTime, "Schedule Time is required.");
        if (!firstInvalid) firstInvalid = reservationTime;
        isValid = false;
      }

      if (!reservationPriority || !reservationPriority.value) {
        showReservationFieldError(reservationPriority, "Priority is required.");
        if (!firstInvalid) firstInvalid = reservationPriority;
        isValid = false;
      }

      if (role === "fleet_manager") {
          if (!reservationStatus || !reservationStatus.value) {
              showReservationFieldError(
                  reservationStatus,
                  "Status is required.",
              );

              if (!firstInvalid) {
                  firstInvalid = reservationStatus;
              }

              isValid = false;
          }
      }

      if (
        reservationContact &&
        reservationContact.value.trim() &&
        !/^[0-9+\-() ]+$/.test(reservationContact.value.trim())
      ) {
        showReservationFieldError(
          reservationContact,
          "Contact Number can only contain numbers, +, -, spaces, and parentheses.",
        );
        if (!firstInvalid) firstInvalid = reservationContact;
        isValid = false;
      }

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const row = modal.currentRow;
      const reservationId = row.dataset.id;

      let formData = {
          patient_name: reservationPatient.value.trim(),
          request_type: reservationType.value,
          pickup_location: reservationPickup.value.trim(),
          destination: reservationDestination.value.trim(),
          schedule_date: reservationDate.value,
          schedule_time: reservationTime.value,
          priority: reservationPriority.value,
          contact_number: reservationContact?.value.trim() || "",
          notes:
              document.getElementById("editReservationNotes")?.value.trim() ||
              "",
      };
      if (role === "fleet_manager") {
          formData = {
              reservation_number: reservationNumber.value.trim(),
              ...formData,
              vehicle_id: reservationVehicle.value || null,
              driver_id: reservationDriver.value || null,
              status: reservationStatus.value,
          };
      }
      if (role === "dispatcher") {
          formData = {
              reservation_number: reservationNumber.value.trim(),
              ...formData,
              vehicle_id: reservationVehicle.value || null,
              driver_id: reservationDriver.value || null,
          };
      }

      try {
          const response = await fetch(`/reservation/${reservationId}`, {
              method: "PUT",

              headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "X-CSRF-TOKEN":
                      document.querySelector(
                          'meta[name="csrf-token"]'
                      ).content,
              },

              body: JSON.stringify(formData),
          });

          const data = await response.json();

          if (response.status === 422) {
              const errors = data.errors;

              const firstError = errors
                  ? Object.values(errors).flat()[0]
                  : null;

              window.showToast(
                  firstError ||
                      data.message ||
                      "Please check the reservation information.",
                  "error"
              );

              return;
          }

          if (!response.ok) {
              throw new Error(
                  data.message || "Failed to update reservation."
              );
          }

          if (data.success) {
              await loadReservations();

              closeEditReservationModal();

              window.showToast(
                  data.message || "Reservation updated successfully.",
                  "success"
              );
          }

      } catch (error) {
          window.showToast(
              error.message || "Failed to update reservation.",
              "error"
          );
      }

      //closeEditReservationModal();

      //if (typeof showToast === "function") {
      //  showToast("Reservation updated successfully.", "success");
      //}
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
    await initEditReservationModal();
});