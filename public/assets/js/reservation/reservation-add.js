/* ==========================================
   Reservation Module Settings
========================================== */
window.getReservationModuleSettings =
    window.getReservationModuleSettings ||
    async function () {
        const defaults = {
            requireApproval: true,
            allowSameDay: true,
            maxAdvanceDays: 30,
            defaultDurationHours: 2,
        };
        try {
            const response = await fetch("/settings/data", {
                headers: {
                    Accept: "application/json",
                },
                credentials: "same-origin",
            });
            if (!response.ok) {
                throw new Error("Unable to load reservation settings.");
            }
            const data = await response.json();
            const settings = data?.settings?.reservations;
            if (!settings || typeof settings !== "object") {
                return defaults;
            }

            return {
                requireApproval: settings.requireApproval !== false,
                allowSameDay: settings.allowSameDay !== false,
                maxAdvanceDays: Math.max(
                    1,
                    Math.min(365, Number(settings.maxAdvanceDays ?? 30)),
                ),
                defaultDurationHours: Math.max(
                    1,
                    Math.min(72, Number(settings.defaultDurationHours ?? 2)),
                ),
            };
        } catch (error) {
            console.error("Reservation settings load error:", error);
            return defaults;
        }
    };

function reservationFormatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isEmergencyTransferReservation() {
    return (
        document.getElementById("reservationType")?.value ===
        "Emergency Transfer"
    );
}
function getCurrentReservationTime() {
    const now = new Date();

    return `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
    ).padStart(2, "0")}`;
}

function isSupplyDeliveryReservation() {
    return (
        document.getElementById("reservationType")?.value === "Supply Delivery"
    );
}
function applyReservationLogisticsVisibility() {
    const section = document.getElementById("reservationLogisticsSection");
    if (!section) {
        return;
    }
    section.hidden = !isSupplyDeliveryReservation();
}

async function loadSupplyDeliveryShipments() {
    const select = document.getElementById("reservationShipment");
    if (!select) {
        return;
    }
    select.innerHTML = `
        <option value="">
            Waiting for Logistics integration
        </option>
    `;
    select.disabled = true;
    clearReservationLogisticsFields();
}

function clearReservationLogisticsFields() {
    const fields = [
        "logisticsExternalId",
        "logisticsPoNumber",
        "logisticsSupplier",
        "logisticsTrackingNumber",
        "logisticsStatus",
        "logisticsEta",
    ];
    fields.forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.value = id === "logisticsStatus" ? "Not Synced" : "";
    });
}
function applySelectedShipmentDetails() {
    const select = document.getElementById("reservationShipment");
    if (!select) return;
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption?.dataset?.shipment) {
        clearReservationLogisticsFields();
        return;
    }
    const shipment = JSON.parse(selectedOption.dataset.shipment);
    document.getElementById("logisticsExternalId").value =
        shipment.shipment_number ?? "";
    document.getElementById("logisticsPoNumber").value =
        shipment.po_number ?? "";
    document.getElementById("logisticsSupplier").value =
        shipment.supplier_name ?? "";
    document.getElementById("logisticsTrackingNumber").value =
        shipment.tracking_number || shipment.waybill_number || "";
    document.getElementById("logisticsStatus").value =
        shipment.status ?? "Unknown";
    document.getElementById("logisticsEta").value =
        shipment.estimated_delivery_date ?? "";
    const pickup = document.getElementById("reservationPickup");
    const destination = document.getElementById("reservationDestination");
    if (pickup) {
        pickup.value =
            shipment.origin_address || shipment.pickup_location_name || "";
    }
    if (destination) {
        destination.value = shipment.destination_facility || "";
    }
}

function applyReservationPatientRequirement() {
    const patientInput = document.getElementById("reservationPatient");
    const patientLabel = document.getElementById("reservationPatientLabel");
    if (!patientInput || !patientLabel) {
        return;
    }
    const required = [
        "Patient Transport",
        "Emergency Transfer",
        "Medical Appointment",
        "Laboratory Transport",
    ].includes(document.getElementById("reservationType")?.value);
    patientLabel.textContent = required ? "Patient Name *" : "Patient Name";
}

