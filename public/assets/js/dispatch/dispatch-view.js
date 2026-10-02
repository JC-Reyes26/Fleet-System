/* ==========================================
   HIMS Fleet - Dispatch View
========================================== */

let viewDispatchInitialized = false;

function openViewDispatchModal() {
    const modal = document.getElementById("viewDispatchModal");
    if (!modal) {
        return;
    }
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeViewDispatchModal() {
    const modal = document.getElementById("viewDispatchModal");
    if (!modal) {
        return;
    }
    modal.classList.remove("show");
    document.body.style.overflow = "";
    modal.currentDispatchId = null;
}

function setViewDispatchValue(id, value, fallback = "") {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    const displayValue =
        value !== null && value !== undefined && String(value).trim() !== ""
            ? value
            : fallback;

    element.textContent = displayValue;
}

function getViewDispatchRoutePlan(reservation) {
    return reservation?.route_plan || reservation?.routePlan || null;
}

function setViewDispatchStatus(status) {
    const statusElement = document.getElementById("viewDispatchStatus");

    if (!statusElement) {
        return;
    }

    const statusClassMap = {
        Pending: "pending",
        Assigned: "scheduled",
        "En Route": "trip",
        Arrived: "approved",
        Completed: "completed",
        Cancelled: "cancelled",
    };

    const statusClass =
        statusClassMap[status] ||
        String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "-");

    statusElement.className = "status-badge";
    if (statusClass) {
        statusElement.classList.add(statusClass);
    }
    statusElement.textContent = status || "N/A";
}

function formatViewVehicle(vehicle) {
    if (!vehicle) {
        return "Unassigned";
    }
    const brandModel = [vehicle.brand, vehicle.model]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ")
        .trim();
    const vehicleType = String(
        vehicle.vehicle_type || vehicle.type || "",
    ).trim();
    if (brandModel && vehicleType) {
        return `${brandModel} - ${vehicleType}`;
    }
    if (brandModel) {
        return brandModel;
    }
    if (vehicleType) {
        return vehicleType;
    }
    return (
        vehicle.vehicle_name ||
        vehicle.name ||
        vehicle.plate_number ||
        "Unassigned"
    );
}

function formatViewDriver(driver) {
    if (!driver) {
        return "Unassigned";
    }

    const fullName = [driver.first_name, driver.last_name]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || driver.name || "Unassigned";
}

async function loadViewDispatch(dispatchId) {
    try {
        const response = await fetch(
            `/dispatch/${encodeURIComponent(dispatchId)}`,
            {
                headers: {
                    Accept: "application/json",
                },
                credentials: "same-origin",
            },
        );

        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }
        if (!response.ok) {
            throw new Error(data.message || "Failed to load dispatch details.");
        }
        const dispatch = data.dispatch;
        if (!dispatch) {
            throw new Error("Dispatch information not found.");
        }

        const reservation = dispatch.reservation || {};
        const routePlan = getViewDispatchRoutePlan(reservation);
        const vehicle = reservation.vehicle || null;
        const driver = reservation.driver || null;
        /*
        |--------------------------------------------------------------------------
        | Reassignment History
        |--------------------------------------------------------------------------
        */
        const reassignments = Array.isArray(dispatch.reassignments)
            ? dispatch.reassignments
            : [];
        const latestApprovedReassignment =
            [...reassignments]
                .filter(
                    (item) =>
                        String(item?.status || "")
                            .trim()
                            .toLowerCase() === "approved",
                )
                .sort((a, b) => {
                    const aId = Number(a?.id || 0);
                    const bId = Number(b?.id || 0);
                    return bId - aId;
                })[0] || null;

        setViewDispatchValue(
            "viewDispatchNumber",
            dispatch.dispatch_number,
            "N/A",
        );
        setViewDispatchValue(
            "viewDispatchReservation",
            reservation.reservation_number,
            "N/A",
        );
        setViewDispatchValue(
            "viewDispatchPatient",
            reservation.patient_name,
            "N/A",
        );
        setViewDispatchValue(
            "viewDispatchRequestType",
            reservation.request_type,
            "N/A",
        );
        setViewDispatchValue(
            "viewDispatchVehicle",
            formatViewVehicle(vehicle),
            "Unassigned",
        );
        setViewDispatchValue(
            "viewDispatchDriver",
            formatViewDriver(driver),
            "Unassigned",
        );
        /*
        |--------------------------------------------------------------------------
        | Assignment History Display
        |--------------------------------------------------------------------------
        */
        const originalVehicle =
            latestApprovedReassignment?.original_vehicle || null;
        const originalDriver =
            latestApprovedReassignment?.original_driver || null;
        const recommendedVehicle =
            latestApprovedReassignment?.recommended_vehicle || null;
        const recommendedDriver =
            latestApprovedReassignment?.recommended_driver || null;
        const reassignedVehicle =
            latestApprovedReassignment?.new_vehicle || null;
        const reassignedDriver = latestApprovedReassignment?.new_driver || null;
        setViewDispatchValue(
            "viewDispatchOriginalVehicle",
            originalVehicle ? formatViewVehicle(originalVehicle) : null,
            "Not reassigned",
        );
        setViewDispatchValue(
            "viewDispatchOriginalDriver",
            originalDriver ? formatViewDriver(originalDriver) : null,
            "Not reassigned",
        );
        setViewDispatchValue(
            "viewDispatchRecommendedVehicle",
            recommendedVehicle ? formatViewVehicle(recommendedVehicle) : null,
            "No recommendation",
        );
        setViewDispatchValue(
            "viewDispatchRecommendedDriver",
            recommendedDriver ? formatViewDriver(recommendedDriver) : null,
            "No recommendation",
        );
        setViewDispatchValue(
            "viewDispatchReassignedVehicle",
            reassignedVehicle ? formatViewVehicle(reassignedVehicle) : null,
            "Not reassigned",
        );
        setViewDispatchValue(
            "viewDispatchReassignedDriver",
            reassignedDriver ? formatViewDriver(reassignedDriver) : null,
            "Not reassigned",
        );
        setViewDispatchValue(
            "viewDispatchPickup",
            routePlan?.origin || reservation.pickup_location,
            "Not provided",
        );
        setViewDispatchValue(
            "viewDispatchDestination",
            routePlan?.destination || reservation.destination,
            "Not provided",
        );

        const dispatchDate =
            dispatch.dispatch_date || routePlan?.departure_date || "";
        const departureTime =
            dispatch.departure_time || routePlan?.departure_time || "";

        setViewDispatchValue(
            "viewDispatchSchedule",
            formatDispatchSchedule(dispatchDate, departureTime),
            "Not scheduled",
        );
        setViewDispatchValue(
            "viewDispatchPriority",
            routePlan?.priority || reservation.priority,
            "N/A",
        );
        setViewDispatchValue(
            "viewDispatchContact",
            reservation.contact_number,
            "Not provided",
        );
        setViewDispatchValue(
            "viewDispatchNotes",
            dispatch.remarks,
            "Not provided",
        );
        setViewDispatchStatus(dispatch.trip_status || "Pending");
        const modal = document.getElementById("viewDispatchModal");
        if (modal) {
            modal.currentDispatchId = dispatch.id;
        }
        const editButton = document.getElementById("editDispatchFromViewBtn");
        if (editButton) {
            const canEdit =
                window.FleetRBAC?.hasPermission?.("dispatch", "canUpdate") ===
                true;
            const finalStatus = ["Completed", "Cancelled"].includes(
                dispatch.trip_status,
            );
            editButton.hidden = !canEdit;
            editButton.disabled = canEdit && finalStatus;
            editButton.title = finalStatus
                ? "This dispatch can no longer be edited."
                : "Edit Dispatch";
        }
        openViewDispatchModal();
        return dispatch;
    } catch (error) {
        console.error("Error loading dispatch:", error);
        if (typeof showToast === "function") {
            showToast(
                error.message || "Failed to load dispatch details.",
                "error",
            );
        }

        return null;
    }
}

