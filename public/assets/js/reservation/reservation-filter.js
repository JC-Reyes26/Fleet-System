/* ==========================================
Reservation Search and Filters
========================================== */

let reservationSearchState = null;

function getReservationSearchText(row, selector) {
    const element = selector
        ? row.querySelector(selector)
        : null;
    return element
        ? element.textContent.trim()
        : "";
}

function getReservationFilterLabel(select) {
    if (!select || select.value === "all") {
        return "";
    }

    const option = select.options[select.selectedIndex];
    const value = option
      ? option.textContent
      : select.value;

    return value.trim().toLowerCase();
}

function getReservationDataRows(tableBody) {
    if (!tableBody) return [];

    return Array.from(
        tableBody.querySelectorAll("tr")
    ).filter((row) => {

        const isHelperRow = row.classList.contains("reservation-no-results") ||
            row.classList.contains("helper-row") ||
            row.classList.contains("empty-state") ||
            row.dataset.helperRow === "true";

        return (!isHelperRow && Boolean(
            row.querySelector(".reservation-number") || row.querySelector(".reservation-checkbox")
          )
        );
    });
}

function updateReservationNoResultsRow(tableBody, shouldShow) {
    if (!tableBody) {
        return;
    }
    const existingRow = tableBody.querySelector(".reservation-no-results");
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
                class="reservation-no-results"
                data-helper-row="true"
            >
                <td
                    colspan="10"
                    class="text-center"
                >
                    No reservations found.
                </td>
            </tr>
        `,
    );
}

function renderReservationFilterRows(matchingRows) {
    if (!reservationSearchState) return;

    const { tableBody } = reservationSearchState;

    updateReservationNoResultsRow(tableBody, matchingRows.length === 0);
}

function applyReservationFilters({resetPage = false} = {}) {
    if (!reservationSearchState) {
        return [];
    }

    const {tableBody, searchInput, statusFilter, dateFilter} = reservationSearchState;
    const searchQuery = (searchInput?.value || "")
      .trim()
      .toLowerCase();
    const statusValue = getReservationFilterLabel(statusFilter);
    const dateValue = dateFilter?.value || "";
    const matchingRows = [];

    getReservationDataRows(tableBody).forEach((row) => {
        const searchableText = [
            getReservationSearchText(row, ".reservation-number"),
            getReservationSearchText(row, ".patient-name"),
            getReservationSearchText(row, ".reservation-vehicle"),
            getReservationSearchText(row, ".reservation-driver"),
            getReservationSearchText(row, ".reservation-pickup"),
            getReservationSearchText(row, ".reservation-destination"
          )
        ]
          .join(" ")
          .toLowerCase();
        const rowStatus = getReservationSearchText(row, ".status-badge").toLowerCase();
        const rowDate = row.dataset.scheduleDate || "";
        const matchesSearch = !searchQuery || searchableText.includes(searchQuery);
        const matchesStatus = !statusValue || rowStatus === statusValue;
        const matchesDate = !dateValue || rowDate === dateValue;
        const isMatch = matchesSearch && matchesStatus && matchesDate;
        row.dataset.reservationMatchesFilter = String(isMatch);
        if (isMatch) {
            matchingRows.push(row);
        }
    });

    updateReservationNoResultsRow(tableBody, matchingRows.length === 0);

    renderReservationFilterRows(matchingRows);

    if (typeof updateReservationPagination === "function") {
        updateReservationPagination({reset: resetPage});
    }

    return matchingRows;
}

function initReservationFilters() {

    const tableBody = document.getElementById("reservationTableBody");
    const searchInput = document.getElementById("reservationSearch");
    const statusFilter = document.getElementById("reservationStatusFilter");
    const dateFilter = document.getElementById("reservationDateFilter");
    const refreshButton = document.getElementById("refreshReservations");

    if (!tableBody || tableBody.dataset.reservationSearchInitialized === "true") {
        return;
    }

    tableBody.dataset.reservationSearchInitialized = "true";
    reservationSearchState = {tableBody, searchInput, statusFilter, dateFilter};

    const isNoResultsMutation = (node) => {
        const element = node.nodeType === Node.ELEMENT_NODE
          ? node
          : node.parentElement;
        return Boolean(element?.closest(".reservation-no-results"));
    };
    const observer = typeof MutationObserver === "function"
      ? new MutationObserver((mutations) => {
          const hasReservationRowChange = mutations.some((mutation) => {
            if (isNoResultsMutation(mutation.target)) {return false;}
              return [...mutation.addedNodes, ...mutation.removedNodes].some(
                (node) => !isNoResultsMutation(node)
              );
            }
          );

          if (hasReservationRowChange) {applyReservationFilters();}
        }
      )
        : null;

    observer?.observe(tableBody,
      {
        childList: true,
        subtree: true
      }
    );

    searchInput?.addEventListener("input", () => {
        applyReservationFilters({resetPage: true});
      }
    );
    statusFilter?.addEventListener("change", () => {
        applyReservationFilters({resetPage: true});
      }
    );
    dateFilter?.addEventListener("change", () => {
        applyReservationFilters({resetPage: true});
      }
    );

    refreshButton?.addEventListener("click", () => {
          if (searchInput) {searchInput.value = "";}
          if (statusFilter) {statusFilter.value = "all";}
          if (dateFilter) {dateFilter.value = "";}

          applyReservationFilters({resetPage: true});
        }
    );
    applyReservationFilters();
}

document.addEventListener(
    "DOMContentLoaded",
    initReservationFilters
);