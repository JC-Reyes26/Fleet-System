/* ==========================================
   Fleet Settings page — system configuration :)
   Appearance theme: shared himsFleetTheme only
========================================== */

let settingsPageInitialized = false;
let settingsBaseline = null;
let themeBaseline = null;
let settingsDirty = false;

let maintenanceServiceTypes = [];
let maintenanceProviders = [];

let fuelStations = [];

function settingsClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function settingsSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function settingsGetThemePreference() {
    if (typeof getSavedTheme === "function") {
        return getSavedTheme();
    }
    try {
        return localStorage.getItem("himsFleetTheme") === "dark"
            ? "dark"
            : "light";
    } catch {
        return "light";
    }
}

function settingsApplyTheme(theme, options) {
    if (typeof applyTheme === "function") {
        applyTheme(theme, options);
        return;
    }
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    if (options?.persist !== false) {
        try {
            localStorage.setItem("himsFleetTheme", next);
        } catch {
            /* ignore */
        }
    }
}

function settingsSyncThemeMenu() {
    if (typeof syncThemeMenuState === "function") {
        syncThemeMenuState();
    }
}

function settingsReadThemeFromForm() {
    const checked = document.querySelector(
        'input[name="settingsTheme"]:checked',
    );
    return checked?.value === "dark" ? "dark" : "light";
}

function settingsWriteThemeToForm(theme) {
    const next = theme === "dark" ? "dark" : "light";
    const radio = document.querySelector(
        'input[name="settingsTheme"][value="' + next + '"]',
    );
    if (radio) radio.checked = true;
}

function settingsSetCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
}

function settingsGetCheckbox(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return el.checked;
}

function settingsSetInput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value == null ? "" : String(value);
}

function settingsGetInput(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return el.value;
}

function settingsGetNumber(id, fallback) {
    const n = Number(settingsGetInput(id, fallback));
    return Number.isNaN(n) ? fallback : n;
}

function settingsStableStringify(value) {
    return JSON.stringify(value);
}