function initViewDispatchModal() {
    if (viewDispatchInitialized) {
        return;
    }
    const modal = document.getElementById("viewDispatchModal");
    if (!modal) {
        return;
    }

    viewDispatchInitialized = true;
    document.body.addEventListener("click", async (event) => {
        const viewButton = event.target.closest(".action-btn.view-dispatch");
        if (!viewButton) {
            return;
        }
        const dispatchId = viewButton.dataset.id;
        if (!dispatchId) {
            console.error("Dispatch ID not found.");
            return;
        }
        await loadViewDispatch(dispatchId);
    });
    document
        .getElementById("closeViewDispatchModal")
        ?.addEventListener("click", closeViewDispatchModal);
    document
        .getElementById("closeViewDispatchBtn")
        ?.addEventListener("click", closeViewDispatchModal);
    const editFromViewButton = document.getElementById(
        "editDispatchFromViewBtn",
    );

    if (editFromViewButton) {
        const canEdit =
            window.FleetRBAC?.hasPermission?.("dispatch", "canUpdate") === true;
        editFromViewButton.hidden = !canEdit;
        editFromViewButton.addEventListener("click", async () => {
            const viewModal = document.getElementById("viewDispatchModal");
            const editModal = document.getElementById("editDispatchModal");
            if (!viewModal || !editModal || !viewModal.currentDispatchId) {
                return;
            }
            if (editFromViewButton.disabled) {
                return;
            }
            const dispatchId = viewModal.currentDispatchId;
            editFromViewButton.disabled = true;

            try {
                editModal.currentDispatchId = dispatchId;
                let dispatch = null;
                if (typeof populateEditDispatchForm === "function") {
                    dispatch = await populateEditDispatchForm(dispatchId);
                }
                if (!dispatch) {
                    return;
                }
                if (typeof openEditDispatchModal === "function") {
                    openEditDispatchModal();
                }

                await new Promise((resolve) => setTimeout(resolve, 120));

                closeViewDispatchModal();

                document.body.style.overflow = "hidden";
            } catch (error) {
                console.error("Unable to switch to Edit Dispatch:", error);

                if (typeof showToast === "function") {
                    showToast("Unable to open dispatch for editing.", "error");
                }
            } finally {
                editFromViewButton.disabled = false;
            }
        });
    }
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeViewDispatchModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeViewDispatchModal();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initViewDispatchModal();
});