function applyReservationAddSettings(settings) {
    const dateInput = document.getElementById("reservationDate");
    const timeInput = document.getElementById("reservationTime");
    const statusSelect = document.getElementById("reservationStatus");
    const statusHint = document.getElementById("reservationStatusHint");
    const prioritySelect = document.getElementById("reservationPriority");
    const today = new Date();
    const minimumDate = new Date(today);
    if (!settings.allowSameDay) {
        minimumDate.setDate(minimumDate.getDate() + 1);
    }
    const maximumDate = new Date(today);
    maximumDate.setDate(maximumDate.getDate() + settings.maxAdvanceDays);
    const todayValue = reservationFormatDate(today);
    const minimumDateValue = reservationFormatDate(minimumDate);
    const maximumDateValue = reservationFormatDate(maximumDate);
    const emergency = isEmergencyTransferReservation();
    /*
    |--------------------------------------------------------------------------
    | Date
    |--------------------------------------------------------------------------
    */
    if (dateInput) {
        dateInput.min = minimumDateValue;
        dateInput.max = maximumDateValue;
        if (emergency) {
            dateInput.value = todayValue;
            /*
            | Emergency transfer is immediate.
            | Prevent manual scheduling for a future date.
            */
            dateInput.disabled = true;
        } else {
            dateInput.disabled = false;
        }
    }
    /*
    |--------------------------------------------------------------------------
    | Time
    |--------------------------------------------------------------------------
    */
    if (timeInput) {
        if (emergency) {
            timeInput.value = getCurrentReservationTime();
            /*
            | Emergency time is controlled automatically.
            */
            timeInput.disabled = true;
        } else {
            timeInput.disabled = false;
        }
    }
    /*
    |--------------------------------------------------------------------------
    | Priority
    |--------------------------------------------------------------------------
    */
    if (prioritySelect) {
        if (emergency) {
            prioritySelect.value = "Emergency";

            prioritySelect.disabled = true;
        } else {
            prioritySelect.disabled = false;
            /*
            | Emergency priority must not remain selected
            | for a normal request.
            */
            if (prioritySelect.value === "Emergency") {
                prioritySelect.value = "";
            }
            /*
            | Preserve normal default behavior.
            */
        }
    }
    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */
    if (statusSelect) {
        if (emergency) {
            statusSelect.value = "Approved";
        } else {
            statusSelect.value = settings.requireApproval
                ? "Pending"
                : "Approved";
        }
    }
    /*
    |--------------------------------------------------------------------------
    | Status Hint
    |--------------------------------------------------------------------------
    */
    if (statusHint) {
        if (emergency) {
            statusHint.textContent =
                "Emergency Transfer is automatically approved for immediate processing.";
        } else {
            statusHint.textContent = settings.requireApproval
                ? "New reservations require approval and will start as Pending."
                : "Approval is disabled. New reservations will start as Approved.";
        }
    }
}

//   RBAC
function getReservationRole() {
    return window.FleetRBAC?.getRole?.() || "";
}
function canCreateReservation() {
    return (
        window.FleetRBAC?.hasPermission?.("reservations", "canCreate") === true
    );
}
function isDepartmentHeadReservationUser() {
    return getReservationRole() === "department_head";
}
function applyReservationAddRbac() {
    if (!isDepartmentHeadReservationUser()) {
        return;
    }
    ["reservationVehicle", "reservationDriver"].forEach((id) => {
        const field = document.getElementById(id);
        if (!field) return;
        const wrapper = field.closest(".form-group");
        if (wrapper) {
            wrapper.hidden = true;
        }
        field.disabled = true;
    });
}

