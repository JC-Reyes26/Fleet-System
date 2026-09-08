/* ==========================================
   Vehicle Search & Filters
========================================== */

let vehicleFilterState = null;
let currentSort = "id";
let currentDirection = "asc";
let vehicleSearchTimeout = null;

const vehicleSortMap = {
    1: "brand",
    2: "plate_number",
    3: "vehicle_type",
    5: "status",
};

function getVehicleDataRows(tableBody) {

    if (!tableBody) return [];

    return Array.from(tableBody.querySelectorAll("tr")
    ).filter((row) => {

        const isHelperRow =
            row.classList.contains("vehicle-no-results") ||
            row.classList.contains("helper-row") ||
            row.classList.contains("empty-state") ||
            row.dataset.helperRow === "true" ||
            row.dataset.temporary === "true";
        return (
            !isHelperRow &&
            Boolean(
                row.querySelector(".vehicle-name") ||
                row.querySelector(".vehicle-checkbox")
            )
        );
    });
}

function updateVehicleNoResultsRow(tableBody, shouldShow) {
    if (!tableBody) {
        return;
    }
    const existingRow = tableBody.querySelector(".vehicle-no-results");
    if (!shouldShow) {
        existingRow?.remove();
        return;
    }
    if (existingRow) {
        return;
    }
    const row = document.createElement("tr");
    row.className = "vehicle-no-results";
    row.dataset.helperRow = "true";
    row.innerHTML = `
        <td
            colspan="9"
            class="text-center"
        >
            No vehicles found.
        </td>
    `;
    tableBody.appendChild(row);
}


function getVehicleSearchText(row, columnIndex, selector) {
    const selectedElement = selector
        ? row.querySelector(selector)
        : null;

    const cell = row.children?.[columnIndex];
    const value = selectedElement
        ? selectedElement.textContent
        : cell?.textContent;

    return value
        ? value.trim()
        : "";
}

function getVehicleFilterLabel(select) {
    if (!select || select.value === "all") {
        return "";
    }

    const option = select.options[select.selectedIndex];
    const value = option
            ? option.textContent
            : select.value;
    return value
        .trim()
        .toLowerCase();
}

function applyVehicleFilters({resetPage = false} = {}) {
    if (!vehicleFilterState) {
        return [];
    }
    const {tableBody, searchInput, typeFilter, statusFilter,} = vehicleFilterState;
    const searchQuery = (searchInput?.value || "")
            .trim()
            .toLowerCase();
    const typeValue = getVehicleFilterLabel(typeFilter);
    const statusValue = getVehicleFilterLabel(statusFilter);
    const matchingRows = [];

    getVehicleDataRows(tableBody).forEach((row) => {
        const searchableText = [
            row.dataset.brand,
            row.dataset.model,
            row.dataset.plateNumber,
            row.dataset.vehicleType,
            row.dataset.driverName,
            row.dataset.driverLicense,
            row.dataset.fuelType,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const rowType = (row.dataset.vehicleType || "")
                .trim()
                .toLowerCase();
        const rowStatus = (row.dataset.status || "")
                .trim()
                .toLowerCase();
        const matchesSearch = !searchQuery || searchableText.includes(searchQuery);
        const matchesType = !typeValue || rowType === typeValue;
        const matchesStatus = !statusValue || rowStatus === statusValue;
        const isMatch = matchesSearch && matchesType && matchesStatus;
        row.dataset.vehicleMatchesFilter = String(isMatch);

        if (isMatch) {matchingRows.push(row);}
    });

    updateVehicleNoResultsRow(tableBody, matchingRows.length === 0);

    if (typeof refreshVehiclePagination === "function") {
    const paginationUpdated = refreshVehiclePagination({reset: resetPage});

    if (paginationUpdated) {
        return matchingRows;
    }
}

    const matchingRowSet = new Set(matchingRows);

    getVehicleDataRows(tableBody)
        .forEach((row) => {
            row.style.display = matchingRowSet.has(row)
                ? ""
                : "none";

        });
    return matchingRows;
}

function initVehicleSearch() {
    const tableBody = document.getElementById(
        "vehicleTableBody"
    );
    const searchInput = document.getElementById(
        "vehicleSearch"
    );
    const typeFilter = document.getElementById(
        "vehicleTypeFilter"
    );
    const statusFilter = document.getElementById(
        "vehicleStatusFilter"
    );
    const refreshButton = document.getElementById(
        "refreshVehicles"
    );

    if (!tableBody || tableBody.dataset.vehicleSearchInitialized === "true") {
        return;
    }

    tableBody.dataset.vehicleSearchInitialized = "true";

    vehicleFilterState = {
        tableBody,
        searchInput,
        typeFilter,
        statusFilter,
    };

    searchInput?.addEventListener("input", () => {
            clearTimeout(vehicleSearchTimeout);

            vehicleSearchTimeout = setTimeout(() => {
                applyVehicleFilters({resetPage: true});
            }, 300);
        }
    );

    typeFilter?.addEventListener("change", () =>
        {applyVehicleFilters({resetPage: true});}
    );
    statusFilter?.addEventListener("change", () => 
        {applyVehicleFilters({resetPage: true});}
    );

    refreshButton?.addEventListener("click", () => {
        if (searchInput) {searchInput.value = "";}
        if (typeFilter) {typeFilter.value = "all";}
        if (statusFilter) {statusFilter.value = "all";}
            currentSort = "id";
            currentDirection = "asc";
            applyVehicleFilters({resetPage: true});
        }
    );


    document.querySelectorAll(".sortable")
        .forEach((header) => {
            header.addEventListener("click", () => {
                const column = header.dataset.column;
                const sortField = vehicleSortMap[column];
                if (!sortField) {
                    return;
                }
                if (currentSort === sortField) {
                        currentDirection = currentDirection === "asc"
                            ? "desc"
                            : "asc";
                        } else {
                            currentSort = sortField;
                            currentDirection = "asc";
                        }
                        applyVehicleFilters({resetPage: true});

                }
            );
        });
        applyVehicleFilters();
}


document.addEventListener("DOMContentLoaded",() => {
    initVehicleSearch();
});