/* ==========================================
   Maintenance master data
========================================== */
function maintenanceGenerateId(prefix) {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function maintenanceFormatCost(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        return "₱0.00";
    }
    const currency =
        typeof getDefaultFleetSettings === "function"
            ? getDefaultFleetSettings().regional.currencySymbol
            : "₱";
    return (
        currency +
        amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    );
}
function maintenanceEscapeText(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function renderMaintenanceServiceTypes() {
    const tbody = document.getElementById("maintenanceServiceTypesTableBody");
    if (!tbody) {
        return;
    }
    tbody.innerHTML = "";
    if (!maintenanceServiceTypes.length) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="4" class="settings-empty-state">
                No maintenance service types configured.
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    maintenanceServiceTypes.forEach((service) => {
        const row = document.createElement("tr");
        const statusText = service.active ? "Active" : "Inactive";
        const statusClass = service.active
            ? "status-badge completed"
            : "status-badge cancelled";
        row.innerHTML = `
                <td>
                    ${maintenanceEscapeText(service.name)}
                </td>
                <td>
                    ${maintenanceFormatCost(service.defaultCost)}
                </td>
                <td>
                    <span class="${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="action-btn edit-maintenance-service-type"
                            data-id="${maintenanceEscapeText(service.id)}"
                            aria-label="Edit ${maintenanceEscapeText(service.name)}"
                            title="Edit"
                        >
                            <i class="ph ph-pencil-simple"></i>
                        </button>

                        <button
                            type="button"
                            class="action-btn toggle-maintenance-service-type"
                            data-id="${maintenanceEscapeText(service.id)}"
                            aria-label="${
                                service.active ? "Deactivate" : "Activate"
                            } ${maintenanceEscapeText(service.name)}"
                            title="${
                                service.active ? "Deactivate" : "Activate"
                            }"
                        >
                            <i class="ph ${
                                service.active ? "ph-eye-slash" : "ph-eye"
                            }"></i>
                        </button>
                    </div>
                </td>
            `;

        tbody.appendChild(row);
    });
}

function renderMaintenanceProviders() {
    const tbody = document.getElementById("maintenanceProvidersTableBody");
    if (!tbody) {
        return;
    }
    tbody.innerHTML = "";
    if (!maintenanceProviders.length) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="5" class="settings-empty-state">
                No technicians or workshops configured.
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    maintenanceProviders.forEach((provider) => {
        const row = document.createElement("tr");
        const statusText = provider.active ? "Active" : "Inactive";
        const statusClass = provider.active
            ? "status-badge completed"
            : "status-badge cancelled";
        row.innerHTML = `
                <td>
                    ${maintenanceEscapeText(provider.name)}
                </td>
                <td>
                    ${maintenanceEscapeText(provider.type)}
                </td>
                <td>
                    ${maintenanceEscapeText(provider.contractType)}
                </td>
                <td>
                    <span class="${statusClass}">
                        ${statusText}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="action-btn edit-maintenance-provider"
                            data-id="${maintenanceEscapeText(provider.id)}"
                            aria-label="Edit ${maintenanceEscapeText(provider.name)}"
                            title="Edit"
                        >
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button
                            type="button"
                            class="action-btn toggle-maintenance-provider"
                            data-id="${maintenanceEscapeText(provider.id)}"
                            aria-label="${
                                provider.active ? "Deactivate" : "Activate"
                            } ${maintenanceEscapeText(provider.name)}"
                            title="${
                                provider.active ? "Deactivate" : "Activate"
                            }"
                        >
                            <i class="ph ${
                                provider.active ? "ph-eye-slash" : "ph-eye"
                            }"></i>
                        </button>
                    </div>
                </td>
            `;

        tbody.appendChild(row);
    });
}

function openMaintenanceServiceTypeEditor(service = null) {
    const isEdit = Boolean(service);
    const modalId = "maintenanceServiceTypeEditorModal";
    document.getElementById(modalId)?.remove();
    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "maintenance-settings-editor";
    modal.innerHTML = `
        <div
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
        >
            <div class="custom-modal">

                <div class="modal-header">
                    <div>
                        <h2>
                            ${isEdit ? "Edit Service Type" : "Add Service Type"}
                        </h2>

                        <p>
                            Configure the maintenance service and its default cost.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="modal-close"
                        data-close-maintenance-service-modal
                        aria-label="Close"
                    >
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <div class="modal-body">

                    <form
                        id="maintenanceServiceTypeEditorForm"
                    >

                        <div class="form-group">
                            <label for="maintenanceServiceTypeName">
                                Service Type *
                            </label>

                            <input
                                type="text"
                                id="maintenanceServiceTypeName"
                                maxlength="100"
                                required
                                value="${maintenanceEscapeText(
                                    service?.name || "",
                                )}"
                                placeholder="Enter service type"
                            />
                        </div>

                        <div class="form-group">
                            <label for="maintenanceServiceTypeCost">
                                Default Cost *
                            </label>

                            <input
                                type="number"
                                id="maintenanceServiceTypeCost"
                                min="0"
                                step="0.01"
                                required
                                value="${service?.defaultCost ?? 0}"
                                placeholder="0.00"
                            />
                        </div>

                        <div class="settings-check-list">
                            <label class="settings-check">
                                <input
                                    type="checkbox"
                                    id="maintenanceServiceTypeActive"
                                    ${
                                        service?.active !== false
                                            ? "checked"
                                            : ""
                                    }
                                />

                                <span>
                                    Active
                                </span>
                            </label>
                        </div>

                        <div class="modal-footer">

                            <button
                                type="button"
                                class="btn-outline"
                                data-close-maintenance-service-modal
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                class="btn-primary"
                            >
                                ${isEdit ? "Save Changes" : "Add Service Type"}
                            </button>

                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const overlay = modal.querySelector(".modal-overlay");
    if (overlay) {
        overlay.classList.add("show");
    }
    const form = document.getElementById("maintenanceServiceTypeEditorForm");
    const close = () => {
        modal.remove();
    };
    modal
        .querySelectorAll("[data-close-maintenance-service-modal]")
        .forEach((button) => {
            button.addEventListener("click", close);
        });
    overlay?.addEventListener("click", (event) => {
        if (event.target === overlay) {
            close();
        }
    });
    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = document
            .getElementById("maintenanceServiceTypeName")
            ?.value.trim();
        const cost = Number(
            document.getElementById("maintenanceServiceTypeCost")?.value,
        );
        const active =
            document.getElementById("maintenanceServiceTypeActive")?.checked !==
            false;
        if (!name) {
            showToast?.("Service type name is required.", "warning");
            return;
        }
        if (!Number.isFinite(cost) || cost < 0) {
            showToast?.("Enter a valid default cost.", "warning");
            return;
        }
        /*
         * Prevent duplicate service names.
         */
        const duplicate = maintenanceServiceTypes.some(
            (item) =>
                item.id !== service?.id &&
                item.name.toLowerCase() === name.toLowerCase(),
        );
        if (duplicate) {
            showToast?.("That service type already exists.", "warning");
            return;
        }
        if (isEdit) {
            const target = maintenanceServiceTypes.find(
                (item) => item.id === service.id,
            );

            if (target) {
                target.name = name;
                target.defaultCost = cost;
                target.active = active;
            }
        } else {
            maintenanceServiceTypes.push({
                id: maintenanceGenerateId("service"),
                name,
                defaultCost: cost,
                active,
            });
        }
        renderMaintenanceServiceTypes();
        markSettingsDirty();
        close();
        showToast?.(
            isEdit ? "Service type updated." : "Service type added.",
            "success",
        );
    });
    document.getElementById("maintenanceServiceTypeName")?.focus();
}

function openMaintenanceProviderEditor(provider = null) {
    const isEdit = Boolean(provider);
    const modalId = "maintenanceProviderEditorModal";
    document.getElementById(modalId)?.remove();
    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "maintenance-settings-editor";
    modal.innerHTML = `
        <div
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
        >
            <div class="custom-modal">
                <div class="modal-header">
                    <div>
                        <h2>
                            ${
                                isEdit
                                    ? "Edit Technician / Workshop"
                                    : "Add Technician / Workshop"
                            }
                        </h2>
                        <p>
                            Configure the provider available for maintenance assignments.
                        </p>
                    </div>
                    <button
                        type="button"
                        class="modal-close"
                        data-close-maintenance-provider-modal
                        aria-label="Close"
                    >
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="modal-body">

                    <form
                        id="maintenanceProviderEditorForm"
                    >

                        <div class="form-group">
                            <label for="maintenanceProviderName">
                                Name *
                            </label>

                            <input
                                type="text"
                                id="maintenanceProviderName"
                                maxlength="120"
                                required
                                value="${maintenanceEscapeText(
                                    provider?.name || "",
                                )}"
                                placeholder="Enter technician or workshop name"
                            />
                        </div>

                        <div class="form-group">
                            <label for="maintenanceProviderType">
                                Type *
                            </label>

                            <select
                                id="maintenanceProviderType"
                                required
                            >
                                <option
                                    value="Technician"
                                    ${
                                        provider?.type === "Technician" ||
                                        !provider
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Technician
                                </option>

                                <option
                                    value="Workshop"
                                    ${
                                        provider?.type === "Workshop"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Workshop
                                </option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="maintenanceProviderContractType">
                                Contract Type *
                            </label>

                            <select
                                id="maintenanceProviderContractType"
                                required
                            >
                                <option
                                    value="Contractual"
                                    ${
                                        provider?.contractType !== "In-house"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Contractual
                                </option>

                                <option
                                    value="In-house"
                                    ${
                                        provider?.contractType === "In-house"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    In-house
                                </option>
                            </select>
                        </div>

                        <div class="settings-check-list">
                            <label class="settings-check">
                                <input
                                    type="checkbox"
                                    id="maintenanceProviderActive"
                                    ${
                                        provider?.active !== false
                                            ? "checked"
                                            : ""
                                    }
                                />

                                <span>
                                    Active
                                </span>
                            </label>
                        </div>

                        <div class="modal-footer">

                            <button
                                type="button"
                                class="btn-outline"
                                data-close-maintenance-provider-modal
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                class="btn-primary"
                            >
                                ${isEdit ? "Save Changes" : "Add Provider"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const overlay = modal.querySelector(".modal-overlay");
    if (overlay) {
        overlay.classList.add("show");
    }
    const form = document.getElementById("maintenanceProviderEditorForm");
    const close = () => {
        modal.remove();
    };
    modal
        .querySelectorAll("[data-close-maintenance-provider-modal]")
        .forEach((button) => {
            button.addEventListener("click", close);
        });
    overlay?.addEventListener("click", (event) => {
        if (event.target === overlay) {
            close();
        }
    });
    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = document
            .getElementById("maintenanceProviderName")
            ?.value.trim();
        const type = document.getElementById("maintenanceProviderType")?.value;
        const contractType = document.getElementById(
            "maintenanceProviderContractType",
        )?.value;
        const active =
            document.getElementById("maintenanceProviderActive")?.checked !==
            false;
        if (!name) {
            showToast?.("Technician / workshop name is required.", "warning");
            return;
        }
        if (!["Technician", "Workshop"].includes(type)) {
            showToast?.("Select a valid provider type.", "warning");
            return;
        }
        if (!["Contractual", "In-house"].includes(contractType)) {
            showToast?.("Select a valid contract type.", "warning");
            return;
        }
        const duplicate = maintenanceProviders.some(
            (item) =>
                item.id !== provider?.id &&
                item.name.toLowerCase() === name.toLowerCase(),
        );
        if (duplicate) {
            showToast?.(
                "That technician or workshop already exists.",
                "warning",
            );
            return;
        }
        if (isEdit) {
            const target = maintenanceProviders.find(
                (item) => item.id === provider.id,
            );
            if (target) {
                target.name = name;
                target.type = type;
                target.contractType = contractType;
                target.active = active;
            }
        } else {
            maintenanceProviders.push({
                id: maintenanceGenerateId("provider"),
                name,
                type,
                contractType,
                active,
            });
        }
        renderMaintenanceProviders();
        markSettingsDirty();
        close();
        showToast?.(
            isEdit
                ? "Technician / workshop updated."
                : "Technician / workshop added.",
            "success",
        );
    });
    document.getElementById("maintenanceProviderName")?.focus();
}

/* ==========================================
   Fuel Station master data
========================================== */

function fuelStationGenerateId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `fuel_station_${crypto.randomUUID()}`;
    }

    return (
        "fuel_station_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2, 10)
    );
}

