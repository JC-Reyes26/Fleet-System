(function () {
    "use strict";

    const modal = document.getElementById("tripLogModal");

    if (!modal) {
        return;
    }

    const form = document.getElementById("tripLogForm");

    const dispatchIdInput = document.getElementById("tripLogDispatchId");

    const dispatchNumberElement = document.getElementById(
        "tripLogDispatchNumber",
    );

    const vehicleElement = document.getElementById("tripLogVehicle");

    const routeElement = document.getElementById("tripLogRoute");

    const startOdometerInput = document.getElementById("tripLogStartOdometer");

    const endOdometerInput = document.getElementById("tripLogEndOdometer");

    const distanceInput = document.getElementById("tripLogDistance");

    const fuelUsedInput = document.getElementById("tripLogFuelUsed");

    const logbookPhotoInput = document.getElementById("tripLogLogbookPhoto");

    const arrivalPhotoInput = document.getElementById("tripLogArrivalPhoto");

    const deliveryPhotoInput = document.getElementById("tripLogDeliveryPhoto");

    const deliveryPhotoGroup = document.getElementById(
        "tripLogDeliveryPhotoGroup",
    );

    const notesInput = document.getElementById("tripLogNotes");

    const submitButton = document.getElementById("submitTripLog");

    const cancelButton = document.getElementById("cancelTripLog");

    const closeButton = document.getElementById("closeTripLogModal");

    const logbookPreview = document.getElementById("tripLogLogbookPreview");

    const arrivalPreview = document.getElementById("tripLogArrivalPreview");

    const deliveryPreview = document.getElementById("tripLogDeliveryPreview");

    let currentDispatch = null;

    function getCsrfToken() {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    }

    function showMessage(message, type = "success") {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);
            return;
        }

        alert(message);
    }

    function escapeHtml(value) {
        const div = document.createElement("div");

        div.textContent = String(value ?? "");

        return div.innerHTML;
    }

    function getVehicleName(dispatch) {
        const vehicle = dispatch?.reservation?.vehicle || null;

        if (!vehicle) {
            return "—";
        }

        return (
            [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim() ||
            "—"
        );
    }

    function getRouteName(dispatch) {
        const reservation = dispatch?.reservation || null;

        const origin = reservation?.pickup_location || "";

        const destination = reservation?.destination || "";

        if (!origin && !destination) {
            return "—";
        }

        return `${origin || "—"} → ${destination || "—"}`;
    }

    function resetPreview(previewElement) {
        if (!previewElement) {
            return;
        }

        const image = previewElement.querySelector("img");

        if (image) {
            image.src = "";
        }

        previewElement.hidden = true;
    }

    function previewImage(input, previewElement) {
        if (!input || !previewElement) {
            return;
        }

        const file = input.files?.[0];

        if (!file) {
            resetPreview(previewElement);
            return;
        }

        if (!file.type.startsWith("image/")) {
            showMessage("Please select a valid image file.", "error");

            input.value = "";
            resetPreview(previewElement);

            return;
        }

        const image = previewElement.querySelector("img");

        if (!image) {
            return;
        }

        const objectUrl = URL.createObjectURL(file);

        image.src = objectUrl;

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
        };

        previewElement.hidden = false;
    }

    function resetForm() {
        form?.reset();

        if (dispatchIdInput) {
            dispatchIdInput.value = "";
        }

        if (dispatchNumberElement) {
            dispatchNumberElement.textContent = "—";
        }

        if (vehicleElement) {
            vehicleElement.textContent = "—";
        }

        if (routeElement) {
            routeElement.textContent = "—";
        }

        resetPreview(logbookPreview);
        resetPreview(arrivalPreview);
        resetPreview(deliveryPreview);
        if (deliveryPhotoGroup) {
            deliveryPhotoGroup.hidden = true;
        }

        if (deliveryPhotoInput) {
            deliveryPhotoInput.required = false;
        }

        currentDispatch = null;
    }

    function updateDeliveryPhotoRequirement(dispatch) {
        const requestType = String(dispatch?.reservation?.request_type || "")
            .trim()
            .toLowerCase();

        const isSupplyDelivery = requestType === "supply delivery";

        if (deliveryPhotoGroup) {
            deliveryPhotoGroup.hidden = !isSupplyDelivery;
        }

        if (deliveryPhotoInput) {
            deliveryPhotoInput.required = isSupplyDelivery;

            if (!isSupplyDelivery) {
                deliveryPhotoInput.value = "";
                resetPreview(deliveryPreview);
            }
        }

        return isSupplyDelivery;
    }

    function openModal(dispatch) {
        if (!dispatch?.id) {
            showMessage("Invalid dispatch selected.", "error");

            return;
        }

        currentDispatch = dispatch;

        updateDeliveryPhotoRequirement(dispatch);

        const dispatchId = dispatch.id;

        const dispatchNumber =
            dispatch.dispatch_number || `Dispatch #${dispatchId}`;

        if (dispatchIdInput) {
            dispatchIdInput.value = dispatchId;
        }

        if (dispatchNumberElement) {
            dispatchNumberElement.textContent = dispatchNumber;
        }

        if (vehicleElement) {
            vehicleElement.textContent = getVehicleName(dispatch);
        }

        if (routeElement) {
            routeElement.textContent = getRouteName(dispatch);
        }

        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            modal.classList.add("show");

            startOdometerInput?.focus();
        });
    }

    function closeModal() {
        modal.classList.remove("show");

        modal.setAttribute("aria-hidden", "true");

        window.setTimeout(() => {
            modal.hidden = true;

            resetForm();
        }, 180);
    }

    function setLoading(loading) {
        if (!submitButton) {
            return;
        }

        if (loading) {
            submitButton.disabled = true;

            submitButton.dataset.originalHtml = submitButton.innerHTML;

            submitButton.innerHTML = `
                <span
                    class="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                ></span>
                Submitting...
            `;

            return;
        }

        submitButton.disabled = false;

        if (submitButton.dataset.originalHtml) {
            submitButton.innerHTML = submitButton.dataset.originalHtml;

            delete submitButton.dataset.originalHtml;
        }
    }

    async function submitTripLog(event) {
        event.preventDefault();

        const dispatchId = currentDispatch?.id || dispatchIdInput?.value || "";

        if (!dispatchId) {
            showMessage("No dispatch is selected.", "error");

            return;
        }

        const startOdometer = Number(startOdometerInput?.value);

        const endOdometer = Number(endOdometerInput?.value);

        if (!Number.isFinite(startOdometer) || !Number.isFinite(endOdometer)) {
            showMessage("Please enter valid odometer values.", "error");

            return;
        }

        if (endOdometer < startOdometer) {
            showMessage(
                "End odometer cannot be lower than start odometer.",
                "error",
            );

            endOdometerInput?.focus();

            return;
        }

        if (!logbookPhotoInput?.files?.length) {
            showMessage("Please upload the logbook photo.", "error");

            return;
        }

        if (!arrivalPhotoInput?.files?.length) {
            showMessage("Please upload the proof of arrival.", "error");

            return;
        }

        const requestType = String(
            currentDispatch?.reservation?.request_type || "",
        )
            .trim()
            .toLowerCase();

        const isSupplyDelivery = requestType === "supply delivery";

        if (isSupplyDelivery && !deliveryPhotoInput?.files?.length) {
            showMessage(
                "Please upload the proof of delivery for this Supply Delivery dispatch.",
                "error",
            );

            return;
        }

        const formData = new FormData();

        formData.append("start_odometer", startOdometerInput.value);

        formData.append("end_odometer", endOdometerInput.value);

        formData.append("distance", distanceInput?.value || "");

        formData.append("fuel_used", fuelUsedInput?.value || "");

        formData.append("logbook_photo", logbookPhotoInput.files[0]);

        formData.append("arrival_proof_photo", arrivalPhotoInput.files[0]);

        if (deliveryPhotoInput?.files?.length) {
            formData.append(
                "delivery_proof_photo",
                deliveryPhotoInput.files[0],
            );
        }

        formData.append("notes", notesInput?.value?.trim() || "");

        setLoading(true);

        try {
            const response = await fetch(
                `/trip-logs/${encodeURIComponent(dispatchId)}`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                    body: formData,
                },
            );

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const firstValidationError = payload?.errors
                    ? Object.values(payload.errors)?.[0]?.[0]
                    : null;

                throw new Error(
                    firstValidationError ||
                        payload?.message ||
                        "Unable to submit Trip Log.",
                );
            }

            closeModal();

            showMessage(
                payload?.message || "Trip Log submitted successfully.",
                "success",
            );

            if (typeof window.loadDispatches === "function") {
                await window.loadDispatches();
            } else if (typeof loadDispatches === "function") {
                await loadDispatches();
            } else {
                window.setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (error) {
            console.error("Trip Log submission error:", error);

            showMessage(
                error?.message || "Unable to submit Trip Log.",
                "error",
            );
        } finally {
            setLoading(false);
        }
    }

    logbookPhotoInput?.addEventListener("change", () => {
        previewImage(logbookPhotoInput, logbookPreview);
    });

    arrivalPhotoInput?.addEventListener("change", () => {
        previewImage(arrivalPhotoInput, arrivalPreview);
    });

    deliveryPhotoInput?.addEventListener("change", () => {
        previewImage(deliveryPhotoInput, deliveryPreview);
    });

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".submit-trip-log");

        if (!button) {
            return;
        }

        let dispatch = null;

        try {
            dispatch = JSON.parse(button.dataset.dispatch || "{}");
        } catch (error) {
            console.error("Unable to read dispatch data:", error);
        }

        openModal(dispatch);
    });

    form?.addEventListener("submit", submitTripLog);

    cancelButton?.addEventListener("click", closeModal);

    closeButton?.addEventListener("click", closeModal);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
})();
