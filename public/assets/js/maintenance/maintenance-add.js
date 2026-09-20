/* ==========================================
   Maintenance Add
========================================== */

/* ==========================================
   Maintenance Module Settings
========================================== */
window.getMaintenanceModuleSettings =
    window.getMaintenanceModuleSettings ||
    async function () {
        const defaults = {
            overdueWarnDays: 3,
            requireCost: true,
            defaultType:
                "Preventive Maintenance",
        };

        try {
            const response = await fetch(
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
                    "Unable to load Maintenance settings."
                );
            }
            const data =
                await response.json();
            const settings =
                data?.settings?.maintenance;

            if (
                !settings ||
                typeof settings !== "object"
            ) {
                return defaults;
            }
            const allowedTypes = [
                "Preventive Maintenance",
                "Corrective Repair",
                "Inspection",
                "Oil Change",
                "Tire Service",
                "Brake Service",
                "Engine Service",
                "Other",
            ];
            return {
                overdueWarnDays:
                    Math.max(
                        1,
                        Math.min(
                            90,
                            Number(
                                settings.overdueWarnDays
                                ?? 3
                            )
                        )
                    ),

                requireCost:
                    settings.requireCost !== false,

                defaultType:
                    allowedTypes.includes(
                        settings.defaultType
                    )
                        ? settings.defaultType
                        : defaults.defaultType,
            };
        } catch (error) {
            console.error(
                "Maintenance settings load error:",
                error
            );

            return defaults;
        }
    };
    
function applyMaintenanceAddSettings(
    settings
) {
    const serviceType =
        document.getElementById(
            "maintenanceServiceType"
        );
    const status =
        document.getElementById(
            "maintenanceStatus"
        );
    const cost =
        document.getElementById(
            "maintenanceCost"
        );
    const costMark =
        document.getElementById(
            "maintenanceCostRequiredMark"
        );
    /*
    |--------------------------------------------------------------------------
    | Default Maintenance Type
    |--------------------------------------------------------------------------
    */
    if (
        serviceType &&
        !serviceType.value
    ) {
        serviceType.value =
            settings.defaultType;
    }
    /*
    |--------------------------------------------------------------------------
    | Cost Requirement
    |--------------------------------------------------------------------------
    */
    const completed =
        status?.value === "Completed";
    const costRequired =
        settings.requireCost &&
        completed;
    if (cost) {
        cost.required =
            costRequired;
    }
    if (costMark) {
        costMark.hidden =
            !costRequired;
    }
}


//  RBAC
function canCreateMaintenance() {
    return (
        window.FleetRBAC?.hasPermission?.("maintenance", "canCreate") === true
    );
}

let maintenanceNumberRequestController = null;

async function loadNextMaintenanceNumber() {
    if (!canCreateMaintenance()) {
        return;
    }
    const input = document.getElementById("maintenanceNumber");
    if (!input) {
        return;
    }
    if (maintenanceNumberRequestController) {
        maintenanceNumberRequestController.abort();
    }
    maintenanceNumberRequestController = new AbortController();
    input.value = "Generating...";
    input.classList.add("is-generating");
    try {
        const response = await fetch("/maintenance/next-number", {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            signal: maintenanceNumberRequestController.signal,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(
                data?.message || "Unable to generate maintenance number.",
            );
        }

        input.value = data?.maintenance_number || "";
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }
        console.error("Maintenance number load error:", error);
        input.value = "Unable to generate";
        if (typeof showToast === "function") {
            showToast(
                error.message || "Unable to generate maintenance number.",
                "error",
            );
        }
    } finally {
        input.classList.remove("is-generating");
    }
}

let availableMaintenanceVehicles = [];
let maintenanceAddInitialized = false;

