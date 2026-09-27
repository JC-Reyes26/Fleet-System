/* ==========================================
   Fleet Settings store (system configuration)
   Theme preference stays in himsFleetTheme only.
========================================== */

const HIMS_FLEET_SETTINGS_KEY = "himsFleetSettings";
const HIMS_FLEET_SETTINGS_VERSION = 1;

function getDefaultFleetSettings() {
  return {
      version: HIMS_FLEET_SETTINGS_VERSION,
      general: {
          organizationName: "Hospital Information Management System",
          fleetUnitName: "Fleet & Transportation",
          contactEmail: "",
          contactPhone: "",
          defaultLandingPage: "dashboard",
          /* Preference only — modules still use local page-size controls */
          defaultRowsPerPage: 10,
      },
      regional: {
          currencyCode: "PHP",
          currencySymbol: "₱",
          dateFormat: "YYYY-MM-DD",
          timeFormat: "24h",
          distanceUnit: "km",
          volumeUnit: "L",
      },
      vehicles: {
          requirePlateNumber: true,
          requireDepartment: false,
          defaultStatus: "Available",
          lowUtilizationThreshold: 40,
      },
      reservations: {
          requireApproval: true,
          allowSameDay: true,
          defaultDurationHours: 2,
          maxAdvanceDays: 30,
      },
      dispatch: {
          autoAssignDriver: false,
          requireVehicleCheck: true,
          defaultPriority: "Normal",
          showCompletedDays: 7,
      },
      drivers: {
          requireLicenseExpiry: true,
          warnLicenseDays: 30,
          defaultStatus: "Available",
      },
      maintenance: {
          overdueWarnDays: 3,
          requireCost: true,
          defaultType: "Preventive Maintenance",
          serviceTypes: [
              {
                  id: "preventive_maintenance",
                  name: "Preventive Maintenance",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "corrective_repair",
                  name: "Corrective Repair",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "inspection",
                  name: "Inspection",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "oil_change",
                  name: "Oil Change",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "tire_service",
                  name: "Tire Service",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "brake_service",
                  name: "Brake Service",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "engine_service",
                  name: "Engine Service",
                  defaultCost: 0,
                  active: true,
              },
              {
                  id: "other",
                  name: "Other",
                  defaultCost: 0,
                  active: true,
              },
          ],
          providers: [],
      },
      fuel: {
          requireOdometer: true,
          requireStation: false,
          highCostAlert: 5000,
          fuelStations: [],
      },
      routes: {
          preferOptimized: true,
      },
      costAnalysis: {
          defaultDateRange: "last30",
          showBudgetMismatch: true,
          includeUnassignedDepartment: true,
      },
      notifications: {
          maintenanceDue: true,
          licenseExpiring: true,
          reservationPending: true,
          fuelHighCost: false,
          dispatchUpdates: true,
          /* Preference flag only — no push/SW/polling */
          browserNotifications: false,
      },
      dataManagement: {
          confirmDestructive: true,
          retainExportHistory: false,
      },
      updatedAt: null,
  };
}

