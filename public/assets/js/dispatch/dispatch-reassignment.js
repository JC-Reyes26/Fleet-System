(function () {
    "use strict";

    const modalElement = document.getElementById("requestReassignmentModal");

    if (!modalElement) {
        return;
    }

    const form = document.getElementById("requestReassignmentForm");
    const dispatchIdInput = document.getElementById("reassignmentDispatchId");
    const reasonInput = document.getElementById("reassignmentReason");
    const submitButton = document.getElementById("submitRequestReassignment");
    const cancelButton = document.getElementById("cancelRequestReassignment");
    const closeButton = document.getElementById(
        "closeRequestReassignmentModal",
    );
    const acceptModalElement = document.getElementById("acceptDispatchModal");
    const acceptDispatchName = document.getElementById("acceptDispatchName");
    const cancelAcceptButton = document.getElementById("cancelAcceptDispatch");
    const confirmAcceptButton = document.getElementById(
        "confirmAcceptDispatch",
    );

    let currentAcceptDispatchId = null;

    let currentDispatchId = null;

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

    function openModal(dispatchId) {
        if (!dispatchId) {
            showMessage("Invalid dispatch selected.", "error");
            return;
        }

        currentDispatchId = dispatchId;

        if (dispatchIdInput) {
            dispatchIdInput.value = dispatchId;
        }

        if (reasonInput) {
            reasonInput.value = "";
        }

        modalElement.hidden = false;
        modalElement.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            modalElement.classList.add("show");

            if (reasonInput) {
                reasonInput.focus();
            }
        });
    }

    function closeModal() {
        modalElement.classList.remove("show");

        modalElement.setAttribute("aria-hidden", "true");

        window.setTimeout(() => {
            modalElement.hidden = true;
        }, 180);

        currentDispatchId = null;

        if (dispatchIdInput) {
            dispatchIdInput.value = "";
        }

        if (reasonInput) {
            reasonInput.value = "";
        }
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
                Sending...
            `;

            return;
        }

        submitButton.disabled = false;

        if (submitButton.dataset.originalHtml) {
            submitButton.innerHTML = submitButton.dataset.originalHtml;

            delete submitButton.dataset.originalHtml;
        }
    }

    async function submitRequest(event) {
        event.preventDefault();

        const dispatchId = currentDispatchId || dispatchIdInput?.value || "";

        const reason = String(reasonInput?.value || "").trim();

        if (!dispatchId) {
            showMessage("No dispatch is selected.", "error");
            return;
        }

        if (reason.length < 10) {
            showMessage(
                "The reassignment reason must be at least 10 characters.",
                "error",
            );

            reasonInput?.focus();

            return;
        }

        if (reason.length > 2000) {
            showMessage(
                "The reassignment reason cannot exceed 2000 characters.",
                "error",
            );

            reasonInput?.focus();

            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `/dispatch/${encodeURIComponent(
                    dispatchId,
                )}/request-reassignment`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        reason,
                    }),
                },
            );

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    payload?.message ||
                        "Unable to submit reassignment request.",
                );
            }

            closeModal();

            showMessage(
                payload?.message ||
                    "Reassignment request submitted successfully.",
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
            console.error("Request reassignment error:", error);

            showMessage(
                error.message || "Unable to submit reassignment request.",
                "error",
            );
        } finally {
            setLoading(false);
        }
    }

    function openAcceptModal(dispatchId, dispatchNumber = "this dispatch") {
        if (!acceptModalElement || !dispatchId) {
            showMessage("Invalid dispatch selected.", "error");
            return;
        }

        currentAcceptDispatchId = dispatchId;

        if (acceptDispatchName) {
            acceptDispatchName.textContent = dispatchNumber;
        }

        acceptModalElement.hidden = false;
        acceptModalElement.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            acceptModalElement.classList.add("show");
        });
    }

    function closeAcceptModal() {
        if (!acceptModalElement) {
            return;
        }

        acceptModalElement.classList.remove("show");
        acceptModalElement.setAttribute("aria-hidden", "true");

        window.setTimeout(() => {
            acceptModalElement.hidden = true;
        }, 180);

        currentAcceptDispatchId = null;

        if (acceptDispatchName) {
            acceptDispatchName.textContent = "this dispatch";
        }

        setAcceptLoading(false);
    }

    function setAcceptLoading(loading) {
        if (!confirmAcceptButton) {
            return;
        }

        if (loading) {
            confirmAcceptButton.disabled = true;

            confirmAcceptButton.dataset.originalHtml =
                confirmAcceptButton.innerHTML;

            confirmAcceptButton.innerHTML = `
            <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
            ></span>
            Accepting...
        `;

            return;
        }

        confirmAcceptButton.disabled = false;

        if (confirmAcceptButton.dataset.originalHtml) {
            confirmAcceptButton.innerHTML =
                confirmAcceptButton.dataset.originalHtml;

            delete confirmAcceptButton.dataset.originalHtml;
        }
    }

    async function acceptDispatch() {
        const dispatchId = currentAcceptDispatchId;
        if (!dispatchId) {
            showMessage("No dispatch is selected.", "error");
            return;
        }
        setAcceptLoading(true);
        try {
            const response = await fetch(
                `/dispatch/${encodeURIComponent(dispatchId)}/accept`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                },
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    payload?.message || "Unable to accept this dispatch.",
                );
            }
            closeAcceptModal();
            showMessage(
                payload?.message || "Dispatch accepted successfully.",
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
            console.error("Accept dispatch error:", error);

            showMessage(
                error.message || "Unable to accept this dispatch.",
                "error",
            );
        } finally {
            setAcceptLoading(false);
        }
    }

    document.addEventListener("click", function (event) {
        const acceptButton = event.target.closest(".accept-dispatch");
        if (acceptButton) {
            const dispatchId = acceptButton.dataset.id || "";
            const dispatchNumber =
                acceptButton.dataset.dispatchNumber || "this dispatch";
            openAcceptModal(dispatchId, dispatchNumber);
            return;
        }
        const reassignmentButton = event.target.closest(
            ".request-reassignment",
        );
        if (reassignmentButton) {
            const dispatchId = reassignmentButton.dataset.id || "";
            openModal(dispatchId);
        }
    });

    if (form) {
        form.addEventListener("submit", submitRequest);
    }

    cancelButton?.addEventListener("click", closeModal);
    closeButton?.addEventListener("click", closeModal);
    cancelAcceptButton?.addEventListener("click", closeAcceptModal);
    confirmAcceptButton?.addEventListener("click", acceptDispatch);
    modalElement.addEventListener("click", function (event) {
        if (event.target === modalElement) {
            closeModal();
        }
    });
    acceptModalElement?.addEventListener("click", function (event) {
        if (event.target === acceptModalElement) {
            closeAcceptModal();
        }
    });
})();