async function loadAvailableMaintenanceVehicles() {
    if (!canCreateMaintenance()) {
        return;
    }
    const select = document.getElementById("maintenanceVehicle");

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Loading vehicles...</option>';

    try {
        const response = await fetch("/maintenance/available-vehicles", {
            headers: {
                Accept: "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load available vehicles.",
            );
        }

        availableMaintenanceVehicles = data.vehicles || [];

        populateMaintenanceVehicleSelect(availableMaintenanceVehicles);
    } catch (error) {
        console.error("Maintenance vehicle load error:", error);

        select.innerHTML = '<option value="">Failed to load vehicles</option>';

        if (typeof showToast === "function") {
            showToast("Failed to load available vehicles.", "error");
        }
    }
}

function populateMaintenanceVehicleSelect(vehicles) {
    const select = document.getElementById("maintenanceVehicle");

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Select Vehicle</option>';

    vehicles.forEach((vehicle) => {
        const option = document.createElement("option");

        option.value = vehicle.id;

        const vehicleName = [vehicle.brand, vehicle.model]
            .filter(Boolean)
            .join(" ");

        const vehicleType = vehicle.vehicle_type || "";

        option.textContent = [vehicleName, vehicleType]
            .filter(Boolean)
            .join(" - ");

        select.appendChild(option);
    });
}

function createMaintenanceRow(form, savedMaintenance = null) {
    const canUpdate =
        window.FleetRBAC?.hasPermission?.("maintenance", "canUpdate") === true;
    const canArchive =
        window.FleetRBAC?.hasPermission?.("maintenance", "canArchive") === true;
    const canBulkArchive =
        window.FleetRBAC?.hasPermission?.("maintenance", "canBulkArchive") ===
        true;
    const canRestore =
        window.FleetRBAC?.hasPermission?.("maintenance", "canRestore") === true;
    const isArchived = Boolean(savedMaintenance?.archived_at);
    const get = (id) => {
        const el = form.querySelector("#" + id);
        return el ? el.value : "";
    };
    const number =
        savedMaintenance?.maintenance_number ?? get("maintenanceNumber");
    const vehicleId = savedMaintenance?.vehicle_id ?? get("maintenanceVehicle");
    const serviceType =
        savedMaintenance?.maintenance_type ?? get("maintenanceServiceType");
    const technician =
        savedMaintenance?.technician ?? get("maintenanceTechnician");
    const scheduledDateRaw =
        savedMaintenance?.maintenance_date ?? get("maintenanceScheduledDate");
    const completionDateRaw =
        savedMaintenance?.completion_date ?? get("maintenanceCompletionDate");
    const costRaw = savedMaintenance?.cost ?? get("maintenanceCost");
    const priority = savedMaintenance?.priority ?? get("maintenancePriority");
    const status = savedMaintenance?.status ?? get("maintenanceStatus");
    const odometer = savedMaintenance?.odometer ?? get("maintenanceOdometer");
    const description =
        savedMaintenance?.description ?? get("maintenanceDescription");
    const partsUsed =
        savedMaintenance?.parts_used ?? get("maintenancePartsUsed");
    const notes = savedMaintenance?.notes ?? get("maintenanceNotes");

    function formatDate(raw) {
        if (!raw) {
            return "";
        }
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    let vehicleName = "Unassigned";
    if (savedMaintenance?.vehicle) {
        const vehicle = savedMaintenance.vehicle;
        vehicleName = [
            [vehicle.brand, vehicle.model].filter(Boolean).join(" "),
            vehicle.vehicle_type,
        ]
            .filter(Boolean)
            .join(" - ");
    } else {
        const vehicleSelect = form.querySelector("#maintenanceVehicle");
        const selectedOption = vehicleSelect?.selectedOptions?.[0];
        vehicleName = selectedOption?.textContent?.trim() || "Unassigned";
    }
    const scheduledDisplay = formatDate(scheduledDateRaw);
    let completionDisplay = formatDate(completionDateRaw);
    if (!completionDisplay) {
        completionDisplay = "Not completed";
    }
    let costDisplay = "₱0.00";
    if (costRaw !== "" && costRaw !== null && costRaw !== undefined) {
        const costValue = parseFloat(costRaw);
        if (!Number.isNaN(costValue)) {
            costDisplay =
                "₱" +
                costValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
        }
    }
    const statusMap = {
        Scheduled: "scheduled",
        "In Progress": "trip",
        Completed: "completed",
        Cancelled: "cancelled",
    };
    const statusClass = statusMap[status] || "scheduled";
    const tr = document.createElement("tr");
    tr.dataset.id = savedMaintenance?.id ?? "";
    tr.dataset.maintenanceId = savedMaintenance?.id ?? "";
    tr.dataset.vehicleId = vehicleId ?? "";
    tr.dataset.scheduledDate = scheduledDateRaw ?? "";
    tr.dataset.completionDate = completionDateRaw ?? "";
    tr.dataset.priority = priority ?? "";
    tr.dataset.odometer = odometer ?? "";
    tr.dataset.description = description ?? "";
    tr.dataset.partsUsed = partsUsed ?? "";
    tr.dataset.notes = notes ?? "";
    tr.dataset.cost = costRaw ?? "";
    tr.dataset.status = status ?? "";
    tr.dataset.archivedAt = savedMaintenance?.archived_at ?? "";
    tr.dataset.maintenanceMatchesFilter = "true";

    function makeCell() {
        return document.createElement("td");
    }

    function makeSpan(className, text) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = text ?? "";
        return span;
    }

    /*
    |--------------------------------------------------------------------------
    | 1. Checkbox
    |--------------------------------------------------------------------------
    */
    const checkboxTd = makeCell();
    if (canBulkArchive && !isArchived) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "maintenance-checkbox";
        checkbox.dataset.maintenanceId = savedMaintenance?.id ?? "";
        checkbox.dataset.id = savedMaintenance?.id ?? "";
        checkbox.setAttribute("aria-label", "Select " + number);
        checkbox.checked = false;
        checkboxTd.appendChild(checkbox);
    }
    /*
    |--------------------------------------------------------------------------
    | 2. Maintenance Number
    |--------------------------------------------------------------------------
    */
    const numberTd = makeCell();
    numberTd.appendChild(makeSpan("maintenance-number", number));
    /*
    |--------------------------------------------------------------------------
    | 3. Vehicle
    |--------------------------------------------------------------------------
    */
    const vehicleTd = makeCell();
    vehicleTd.appendChild(makeSpan("maintenance-vehicle", vehicleName));
    /*
    |--------------------------------------------------------------------------
    | 4. Service Type
    |--------------------------------------------------------------------------
    */
    const serviceTd = makeCell();
    serviceTd.appendChild(makeSpan("maintenance-service-type", serviceType));
    /*
    |--------------------------------------------------------------------------
    | 5. Technician / Workshop
    |--------------------------------------------------------------------------
    */
    const technicianTd = makeCell();
    technicianTd.appendChild(
        makeSpan("maintenance-technician", technician || "Not provided"),
    );
    /*
    |--------------------------------------------------------------------------
    | 6. Scheduled Date
    |--------------------------------------------------------------------------
    */
    const scheduledTd = makeCell();
    scheduledTd.appendChild(
        makeSpan("maintenance-scheduled-date", scheduledDisplay),
    );
    /*
    |--------------------------------------------------------------------------
    | 7. Completion Date
    |--------------------------------------------------------------------------
    */
    const completionTd = makeCell();
    completionTd.appendChild(
        makeSpan("maintenance-completion-date", completionDisplay),
    );
    /*
    |--------------------------------------------------------------------------
    | 8. Cost
    |--------------------------------------------------------------------------
    */
    const costTd = makeCell();
    costTd.appendChild(makeSpan("maintenance-cost", costDisplay));
    /*
    |--------------------------------------------------------------------------
    | 9. Priority
    |--------------------------------------------------------------------------
    */
    const priorityTd = makeCell();
    priorityTd.appendChild(makeSpan("maintenance-priority", priority));
    /*
    |--------------------------------------------------------------------------
    | 10. Status
    |--------------------------------------------------------------------------
    */
    const statusTd = makeCell();
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge " + statusClass;
    statusBadge.textContent = status;
    statusTd.appendChild(statusBadge);
    /*
    |--------------------------------------------------------------------------
    | 11. Actions
    |--------------------------------------------------------------------------
    */
    const actionsTd = makeCell();
    const actionsWrapper = document.createElement("div");
    actionsWrapper.className = "action-buttons";
    /*
    |--------------------------------------------------------------------------
    | View
    |--------------------------------------------------------------------------
    */
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "action-btn view-maintenance";
    viewBtn.dataset.id = savedMaintenance?.id ?? "";
    viewBtn.setAttribute("aria-label", "View " + number);
    viewBtn.title = "View";
    const viewIcon = document.createElement("i");
    viewIcon.className = "ph ph-eye";
    viewBtn.appendChild(viewIcon);
    actionsWrapper.appendChild(viewBtn);
    /*
    |--------------------------------------------------------------------------
    | Edit
    |--------------------------------------------------------------------------
    */
    if (canUpdate && !isArchived) {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "action-btn edit-maintenance";
        editBtn.dataset.id = savedMaintenance?.id ?? "";
        editBtn.setAttribute("aria-label", "Edit " + number);
        editBtn.title = "Edit";
        const editIcon = document.createElement("i");
        editIcon.className = "ph ph-pencil-simple";
        editBtn.appendChild(editIcon);
        actionsWrapper.appendChild(editBtn);
    }
    /*
    |--------------------------------------------------------------------------
    | Archive
    |--------------------------------------------------------------------------
    */
    if (canArchive && !isArchived) {
        const archiveBtn = document.createElement("button");
        archiveBtn.type = "button";
        archiveBtn.className = "action-btn archive-maintenance";
        archiveBtn.dataset.id = savedMaintenance?.id ?? "";
        archiveBtn.setAttribute("aria-label", "Archive " + number);
        archiveBtn.title = "Archive";
        const archiveIcon = document.createElement("i");
        archiveIcon.className = "ph ph-archive";
        archiveBtn.appendChild(archiveIcon);
        actionsWrapper.appendChild(archiveBtn);
    }
    /*
    |--------------------------------------------------------------------------
    | Restore
    |--------------------------------------------------------------------------
    */
    if (canRestore && isArchived) {
        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "action-btn restore-maintenance";
        restoreBtn.dataset.id = savedMaintenance?.id ?? "";
        restoreBtn.setAttribute("aria-label", "Restore " + number);
        restoreBtn.title = "Restore";
        const restoreIcon = document.createElement("i");
        restoreIcon.className = "ph ph-arrow-counter-clockwise";
        restoreBtn.appendChild(restoreIcon);
        actionsWrapper.appendChild(restoreBtn);
    }

    actionsTd.appendChild(actionsWrapper);
    tr.appendChild(checkboxTd);
    tr.appendChild(numberTd);
    tr.appendChild(vehicleTd);
    tr.appendChild(serviceTd);
    tr.appendChild(technicianTd);
    tr.appendChild(scheduledTd);
    tr.appendChild(completionTd);
    tr.appendChild(costTd);
    tr.appendChild(priorityTd);
    tr.appendChild(statusTd);
    tr.appendChild(actionsTd);

    return tr;
}