async function loadNextReservationNumber() {
    const numberInput = document.getElementById("reservationNumber");
    const saveButton = document.getElementById("saveReservationBtn");
    if (!numberInput) {
        return;
    }
    /*
    |--------------------------------------------------------------------------
    | Loading State
    |--------------------------------------------------------------------------
    */
    numberInput.value = "Generating...";
    numberInput.classList.add("is-generating");
    if (saveButton) {
        saveButton.disabled = true;
    }

    try {
        const response = await fetch("/reservation/next-number", {
            method: "GET",
            headers: {
                Accept: "application/json",

                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(
                data.message || "Failed to generate reservation number.",
            );
        }
        numberInput.value = data.reservation_number || "";
        if (!numberInput.value) {
            throw new Error("Reservation number was not generated.");
        }
    } catch (error) {
        console.error("Failed to load next reservation number:", error);
        numberInput.value = "Unable to generate";
        if (typeof window.showToast === "function") {
            window.showToast(
                error.message || "Failed to generate reservation number.",
                "error",
            );
        }
    } finally {
        numberInput.classList.remove("is-generating");
        /*
         * Only enable Save when a real
         * reservation number exists.
         */
        if (saveButton) {
            saveButton.disabled =
                !numberInput.value ||
                numberInput.value === "Unable to generate";
        }
    }
}

async function loadReservationOptions() {
    const vehicleSelect = document.getElementById("reservationVehicle");
    const driverSelect = document.getElementById("reservationDriver");

    if (!vehicleSelect || !driverSelect) return;

    vehicleSelect.innerHTML = '<option value="">Loading vehicles...</option>';
    driverSelect.innerHTML = '<option value="">Select Vehicle First</option>';
    driverSelect.disabled = true;

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

        vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';

        vehicles.forEach((vehicle) => {
            const option = document.createElement("option");
            option.value = vehicle.id;
            option.textContent = `${vehicle.brand} ${vehicle.model} - ${vehicle.vehicle_type}`;
            option.dataset.driverId = vehicle.drivers?.[0]?.id || "";
            option.dataset.driverName = vehicle.drivers?.[0]
                ? `${vehicle.drivers[0].first_name} ${vehicle.drivers[0].last_name}`
                : "";
            vehicleSelect.appendChild(option);
        });

        if (vehicleSelect.dataset.driverBehaviorInitialized !== "true") {
            vehicleSelect.dataset.driverBehaviorInitialized = "true";
            vehicleSelect.addEventListener("change", () => {
                const selectedOption =
                    vehicleSelect.options[vehicleSelect.selectedIndex];
                const driverId = selectedOption?.dataset.driverId || "";
                const driverName = selectedOption?.dataset.driverName || "";
                driverSelect.innerHTML = "";
                if (driverId && driverName) {
                    const option = document.createElement("option");
                    option.value = driverId;
                    option.textContent = driverName;
                    driverSelect.appendChild(option);
                    driverSelect.disabled = false;
                } else {
                    const option = document.createElement("option");
                    option.value = "";
                    option.textContent = "No Assigned Driver";
                    driverSelect.appendChild(option);
                    driverSelect.disabled = true;
                }
            });
        }
    } catch (error) {
        console.error("Failed to load reservation options:", error);

        vehicleSelect.innerHTML =
            '<option value="">Failed to load vehicles</option>';

        driverSelect.innerHTML =
            '<option value="">Failed to load driver</option>';

        driverSelect.disabled = true;
    }
}

async function initReservationAdd() {
    if (!canCreateReservation()) {
        return;
    }
    const modal = document.getElementById("addReservationModal");
    const form = document.getElementById("reservationForm");

    if (!modal || !form) return;
    if (form.dataset.reservationAddInitialized === "true") return;

    const reservationSettings = await window.getReservationModuleSettings();

    applyReservationAddSettings(reservationSettings);
    applyReservationAddRbac();

    applyReservationLogisticsVisibility();
    applyReservationPatientRequirement();

    setupFacilityAutocomplete(
        "reservationPickup",
        "reservationPickupSuggestions",
        "pickup",
    );
    setupFacilityAutocomplete(
        "reservationDestination",
        "reservationDestinationSuggestions",
        "destination",
    );

    if (isSupplyDeliveryReservation()) {
        await loadSupplyDeliveryShipments();
    }

    const shipmentSelect = document.getElementById("reservationShipment");
    if (
        shipmentSelect &&
        shipmentSelect.dataset.shipmentBehaviorInitialized !== "true"
    ) {
        shipmentSelect.dataset.shipmentBehaviorInitialized = "true";
        shipmentSelect.addEventListener("change", applySelectedShipmentDetails);
    }

    const requestTypeSelect = document.getElementById("reservationType");
    if (
        requestTypeSelect &&
        requestTypeSelect.dataset.emergencyBehaviorInitialized !== "true"
    ) {
        requestTypeSelect.dataset.emergencyBehaviorInitialized = "true";
        requestTypeSelect.addEventListener("change", async () => {
            applyReservationAddSettings(reservationSettings);
            applyReservationLogisticsVisibility();
            applyReservationPatientRequirement();
            document
                .querySelectorAll(".facility-suggestions")
                .forEach((element) => {
                    element.innerHTML = "";
                    element.hidden = true;
                });
            const shipmentSelect = document.getElementById(
                "reservationShipment",
            );
            if (!shipmentSelect) {
                return;
            }
            if (isSupplyDeliveryReservation()) {
                await loadSupplyDeliveryShipments();
            } else {
                shipmentSelect.value = "";
                shipmentSelect.innerHTML =
                    '<option value="">Select Logistics Shipment</option>';
                shipmentSelect.disabled = true;
                clearReservationLogisticsFields();
            }
        });
    }

    form.dataset.reservationAddInitialized = "true";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateReservationForm(form)) {
            return;
        }

        if (isSupplyDeliveryReservation()) {
            window.showToast(
                "Supply Delivery is unavailable until Logistics integration is connected.",
                "error",
            );
            return;
        }

        const role = getReservationRole();
        const formData = {
            reservation_number: document
                .getElementById("reservationNumber")
                .value.trim(),
            patient_name: document
                .getElementById("reservationPatient")
                .value.trim(),
            request_type: document.getElementById("reservationType").value,
            shipment_id: isSupplyDeliveryReservation()
                ? document.getElementById("reservationShipment")?.value || null
                : null,
            pickup_location: document
                .getElementById("reservationPickup")
                .value.trim(),
            pickup_hospital_id:
                document.getElementById("reservationPickup")?.dataset
                    .facilityId || null,
            destination: document
                .getElementById("reservationDestination")
                .value.trim(),
            destination_hospital_id:
                document.getElementById("reservationDestination")?.dataset
                    .facilityId || null,
            schedule_date: document.getElementById("reservationDate").value,
            schedule_time: document.getElementById("reservationTime").value,
            priority: document.getElementById("reservationPriority").value,
            contact_number: document
                .getElementById("reservationContact")
                .value.trim(),
            notes: document.getElementById("reservationNotes").value.trim(),
        };

        if (role !== "department_head") {
            formData.vehicle_id =
                document.getElementById("reservationVehicle")?.value || null;
            formData.driver_id =
                document.getElementById("reservationDriver")?.value || null;
        }

        try {
            const response = await fetch("/reservation", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",

                    "X-CSRF-TOKEN": document.querySelector(
                        'meta[name="csrf-token"]',
                    ).content,
                },

                body: JSON.stringify(formData),
            });

            const data = await response.json();

            console.log("ADD RESERVATION RESPONSE:", response.status, data);

            if (response.status === 422) {
                const errors = data.errors;

                const firstError = errors
                    ? Object.values(errors).flat()[0]
                    : null;

                window.showToast(
                    firstError ||
                        data.message ||
                        "Please check the reservation information.",
                    "error",
                );

                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Failed to add reservation.");
            }

            if (data.success) {
                // Normal reservations stay on Reservation page
                await loadReservations();

                // Reset form
                form.reset();

                ["reservationPickup", "reservationDestination"].forEach(
                    (id) => {
                        const input = document.getElementById(id);
                        if (!input) {
                            return;
                        }
                        delete input.dataset.facilityId;
                        delete input.dataset.latitude;
                        delete input.dataset.longitude;
                    },
                );

                applyReservationAddSettings(reservationSettings);
                applyReservationAddRbac();
                applyReservationLogisticsVisibility();
                applyReservationPatientRequirement();

                const shipmentSelect = document.getElementById(
                    "reservationShipment",
                );
                if (shipmentSelect) {
                    shipmentSelect.innerHTML =
                        '<option value="">Select Logistics Shipment</option>';
                    shipmentSelect.value = "";
                    shipmentSelect.disabled = true;
                }
                clearReservationLogisticsFields();

                await loadNextReservationNumber();
                if (!isDepartmentHeadReservationUser()) {
                    await loadReservationOptions();
                }

                if (typeof clearAllReservationErrors === "function") {
                    clearAllReservationErrors(form);
                }

                form.querySelectorAll(".is-invalid").forEach((field) => {
                    field.classList.remove("is-invalid");
                });

                // Close modal
                modal.classList.remove("show");
                document.body.style.overflow = "";

                // Toast
                window.showToast(data.message, "success");
            }
        } catch (error) {
            console.error("ADD RESERVATION ERROR:", error);

            window.showToast("Failed to add reservation.", "error");
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initReservationAdd();
});