const HIMS_FLEET_SETTINGS_EXPORT_TYPE = "hims-fleet-settings";
const HIMS_FLEET_SETTINGS_IMPORT_MAX_BYTES = 262144;

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeFleetSettings(raw) {
  const defaults = getDefaultFleetSettings();
  if (!raw || typeof raw !== "object") return defaults;

  const g = raw.general || {};
  const r = raw.regional || {};
  const v = raw.vehicles || {};
  const res = raw.reservations || {};
  const d = raw.dispatch || {};
  const dr = raw.drivers || {};
  const m = raw.maintenance || {};
  const f = raw.fuel || {};
  const rt = raw.routes || {};
  const c = raw.costAnalysis || {};
  const n = raw.notifications || {};
  const dm = raw.dataManagement || {};

  const landing = [
    "dashboard",
    "vehicles",
    "reservations",
    "dispatch",
    "reports",
  ].includes(g.defaultLandingPage)
    ? g.defaultLandingPage
    : defaults.general.defaultLandingPage;

  return {
      version: HIMS_FLEET_SETTINGS_VERSION,
      general: {
          organizationName: String(
              g.organizationName ?? defaults.general.organizationName,
          ).slice(0, 120),
          fleetUnitName: String(
              g.fleetUnitName ?? defaults.general.fleetUnitName,
          ).slice(0, 80),
          contactEmail: String(g.contactEmail ?? "").slice(0, 120),
          contactPhone: String(g.contactPhone ?? "").slice(0, 40),
          defaultLandingPage: landing,
          defaultRowsPerPage: [5, 10, 20, 25, 50].includes(
              Number(g.defaultRowsPerPage),
          )
              ? Number(g.defaultRowsPerPage)
              : defaults.general.defaultRowsPerPage,
      },
      regional: {
          currencyCode: String(r.currencyCode || "PHP")
              .toUpperCase()
              .slice(0, 8),
          currencySymbol: String(r.currencySymbol || "₱").slice(0, 4),
          dateFormat: ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"].includes(
              r.dateFormat,
          )
              ? r.dateFormat
              : defaults.regional.dateFormat,
          timeFormat: r.timeFormat === "12h" ? "12h" : "24h",
          distanceUnit: r.distanceUnit === "mi" ? "mi" : "km",
          volumeUnit: r.volumeUnit === "gal" ? "gal" : "L",
      },
      vehicles: {
          requirePlateNumber: v.requirePlateNumber !== false,
          requireDepartment: v.requireDepartment !== false,
          defaultStatus: [
              "Available",
              "On Trip",
              "Maintenance",
              "Out of Service",
          ].includes(v.defaultStatus)
              ? v.defaultStatus
              : defaults.vehicles.defaultStatus,
          lowUtilizationThreshold: clampNumber(
              v.lowUtilizationThreshold,
              0,
              100,
              defaults.vehicles.lowUtilizationThreshold,
          ),
      },
      reservations: {
          requireApproval: res.requireApproval !== false,
          allowSameDay: res.allowSameDay !== false,
          defaultDurationHours: clampNumber(
              res.defaultDurationHours,
              1,
              72,
              defaults.reservations.defaultDurationHours,
          ),
          maxAdvanceDays: clampNumber(
              res.maxAdvanceDays,
              1,
              365,
              defaults.reservations.maxAdvanceDays,
          ),
      },
      dispatch: {
          autoAssignDriver: d.autoAssignDriver === true,
          requireVehicleCheck: d.requireVehicleCheck !== false,
          defaultPriority: ["Low", "Medium", "High", "Emergency"].includes(
              d.defaultPriority,
          )
              ? d.defaultPriority
              : defaults.dispatch.defaultPriority,
          showCompletedDays: clampNumber(
              d.showCompletedDays,
              1,
              90,
              defaults.dispatch.showCompletedDays,
          ),
      },
      drivers: {
          requireLicenseExpiry: dr.requireLicenseExpiry !== false,
          warnLicenseDays: clampNumber(
              dr.warnLicenseDays,
              1,
              180,
              defaults.drivers.warnLicenseDays,
          ),
          defaultStatus: ["Available", "On Leave", "Inactive"].includes(
              dr.defaultStatus,
          )
              ? dr.defaultStatus
              : defaults.drivers.defaultStatus,
      },
      maintenance: {
          overdueWarnDays: clampNumber(
              m.overdueWarnDays,
              0,
              30,
              defaults.maintenance.overdueWarnDays,
          ),
          requireCost: m.requireCost !== false,
          defaultType: [
              "Preventive Maintenance",
              "Corrective Repair",
              "Inspection",
              "Oil Change",
              "Tire Service",
              "Brake Service",
              "Engine Service",
              "Other",
          ].includes(m.defaultType)
              ? m.defaultType
              : defaults.maintenance.defaultType,
          serviceTypes: Array.isArray(m.serviceTypes)
              ? m.serviceTypes
                    .map((item) => ({
                        id: String(item?.id ?? "").trim(),
                        name: String(item?.name ?? "")
                            .trim()
                            .slice(0, 100),
                        defaultCost: clampNumber(
                            item?.defaultCost,
                            0,
                            100000000,
                            0,
                        ),
                        active: item?.active !== false,
                    }))
                    .filter((item) => item.id && item.name)
              : JSON.parse(JSON.stringify(defaults.maintenance.serviceTypes)),
          providers: Array.isArray(m.providers)
              ? m.providers
                    .map((item) => ({
                        id: String(item?.id ?? "").trim(),
                        name: String(item?.name ?? "")
                            .trim()
                            .slice(0, 120),
                        type:
                            item?.type === "Workshop"
                                ? "Workshop"
                                : "Technician",
                        contractType:
                            item?.contractType === "In-house"
                                ? "In-house"
                                : "Contractual",
                        active: item?.active !== false,
                    }))
                    .filter((item) => item.id && item.name)
              : [],
      },
      fuel: {
          requireOdometer: f.requireOdometer !== false,
          requireStation: f.requireStation === true,
          highCostAlert: clampNumber(
              f.highCostAlert,
              0,
              1000000,
              defaults.fuel.highCostAlert,
          ),
          fuelStations: Array.isArray(f.fuelStations)
              ? f.fuelStations
                    .map((item) => ({
                        id: String(item?.id ?? "")
                            .trim()
                            .slice(0, 160),
                        name: String(item?.name ?? "")
                            .trim()
                            .slice(0, 120),
                        /*
                         * Fuel stations are always contractual.
                         */
                        contractType: "Contractual",
                        active: item?.active !== false,
                    }))
                    .filter((item) => item.id && item.name)
              : [],
      },
      routes: {
          preferOptimized: rt.preferOptimized !== false,
      },
      costAnalysis: {
          defaultDateRange: [
              "today",
              "last7",
              "last30",
              "thisMonth",
              "thisQuarter",
              "thisYear",
          ].includes(c.defaultDateRange)
              ? c.defaultDateRange
              : defaults.costAnalysis.defaultDateRange,
          showBudgetMismatch: c.showBudgetMismatch !== false,
          includeUnassignedDepartment: c.includeUnassignedDepartment !== false,
      },
      notifications: {
          maintenanceDue: n.maintenanceDue !== false,
          licenseExpiring: n.licenseExpiring !== false,
          reservationPending: n.reservationPending !== false,
          fuelHighCost: n.fuelHighCost === true,
          dispatchUpdates: n.dispatchUpdates !== false,
          browserNotifications: n.browserNotifications === true,
      },
      dataManagement: {
          confirmDestructive: dm.confirmDestructive !== false,
          retainExportHistory: dm.retainExportHistory === true,
      },
      updatedAt: raw.updatedAt || null,
  };
}

