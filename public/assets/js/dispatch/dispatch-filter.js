/* ==========================================
   Dispatch Search and Filters
========================================== */

let dispatchSearchState = null;

function getDispatchSearchText(row, selector) {
    const element = selector ? row.querySelector(selector) : null;

    return element?.textContent?.trim() || "";
}

function getDispatchFilterLabel(select) {
    if (!select || select.value === "all") {
        return "";
    }

    const option = select.options[select.selectedIndex];
    const value = option ? option.textContent : select.value;

    return value.trim().toLowerCase();
}

function getDispatchDataRows(tableBody) {
    if (!tableBody) {
        return [];
    }

    return Array.from(tableBody.querySelectorAll("tr")).filter((row) => {
        const isHelperRow =
            row.classList.contains("dispatch-no-results") ||
            row.classList.contains("helper-row") ||
            row.classList.contains("empty-state") ||
            row.dataset.helperRow === "true";

        return (
            !isHelperRow &&
            Boolean(
                row.querySelector(".dispatch-number") ||
                row.querySelector(".dispatch-checkbox"),
            )
        );
    });
}

function updateDispatchNoResultsRow(tableBody, shouldShow) {
    if (!tableBody) {
        return;
    }
    const existingRow = tableBody.querySelector(".dispatch-no-results");
    if (!shouldShow) {
        existingRow?.remove();
        return;
    }
    if (existingRow) {
        return;
    }
    tableBody.insertAdjacentHTML(
        "beforeend",
        `
            <tr
                class="dispatch-no-results"
                data-helper-row="true"
            >
                <td
                    colspan="11"
                    class="text-center"
                >
                    No dispatch records found.
                </td>
            </tr>
        `,
    );
}

function renderDispatchFilterRows(matchingRows) {
    if (!dispatchSearchState) {
        return;
    }

    const matchingRowSet = new Set(matchingRows);

    getDispatchDataRows(dispatchSearchState.tableBody).forEach((row) => {
        row.style.display = matchingRowSet.has(row) ? "" : "none";
    });

    updateDispatchNoResultsRow(
        dispatchSearchState.tableBody,
        matchingRows.length === 0,
    );
}

function applyDispatchFilters({ resetPage = false } = {}) {
    if (!dispatchSearchState) {
        return [];
    }

    const { tableBody, searchInput, statusFilter, priorityFilter, dateFilter } =
        dispatchSearchState;
    const searchQuery = (searchInput?.value || "").trim().toLowerCase();
    const statusValue = getDispatchFilterLabel(statusFilter);
    const priorityValue = getDispatchFilterLabel(priorityFilter);
    const dateValue = (dateFilter?.value || "").trim();
    const matchingRows = [];

    getDispatchDataRows(tableBody).forEach((row) => {
        const dispatchNumber = getDispatchSearchText(row, ".dispatch-number");
        const reservationNumber = getDispatchSearchText(
            row,
            ".dispatch-reservation-number",
        );
        const patientName = getDispatchSearchText(
            row,
            ".dispatch-patient-name",
        );
        const requestType =
            getDispatchSearchText(row, ".dispatch-request-type") ||
            row.dataset.requestType ||
            "";
        const vehicle = getDispatchSearchText(row, ".dispatch-vehicle");
        const driver = getDispatchSearchText(row, ".dispatch-driver");
        const pickup = row.dataset.pickup || "";
        const destination = row.dataset.destination || "";
        const searchableText = [
            dispatchNumber,
            reservationNumber,
            patientName,
            requestType,
            vehicle,
            driver,
            pickup,
            destination,
        ]
            .join(" ")
            .toLowerCase();

        const rowStatus = getDispatchSearchText(
            row,
            ".status-badge",
        ).toLowerCase();

        const rowPriority =
            getDispatchSearchText(row, ".dispatch-priority").toLowerCase() ||
            (row.dataset.priority || "").toLowerCase();
        const rowDate = (row.dataset.scheduleDate || "").trim();
        const matchesSearch =
            !searchQuery || searchableText.includes(searchQuery);
        const matchesStatus = !statusValue || rowStatus === statusValue;
        const matchesPriority = !priorityValue || rowPriority === priorityValue;
        const matchesDate = !dateValue || rowDate === dateValue;
        const isMatch =
            matchesSearch && matchesStatus && matchesPriority && matchesDate;

        row.dataset.dispatchMatchesFilter = String(isMatch);

        if (isMatch) {
            matchingRows.push(row);
        }
    });

    updateDispatchNoResultsRow(tableBody, matchingRows.length === 0);

    /*
     * Let pagination handle the actual
     * visible page.
     */
    if (typeof updateDispatchPagination === "function") {
        if (typeof refreshDispatchPagination === "function") {
            refreshDispatchPagination({
                reset: resetPage,
            });
        } else {
            if (resetPage) {
                dispatchCurrentPage = 1;
            }

            updateDispatchPagination();
        }

        return matchingRows;
    }

    renderDispatchFilterRows(matchingRows);

    return matchingRows;
}

function initDispatchSearch() {
    const tableBody = document.getElementById("dispatchTableBody");
    const searchInput = document.getElementById("dispatchSearch");
    const statusFilter = document.getElementById("dispatchStatusFilter");
    const priorityFilter = document.getElementById("dispatchPriorityFilter");
    const dateFilter = document.getElementById("dispatchDateFilter");
    const refreshButton = document.getElementById("refreshDispatches");

    if (!tableBody || tableBody.dataset.dispatchSearchInitialized === "true") {
        return;
    }

    tableBody.dataset.dispatchSearchInitialized = "true";

    dispatchSearchState = {
        tableBody,
        searchInput,
        statusFilter,
        priorityFilter,
        dateFilter,
    };

    /*
     * Observe table changes.
     *
     * Important for:
     * - Add dispatch
     * - Edit dispatch
     * - Delete dispatch
     * - Bulk delete
     * - Reloaded table rows
     */
    const isNoResultsMutation = (node) => {
        const element =
            node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

        return Boolean(element?.closest(".dispatch-no-results"));
    };

    const observer =
        typeof MutationObserver === "function"
            ? new MutationObserver((mutations) => {
                  const hasDispatchRowChange = mutations.some((mutation) => {
                      if (isNoResultsMutation(mutation.target)) {
                          return false;
                      }

                      return [
                          ...mutation.addedNodes,
                          ...mutation.removedNodes,
                      ].some((node) => !isNoResultsMutation(node));
                  });

                  if (hasDispatchRowChange) {
                      applyDispatchFilters();
                  }
              })
            : null;

    observer?.observe(tableBody, {
        childList: true,
        subtree: true,
    });
    searchInput?.addEventListener("input", () => {
        applyDispatchFilters({
            resetPage: true,
        });
    });
    statusFilter?.addEventListener("change", () => {
        applyDispatchFilters({
            resetPage: true,
        });
    });
    priorityFilter?.addEventListener("change", () => {
        applyDispatchFilters({
            resetPage: true,
        });
    });
    dateFilter?.addEventListener("change", () => {
        applyDispatchFilters({
            resetPage: true,
        });
    });

    refreshButton?.addEventListener("click", () => {
        if (searchInput) {
            searchInput.value = "";
        }
        if (statusFilter) {
            statusFilter.value = "all";
        }
        if (priorityFilter) {
            priorityFilter.value = "all";
        }
        if (dateFilter) {
            dateFilter.value = "";
        }

        applyDispatchFilters({
            resetPage: true,
        });

        if (typeof updateDispatchStatistics === "function") {
            updateDispatchStatistics();
        }
    });

    applyDispatchFilters({
        resetPage: true,
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initDispatchSearch();
});
