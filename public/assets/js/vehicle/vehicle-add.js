/* ==========================================
   Add Vehicle
========================================== */

/* ==========================================
   Vehicle Module Settings
========================================== */
window.getVehicleModuleSettings =
  window.getVehicleModuleSettings ||
  async function () {
    const defaults = {
        requirePlateNumber: true,
        requireDepartment: false,
        defaultStatus: "Available",
    };

    try {
      const response =
        await fetch(
          "/settings/data",
          {
            headers: {
              Accept: "application/json",
            },
            credentials: "same-origin",
          }
        );

      if (!response.ok) {
        throw new Error(
          "Unable to load vehicle settings."
        );
      }
      const data =
        await response.json();
      const settings =
        data?.settings?.vehicles;
      if (
        !settings ||
        typeof settings !== "object"
      ) {
        return defaults;
      }
      const allowedStatuses = [
        "Available",
        "On Trip",
        "Maintenance",
        "Out of Service",
      ];
      return {
          requirePlateNumber: settings.requirePlateNumber !== false,
          requireDepartment: settings.requireDepartment === true,
          defaultStatus: allowedStatuses.includes(settings.defaultStatus)
              ? settings.defaultStatus
              : defaults.defaultStatus,
      };
    } catch (error) {
      console.error(
        "Vehicle settings load error:",
        error
      );
      return defaults;
    }
  };

function applyVehicleAddSettings(settings) {
    const plate = document.getElementById("vehiclePlate");
    const plateMark = document.getElementById("vehiclePlateRequiredMark");
    const department = document.getElementById("vehicleDepartment");
    const departmentMark = document.getElementById(
        "vehicleDepartmentRequiredMark",
    );
    const status = document.getElementById("vehicleStatus");
    const requirePlate = settings?.requirePlateNumber !== false;
    const requireDepartment = settings?.requireDepartment === true;
    if (plate) {
        plate.required = requirePlate;
    }
    if (plateMark) {
        plateMark.hidden = !requirePlate;
    }
    if (department) {
        department.required = requireDepartment;
    }
    if (departmentMark) {
        departmentMark.hidden = !requireDepartment;
    }
    if (status && !status.value) {
        status.value = settings?.defaultStatus || "Available";
    }
}

