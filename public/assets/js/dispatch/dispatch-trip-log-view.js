(function () {
    "use strict";

    const modal = document.getElementById("viewTripLogModal");

    if (!modal) {
        return;
    }

    const closeButton = document.getElementById("closeViewTripLogModal");

    const footerCloseButton = document.getElementById("closeViewTripLogFooter");

    const dispatchNumberElement = document.getElementById(
        "viewTripLogDispatchNumber",
    );

    const driverElement = document.getElementById("viewTripLogDriver");

    const vehicleElement = document.getElementById("viewTripLogVehicle");

    const submittedAtElement = document.getElementById(
        "viewTripLogSubmittedAt",
    );

    const startOdometerElement = document.getElementById(
        "viewTripLogStartOdometer",
    );

    const endOdometerElement = document.getElementById(
        "viewTripLogEndOdometer",
    );

    const distanceElement = document.getElementById("viewTripLogDistance");

    const fuelUsedElement = document.getElementById("viewTripLogFuelUsed");

    const routeElement = document.getElementById("viewTripLogRoute");

    const notesElement = document.getElementById("viewTripLogNotes");

    const logbookContainer = document.getElementById(
        "viewTripLogbookPhotoContainer",
    );

    const arrivalContainer = document.getElementById(
        "viewTripArrivalPhotoContainer",
    );

    const deliveryContainer = document.getElementById(
        "viewTripDeliveryPhotoContainer",
    );

    const deliveryItem = document.getElementById("viewTripDeliveryProofItem");

    function getCsrfToken() {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    }

    function showMessage(message, type = "error") {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);

            return;
        }

        alert(message);
    }

    function getDriverName(driver) {
        if (!driver) {
            return "—";
        }

        const fullName = [driver.first_name, driver.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();

        return fullName || driver.name || "—";
    }

    function getVehicleName(vehicle) {
        if (!vehicle) {
            return "—";
        }

        return (
            [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim() ||
            vehicle.vehicle_name ||
            vehicle.name ||
            "—"
        );
    }

    function getPhotoUrl(path) {
        if (!path) {
            return null;
        }

        const normalizedPath = String(path).replace(/^\/+/, "");

        if (
            normalizedPath.startsWith("http://") ||
            normalizedPath.startsWith("https://")
        ) {
            return normalizedPath;
        }

        return `/storage/${normalizedPath}`;
    }

    function renderPhoto(container, path, altText) {
        if (!container) {
            return;
        }

        const url = getPhotoUrl(path);

        if (!url) {
            container.innerHTML = `
                <span class="view-trip-log-proof-empty">
                    No photo available.
                </span>
            `;

            return;
        }

        container.innerHTML = `
            <a
                href="${url}"
                target="_blank"
                rel="noopener noreferrer"
                class="view-trip-log-proof-link"
            >
                <img
                    src="${url}"
                    alt="${altText}"
                    loading="lazy"
                />
            </a>
        `;
    }

    function formatSubmittedAt(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    function openModal() {
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            modal.classList.add("show");
        });
    }

    function closeModal() {
        modal.classList.remove("show");

        modal.setAttribute("aria-hidden", "true");

        window.setTimeout(() => {
            modal.hidden = true;
        }, 180);
    }

    function resetView() {
        const values = [
            dispatchNumberElement,
            driverElement,
            vehicleElement,
            submittedAtElement,
            startOdometerElement,
            endOdometerElement,
            distanceElement,
            fuelUsedElement,
            routeElement,
            notesElement,
        ];

        values.forEach((element) => {
            if (element) {
                element.textContent = "—";
            }
        });

        renderPhoto(logbookContainer, null, "Logbook photo");

        renderPhoto(arrivalContainer, null, "Proof of arrival");

        renderPhoto(deliveryContainer, null, "Proof of delivery");

        if (deliveryItem) {
            deliveryItem.hidden = false;
        }
    }

    async function loadTripLog(tripLogId) {
        if (!tripLogId) {
            showMessage("Invalid Trip Log selected.", "error");

            return;
        }

        resetView();

        openModal();

        try {
            const response = await fetch(
                `/trip-logs/${encodeURIComponent(tripLogId)}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                    cache: "no-store",
                },
            );

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.message || "Unable to load Trip Log.");
            }

            const tripLog = payload?.trip_log || null;

            if (!tripLog) {
                throw new Error("Trip Log details were not found.");
            }

            const dispatch = tripLog?.dispatch || null;

            const reservation = dispatch?.reservation || null;

            const driver = reservation?.driver || null;

            const vehicle = reservation?.vehicle || null;

            if (dispatchNumberElement) {
                dispatchNumberElement.textContent =
                    dispatch?.dispatch_number || "—";
            }

            if (driverElement) {
                driverElement.textContent = getDriverName(driver);
            }

            if (vehicleElement) {
                vehicleElement.textContent = getVehicleName(vehicle);
            }

            if (submittedAtElement) {
                submittedAtElement.textContent = formatSubmittedAt(
                    tripLog.submitted_at,
                );
            }

            if (startOdometerElement) {
                startOdometerElement.textContent =
                    tripLog.start_odometer ?? "—";
            }

            if (endOdometerElement) {
                endOdometerElement.textContent = tripLog.end_odometer ?? "—";
            }

            if (distanceElement) {
                distanceElement.textContent = tripLog.distance ?? "—";
            }

            if (fuelUsedElement) {
                fuelUsedElement.textContent = tripLog.fuel_used ?? "—";
            }

            if (routeElement) {
                const origin = reservation?.pickup_location || "—";

                const destination = reservation?.destination || "—";

                routeElement.textContent = `${origin} → ${destination}`;
            }

            if (notesElement) {
                notesElement.textContent =
                    tripLog.notes || "No notes provided.";
            }

            renderPhoto(
                logbookContainer,
                tripLog.logbook_photo,
                "Logbook photo",
            );

            renderPhoto(
                arrivalContainer,
                tripLog.arrival_proof_photo,
                "Proof of arrival",
            );

            if (deliveryItem && !tripLog.delivery_proof_photo) {
                deliveryItem.hidden = true;
            } else {
                renderPhoto(
                    deliveryContainer,
                    tripLog.delivery_proof_photo,
                    "Proof of delivery",
                );
            }
        } catch (error) {
            console.error("Trip Log view error:", error);

            closeModal();

            showMessage(error?.message || "Unable to load Trip Log.", "error");
        }
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".view-trip-log");

        if (!button) {
            return;
        }

        const tripLogId = button.dataset.id || "";

        loadTripLog(tripLogId);
    });

    closeButton?.addEventListener("click", closeModal);

    footerCloseButton?.addEventListener("click", closeModal);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
})();