async function saveMaintenance(form) {
    const values = {
        vehicle_id: document.getElementById("maintenanceVehicle")?.value || "",
        maintenance_type:
            document.getElementById("maintenanceServiceType")?.value || "",
        technician:
            document.getElementById("maintenanceTechnician")?.value.trim() ||
            "",
        maintenance_date:
            document.getElementById("maintenanceScheduledDate")?.value || "",
        completion_date:
            document.getElementById("maintenanceCompletionDate")?.value || null,
        cost: document.getElementById("maintenanceCost")?.value || null,
        priority: document.getElementById("maintenancePriority")?.value || "",
        status: document.getElementById("maintenanceStatus")?.value || "",
        odometer: document.getElementById("maintenanceOdometer")?.value || null,
        description:
            document.getElementById("maintenanceDescription")?.value.trim() ||
            "",
        parts_used:
            document.getElementById("maintenancePartsUsed")?.value.trim() ||
            null,
        notes:
            document.getElementById("maintenanceNotes")?.value.trim() || null,
    };

    const response = await fetch("/maintenance", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-TOKEN": document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content"),
        },

        body: JSON.stringify(values),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Maintenance save error:", data);

        const firstError = data.errors
            ? Object.values(data.errors).flat()[0]
            : null;

        throw new Error(
            firstError ||
                data.message ||
                "Failed to create maintenance record.",
        );
    }

    return data.maintenance;
}