async function loadAvailableDrivers(selectedId = null) {
    const select = document.getElementById("vehicleDriver");

    if (!select) {
        return;
    }

    try {
        const response = await fetch("/drivers/available", {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to load available drivers.");
        }

        const drivers = await response.json();

        select.innerHTML = `
            <option value="">Select Driver</option>
        `;

        drivers.forEach((driver) => {
            const option = document.createElement("option");

            option.value = driver.id;

            option.textContent = `${driver.first_name} ${driver.last_name}`;

            if (
                selectedId != null &&
                String(selectedId) === String(driver.id)
            ) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    } catch (error) {
        console.error("Available drivers load error:", error);

        select.innerHTML = `
            <option value="">Unable to load drivers</option>
        `;
    }
}

function setVehicleFieldValidationMessage(field) {
    if (!field) {
        return;
    }

    field.setCustomValidity("Please complete this required field.");

    const clearValidationMessage = () => field.setCustomValidity("");

    field.addEventListener("input", clearValidationMessage, { once: true });
    field.addEventListener("change", clearValidationMessage, { once: true });

    field.reportValidity();
    field.focus();
}

function validateVehicleFuelFields() {
    const tankCapacity = document.getElementById("vehicleTankCapacity");
    const currentFuel = document.getElementById("vehicleCurrentFuel");
    const currentOdometer = document.getElementById("vehicleMileage");

    if (!tankCapacity || !currentFuel) {
        return true;
    }

    const tankValue = Number(tankCapacity.value);
    const fuelValue = Number(currentFuel.value);

    if (Number.isNaN(tankValue) || tankValue <= 0) {
        setVehicleFieldValidationMessage(tankCapacity);

        return false;
    }

    if (Number.isNaN(fuelValue) || fuelValue < 0) {
        setVehicleFieldValidationMessage(currentFuel);

        return false;
    }

    if (fuelValue > tankValue) {
        currentFuel.setCustomValidity(
            "Current fuel cannot be greater than tank capacity.",
        );

        currentFuel.reportValidity();
        currentFuel.focus();

        return false;
    }

    if (currentOdometer && currentOdometer.value !== "") {
        const odometerValue = Number(currentOdometer.value);

        if (Number.isNaN(odometerValue) || odometerValue < 0) {
            setVehicleFieldValidationMessage(currentOdometer);

            return false;
        }
    }

    return true;
}


async function initVehicleAdd() {
    const form = document.getElementById("vehicleForm");

    if (!form || form.dataset.vehicleAddInitialized === "true") {
        return;
    }

    const vehicleSettings = await window.getVehicleModuleSettings();
    applyVehicleAddSettings(vehicleSettings);

    const alwaysRequiredFields = [
        "vehicleType",
        "vehicleBrand",
        "vehicleModel",
        "vehicleCapacity",
        "vehicleFuel",
        "vehicleTankCapacity",
        "vehicleCurrentFuel",
        "vehicleMileage",
        "vehicleStatus",
    ]
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    alwaysRequiredFields.forEach((field) => {
        field.required = true;
    });

    function getRequiredVehicleFields() {
        const fields = [...alwaysRequiredFields];
        const plate = document.getElementById("vehiclePlate");
        const department = document.getElementById("vehicleDepartment");
        if (plate && plate.required) {
            fields.unshift(plate);
        }
        if (department && department.required) {
            fields.push(department);
        }
        return fields;
    }

    form.dataset.vehicleAddInitialized = "true";

    const tankCapacity = document.getElementById("vehicleTankCapacity");
    const currentFuel = document.getElementById("vehicleCurrentFuel");
    const updateFuelValidity = () => {
        if (!tankCapacity || !currentFuel) {
            return;
        }

        const tankValue = Number(tankCapacity.value);

        const fuelValue = Number(currentFuel.value);

        if (
            currentFuel.value !== "" &&
            tankCapacity.value !== "" &&
            !Number.isNaN(fuelValue) &&
            !Number.isNaN(tankValue) &&
            fuelValue > tankValue
        ) {
            currentFuel.setCustomValidity(
                "Current fuel cannot be greater than tank capacity.",
            );
        } else {
            currentFuel.setCustomValidity("");
        }
    };

    tankCapacity?.addEventListener("input", updateFuelValidity);

    currentFuel?.addEventListener("input", updateFuelValidity);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const requiredFields = getRequiredVehicleFields();

        const emptyField = requiredFields.find(
            (field) => String(field.value ?? "").trim() === "",
        );

        if (emptyField) {
            setVehicleFieldValidationMessage(emptyField);

            return;
        }

        if (!validateVehicleFuelFields()) {
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content");

        if (!csrfToken) {
            window.showToast("CSRF token not found.", "error");

            return;
        }

        const formData = {
            plate_number:
                document.getElementById("vehiclePlate")?.value.trim() || "",
            vehicle_type: document.getElementById("vehicleType")?.value || "",
            department:
                document.getElementById("vehicleDepartment")?.value || null,
            brand: document.getElementById("vehicleBrand")?.value.trim() || "",
            model: document.getElementById("vehicleModel")?.value.trim() || "",
            purchase_date:
                document.getElementById("vehiclePurchaseDate")?.value || null,
            insurance_expiry:
                document.getElementById("vehicleInsuranceExpiry")?.value ||
                null,
            capacity: document.getElementById("vehicleCapacity")?.value || "",
            fuel_type: document.getElementById("vehicleFuel")?.value || "",
            tank_capacity:
                document.getElementById("vehicleTankCapacity")?.value || "",
            current_fuel:
                document.getElementById("vehicleCurrentFuel")?.value || "",
            current_odometer:
                document.getElementById("vehicleMileage")?.value || "",
            status: document.getElementById("vehicleStatus")?.value || "",
            notes:
                document.getElementById("vehicleNotes")?.value.trim() || null,
            assigned_driver_id:
                document.getElementById("vehicleDriver")?.value || null,
        };

        const saveButton = document.getElementById("saveVehicleBtn");

        if (saveButton) {
            saveButton.disabled = true;

            saveButton.innerHTML = '<i class="ph ph-spinner"></i> Saving...';
        }

        try {
            const response = await fetch("/fleet", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": csrfToken,
                },

                body: JSON.stringify(formData),
            });

            const data = await response.json();

            console.log("ADD VEHICLE RESPONSE:", response.status, data);

            if (!response.ok) {
                throw {
                    status: response.status,

                    data,
                };
            }

            form.reset();

            applyVehicleAddSettings(vehicleSettings);

            if (typeof resetVehicleImagePreview === "function") {
                resetVehicleImagePreview();
            }

            const modal = document.getElementById("vehicleModal");

            if (typeof closeVehicleModal === "function") {
                closeVehicleModal(modal);
            } else {
                modal?.classList.remove("show");

                document.body.style.overflow = "";
            }

            if (typeof loadAvailableDrivers === "function") {
                loadAvailableDrivers();
            }
            if (typeof updateVehicleStats === "function") {
                updateVehicleStats();
            }
            if (typeof applyVehicleFilters === "function") {
                applyVehicleFilters();
            }
            if (typeof loadVehicles === "function") {
                await loadVehicles();
            }

            window.showToast(
                data.message || "Vehicle requested successfully.",
                "success",
            );
        } catch (error) {
            console.error("ADD VEHICLE ERROR:", error);

            if (error.status === 422) {
                const errors = error.data?.errors;

                console.log("VALIDATION ERRORS:", errors);

                const firstError = errors
                    ? Object.values(errors).flat()[0]
                    : null;

                window.showToast(
                    firstError ||
                        error.data?.message ||
                        "Please check the vehicle information.",
                    "error",
                );

                return;
            }

            window.showToast("Unable to add vehicle.", "error");
        } finally {
            if (saveButton) {
                saveButton.disabled = false;

                saveButton.innerHTML =
                    '<i class="ph ph-floppy-disk"></i> Save Vehicle';
            }
        }
    });
}


document.addEventListener("DOMContentLoaded", async () => {
    await initVehicleAdd();
    loadAvailableDrivers();
});