function fuelStationEscapeText(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function renderFuelStations() {
    const tbody = document.getElementById(
        "fuelStationsTableBody",
    );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!fuelStations.length) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="4" class="settings-empty-state">
                No fuel stations configured.
            </td>
        `;

        tbody.appendChild(row);
        return;
    }

    fuelStations.forEach((station) => {
        const row = document.createElement("tr");

        const statusText =
            station.active ? "Active" : "Inactive";

        const statusClass =
            station.active
                ? "status-badge completed"
                : "status-badge cancelled";

        row.innerHTML = `
            <td>
                ${fuelStationEscapeText(
                    station.name,
                )}
            </td>

            <td>
                Contractual
            </td>

            <td>
                <span class="${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>
                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-btn edit-fuel-station"
                        data-id="${fuelStationEscapeText(
                            station.id,
                        )}"
                        aria-label="Edit ${fuelStationEscapeText(
                            station.name,
                        )}"
                        title="Edit"
                    >
                        <i class="ph ph-pencil-simple"></i>
                    </button>

                    <button
                        type="button"
                        class="action-btn toggle-fuel-station"
                        data-id="${fuelStationEscapeText(
                            station.id,
                        )}"
                        aria-label="${
                            station.active
                                ? "Deactivate"
                                : "Activate"
                        } ${fuelStationEscapeText(
                            station.name,
                        )}"
                        title="${
                            station.active
                                ? "Deactivate"
                                : "Activate"
                        }"
                    >
                        <i class="ph ${
                            station.active
                                ? "ph-eye-slash"
                                : "ph-eye"
                        }"></i>
                    </button>

                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function openFuelStationEditor(station = null) {
    const isEdit = Boolean(station);

    const modalId =
        "fuelStationEditorModal";

    document.getElementById(modalId)?.remove();

    const modal =
        document.createElement("div");

    modal.id = modalId;
    modal.className =
        "maintenance-settings-editor";

    modal.innerHTML = `
        <div
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
        >
            <div class="custom-modal">
                <div class="modal-header">
                    <div>
                        <h2>
                            ${
                                isEdit
                                    ? "Edit Fuel Station"
                                    : "Add Fuel Station"
                            }
                        </h2>
                        <p>
                            Configure a contractual fuel station
                            available for fuel transactions.
                        </p>
                    </div>
                    <button
                        type="button"
                        class="modal-close"
                        data-close-fuel-station-modal
                        aria-label="Close"
                    >
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="fuelStationEditorForm">

                        <div class="form-group">
                            <label for="fuelStationName">
                                Fuel Station *
                            </label>

                            <input
                                type="text"
                                id="fuelStationName"
                                maxlength="120"
                                required
                                value="${fuelStationEscapeText(
                                    station?.name || "",
                                )}"
                                placeholder="Enter fuel station name"
                            />
                        </div>

                        <div class="form-group">
                            <label for="fuelStationContractType">
                                Contract Type
                            </label>

                            <input
                                type="text"
                                id="fuelStationContractType"
                                value="Contractual"
                                readonly
                            />
                        </div>

                        <div class="settings-check-list">
                            <label class="settings-check">

                                <input
                                    type="checkbox"
                                    id="fuelStationActive"
                                    ${
                                        station?.active !== false
                                            ? "checked"
                                            : ""
                                    }
                                />

                                <span>
                                    Active
                                </span>

                            </label>
                        </div>

                        <div class="modal-footer">

                            <button
                                type="button"
                                class="btn-outline"
                                data-close-fuel-station-modal
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                class="btn-primary"
                            >
                                ${
                                    isEdit
                                        ? "Save Changes"
                                        : "Add Fuel Station"
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const overlay =
        modal.querySelector(
            ".modal-overlay",
        );
    if (overlay) {
        overlay.classList.add("show");
    }
    const form =
        document.getElementById(
            "fuelStationEditorForm",
        );
    const close = () => {
        modal.remove();
    };
    modal
        .querySelectorAll(
            "[data-close-fuel-station-modal]",
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                close,
            );
        });
    overlay?.addEventListener(
        "click",
        (event) => {
            if (event.target === overlay) {
                close();
            }
        },
    );
    form?.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();
            const name =
                document
                    .getElementById(
                        "fuelStationName",
                    )
                    ?.value.trim();
            const active =
                document.getElementById(
                    "fuelStationActive",
                )?.checked !== false;
            if (!name) {
                showToast?.(
                    "Fuel station name is required.",
                    "warning",
                );
                return;
            }
            const duplicate =
                fuelStations.some(
                    (item) =>
                        item.id !==
                            station?.id &&
                        item.name
                            .toLowerCase() ===
                            name.toLowerCase(),
                );
            if (duplicate) {
                showToast?.(
                    "That fuel station already exists.",
                    "warning",
                );
                return;
            }
            if (isEdit) {
                const target =
                    fuelStations.find(
                        (item) =>
                            item.id ===
                            station.id,
                    );
                if (target) {
                    target.name = name;
                    target.active =
                        active;
                    /*
                     * Fuel stations are always
                     * contractual.
                     */
                    target.contractType =
                        "Contractual";
                }
            } else {
                fuelStations.push({
                    id:
                        fuelStationGenerateId(),
                    name,
                    contractType:
                        "Contractual",
                    active,
                });
            }
            renderFuelStations();
            markSettingsDirty();
            close();
            showToast?.(
                isEdit
                    ? "Fuel station updated."
                    : "Fuel station added.",
                "success",
            );
        },
    );
    document
        .getElementById(
            "fuelStationName",
        )
        ?.focus();
}

function applySettingsToForm(settings, options = {}) {
    const s = settings || getDefaultFleetSettings();
    const syncTheme = options.syncTheme !== false;

    settingsSetInput("settingsOrgName", s.general.organizationName);
    settingsSetInput("settingsFleetUnit", s.general.fleetUnitName);
    settingsSetInput("settingsContactEmail", s.general.contactEmail);
    settingsSetInput("settingsContactPhone", s.general.contactPhone);
    settingsSetInput("settingsLandingPage", s.general.defaultLandingPage);
    settingsSetInput(
        "settingsRowsPerPage",
        String(s.general.defaultRowsPerPage || 10),
    );

    settingsSetInput("settingsCurrencyCode", s.regional.currencyCode);
    settingsSetInput("settingsCurrencySymbol", s.regional.currencySymbol);
    settingsSetInput("settingsDateFormat", s.regional.dateFormat);
    settingsSetInput("settingsTimeFormat", s.regional.timeFormat);
    settingsSetInput("settingsDistanceUnit", s.regional.distanceUnit);
    settingsSetInput("settingsVolumeUnit", s.regional.volumeUnit);

    settingsSetCheckbox(
        "settingsVehicleRequirePlate",
        s.vehicles.requirePlateNumber,
    );
    settingsSetCheckbox(
        "settingsVehicleRequireDept",
        s.vehicles.requireDepartment,
    );
    settingsSetInput("settingsVehicleDefaultStatus", s.vehicles.defaultStatus);
    settingsSetInput(
        "settingsVehicleUtilThreshold",
        s.vehicles.lowUtilizationThreshold,
    );

    settingsSetCheckbox(
        "settingsResRequireApproval",
        s.reservations.requireApproval,
    );
    settingsSetCheckbox("settingsResAllowSameDay", s.reservations.allowSameDay);
    settingsSetInput(
        "settingsResDefaultHours",
        s.reservations.defaultDurationHours,
    );
    settingsSetInput("settingsResMaxAdvance", s.reservations.maxAdvanceDays);

    settingsSetCheckbox("settingsDispAutoAssign", s.dispatch.autoAssignDriver);
    settingsSetCheckbox(
        "settingsDispRequireCheck",
        s.dispatch.requireVehicleCheck,
    );
    settingsSetInput("settingsDispPriority", s.dispatch.defaultPriority);
    settingsSetInput("settingsDispCompletedDays", s.dispatch.showCompletedDays);

    settingsSetCheckbox(
        "settingsDriverRequireLicense",
        s.drivers.requireLicenseExpiry,
    );
    settingsSetInput("settingsDriverWarnDays", s.drivers.warnLicenseDays);
    settingsSetInput("settingsDriverStatus", s.drivers.defaultStatus);

    settingsSetInput("settingsMntOverdueDays", s.maintenance.overdueWarnDays);
    settingsSetCheckbox("settingsMntRequireCost", s.maintenance.requireCost);
    settingsSetInput("settingsMntDefaultType", s.maintenance.defaultType);

    maintenanceServiceTypes = settingsClone(s.maintenance.serviceTypes || []);
    maintenanceProviders = settingsClone(s.maintenance.providers || []);
    renderMaintenanceServiceTypes();
    renderMaintenanceProviders();

    settingsSetCheckbox("settingsFuelRequireOdo", s.fuel.requireOdometer);
    settingsSetCheckbox("settingsFuelRequireStation", s.fuel.requireStation);
    settingsSetInput("settingsFuelHighCost", s.fuel.highCostAlert);
    fuelStations = settingsClone(s.fuel.fuelStations || []);
    renderFuelStations();

    settingsSetCheckbox("settingsRoutePreferOpt", s.routes.preferOptimized);
    settingsSetCheckbox("settingsRouteArchive", s.routes.archiveCompleted);
    settingsSetInput("settingsRoutePriority", s.routes.defaultPriority);

    settingsSetInput(
        "settingsCostDefaultRange",
        s.costAnalysis.defaultDateRange,
    );
    settingsSetCheckbox(
        "settingsCostShowMismatch",
        s.costAnalysis.showBudgetMismatch,
    );
    settingsSetCheckbox(
        "settingsCostIncludeUnassigned",
        s.costAnalysis.includeUnassignedDepartment,
    );

    settingsSetCheckbox(
        "settingsNotifMaintenance",
        s.notifications.maintenanceDue,
    );
    settingsSetCheckbox(
        "settingsNotifLicense",
        s.notifications.licenseExpiring,
    );
    settingsSetCheckbox(
        "settingsNotifReservation",
        s.notifications.reservationPending,
    );
    settingsSetCheckbox("settingsNotifFuel", s.notifications.fuelHighCost);
    settingsSetCheckbox(
        "settingsNotifDispatch",
        s.notifications.dispatchUpdates,
    );
    settingsSetCheckbox(
        "settingsNotifBrowser",
        s.notifications.browserNotifications,
    );

    settingsSetCheckbox(
        "settingsDataConfirmDestructive",
        s.dataManagement.confirmDestructive,
    );
    settingsSetCheckbox(
        "settingsDataRetainExports",
        s.dataManagement.retainExportHistory,
    );

    if (syncTheme) {
        settingsWriteThemeToForm(settingsGetThemePreference());
    }

    if (s.updatedAt) {
        const d = new Date(s.updatedAt);
        settingsSetText(
            "settingsLastSaved",
            Number.isNaN(d.getTime())
                ? "Last saved: —"
                : "Last saved: " + d.toLocaleString(),
        );
    } else {
        settingsSetText("settingsLastSaved", "Last saved: Not saved yet");
    }

    updateBrowserNotificationStatus();
}

function readSettingsFromForm() {
    return normalizeFleetSettings({
        general: {
            organizationName: settingsGetInput("settingsOrgName", ""),
            fleetUnitName: settingsGetInput("settingsFleetUnit", ""),
            contactEmail: settingsGetInput("settingsContactEmail", ""),
            contactPhone: settingsGetInput("settingsContactPhone", ""),
            defaultLandingPage: settingsGetInput(
                "settingsLandingPage",
                "dashboard",
            ),
            defaultRowsPerPage: settingsGetNumber("settingsRowsPerPage", 10),
        },
        regional: {
            currencyCode: settingsGetInput("settingsCurrencyCode", "PHP"),
            currencySymbol: settingsGetInput("settingsCurrencySymbol", "₱"),
            dateFormat: settingsGetInput("settingsDateFormat", "YYYY-MM-DD"),
            timeFormat: settingsGetInput("settingsTimeFormat", "24h"),
            distanceUnit: settingsGetInput("settingsDistanceUnit", "km"),
            volumeUnit: settingsGetInput("settingsVolumeUnit", "L"),
        },
        vehicles: {
            requirePlateNumber: settingsGetCheckbox(
                "settingsVehicleRequirePlate",
                true,
            ),
            requireDepartment: settingsGetCheckbox(
                "settingsVehicleRequireDept",
                true,
            ),
            defaultStatus: settingsGetInput(
                "settingsVehicleDefaultStatus",
                "Available",
            ),
            lowUtilizationThreshold: settingsGetNumber(
                "settingsVehicleUtilThreshold",
                40,
            ),
        },
        reservations: {
            requireApproval: settingsGetCheckbox(
                "settingsResRequireApproval",
                true,
            ),
            allowSameDay: settingsGetCheckbox("settingsResAllowSameDay", true),
            defaultDurationHours: settingsGetNumber(
                "settingsResDefaultHours",
                2,
            ),
            maxAdvanceDays: settingsGetNumber("settingsResMaxAdvance", 30),
        },
        dispatch: {
            autoAssignDriver: settingsGetCheckbox(
                "settingsDispAutoAssign",
                false,
            ),
            requireVehicleCheck: settingsGetCheckbox(
                "settingsDispRequireCheck",
                true,
            ),
            defaultPriority: settingsGetInput("settingsDispPriority", "Medium"),
            showCompletedDays: settingsGetNumber(
                "settingsDispCompletedDays",
                7,
            ),
        },
        drivers: {
            requireLicenseExpiry: settingsGetCheckbox(
                "settingsDriverRequireLicense",
                true,
            ),
            warnLicenseDays: settingsGetNumber("settingsDriverWarnDays", 30),
            defaultStatus: settingsGetInput("settingsDriverStatus", "Active"),
        },
        maintenance: {
            overdueWarnDays: settingsGetNumber("settingsMntOverdueDays", 3),
            requireCost: settingsGetCheckbox("settingsMntRequireCost", true),
            defaultType: settingsGetInput(
                "settingsMntDefaultType",
                "Preventive Maintenance",
            ),
            serviceTypes: settingsClone(maintenanceServiceTypes),
            providers: settingsClone(maintenanceProviders),
        },
        fuel: {
            requireOdometer: settingsGetCheckbox(
                "settingsFuelRequireOdo",
                true,
            ),
            requireStation: settingsGetCheckbox(
                "settingsFuelRequireStation",
                false,
            ),
            highCostAlert: settingsGetNumber("settingsFuelHighCost", 5000),
            fuelStations: settingsClone(fuelStations),
        },
        routes: {
            preferOptimized: settingsGetCheckbox(
                "settingsRoutePreferOpt",
                true,
            ),
            archiveCompleted: settingsGetCheckbox(
                "settingsRouteArchive",
                false,
            ),
            defaultPriority: settingsGetInput(
                "settingsRoutePriority",
                "Medium",
            ),
        },
        costAnalysis: {
            defaultDateRange: settingsGetInput(
                "settingsCostDefaultRange",
                "last30",
            ),
            showBudgetMismatch: settingsGetCheckbox(
                "settingsCostShowMismatch",
                true,
            ),
            includeUnassignedDepartment: settingsGetCheckbox(
                "settingsCostIncludeUnassigned",
                true,
            ),
        },
        notifications: {
            maintenanceDue: settingsGetCheckbox(
                "settingsNotifMaintenance",
                true,
            ),
            licenseExpiring: settingsGetCheckbox("settingsNotifLicense", true),
            reservationPending: settingsGetCheckbox(
                "settingsNotifReservation",
                true,
            ),
            fuelHighCost: settingsGetCheckbox("settingsNotifFuel", false),
            dispatchUpdates: settingsGetCheckbox("settingsNotifDispatch", true),
            browserNotifications: settingsGetCheckbox(
                "settingsNotifBrowser",
                false,
            ),
        },
        dataManagement: {
            confirmDestructive: settingsGetCheckbox(
                "settingsDataConfirmDestructive",
                true,
            ),
            retainExportHistory: settingsGetCheckbox(
                "settingsDataRetainExports",
                false,
            ),
        },
    });
}

function isSettingsFormDirty() {
    if (!settingsBaseline) return false;
    const current = readSettingsFromForm();
    const theme = settingsReadThemeFromForm();
    return (
        settingsStableStringify(current) !==
            settingsStableStringify(settingsBaseline) || theme !== themeBaseline
    );
}

function updateSettingsDirtyUi() {
    settingsDirty = isSettingsFormDirty();
    const bar = document.getElementById("settingsActionBar");
    const badge = document.getElementById("settingsUnsavedBadge");
    const hint = document.getElementById("settingsDirtyHint");
    const saveBtn = document.getElementById("saveFleetSettings");
    const cancelBtn = document.getElementById("cancelFleetSettings");

    if (bar) bar.classList.toggle("is-dirty", settingsDirty);
    if (badge) badge.hidden = !settingsDirty;
    if (hint) {
        hint.textContent = settingsDirty
            ? "You have unsaved changes"
            : "All changes saved";
    }
    if (saveBtn) saveBtn.disabled = !settingsDirty;
    if (cancelBtn) cancelBtn.disabled = !settingsDirty;
}

function markSettingsDirty() {
    updateSettingsDirtyUi();
}

function clearSettingsDirty() {
    updateSettingsDirtyUi();
}

function captureSettingsBaseline() {
    settingsBaseline = settingsClone(readSettingsFromForm());
    themeBaseline = settingsReadThemeFromForm();
    updateSettingsDirtyUi();
}

function validateSettingsForm() {
    const org = settingsGetInput("settingsOrgName", "").trim();
    if (!org) {
        if (typeof showToast === "function") {
            showToast("Organization name is required.", "warning");
        }
        document.getElementById("settingsOrgName")?.focus();
        return false;
    }
    const email = settingsGetInput("settingsContactEmail", "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (typeof showToast === "function") {
            showToast(
                "Enter a valid contact email or leave it blank.",
                "warning",
            );
        }
        document.getElementById("settingsContactEmail")?.focus();
        return false;
    }
    return true;
}

async function saveFleetSettingsPage() {
    if (!settingsDirty) return;
    if (!validateSettingsForm()) {
        return;
    }
    const saveButton = document.getElementById("saveFleetSettings");
    const cancelButton = document.getElementById("cancelFleetSettings");
    if (saveButton) {
        saveButton.disabled = true;
    }
    if (cancelButton) {
        cancelButton.disabled = true;
    }
    const next = readSettingsFromForm();
    const saved = await persistFleetSettings(next);
    if (!saved) {
        updateSettingsDirtyUi();
        return;
    }
    /*
     * Theme remains browser-local.
     */
    const theme = settingsReadThemeFromForm();
    settingsApplyTheme(theme, {
        persist: true,
    });
    settingsSyncThemeMenu();
    applySettingsToForm(saved);
    captureSettingsBaseline();
    if (typeof showToast === "function") {
        showToast("Fleet settings saved.", "success");
    }
}

function cancelFleetSettingsPage() {
    if (!settingsDirty) {
        return;
    }
    if (!settingsBaseline) {
        return;
    }
    applySettingsToForm(settingsBaseline, {
        syncTheme: false,
    });
    const restoreTheme =
        themeBaseline || settingsGetThemePreference() || "light";
    settingsWriteThemeToForm(restoreTheme);
    settingsApplyTheme(restoreTheme, {
        persist: false,
    });
    settingsSyncThemeMenu();
    captureSettingsBaseline();
    if (typeof showToast === "function") {
        showToast("Changes discarded.", "info");
    }
}

async function resetFleetSettingsDefaults() {
    const requireConfirm =
        settingsGetCheckbox("settingsDataConfirmDestructive", true) !== false;
    if (requireConfirm) {
        const ok = window.confirm(
            "Reset Fleet Settings to defaults?\n\n" +
                "Fleet configuration stored in the database will be reset.\n" +
                "Operational Fleet records will not be deleted.\n" +
                "Your theme preference will be preserved.",
        );
        if (!ok) {
            return;
        }
    }
    const reset = await resetFleetSettingsStorage();
    if (!reset) {
        return;
    }
    const defaults = getDefaultFleetSettings();
    /*
     * After reset, save defaults to DB.
     */
    const saved = await persistFleetSettings(defaults);
    applySettingsToForm(saved || defaults, {
        syncTheme: false,
    });
    const theme = settingsGetThemePreference();
    settingsWriteThemeToForm(theme);
    settingsApplyTheme(theme, {
        persist: false,
    });
    settingsSyncThemeMenu();
    captureSettingsBaseline();
    if (typeof showToast === "function") {
        showToast("Fleet settings restored to defaults.", "success");
    }
}

function getSettingsExportDateStamp() {
    const now = new Date();
    return (
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0")
    );
}

function exportFleetSettingsFile() {
    try {
        /* Export last-saved settings when clean; draft when dirty is intentional for backup of current form */
        const payload = buildFleetSettingsExportPackage(readSettingsFromForm());
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
            "hims-fleet-settings-" + getSettingsExportDateStamp() + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (typeof showToast === "function") {
            showToast("Settings exported (settings only).", "success");
        }
    } catch (error) {
        console.error(error);
        if (typeof showToast === "function") {
            showToast("Unable to export settings.", "error");
        }
    }
}

function importFleetSettingsFromFile(file) {
    if (!file) return;
    if (file.size > (HIMS_FLEET_SETTINGS_IMPORT_MAX_BYTES || 262144)) {
        if (typeof showToast === "function") {
            showToast("Import file is too large (max 256 KB).", "warning");
        }
        return;
    }
    const name = String(file.name || "").toLowerCase();
    if (name && !name.endsWith(".json")) {
        if (typeof showToast === "function") {
            showToast("Import accepts JSON files only.", "warning");
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const text = String(reader.result || "");
            if (/^\s*<!DOCTYPE|^\s*<html|javascript:/i.test(text)) {
                if (typeof showToast === "function") {
                    showToast(
                        "Import rejected: file is not valid settings JSON.",
                        "error",
                    );
                }
                return;
            }
            const parsed = JSON.parse(text);
            const result = validateFleetSettingsImportPayload(
                parsed,
                file.size,
            );
            if (!result.ok) {
                if (typeof showToast === "function") {
                    showToast(
                        result.error || "Invalid settings import.",
                        "error",
                    );
                }
                return;
            }
            /* Draft only until Save */
            applySettingsToForm(result.settings, { syncTheme: false });
            updateSettingsDirtyUi();
            if (typeof showToast === "function") {
                showToast(
                    "Settings imported as draft. Click Save Settings to persist.",
                    "success",
                );
            }
        } catch (error) {
            console.error(error);
            if (typeof showToast === "function") {
                showToast("Invalid JSON. Import failed.", "error");
            }
        }
    };
    reader.onerror = () => {
        if (typeof showToast === "function") {
            showToast("Unable to read import file.", "error");
        }
    };
    reader.readAsText(file);
}

function updateBrowserNotificationStatus() {
    const status = document.getElementById("settingsNotifBrowserStatus");
    const btn = document.getElementById("requestBrowserNotificationPermission");
    const checkbox = document.getElementById("settingsNotifBrowser");

    if (!("Notification" in window)) {
        if (status) {
            status.textContent =
                "Browser notifications are not supported in this browser. Control disabled.";
        }
        if (btn) btn.disabled = true;
        if (checkbox) {
            checkbox.disabled = true;
            checkbox.checked = false;
        }
        return;
    }

    if (btn) btn.disabled = false;
    if (checkbox) checkbox.disabled = false;

    const permission = Notification.permission;
    if (!status) return;
    if (permission === "granted") {
        status.textContent = "Browser permission: granted.";
    } else if (permission === "denied") {
        status.textContent =
            "Browser permission: denied. Enable notifications in browser site settings if needed.";
    } else {
        status.textContent =
            "Browser permission: not requested. Click the button to request (user interaction required).";
    }
}

function requestBrowserNotificationPermission() {
    if (!("Notification" in window)) {
        updateBrowserNotificationStatus();
        if (typeof showToast === "function") {
            showToast("Browser notifications are not supported.", "warning");
        }
        return;
    }

    Notification.requestPermission()
        .then((result) => {
            updateBrowserNotificationStatus();
            if (result === "granted") {
                settingsSetCheckbox("settingsNotifBrowser", true);
                markSettingsDirty();
                if (typeof showToast === "function") {
                    showToast(
                        "Browser notification permission granted.",
                        "success",
                    );
                }
            } else if (result === "denied") {
                settingsSetCheckbox("settingsNotifBrowser", false);
                markSettingsDirty();
                if (typeof showToast === "function") {
                    showToast(
                        "Permission denied. Preference saved as off when you Save.",
                        "warning",
                    );
                }
            }
        })
        .catch(() => {
            if (typeof showToast === "function") {
                showToast(
                    "Unable to request notification permission.",
                    "error",
                );
            }
        });
}

function initSettingsSectionNav() {
    const nav = document.getElementById("settingsSectionNav");
    if (!nav || nav.dataset.init === "true") return;
    nav.dataset.init = "true";

    nav.addEventListener("click", (event) => {
        const link = event.target?.closest?.("[data-settings-section]");
        if (!link) return;
        event.preventDefault();
        const id = link.getAttribute("data-settings-section");
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        nav.querySelectorAll("[data-settings-section]").forEach((el) => {
            el.classList.toggle("is-active", el === link);
        });
    });
}

function initSettingsDataActions() {
    document
        .getElementById("exportFleetSettings")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            exportFleetSettingsFile();
        });

    const fileInput = document.getElementById("importFleetSettingsFile");
    document
        .getElementById("importFleetSettings")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            fileInput?.click();
        });

    fileInput?.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        importFleetSettingsFromFile(file);
        fileInput.value = "";
    });

    document
        .getElementById("resetFleetSettings")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            resetFleetSettingsDefaults();
        });

    /* Demo wipe not registered — keep disabled, explain in note */
    const clearDemo = document.getElementById("clearDemoData");
    if (clearDemo) {
        clearDemo.disabled = true;
        clearDemo.setAttribute(
            "title",
            "No demo-data wipe architecture is registered in this frontend",
        );
    }

    document
        .getElementById("requestBrowserNotificationPermission")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            requestBrowserNotificationPermission();
        });

    document
        .getElementById("addMaintenanceServiceType")
        ?.addEventListener("click", () => {
            openMaintenanceServiceTypeEditor();
        });

    document
        .getElementById("addMaintenanceProvider")
        ?.addEventListener("click", () => {
            openMaintenanceProviderEditor();
        });

    document
        .getElementById("maintenanceServiceTypesTableBody")
        ?.addEventListener("click", (event) => {
            const editButton = event.target.closest(
                ".edit-maintenance-service-type",
            );
            const toggleButton = event.target.closest(
                ".toggle-maintenance-service-type",
            );
            if (editButton) {
                const id = editButton.dataset.id;
                const service = maintenanceServiceTypes.find(
                    (item) => item.id === id,
                );
                if (service) {
                    openMaintenanceServiceTypeEditor(service);
                }
                return;
            }

            if (toggleButton) {
                const id = toggleButton.dataset.id;
                const service = maintenanceServiceTypes.find(
                    (item) => item.id === id,
                );
                if (!service) {
                    return;
                }
                service.active = !service.active;
                renderMaintenanceServiceTypes();
                markSettingsDirty();
                showToast?.(
                    service.active
                        ? "Service type activated."
                        : "Service type deactivated.",
                    "success",
                );
            }
        });

    document
        .getElementById("maintenanceProvidersTableBody")
        ?.addEventListener("click", (event) => {
            const editButton = event.target.closest(
                ".edit-maintenance-provider",
            );
            const toggleButton = event.target.closest(
                ".toggle-maintenance-provider",
            );
            if (editButton) {
                const id = editButton.dataset.id;
                const provider = maintenanceProviders.find(
                    (item) => item.id === id,
                );
                if (provider) {
                    openMaintenanceProviderEditor(provider);
                }
                return;
            }
            if (toggleButton) {
                const id = toggleButton.dataset.id;
                const provider = maintenanceProviders.find(
                    (item) => item.id === id,
                );
                if (!provider) {
                    return;
                }
                provider.active = !provider.active;
                renderMaintenanceProviders();
                markSettingsDirty();
                showToast?.(
                    provider.active
                        ? "Technician / workshop activated."
                        : "Technician / workshop deactivated.",
                    "success",
                );
            }
        });

    document.getElementById("addFuelStation")?.addEventListener("click", () => {
        openFuelStationEditor();
    });
    document
        .getElementById("fuelStationsTableBody")
        ?.addEventListener("click", (event) => {
            const editButton = event.target.closest(".edit-fuel-station");
            const toggleButton = event.target.closest(".toggle-fuel-station");
            if (editButton) {
                const id = editButton.dataset.id;
                const station = fuelStations.find((item) => item.id === id);
                if (station) {
                    openFuelStationEditor(station);
                }
                return;
            }
            if (toggleButton) {
                const id = toggleButton.dataset.id;
                const station = fuelStations.find((item) => item.id === id);
                if (!station) {
                    return;
                }
                station.active = !station.active;
                renderFuelStations();
                markSettingsDirty();
                showToast?.(
                    station.active
                        ? "Fuel station activated."
                        : "Fuel station deactivated.",
                    "success",
                );
            }
        });
}

async function initSettingsPage() {
    if (settingsPageInitialized) {
        return;
    }
    if (!document.getElementById("settingsPage")) {
        return;
    }
    settingsPageInitialized = true;
    const loaded = await loadFleetSettings();
    applySettingsToForm(loaded);
    settingsWriteThemeToForm(settingsGetThemePreference());
    captureSettingsBaseline();
    initSettingsSectionNav();
    initSettingsDataActions();
    const form = document.getElementById("fleetSettingsForm");
    form?.addEventListener("input", () => {
        markSettingsDirty();
    });
    form?.addEventListener("change", (event) => {
        markSettingsDirty();
        const target = event.target;
        if (target && target.name === "settingsTheme") {
            settingsApplyTheme(settingsReadThemeFromForm(), {
                persist: false,
            });
        }
    });
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveFleetSettingsPage();
    });
    document
        .getElementById("cancelFleetSettings")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            cancelFleetSettingsPage();
        });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initSettingsPage();
    });
} else {
    initSettingsPage();
}