async function initMaintenanceAdd() {
    if (!canCreateMaintenance()) {
        return;
    }
    if (maintenanceAddInitialized) {
        return;
    }
    if (typeof initMaintenanceModal !== "function") {
        return;
    }

    const form = document.getElementById("maintenanceForm");
    const tableBody = document.getElementById("maintenanceTableBody");

    if (!form || !tableBody) {
        return;
    }
    if (typeof validateMaintenanceForm !== "function") {
        return;
    }

    const maintenanceSettings = await window.getMaintenanceModuleSettings();

    applyMaintenanceAddSettings(maintenanceSettings);

    maintenanceAddInitialized = true;

    document
        .getElementById("maintenanceStatus")
        ?.addEventListener("change", () => {
            applyMaintenanceAddSettings(maintenanceSettings);
        });

    loadAvailableMaintenanceVehicles();

    form.querySelectorAll("input, select, textarea").forEach((input) => {
        input.addEventListener("input", () => {
            input.classList.remove("is-invalid");
        });
        input.addEventListener("change", () => {
            input.classList.remove("is-invalid");
        });
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateMaintenanceForm(form)) {
            return;
        }

        const saveButton = document.getElementById("saveMaintenanceBtn");

        if (saveButton) {
            saveButton.disabled = true;

            saveButton.textContent = "Saving...";
        }

        try {
            const maintenance = await saveMaintenance(form);

            if (typeof loadMaintenances === "function") {
                await loadMaintenances();
            } else {
                throw new Error("Maintenance table loader is unavailable.");
            }

            await loadAvailableMaintenanceVehicles();

            form.reset();

            applyMaintenanceAddSettings(maintenanceSettings);

            form.querySelectorAll(".is-invalid").forEach((field) => {
                field.classList.remove("is-invalid");
            });
            form.querySelectorAll(".field-error").forEach((errorEl) => {
                errorEl.textContent = "";

                errorEl.style.display = "none";
            });

            const modal = document.getElementById("addMaintenanceModal");

            if (modal) {
                modal.classList.remove("show");
            }

            document.body.style.overflow = "";

            if (typeof updateMaintenanceStatistics === "function") {
                updateMaintenanceStatistics();
            }
            if (typeof updateMaintenancePagination === "function") {
                updateMaintenancePagination();
            }
            if (typeof refreshMaintenanceBulkState === "function") {
                refreshMaintenanceBulkState();
            }
            if (typeof showToast === "function") {
                showToast(
                    "Maintenance record created successfully.",
                    "success",
                );
            }
        } catch (error) {
            console.error("Maintenance creation error:", error);

            if (typeof showToast === "function") {
                showToast(
                    error.message || "Failed to create maintenance record.",
                    "error",
                );
            }
        } finally {
            if (saveButton) {
                saveButton.disabled = false;

                saveButton.textContent = "Save Maintenance";
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initMaintenanceAdd();
});
