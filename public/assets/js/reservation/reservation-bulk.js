let reservationBulkInitialized = false;

function getRealReservationRows(tableBody) {
  return Array.from(tableBody.querySelectorAll("tr")).filter((row) => {
    if (
      row.id === "reservation-no-results" ||
      row.classList.contains("reservation-no-results")
    ) {
      return false;
    }
    return Boolean(row.querySelector(".reservation-checkbox"));
  });
}

function getSelectedReservationRows(tableBody) {
  return getRealReservationRows(tableBody).filter((row) => {
    const checkbox = row.querySelector(".reservation-checkbox");
    return checkbox && checkbox.checked;
  });
}

function getVisibleSelectableRows(tableBody) {
  return getRealReservationRows(tableBody).filter((row) => {
    return (
      row.dataset.reservationMatchesFilter !== "false" &&
      row.style.display !== "none"
    );
  });
}

function updateReservationSelectedCount(tableBody, countEl) {
  const count = getSelectedReservationRows(tableBody).length;
  if (countEl) {
    countEl.textContent =
      count === 1
        ? "1 reservation selected"
        : count + " reservations selected";
  }
  return count;
}

function refreshReservationBulkState() {
  const tableBody = document.getElementById("reservationTableBody");
  const selectAll = document.getElementById("selectAllReservations");
  const toolbar = document.getElementById("reservationBulkToolbar");
  const countEl = document.getElementById("reservationSelectedCount");

  if (!tableBody || !selectAll || !toolbar || !countEl) {
    return;
  }

  const totalSelected = getSelectedReservationRows(tableBody).length;

  toolbar.classList.toggle("show", totalSelected > 0);

  updateReservationSelectedCount(tableBody, countEl);

  const visibleSelectable = getVisibleSelectableRows(tableBody);
  const visibleSelected = visibleSelectable.filter((row) => {
    const checkbox = row.querySelector(".reservation-checkbox");
    return checkbox && checkbox.checked;
  }).length;

  const visibleCount = visibleSelectable.length;

  if (visibleCount > 0 && visibleSelected === visibleCount) {
    selectAll.checked = true;
    selectAll.indeterminate = false;
  } else if (visibleSelected > 0) {
    selectAll.checked = false;
    selectAll.indeterminate = true;
  } else {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
}

async function archiveSelectedReservations() {
    const tableBody = document.getElementById("reservationTableBody");
    const selectAll = document.getElementById("selectAllReservations");
    const archiveBtn = document.getElementById("archiveSelectedReservations");
    if (!tableBody || !archiveBtn) {
        return;
    }

    const selectedRows = getSelectedReservationRows(tableBody);

    if (selectedRows.length === 0) {
        if (typeof window.showToast === "function") {
            window.showToast(
                "Please select at least one reservation.",
                "error",
            );
        }

        return;
    }

    const reservationIds = selectedRows
        .map((row) => row.dataset.id)
        .filter(Boolean);

    if (reservationIds.length === 0) {
        return;
    }

    archiveBtn.disabled = true;

    try {
        const response = await fetch("/reservation/bulk-archive", {
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
                ids: reservationIds,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to archive reservations.");
        }

        await loadReservations();

        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }

        refreshReservationBulkState();

        if (typeof updateReservationStatistics === "function") {
            updateReservationStatistics();
        }
        if (typeof updateReservationPagination === "function") {
            updateReservationPagination();
        }

        if (typeof window.showToast === "function") {
            window.showToast(
                data.message || "Reservation(s) archived successfully.",
                "success",
            );
        }
    } catch (error) {
        console.error("BULK RESERVATION ARCHIVE ERROR:", error);

        if (typeof window.showToast === "function") {
            window.showToast(
                error.message || "Failed to archive reservations.",
                "error",
            );
        }
    } finally {
        archiveBtn.disabled = false;
    }
}

function initReservationBulkActions() {
    if (reservationBulkInitialized) {
        return;
    }

    const tableBody = document.getElementById(
      "reservationTableBody"
    );
    const selectAll = document.getElementById(
      "selectAllReservations"
    );
    const toolbar = document.getElementById(
      "reservationBulkToolbar"
    );
    const countEl = document.getElementById(
      "reservationSelectedCount"
    );
    const clearBtn = document.getElementById(
      "clearReservationSelection"
    );
    const archiveBtn = document.getElementById("archiveSelectedReservations");

    if (
        !tableBody ||
        !selectAll ||
        !toolbar ||
        !countEl ||
        !clearBtn ||
        !archiveBtn
    ) {
        console.warn("Reservation bulk actions could not initialize.");
        return;
    }

    reservationBulkInitialized = true;

    tableBody.addEventListener("change", (event) => {
            const target =event.target;

            if (target && target.classList.contains("reservation-checkbox")) {
              refreshReservationBulkState();
            }
        }
    );

    selectAll.addEventListener("change", () => {
      const visibleSelectable = getVisibleSelectableRows(tableBody);

      visibleSelectable.forEach((row) => {
        const checkbox = row.querySelector(".reservation-checkbox");
          if (checkbox) {checkbox.checked = selectAll.checked;}
        }
      );

        refreshReservationBulkState();
      }
    );

    clearBtn.addEventListener("click", () => {

            const realRows = getRealReservationRows(tableBody);
            realRows.forEach((row) => {
              const checkbox = row.querySelector(".reservation-checkbox");
                  if (checkbox) {checkbox.checked = false;}
              }
            );

            selectAll.checked = false;
            selectAll.indeterminate = false;

            refreshReservationBulkState();
        }
    );

    archiveBtn.addEventListener("click", archiveSelectedReservations);

    const observer = new MutationObserver(() => 
      {
       refreshReservationBulkState();
      }
    );

    observer.observe(tableBody, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "style",
        "class",
      ],
    }
  );

    refreshReservationBulkState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded",initReservationBulkActions
);
} else {
    initReservationBulkActions();
}