/**
 * Build export payload — settings only (no operational datasets, no theme key dump required).
 */
function buildFleetSettingsExportPackage(settings) {
  return {
    exportType: HIMS_FLEET_SETTINGS_EXPORT_TYPE,
    schemaVersion: HIMS_FLEET_SETTINGS_VERSION,
    generatedAt: new Date().toISOString(),
    settings: normalizeFleetSettings(settings),
  };
}

/**
 * Validate and normalize an imported JSON document.
 * Returns { ok, settings, error }.
 * Unknown fields are ignored via normalizeFleetSettings.
 */
function validateFleetSettingsImportPayload(raw, fileSize) {
  if (fileSize != null && fileSize > HIMS_FLEET_SETTINGS_IMPORT_MAX_BYTES) {
    return {
      ok: false,
      settings: null,
      error: "Import file is too large (max 256 KB).",
    };
  }

  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      settings: null,
      error: "Invalid settings file structure.",
    };
  }

  const type = raw.exportType || raw.type || "";
  if (
    type &&
    type !== HIMS_FLEET_SETTINGS_EXPORT_TYPE &&
    type !== "fleet-settings"
  ) {
    return {
      ok: false,
      settings: null,
      error: "Wrong export type. Import a Fleet Settings JSON file only.",
    };
  }

  /* Reject packages that look like operational dumps */
  const forbidden = [
    "vehicles",
    "drivers",
    "fuel",
    "maintenance",
    "reservations",
    "dispatches",
    "routes",
    "reports",
    "budgets",
    "presets",
    "templates",
    "records",
  ];
  for (let i = 0; i < forbidden.length; i += 1) {
    const key = forbidden[i];
    if (Array.isArray(raw[key]) && raw[key].length) {
      return {
        ok: false,
        settings: null,
        error: "File contains operational data and cannot be imported as Settings.",
      };
    }
  }

  let candidate = raw.settings;
  if (!candidate || typeof candidate !== "object") {
    /* Allow bare settings object (legacy / direct schema) */
    if (raw.general || raw.regional || raw.version != null) {
      candidate = raw;
    } else {
      return {
        ok: false,
        settings: null,
        error: "Settings object missing from import file.",
      };
    }
  }

  if (typeof candidate !== "object" || Array.isArray(candidate)) {
    return {
      ok: false,
      settings: null,
      error: "Invalid settings object.",
    };
  }

  const schemaVersion = Number(
    raw.schemaVersion ?? candidate.version ?? HIMS_FLEET_SETTINGS_VERSION,
  );
  if (Number.isNaN(schemaVersion) || schemaVersion < 1 || schemaVersion > 50) {
    return {
      ok: false,
      settings: null,
      error: "Unsupported settings schema version.",
    };
  }

  return {
    ok: true,
    settings: normalizeFleetSettings(candidate),
    error: null,
  };
}


