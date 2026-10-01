/* ==========================================
 * HIMS Fleet - Dispatch Lifecycle
 * ========================================== */

let dispatchLifecycleInitialized = false;

function getDispatchCsrfToken() {
    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");
}

async function sendDispatchLifecycleRequest(url, method = "POST", body = null) {
    const headers = {
        Accept: "application/json",
        "X-CSRF-TOKEN": getDispatchCsrfToken(),
        "X-Requested-With": "XMLHttpRequest",
    };

    const options = {
        method,
        headers,
        credentials: "same-origin",
    };

    if (body !== null) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Unable to process the dispatch action.",
        );
    }

    return data;
}

async function acceptDispatch(dispatchId) {
    return sendDispatchLifecycleRequest(
        `/dispatch/${dispatchId}/accept`,
        "POST",
    );
}

async function updateDriverDispatchStatus(dispatchId, nextStatus) {
    return sendDispatchLifecycleRequest(`/dispatch/${dispatchId}`, "PUT", {
        trip_status: nextStatus,
    });
}

async function handleDispatchLifecycleAction(
    button,
    action,
    nextStatus = null,
) {
    const dispatchId = button?.dataset?.id;

    if (!dispatchId) {
        return;
    }

    const originalHtml = button.innerHTML;

    button.disabled = true;

    button.innerHTML = '<i class="ph ph-spinner"></i>';

    try {
        let data;

        if (action === "accept") {
            data = await acceptDispatch(dispatchId);
        } else {
            data = await updateDriverDispatchStatus(dispatchId, nextStatus);
        }

        if (typeof showToast === "function") {
            showToast(
                data.message || "Dispatch updated successfully.",
                "success",
            );
        }

        if (typeof loadDispatches === "function") {
            await loadDispatches();
        }
    } catch (error) {
        console.error("Dispatch lifecycle action failed:", error);

        if (typeof showToast === "function") {
            showToast(error.message || "Unable to update dispatch.", "error");
        }

        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}

function initDispatchLifecycle() {
    if (dispatchLifecycleInitialized) {
        return;
    }

    dispatchLifecycleInitialized = true;

    document.body.addEventListener("click", async (event) => {
        const acceptButton = event.target.closest(".dispatch-accept");

        if (acceptButton) {
            const confirmed = window.confirm("Accept this dispatch?");

            if (!confirmed) {
                return;
            }

            await handleDispatchLifecycleAction(acceptButton, "accept");

            return;
        }

        const startTripButton = event.target.closest(".dispatch-start-trip");

        if (startTripButton) {
            const confirmed = window.confirm("Start this trip?");

            if (!confirmed) {
                return;
            }

            await handleDispatchLifecycleAction(
                startTripButton,
                "status",
                "En Route",
            );

            return;
        }

        const arrivedButton = event.target.closest(".dispatch-arrived");

        if (arrivedButton) {
            const confirmed = window.confirm("Mark this dispatch as Arrived?");

            if (!confirmed) {
                return;
            }

            await handleDispatchLifecycleAction(
                arrivedButton,
                "status",
                "Arrived",
            );

            return;
        }

        const completeButton = event.target.closest(".dispatch-complete");

        if (completeButton) {
            const confirmed = window.confirm("Complete this dispatch?");

            if (!confirmed) {
                return;
            }

            await handleDispatchLifecycleAction(
                completeButton,
                "status",
                "Completed",
            );

            return;
        }
    });
}

document.addEventListener("DOMContentLoaded", initDispatchLifecycle);