let facilitySearchTimers = {
    pickup: null,
    destination: null,
};

function setupFacilityAutocomplete(
    inputId,
    suggestionsId,
    type,
    requestTypeId = "reservationType",
) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);
    if (!input || !suggestions) {
        return;
    }
    input.addEventListener("input", () => {
        delete input.dataset.facilityId;
        delete input.dataset.latitude;
        delete input.dataset.longitude;
        if (
            document.getElementById(requestTypeId)?.value === "Supply Delivery"
        ) {
            suggestions.innerHTML = "";
            suggestions.hidden = true;
            return;
        }
        const search = input.value.trim();
        clearTimeout(facilitySearchTimers[type]);
        if (search.length < 2) {
            suggestions.innerHTML = "";
            suggestions.hidden = true;
            return;
        }
        facilitySearchTimers[type] = setTimeout(async () => {
            await loadFacilitySuggestions(search, input, suggestions);
        }, 300);
    });
    input.addEventListener("focus", async () => {
        if (
            document.getElementById(requestTypeId)?.value === "Supply Delivery"
        ) {
            suggestions.innerHTML = "";
            suggestions.hidden = true;
            return;
        }
        const search = input.value.trim();
        if (search.length < 2) {
            return;
        }
        await loadFacilitySuggestions(search, input, suggestions);
    });
    document.addEventListener("click", (event) => {
        const wrapper = input.closest(".facility-autocomplete");

        if (!wrapper?.contains(event.target)) {
            suggestions.hidden = true;
        }
    });
}

