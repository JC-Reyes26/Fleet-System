let maintenanceModalInitialized = false;

function initMaintenanceModal() {
    if (maintenanceModalInitialized) {
        return;
    }

    const modal = document.getElementById("addMaintenanceModal");

    const openBtn = document.getElementById("addMaintenanceBtn");

    if (!modal || !openBtn) {
        return;
    }

    maintenanceModalInitialized = true;

    async function openModal() {
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
        await Promise.all([
            loadNextMaintenanceNumber(),
            loadAvailableMaintenanceVehicles(),
        ]);
    }

    function closeModal() {
        modal.classList.remove("show");
        document.body.style.overflow = "";
        const numberInput = document.getElementById("maintenanceNumber");
        if (numberInput) {
            numberInput.value = "Generating...";
        }
    }

    openBtn.addEventListener("click", openModal);

    const closeBtn = document.getElementById("closeAddMaintenanceModal");

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    const cancelBtn = document.getElementById("cancelAddMaintenance");

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeModal);
    }

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeModal();
        }
    });
}

function showMaintenanceFieldError(field, message) {
    if (!field) {
        return;
    }

    field.classList.add("is-invalid");

    let errorEl = field.parentElement
        ? field.parentElement.querySelector(
              ".field-error[data-field='" + field.id + "']",
          )
        : null;

    if (!errorEl) {
        errorEl = document.createElement("div");
        errorEl.className = "field-error";
        errorEl.setAttribute("data-field", field.id);
        const parent = field.parentElement || field;
        parent.appendChild(errorEl);
    }

    errorEl.textContent = message;
    errorEl.style.display = "block";
}

function clearMaintenanceFieldError(field) {
    if (!field) {
        return;
    }

    field.classList.remove("is-invalid");

    const errorEl = field.parentElement
        ? field.parentElement.querySelector(
              ".field-error[data-field='" + field.id + "']",
          )
        : null;

    if (errorEl) {
        errorEl.textContent = "";
        errorEl.style.display = "none";
    }
}

function clearAllMaintenanceErrors(form) {
    if (!form) {
        return;
    }

    const invalidFields = form.querySelectorAll(".is-invalid");
    invalidFields.forEach(function (field) {
        clearMaintenanceFieldError(field);
    });
}

function validateMaintenanceForm(form) {
    if (!form) {
        return false;
    }

    clearAllMaintenanceErrors(form);

    let firstInvalidField = null;

    function fail(field, message) {
        showMaintenanceFieldError(field, message);
        if (!firstInvalidField && field) {
            firstInvalidField = field;
        }
    }

    function trackCorrection(field) {
        if (!field || field.dataset.maintenanceErrorClearBound === "true") {
            return;
        }

        field.dataset.maintenanceErrorClearBound = "true";

        field.addEventListener("input", function () {
            clearMaintenanceFieldError(field);
        });
        field.addEventListener("change", function () {
            clearMaintenanceFieldError(field);
        });
    }

    const isEditForm = form.id === "editMaintenanceForm";
    const prefix = isEditForm ? "editMaintenance" : "maintenance";

    const fields = {
        maintenanceNumber: form.querySelector("#" + prefix + "Number"),
        maintenanceVehicle: form.querySelector("#" + prefix + "Vehicle"),
        maintenanceServiceType: form.querySelector(
            "#" + prefix + "ServiceType",
        ),
        maintenanceTechnician: form.querySelector("#" + prefix + "Technician"),
        maintenanceScheduledDate: form.querySelector(
            "#" + prefix + "ScheduledDate",
        ),
        maintenanceCompletionDate: form.querySelector(
            "#" + prefix + "CompletionDate",
        ),
        maintenanceCost: form.querySelector("#" + prefix + "Cost"),
        maintenancePriority: form.querySelector("#" + prefix + "Priority"),
        maintenanceStatus: form.querySelector("#" + prefix + "Status"),
        maintenanceOdometer: form.querySelector("#" + prefix + "Odometer"),
        maintenanceDescription: form.querySelector(
            "#" + prefix + "Description",
        ),
    };

    Object.keys(fields).forEach(function (key) {
        trackCorrection(fields[key]);
    });

    const number = fields.maintenanceNumber;
    if (isEditForm) {
        if (!number || !number.value.trim()) {
            fail(number, "Maintenance number is required.");
        }
    }

    const vehicle = fields.maintenanceVehicle;
    if (!vehicle || !vehicle.value) {
        fail(vehicle, "Vehicle is required.");
    }

    const serviceType = fields.maintenanceServiceType;
    if (!serviceType || !serviceType.value) {
        fail(serviceType, "Service type is required.");
    }

    const technician = fields.maintenanceTechnician;
    if (!technician || !technician.value.trim()) {
        fail(technician, "Technician / workshop is required.");
    }

    const scheduledDate = fields.maintenanceScheduledDate;
    if (!scheduledDate || !scheduledDate.value) {
        fail(scheduledDate, "Scheduled date is required.");
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = fields.maintenanceScheduledDate;
        if (!scheduledDate || !scheduledDate.value) {
            fail(scheduledDate, "Scheduled date is required.");
        } else {
            const today = new Date();
            const todayLocal =
                today.getFullYear() +
                "-" +
                String(today.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(today.getDate()).padStart(2, "0");
            if (scheduledDate.value < todayLocal) {
                fail(scheduledDate, "Scheduled date cannot be in the past.");
            }
        }
    }

    const completionDate = fields.maintenanceCompletionDate;
    if (completionDate && completionDate.value) {
        const today = getMaintenanceLocalDate();
        const completionValue = completionDate.value;
        if (completionValue < today) {
            fail(completionDate, "Completion date cannot be in the past.");
        }
        const scheduledDateValue = fields.maintenanceScheduledDate
            ? fields.maintenanceScheduledDate.value
            : "";
        if (scheduledDateValue && completionValue < scheduledDateValue) {
            fail(
                completionDate,
                "Completion date cannot be earlier than scheduled date.",
            );
        }
    }

    const cost = fields.maintenanceCost;
    if (cost && cost.value !== "") {
        const costValue = parseFloat(cost.value);
        if (isNaN(costValue) || costValue < 0) {
            fail(cost, "Cost must be zero or greater.");
        }
    }

    const priority = fields.maintenancePriority;
    if (!priority || !priority.value) {
        fail(priority, "Priority is required.");
    }

    const status = fields.maintenanceStatus;
    if (!status || !status.value) {
        fail(status, "Status is required.");
    }

    const odometer = fields.maintenanceOdometer;
    if (odometer && odometer.value !== "") {
        const odometerValue = parseFloat(odometer.value);
        if (isNaN(odometerValue) || odometerValue < 0) {
            fail(odometer, "Odometer reading must be zero or greater.");
        }
    }

    const description = fields.maintenanceDescription;
    if (!description || !description.value.trim()) {
        fail(description, "Description is required.");
    } else if (description.value.trim().length < 5) {
        fail(description, "Description must be at least 5 characters.");
    }

    if (firstInvalidField) {
        firstInvalidField.focus();
        return false;
    }

    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    initMaintenanceModal();
});