/* ==========================================
   Driver Search and Filters
========================================== */

let driverSearchState = null;

function getDriverSearchText(row, columnIndex, selector) {
  const selectedElement = selector ? row.querySelector(selector) : null;
  const cell = row.children && row.children[columnIndex];
  const value = selectedElement ? selectedElement.textContent : cell?.textContent;

  return value ? value.trim() : "";
}

function getDriverFilterLabel(select) {
  if (!select || select.value === "all") return "";

  const option = select.options[select.selectedIndex];
  const value = option ? option.textContent : select.value;

  return value.trim().toLowerCase();
}

function getDriverDataRows(tableBody) {
  if (!tableBody) return [];

  return Array.from(tableBody.querySelectorAll("tr")).filter((row) => {
    const isHelperRow =
      row.classList.contains("driver-no-results") ||
      row.classList.contains("helper-row") ||
      row.classList.contains("empty-state") ||
      row.dataset.helperRow === "true";

    return (
      !isHelperRow &&
      Boolean(
        row.querySelector(".driver-name") ||
          row.querySelector(".driver-checkbox"),
      )
    );
  });
}

function updateDriverNoResultsRow(tableBody, shouldShow) {
    if (!tableBody) {
        return;
    }
    const existingRow = tableBody.querySelector(".driver-no-results");
    if (!shouldShow) {
        existingRow?.remove();
        return;
    }
    if (existingRow) {
        return;
    }
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    row.className = "driver-no-results";
    row.dataset.helperRow = "true";
    cell.colSpan = 9;
    cell.className = "text-center";
    cell.textContent = "No drivers found.";
    row.appendChild(cell);
    tableBody.appendChild(row);
}

function renderDriverFilterRows(matchingRows) {
  if (!driverSearchState) return;

  const matchingRowSet = new Set(matchingRows);

  getDriverDataRows(driverSearchState.tableBody).forEach((row) => {
    row.style.display = matchingRowSet.has(row) ? "" : "none";
  });

  updateDriverNoResultsRow(
    driverSearchState.tableBody,
    matchingRows.length === 0,
  );
}

function applyDriverFilters({ resetPage = false } = {}) {
  if (!driverSearchState) return [];

  const {
    tableBody,
    searchInput,
    statusFilter,
    licenseFilter,
  } = driverSearchState;
  const searchQuery = (searchInput?.value || "").trim().toLowerCase();
  const statusValue = getDriverFilterLabel(statusFilter);
  const licenseValue = getDriverFilterLabel(licenseFilter);
  const matchingRows = [];

  getDriverDataRows(tableBody).forEach((row) => {
    const searchableText = [
      getDriverSearchText(row, 1, ".driver-name"),
      getDriverSearchText(row, 2),
      getDriverSearchText(row, 3),
      getDriverSearchText(row, 5),
      getDriverSearchText(row, 7),
    ]
      .join(" ")
      .toLowerCase();
    const rowStatus = getDriverSearchText(row, 6, ".status-badge").toLowerCase();
    const rowLicense = getDriverSearchText(row, 4).toLowerCase();
    const matchesSearch = !searchQuery || searchableText.includes(searchQuery);
    const matchesStatus = !statusValue || rowStatus === statusValue;
    const matchesLicense = !licenseValue || rowLicense === licenseValue;
    const isMatch = matchesSearch && matchesStatus && matchesLicense;

    row.dataset.driverMatchesFilter = String(isMatch);

    if (isMatch) {
      matchingRows.push(row);
    }
  });

  updateDriverNoResultsRow(tableBody, matchingRows.length === 0);

  if (
    typeof refreshDriverPagination === "function" &&
    refreshDriverPagination({ reset: resetPage })
  ) {
    return matchingRows;
  }

  renderDriverFilterRows(matchingRows);

  return matchingRows;
}

function initDriverSearch() {
  const tableBody = document.getElementById("driverTableBody");
  const searchInput = document.getElementById("driverSearch");
  const statusFilter = document.getElementById("driverStatusFilter");
  const licenseFilter = document.getElementById("driverLicenseFilter");
  const refreshButton = document.getElementById("refreshDrivers");

  if (!tableBody || tableBody.dataset.driverSearchInitialized === "true") {
    return;
  }

  tableBody.dataset.driverSearchInitialized = "true";

  driverSearchState = {
    tableBody,
    searchInput,
    statusFilter,
    licenseFilter,
  };

  const isNoResultsMutation = (node) => {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

    return Boolean(element?.closest(".driver-no-results"));
  };

  const observer =
    typeof MutationObserver === "function"
      ? new MutationObserver((mutations) => {
          const hasDriverRowChange = mutations.some((mutation) => {
            if (isNoResultsMutation(mutation.target)) return false;

            return [...mutation.addedNodes, ...mutation.removedNodes].some(
              (node) => !isNoResultsMutation(node),
            );
          });

          if (hasDriverRowChange) {
            applyDriverFilters();
          }
        })
      : null;

  observer?.observe(tableBody, {
    childList: true,
    subtree: true,
  });

  searchInput?.addEventListener("input", () => {
    applyDriverFilters({ resetPage: true });
  });
  statusFilter?.addEventListener("change", () => {
    applyDriverFilters({ resetPage: true });
  });
  licenseFilter?.addEventListener("change", () => {
    applyDriverFilters({ resetPage: true });
  });
  refreshButton?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "all";
    }

    if (licenseFilter) {
      licenseFilter.value = "all";
    }

    applyDriverFilters({ resetPage: true });
  });

  applyDriverFilters();
}

document.addEventListener("DOMContentLoaded", () => {
    initDriverSearch();
});