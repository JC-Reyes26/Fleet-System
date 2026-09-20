
function openReservationModal(modal) {
  if (!modal) return;

  if (!modal.classList.contains("show")) {
    modal.dataset.previousBodyOverflow = document.body.style.overflow;
  }

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeReservationModal(modal) {
  if (!modal || !modal.classList.contains("show")) return;

  modal.classList.remove("show");
  document.body.style.overflow = modal.dataset.previousBodyOverflow || "";
  delete modal.dataset.previousBodyOverflow;
}

function showReservationFieldError(field, message) {
  if (!field) return;
  field.classList.add("is-invalid");
  const formGroup = field.closest(".form-group");
  if (formGroup) {
    let errorEl = formGroup.querySelector(".invalid-feedback");
    if (!errorEl) {
      errorEl = document.createElement("div");
      errorEl.className = "invalid-feedback";
      formGroup.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }
}

function clearReservationFieldError(field) {
  if (!field) return;
  field.classList.remove("is-invalid");
  const formGroup = field.closest(".form-group");
  if (formGroup) {
    const errorEl = formGroup.querySelector(".invalid-feedback");
    if (errorEl) {
      errorEl.style.display = "none";
    }
  }
}

function clearAllReservationErrors(form) {
  if (!form) return;
  form.querySelectorAll(".is-invalid").forEach((field) => {
    clearReservationFieldError(field);
  });
}

function validateReservationForm(form) {
    if (!form) return false;
    clearAllReservationErrors(form);
    const reservationNumber = document.getElementById("reservationNumber");
    const reservationPatient = document.getElementById("reservationPatient");
    const reservationType = document.getElementById("reservationType");
    const reservationVehicle = document.getElementById("reservationVehicle");
    const reservationDriver = document.getElementById("reservationDriver");
    const reservationPickup = document.getElementById("reservationPickup");
    const reservationDestination = document.getElementById(
        "reservationDestination",
    );
    const reservationDate = document.getElementById("reservationDate");
    const reservationTime = document.getElementById("reservationTime");
    const reservationPriority = document.getElementById("reservationPriority");
    const reservationStatus = document.getElementById("reservationStatus");
    const reservationContact = document.getElementById("reservationContact");
    const isDepartmentHead =
        typeof isDepartmentHeadReservationUser === "function"
            ? isDepartmentHeadReservationUser()
            : window.FleetRBAC?.getRole?.() === "department_head";

    let firstInvalid = null;
    let isValid = true;

    // Reservation Number
    const reservationNumberValue = reservationNumber?.value?.trim() || "";

    if (
        !reservationNumber ||
        !reservationNumberValue ||
        reservationNumberValue === "Generating..." ||
        reservationNumberValue === "Unable to generate"
    ) {
        showReservationFieldError(
            reservationNumber,
            "Please wait for the reservation number to be generated.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationNumber;
        }
        isValid = false;
    }

    // Patient Name
    if (!reservationPatient || !reservationPatient.value.trim()) {
        showReservationFieldError(
            reservationPatient,
            "Patient Name is required.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationPatient;
        }
        isValid = false;
    }

    // Request Type
    if (!reservationType || !reservationType.value) {
        showReservationFieldError(reservationType, "Request Type is required.");
        if (!firstInvalid) {
            firstInvalid = reservationType;
        }
        isValid = false;
    }

    /*
     * Vehicle + Driver are NOT required for Department Head.
     * Department Head reservations are created without assignment.
     */
    if (!isDepartmentHead) {
        if (!reservationVehicle || !reservationVehicle.value) {
            showReservationFieldError(
                reservationVehicle,
                "Vehicle is required.",
            );
            if (!firstInvalid) {
                firstInvalid = reservationVehicle;
            }
            isValid = false;
        }

        if (!reservationDriver || !reservationDriver.value) {
            showReservationFieldError(reservationDriver, "Driver is required.");
            if (!firstInvalid) {
                firstInvalid = reservationDriver;
            }
            isValid = false;
        }
    }

    // Pickup Location
    if (!reservationPickup || !reservationPickup.value.trim()) {
        showReservationFieldError(
            reservationPickup,
            "Pickup Location is required.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationPickup;
        }
        isValid = false;
    }

    // Destination
    if (!reservationDestination || !reservationDestination.value.trim()) {
        showReservationFieldError(
            reservationDestination,
            "Destination is required.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationDestination;
        }
        isValid = false;
    }

    // Schedule Date
    if (!reservationDate || !reservationDate.value) {
        showReservationFieldError(
            reservationDate,
            "Schedule Date is required.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationDate;
        }

        isValid = false;
    } else {
        if (
            reservationDate.min &&
            reservationDate.value < reservationDate.min
        ) {
            showReservationFieldError(
                reservationDate,
                "Selected date is earlier than the allowed reservation date.",
            );
            if (!firstInvalid) {
                firstInvalid = reservationDate;
            }
            isValid = false;
        }

        if (
            reservationDate.max &&
            reservationDate.value > reservationDate.max
        ) {
            showReservationFieldError(
                reservationDate,
                "Selected date exceeds the maximum advance booking period.",
            );
            if (!firstInvalid) {
                firstInvalid = reservationDate;
            }
            isValid = false;
        }
    }

    // Schedule Time
    if (!reservationTime || !reservationTime.value) {
        showReservationFieldError(
            reservationTime,
            "Schedule Time is required.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationTime;
        }
        isValid = false;
    }
    // Priority
    if (!reservationPriority || !reservationPriority.value) {
        showReservationFieldError(reservationPriority, "Priority is required.");
        if (!firstInvalid) {
            firstInvalid = reservationPriority;
        }
        isValid = false;
    }
    /*
     * Status is controlled by backend settings.
     * Do not block reservation creation because of frontend status.
     *
     * Backend already determines:
     * Pending or Approved
     */
    if (reservationStatus && reservationStatus.value === "") {
        // Do nothing intentionally.
    }
    // Contact Number
    if (
        reservationContact &&
        reservationContact.value.trim() &&
        !/^[0-9+\-() ]+$/.test(reservationContact.value.trim())
    ) {
        showReservationFieldError(
            reservationContact,
            "Contact Number can only contain numbers, +, -, spaces, and parentheses.",
        );
        if (!firstInvalid) {
            firstInvalid = reservationContact;
        }
        isValid = false;
    }
    if (!isValid) {
        if (firstInvalid) {
            firstInvalid.focus();
        }
        return false;
    }
    return true;
}

function initReservationModal() {
    const closeButton = document.getElementById("closeAddReservationModal");
    const cancelButton = document.getElementById("cancelAddReservation");
    const form = document.getElementById("reservationForm");
    // Open button
    document.addEventListener("click", async (event) => {
        const button = event.target.closest("#addReservationBtn");
        if (!button) return;
        event.preventDefault();
        const modal = document.getElementById("addReservationModal");
        if (!modal) return;
        openReservationModal(modal);
        if (typeof loadNextReservationNumber === "function") {
            await loadNextReservationNumber();
        }
        const isDepartmentHead =
            typeof isDepartmentHeadReservationUser === "function"
                ? isDepartmentHeadReservationUser()
                : window.FleetRBAC?.getRole?.() === "department_head";
        if (!isDepartmentHead && typeof loadReservationOptions === "function") {
            await loadReservationOptions();
        }
    });

    // Close button
    closeButton?.addEventListener("click", () => {
        const modal = document.getElementById("addReservationModal");
        if (!modal) return;
        closeReservationModal(modal);
    });

    // Cancel button
    cancelButton?.addEventListener("click", () => {
        const modal = document.getElementById("addReservationModal");
        if (!modal) return;
        closeReservationModal(modal);
    });

    // Click outside modal
    document.addEventListener("click", (event) => {
        const modal = document.getElementById("addReservationModal");

        if (!modal) return;
        if (event.target === modal) {
            closeReservationModal(modal);
        }
    });

    // Escape key
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        const modal = document.getElementById("addReservationModal");

        if (!modal) return;
        if (modal.classList.contains("show")) {
            closeReservationModal(modal);
        }
    });

    // Form initialization
    if (form && !form.dataset.reservationFormInitialized) {
        form.dataset.reservationFormInitialized = "true";

        form.setAttribute("novalidate", "");

        const fieldsToClear = [
            document.getElementById("reservationNumber"),
            document.getElementById("reservationPatient"),
            document.getElementById("reservationType"),
            document.getElementById("reservationVehicle"),
            document.getElementById("reservationDriver"),
            document.getElementById("reservationPickup"),
            document.getElementById("reservationDestination"),
            document.getElementById("reservationDate"),
            document.getElementById("reservationTime"),
            document.getElementById("reservationPriority"),
            document.getElementById("reservationStatus"),
            document.getElementById("reservationContact"),
            document.getElementById("reservationNotes"),
        ];

        fieldsToClear.forEach((field) => {
            if (!field) return;

            field.addEventListener("input", () =>
                clearReservationFieldError(field),
            );

            field.addEventListener("change", () =>
                clearReservationFieldError(field),
            );
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initReservationModal();
});