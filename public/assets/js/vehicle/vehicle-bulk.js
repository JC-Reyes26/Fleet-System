/* ==========================================
   Vehicle Bulk Actions
========================================== */

let vehicleBulkState = null;

function getVehicleBulkRows() {
  if (!vehicleBulkState) return [];

  if (typeof getVehicleDataRows === "function") {
    return getVehicleDataRows(vehicleBulkState.tableBody);
  }

  return Array.from(
    vehicleBulkState.tableBody.querySelectorAll("tr"),
  ).filter((row) => row.querySelector(".vehicle-checkbox"));
}

function getVehicleBulkCheckboxes() {
  return getVehicleBulkRows()
    .map((row) => row.querySelector(".vehicle-checkbox"))
    .filter(Boolean);
}

function getVisibleVehicleBulkCheckboxes() {
  return getVehicleBulkRows()
    .filter((row) => row.style.display !== "none")
    .map((row) => row.querySelector(".vehicle-checkbox"))
    .filter(Boolean);
}

function refreshVehicleBulkState() {
  if (!vehicleBulkState) return;

  const { selectAll, toolbar, selectedCount } = vehicleBulkState;
  const checkboxes = getVehicleBulkCheckboxes();
  const visibleCheckboxes = getVisibleVehicleBulkCheckboxes();
  const selectedCheckboxes = checkboxes.filter((checkbox) => checkbox.checked);
  const selectedVisibleCheckboxes = visibleCheckboxes.filter(
    (checkbox) => checkbox.checked,
  );
  const allVisibleSelected =
    visibleCheckboxes.length > 0 &&
    selectedVisibleCheckboxes.length === visibleCheckboxes.length;

  selectedCount.textContent = `${selectedCheckboxes.length} vehicle${
    selectedCheckboxes.length === 1 ? "" : "s"
  } selected`;
  toolbar.classList.toggle("show", selectedCheckboxes.length > 0);
  selectAll.checked = allVisibleSelected;
  selectAll.indeterminate =
    selectedVisibleCheckboxes.length > 0 && !allVisibleSelected;
}

function clearVehicleSelection() {
  getVehicleBulkCheckboxes().forEach((checkbox) => {
    checkbox.checked = false;
  });

  if (vehicleBulkState) {
    vehicleBulkState.selectAll.checked = false;
    vehicleBulkState.selectAll.indeterminate = false;
  }

  refreshVehicleBulkState();
}

function refreshVehicleAfterBulkDelete() {
  if (typeof applyVehicleFilters === "function") {
    applyVehicleFilters();
  } else if (typeof refreshVehiclePagination === "function") {
    refreshVehiclePagination();
  }

  if (typeof updateVehicleStats === "function") {
    updateVehicleStats();
  }

  refreshVehicleBulkState();
}

function initBulkActions() {
  const tableBody = document.getElementById("vehicleTableBody");
  const selectAll = document.getElementById("selectAllVehicles");
  const toolbar = document.getElementById("bulkToolbar");
  const selectedCount = document.getElementById("selectedCount");
  const clearButton = document.getElementById("clearSelection");
  const archiveButton = document.getElementById("archiveSelected");

  if (
      !tableBody ||
      !selectAll ||
      !toolbar ||
      !selectedCount ||
      !archiveButton
  ) {
      return;
  }

  if (tableBody.dataset.vehicleBulkInitialized === "true") {
    refreshVehicleBulkState();
    return;
  }

  tableBody.dataset.vehicleBulkInitialized = "true";
  vehicleBulkState = {
    tableBody,
    selectAll,
    toolbar,
    selectedCount,
  };

  selectAll.addEventListener("change", () => {
    getVisibleVehicleBulkCheckboxes().forEach((checkbox) => {
      checkbox.checked = selectAll.checked;
    });

    refreshVehicleBulkState();
  });

  tableBody.addEventListener("change", (event) => {
    if (!event.target?.classList?.contains("vehicle-checkbox")) return;

    refreshVehicleBulkState();
  });

  clearButton?.addEventListener("click", clearVehicleSelection);

  archiveButton.addEventListener("click", async () => {
      const ids = getVehicleBulkCheckboxes()
          .filter((cb) => cb.checked)
          .map((cb) => cb.dataset.id);

      if (ids.length === 0) {
          return;
      }

      archiveButton.disabled = true;

      try {
          const response = await fetch("/fleet/bulk-archive", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "X-CSRF-TOKEN":
                      document.querySelector('meta[name="csrf-token"]')
                          ?.content || "",
                  "X-Requested-With": "XMLHttpRequest",
              },
              credentials: "same-origin",
              body: JSON.stringify({
                  ids: ids,
              }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
              throw new Error(
                  data.message || "Unable to archive selected vehicles.",
              );
          }

          clearVehicleSelection();

          if (typeof applyVehicleFilters === "function") {
              applyVehicleFilters();
          }

          if (typeof window.showToast === "function") {
              window.showToast(
                  data.message || "Selected vehicles archived successfully.",
                  "success",
              );
          }

          if (typeof loadVehicles === "function") {
              await loadVehicles();
          }
      } catch (error) {
          console.error("BULK VEHICLE ARCHIVE ERROR:", error);

          if (typeof window.showToast === "function") {
              window.showToast(
                  error.message || "Unable to archive selected vehicles.",
                  "error",
              );
          }
      } finally {
          archiveButton.disabled = false;
      }
  });

  refreshVehicleBulkState();

}

document.addEventListener("DOMContentLoaded", initBulkActions);