/* ==========================================
   View Fuel Record
========================================== */

let viewFuelInitialized = false;

const viewFuelModalState = {
    currentRow: null,
    currentFuelId: null,
    currentFuel: null,
};


function getFuelRecordIdFromRow(row) {
    if (!row) {
        return "";
    }

    const id = (row.dataset.id || row.dataset.fuelId || "").trim();

    if (!id || !/^\d+$/.test(id)) {
        return "";
    }

    return id;
}


function resolveFuelRowById(recordId) {
    const id = String(recordId || "").trim();

    if (!id) {
        return null;
    }

    const tableBody = document.getElementById("fuelTableBody");

    if (!tableBody) {
        return null;
    }

    const rows =
        typeof getFuelDataRows === "function"
            ? getFuelDataRows(tableBody)
            : Array.from(tableBody.querySelectorAll("tr"));

    return (
        rows.find((row) => {
            const rowId = (row.dataset.id || row.dataset.fuelId || "").trim();

            return rowId === id;
        }) || null
    );
}

async function openViewFuelModal(row) {
    const modal = document.getElementById("viewFuelModal");

    if (!modal || !row) {
        return false;
    }

    const fuelId = getFuelRecordIdFromRow(row);

    if (!fuelId) {
        console.error("Invalid fuel database ID:", row.dataset);

        showToast?.("Invalid fuel record ID.", "error");

        return false;
    }

    try {
        const response = await fetch(`/fuel-records/${fuelId}`, {
            headers: {
                Accept: "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load fuel record.");
        }

        const fuel = data.fuelLog;

        if (!fuel) {
            throw new Error("Fuel record not found.");
        }

        viewFuelModalState.currentRow = row;
        viewFuelModalState.currentFuelId = String(fuel.id);
        viewFuelModalState.currentFuel = fuel;
        modal.dataset.fuelId = String(fuel.id);

        const editBtn = document.getElementById("editFuelFromViewBtn");

        if (editBtn) {
            editBtn.dataset.fuelId = String(fuel.id);
        }

        const vehicle = fuel.vehicle;
        const driver = fuel.driver;
        const vehicleText = vehicle
            ? [
                  [vehicle.brand, vehicle.model].filter(Boolean).join(" "),

                  vehicle.vehicle_type,
              ]
                  .filter(Boolean)
                  .join(" - ")
            : "Unassigned";
        const driverText = driver
            ? [driver.first_name, driver.last_name].filter(Boolean).join(" ")
            : "Not Assigned";
        const setText = (id, value, fallback = "Not provided") => {
            const element = document.getElementById(id);

            if (!element) {
                return;
            }

            element.textContent =
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
                    ? value
                    : fallback;
        };

        setText("viewFuelNumber", fuel.fuel_number);
        setText("viewFuelVehicle", vehicleText, "Unassigned");
        setText("viewFuelType", fuel.fuel_type);
        setText("viewFuelTotalCost", formatFuelCurrency(fuel.cost));
        setText("viewFuelDate", formatFuelDisplayDate(fuel.date));
        setText("viewFuelTime", fuel.refuel_time || "—");
        setText("viewFuelPlate", vehicle?.plate_number, "—");
        setText("viewFuelDriver", driverText);
        setText("viewFuelQuantity", formatFuelQuantity(fuel.fuel_amount));
        setText(
            "viewFuelCostPerLiter",
            formatFuelCurrency(fuel.cost_per_liter),
        );
        setText("viewFuelOdometer", formatFuelOdometer(fuel.odometer));
        setText("viewFuelStation", fuel.fuel_station);
        setText("viewFuelReceipt", fuel.receipt_number, "—");
        setText("viewFuelPayment", fuel.payment_method, "—");
        setText("viewFuelNotes", fuel.notes, "—");

        
        modal.classList.add("show");
        document.body.style.overflow = "hidden";

        return true;
    } catch (error) {
        console.error("FUEL VIEW ERROR:", error);

        showToast?.(error.message || "Unable to load fuel record.", "error");

        return false;
    }
}

function closeViewFuelModal() {
    const modal = document.getElementById("viewFuelModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");
    document.body.style.overflow = "";
    viewFuelModalState.currentRow = null;
    viewFuelModalState.currentFuelId = null;
    viewFuelModalState.currentFuel = null;
    delete modal.dataset.fuelId;

    const editBtn = document.getElementById("editFuelFromViewBtn");

    if (editBtn) {
        delete editBtn.dataset.fuelId;
    }
}

async function openEditFuelFromView() {
    const modal = document.getElementById("viewFuelModal");
    const canEdit = window.FLEET_RBAC?.fuel?.canUpdate === true;
    if (!canEdit) {
        showToast?.(
            "You do not have permission to edit fuel records.",
            "error",
        );
        return;
    }
    const fuelId =
        viewFuelModalState.currentFuelId || modal?.dataset.fuelId || "";
    let row = viewFuelModalState.currentRow;
    if (!row || !document.body.contains(row)) {
        row = resolveFuelRowById(fuelId);
    }
    if (!row) {
        showToast?.("Fuel record is no longer available.", "error");
        return;
    }
    if (typeof openEditFuelModal !== "function") {
        console.error("openEditFuelModal is not available.");
        return;
    }
    closeViewFuelModal();
    openEditFuelModal(row);
}

function initViewFuelModal() {
    if (viewFuelInitialized) {
        return;
    }

    const modal = document.getElementById("viewFuelModal");

    if (!modal) {
        return;
    }

    viewFuelInitialized = true;

    document.addEventListener("click", (event) => {
        const viewBtn = event.target.closest(".action-btn.view-fuel");

        if (viewBtn) {
            const row = viewBtn.closest("tr");

            if (row) {
                openViewFuelModal(row);
            }

            return;
        }

        const editFromView = event.target.closest("#editFuelFromViewBtn");

        if (editFromView) {
            event.preventDefault();

            openEditFuelFromView();

            return;
        }

        if (
            event.target.closest("#closeViewFuelModal") ||
            event.target.closest("#closeViewFuelBtn")
        ) {
            closeViewFuelModal();

            return;
        }

        if (event.target === modal) {
            closeViewFuelModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeViewFuelModal();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initViewFuelModal();
});