/* ==========================================
   Database-backed Fleet Settings API
========================================== */

async function loadFleetSettings() {
  try {
    const response = await fetch("/settings/data", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load settings (${response.status})`
      );
    }

    const data = await response.json();

    if (!data.settings) {
      return getDefaultFleetSettings();
    }

    const normalized =
      normalizeFleetSettings(data.settings);

    if (data.updated_at) {
      normalized.updatedAt =
        data.updated_at;
    }

    return normalized;
  } catch (error) {
    console.error(
      "Unable to load Fleet settings:",
      error
    );

    if (
      typeof showToast ===
      "function"
    ) {
      showToast(
        "Unable to load Fleet settings.",
        "error"
      );
    }

    return getDefaultFleetSettings();
  }
}

async function persistFleetSettings(
  settings
) {
  try {
    const normalized =
      normalizeFleetSettings(settings);

    const csrfToken =
      document
        .querySelector(
          'meta[name="csrf-token"]'
        )
        ?.getAttribute("content");

    const response = await fetch(
      "/settings",
      {
        method: "PUT",
        credentials: "same-origin",

        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",

          "X-CSRF-TOKEN":
            csrfToken || "",

          "X-Requested-With":
            "XMLHttpRequest",
        },

        body: JSON.stringify({
          settings: normalized,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      const message =
        data?.message ||
        "Unable to save settings.";

      throw new Error(message);
    }

    const saved =
      normalizeFleetSettings(
        data.settings ||
          normalized
      );

    if (data.updated_at) {
      saved.updatedAt =
        data.updated_at;
    }

    return saved;
  } catch (error) {
    console.error(
      "Unable to persist Fleet settings:",
      error
    );

    if (
      typeof showToast ===
      "function"
    ) {
      showToast(
        error.message ||
          "Unable to save Fleet settings.",
        "error"
      );
    }

    return null;
  }
}

async function resetFleetSettingsStorage() {
  try {
    const csrfToken =
      document
        .querySelector(
          'meta[name="csrf-token"]'
        )
        ?.getAttribute("content");

    const response = await fetch(
      "/settings/reset",
      {
        method: "POST",
        credentials: "same-origin",

        headers: {
          Accept: "application/json",

          "X-CSRF-TOKEN":
            csrfToken || "",

          "X-Requested-With":
            "XMLHttpRequest",
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Unable to reset settings."
      );
    }

    return true;
  } catch (error) {
    console.error(
      "Unable to reset Fleet settings:",
      error
    );

    if (
      typeof showToast ===
      "function"
    ) {
      showToast(
        error.message ||
          "Unable to reset settings.",
        "error"
      );
    }

    return false;
  }
}