async function loadFacilitySuggestions(search, input, suggestions) {
    try {
        const response = await fetch(
            `/reservation/hospital-facilities?search=${encodeURIComponent(search)}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
            },
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!data.success || !Array.isArray(data.facilities)) {
            suggestions.innerHTML = `
                <div class="facility-suggestion-empty">
                    No facility found.
                </div>
            `;
            suggestions.hidden = false;
            return;
        }
        if (data.facilities.length === 0) {
            suggestions.innerHTML = `
                <div class="facility-suggestion-empty">
                    No matching hospital or facility found.
                </div>
            `;
            suggestions.hidden = false;
            return;
        }
        suggestions.innerHTML = data.facilities
            .map((facility) => {
                const name = escapeFacilityHtml(facility.name ?? "");
                const address = escapeFacilityHtml(facility.address ?? "");
                /*
                |--------------------------------------------------------------------------
                | Selected value
                |--------------------------------------------------------------------------
                | The search result displays Name + Address,
                | but the actual Reservation field stores Name only.
                |--------------------------------------------------------------------------
                */
                const value = escapeFacilityHtml(facility.name ?? "");
                const facilityId = facility.id ?? "";
                
                return `
                    <div
                        class="facility-suggestion-item"
                        data-id="${escapeFacilityHtml(facilityId)}"
                        data-value="${value}"
                    >
                        <div class="facility-suggestion-name">
                            ${name}
                        </div>

                        <div class="facility-suggestion-address">
                            ${address}
                        </div>
                    </div>
                `;
            })
            .join("");
        suggestions.hidden = false;
        suggestions
            .querySelectorAll(".facility-suggestion-item")
            .forEach((item) => {
                item.addEventListener("click", () => {
                    /*
                    |--------------------------------------------------------------------------
                    | Reservation stores hospital/facility name only.
                    |--------------------------------------------------------------------------
                    */
                    input.value = item.dataset.value || "";

                    /*
                    |--------------------------------------------------------------------------
                    | Preserve the exact HospitalFacility record.
                    |--------------------------------------------------------------------------
                    */
                    input.dataset.facilityId = item.dataset.id || "";

                    /*
                    |--------------------------------------------------------------------------
                    | Do not store/use coordinates in Reservation autocomplete.
                    |--------------------------------------------------------------------------
                    */
                    delete input.dataset.latitude;
                    delete input.dataset.longitude;

                    suggestions.innerHTML = "";
                    suggestions.hidden = true;
                });
            });
    } catch (error) {
        console.error("Failed to load hospital facilities:", error);
        suggestions.innerHTML = `
            <div class="facility-suggestion-empty">
                Unable to load facility suggestions.
            </div>
        `;

        suggestions.hidden = false;
    }
}

function escapeFacilityHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}