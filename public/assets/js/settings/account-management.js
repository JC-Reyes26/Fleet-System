let accountManagementTrigger = null;

function getAccountManagementModal() {
    return document.getElementById("accountManagementModal");
}

function openAccountManagementModal(event = null) {
    const modal = getAccountManagementModal();
    if (!modal) {
        return;
    }
    accountManagementTrigger =
        event?.currentTarget ||
        document.activeElement ||
        document.getElementById("openAccountManagementModal");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
        document.getElementById("accountManagementAction")?.focus();
    });
}

function closeAccountManagementModal() {
    const modal = getAccountManagementModal();
    if (!modal) {
        return;
    }
    if (modal.contains(document.activeElement)) {
        document.activeElement?.blur();
    }
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    const actionSelect = document.getElementById("accountManagementAction");
    if (actionSelect) {
        actionSelect.value = "";
    }
    const content = document.getElementById("accountManagementContent");
    if (content) {
        content.innerHTML = `
            <div class="settings-empty-state">
                <i
                    class="ph ph-user-gear"
                    aria-hidden="true"
                ></i>
                <p>
                    Select an account action to continue.
                </p>
            </div>
        `;
    }

    requestAnimationFrame(() => {
        if (
            accountManagementTrigger &&
            document.body.contains(accountManagementTrigger)
        ) {
            accountManagementTrigger.focus();
        }
        accountManagementTrigger = null;
    });
}

function initAccountManagementModal() {
    const modal = getAccountManagementModal();
    if (!modal || modal.dataset.initialized === "true") {
        return;
    }
    modal.dataset.initialized = "true";
    document
        .getElementById("openAccountManagementModal")
        ?.addEventListener("click", openAccountManagementModal);
    document
        .getElementById("closeAccountManagementModal")
        ?.addEventListener("click", closeAccountManagementModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeAccountManagementModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeAccountManagementModal();
        }
    });
    const actionSelect = document.getElementById("accountManagementAction");
    actionSelect?.addEventListener("change", () => {
        const action = actionSelect.value;
        if (action === "create") {
            renderAccountCreateForm();
            return;
        }
        if (action === "update") {
            renderAccountUpdateForm();
            return;
        }
        if (action === "reset_password") {
            renderAccountResetPasswordForm();
            return;
        }
        if (action === "delete") {
            renderAccountDeleteForm();
            return;
        }
        const content = document.getElementById("accountManagementContent");
        if (content) {
            content.innerHTML = `
                <div class="settings-empty-state">
                    <i
                        class="ph ph-user-gear"
                        aria-hidden="true"
                    ></i>

                    <p>
                        Select an account action to continue.
                    </p>
                </div>
            `;
        }
    });
}

async function renderAccountUpdateForm() {
    const content = document.getElementById("accountManagementContent");
    if (!content) {
        return;
    }
    content.innerHTML = `
        <div class="settings-empty-state">
            <i class="ph ph-spinner"></i>
            <p>Loading user accounts...</p>
        </div>
    `;
    try {
        const response = await fetch("/settings/accounts", {
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.message || "Unable to load accounts.");
        }
        const users = Array.isArray(data?.users) ? data.users : [];
        const options = users
            .map((user) => {
                const name =
                    user.name ||
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    user.email;

                return `
                        <option value="${user.id}">
                            ${escapeAccountHtml(name)}
                            — ${escapeAccountHtml(user.email || "")}
                        </option>
                    `;
            })
            .join("");

        content.innerHTML = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label for="updateAccountUser">
                        Select User *
                    </label>

                    <select id="updateAccountUser">
                        <option value="">
                            Select user account
                        </option>

                        ${options}
                    </select>
                </div>
            </div>

            <div id="updateAccountFormContainer"></div>
        `;
        document
            .getElementById("updateAccountUser")
            ?.addEventListener("change", async (event) => {
                const userId = event.target.value;
                if (!userId) {
                    document.getElementById(
                        "updateAccountFormContainer",
                    ).innerHTML = "";
                    return;
                }
                await loadUpdateAccountForm(userId);
            });
    } catch (error) {
        console.error("LOAD ACCOUNTS ERROR:", error);
        content.innerHTML = `
            <div class="settings-empty-state">
                <p>
                    Unable to load user accounts.
                </p>
            </div>
        `;
        window.showToast?.(
            error?.message || "Unable to load user accounts.",
            "error",
        );
    }
}

async function renderAccountResetPasswordForm() {
    const content = document.getElementById("accountManagementContent");
    if (!content) {
        return;
    }
    content.innerHTML = `
        <div class="settings-empty-state">
            <i class="ph ph-spinner"></i>
            <p>Loading user accounts...</p>
        </div>
    `;
    try {
        const response = await fetch("/settings/accounts", {
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.message || "Unable to load accounts.");
        }
        const users = Array.isArray(data?.users) ? data.users : [];
        const options = users
            .map((user) => {
                const name =
                    user.name ||
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    user.email;

                return `
                        <option value="${user.id}">
                            ${escapeAccountHtml(name)}
                            — ${escapeAccountHtml(user.email || "")}
                        </option>
                    `;
            })
            .join("");

        content.innerHTML = `
            <form id="resetUserPasswordForm">

                <div class="form-grid">

                    <div class="form-group full-width">
                        <label for="resetPasswordUser">
                            User Account *
                        </label>

                        <select
                            id="resetPasswordUser"
                            required
                        >
                            <option value="">
                                Select user account
                            </option>

                            ${options}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="resetAccountPassword">
                            New Password *
                        </label>

                        <input
                            type="password"
                            id="resetAccountPassword"
                            minlength="8"
                            required
                            autocomplete="new-password"
                        >
                    </div>

                    <div class="form-group">
                        <label for="resetAccountPasswordConfirmation">
                            Confirm New Password *
                        </label>

                        <input
                            type="password"
                            id="resetAccountPasswordConfirmation"
                            minlength="8"
                            required
                            autocomplete="new-password"
                        >
                    </div>

                </div>

                <p class="settings-note">
                    The selected user's current password will be replaced.
                </p>

                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn-outline"
                        data-account-modal-cancel
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn-primary"
                        id="resetUserPasswordBtn"
                    >
                        <i class="ph ph-key"></i>
                        Reset Password
                    </button>
                </div>

            </form>
        `;

        initResetUserPasswordForm();
        initAccountModalCancelButtons();
    } catch (error) {
        console.error("LOAD RESET PASSWORD ACCOUNTS ERROR:", error);

        content.innerHTML = `
            <div class="settings-empty-state">
                <p>
                    Unable to load user accounts.
                </p>
            </div>
        `;

        window.showToast?.(
            error?.message || "Unable to load user accounts.",
            "error",
        );
    }
}

async function renderAccountDeleteForm() {
    const content = document.getElementById("accountManagementContent");

    if (!content) {
        return;
    }

    content.innerHTML = `
        <div class="settings-empty-state">
            <i class="ph ph-spinner"></i>
            <p>Loading user accounts...</p>
        </div>
    `;

    try {
        const response = await fetch("/settings/accounts", {
            headers: {
                Accept: "application/json",
            },

            credentials: "same-origin",
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || "Unable to load accounts.");
        }

        const users = Array.isArray(data?.users) ? data.users : [];

        const options = users
            .map((user) => {
                const name =
                    user.name ||
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    user.email;

                return `
                        <option value="${user.id}">
                            ${escapeAccountHtml(name)}
                            — ${escapeAccountHtml(user.email || "")}
                        </option>
                    `;
            })
            .join("");

        content.innerHTML = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label for="deleteAccountUser">
                        Select User *
                    </label>

                    <select id="deleteAccountUser">
                        <option value="">
                            Select user account
                        </option>

                        ${options}
                    </select>
                </div>
            </div>

            <div id="deleteAccountDetails"></div>
        `;

        document
            .getElementById("deleteAccountUser")
            ?.addEventListener("change", async (event) => {
                const userId = event.target.value;

                const details = document.getElementById("deleteAccountDetails");

                if (!userId) {
                    if (details) {
                        details.innerHTML = "";
                    }

                    return;
                }

                await loadDeleteAccountDetails(userId);
            });
    } catch (error) {
        console.error("LOAD DELETE ACCOUNTS ERROR:", error);

        content.innerHTML = `
            <div class="settings-empty-state">
                <p>
                    Unable to load user accounts.
                </p>
            </div>
        `;

        window.showToast?.(
            error?.message || "Unable to load user accounts.",
            "error",
        );
    }
}

function escapeAccountHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadUpdateAccountForm(userId) {
    const container = document.getElementById("updateAccountFormContainer");
    if (!container) {
        return;
    }
    container.innerHTML = `
        <div class="settings-empty-state">
            <i class="ph ph-spinner"></i>
            <p>Loading account...</p>
        </div>
    `;

    try {
        const response = await fetch(`/settings/accounts/${userId}`, {
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.message || "Unable to load account.");
        }
        const user = data.user;
        const isDriver = user.role === "driver";
        container.innerHTML = `
            <form id="updateUserAccountForm">

                <input
                    type="hidden"
                    id="updateAccountId"
                    value="${user.id}"
                >

                <div class="form-grid">

                    <div class="form-group">
                        <label>
                            First Name *
                        </label>

                        <input
                            type="text"
                            id="updateAccountFirstName"
                            value="${escapeAccountHtml(user.first_name || "")}"
                            ${isDriver ? "readonly" : "required"}
                        >
                    </div>

                    <div class="form-group">
                        <label>
                            Middle Name
                        </label>

                        <input
                            type="text"
                            id="updateAccountMiddleName"
                            value="${escapeAccountHtml(user.middle_name || "")}"
                        >
                    </div>

                    <div class="form-group">
                        <label>
                            Last Name *
                        </label>

                        <input
                            type="text"
                            id="updateAccountLastName"
                            value="${escapeAccountHtml(user.last_name || "")}"
                            ${isDriver ? "readonly" : "required"}
                        >
                    </div>

                    <div class="form-group">
                        <label>
                            Email *
                        </label>

                        <input
                            type="email"
                            id="updateAccountEmail"
                            value="${escapeAccountHtml(user.email || "")}"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label>
                            Role *
                        </label>

                        <select
                            id="updateAccountRole"
                            ${isDriver ? "disabled" : ""}
                            required
                        >
                            ${buildAccountRoleOptions(user.role)}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>
                            Department
                        </label>

                        <input
                            type="text"
                            id="updateAccountDepartment"
                            value="${escapeAccountHtml(user.department || "")}"
                        >
                    </div>

                    <div class="form-group">
                        <label>
                            Job Title
                        </label>

                        <input
                            type="text"
                            id="updateAccountJobTitle"
                            value="${escapeAccountHtml(user.job_title || "")}"
                        >
                    </div>

                    <div class="form-group">
                        <label>
                            Mobile Number
                        </label>

                        <input
                            type="text"
                            id="updateAccountMobile"
                            value="${escapeAccountHtml(user.mobile_number || "")}"
                            ${isDriver ? "readonly" : ""}
                        >
                    </div>

                </div>

                ${
                    isDriver
                        ? `
                            <p class="settings-note">
                                Driver name and mobile number are managed through the Driver module.
                            </p>
                        `
                        : ""
                }

                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn-outline"
                        data-account-modal-cancel
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn-primary"
                        id="updateUserAccountBtn"
                    >
                        <i class="ph ph-floppy-disk"></i>
                        Save Account
                    </button>
                </div>
            </form>
        `;

        initUpdateUserAccountForm(isDriver);
        initAccountModalCancelButtons();
    } catch (error) {
        console.error("LOAD ACCOUNT ERROR:", error);
        container.innerHTML = `
            <div class="settings-empty-state">
                <p>
                    Unable to load account.
                </p>
            </div>
        `;
    }
}

async function loadDeleteAccountDetails(userId) {
    const container = document.getElementById("deleteAccountDetails");
    if (!container) {
        return;
    }
    container.innerHTML = `
        <div class="settings-empty-state">
            <i class="ph ph-spinner"></i>
            <p>Loading account...</p>
        </div>
    `;

    try {
        const response = await fetch(`/settings/accounts/${userId}`, {
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.message || "Unable to load account.");
        }
        const user = data.user;
        const displayName =
            user.name ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            "User";
        const roleLabel = String(user.role || "")
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
        container.innerHTML = `
            <div class="account-delete-summary">

                <div>
                    <strong>
                        ${escapeAccountHtml(displayName)}
                    </strong>

                    <p>
                        ${escapeAccountHtml(user.email || "")}
                    </p>

                    <p>
                        Role:
                        ${escapeAccountHtml(roleLabel)}
                    </p>
                </div>

                ${
                    user.role === "driver"
                        ? `
                            <p class="settings-note">
                                Deleting this account will not delete
                                the Driver record. The Driver account
                                link will be removed instead.
                            </p>
                        `
                        : ""
                }

                <div class="account-delete-confirmation">
                    <label for="confirmDeleteUserAccount">
                        <input
                            type="checkbox"
                            id="confirmDeleteUserAccount"
                        >

                        <span>
                            I understand that this user account will be permanently deleted.
                        </span>
                    </label>
                </div>

                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn-outline"
                        data-account-modal-cancel
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="btn-danger"
                        id="deleteUserAccountBtn"
                        data-user-id="${user.id}"
                        disabled
                    >
                        <i class="ph ph-trash"></i>
                        Delete Account
                    </button>
                </div>

            </div>
        `;

        initDeleteUserAccount();
        initAccountModalCancelButtons();
    } catch (error) {
        console.error("LOAD DELETE ACCOUNT ERROR:", error);

        container.innerHTML = `
            <div class="settings-empty-state">
                <p>
                    Unable to load account.
                </p>
            </div>
        `;
    }
}

function initUpdateUserAccountForm(isDriver) {
    const form = document.getElementById("updateUserAccountForm");
    if (!form || form.dataset.initialized === "true") {
        return;
    }
    form.dataset.initialized = "true";
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.submitting === "true") {
            return;
        }
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        form.dataset.submitting = "true";
        const userId = document.getElementById("updateAccountId").value;
        const button = document.getElementById("updateUserAccountBtn");
        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }
        try {
            const payload = {
                middle_name: document
                    .getElementById("updateAccountMiddleName")
                    .value.trim(),
                email: document
                    .getElementById("updateAccountEmail")
                    .value.trim(),
                department: document
                    .getElementById("updateAccountDepartment")
                    .value.trim(),
                job_title: document
                    .getElementById("updateAccountJobTitle")
                    .value.trim(),
            };

            if (isDriver) {
                payload.role = "driver";
            } else {
                payload.first_name = document
                    .getElementById("updateAccountFirstName")
                    .value.trim();
                payload.last_name = document
                    .getElementById("updateAccountLastName")
                    .value.trim();
                payload.mobile_number = document
                    .getElementById("updateAccountMobile")
                    .value.trim();
                payload.role =
                    document.getElementById("updateAccountRole").value;
            }

            const response = await fetch(`/settings/accounts/${userId}`, {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN":
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "",
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (response.status === 422) {
                const error = data?.errors
                    ? Object.values(data.errors).flat()[0]
                    : null;
                window.showToast?.(
                    error ||
                        data?.message ||
                        "Please check the account information.",
                    "error",
                );
                return;
            }
            if (!response.ok) {
                throw new Error(data?.message || "Failed to update account.");
            }
            window.showToast?.(
                data?.message || "User account updated successfully.",
                "success",
            );
            await renderAccountUpdateForm();
        } catch (error) {
            console.error("UPDATE ACCOUNT ERROR:", error);
            window.showToast?.(
                error?.message || "Failed to update account.",
                "error",
            );
        } finally {
            form.dataset.submitting = "false";
            if (button) {
                button.disabled = false;
                button.innerHTML =
                    '<i class="ph ph-floppy-disk"></i> Save Account';
            }
        }
    });
}

function initResetUserPasswordForm() {
    const form = document.getElementById("resetUserPasswordForm");
    if (!form || form.dataset.initialized === "true") {
        return;
    }
    form.dataset.initialized = "true";
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.submitting === "true") {
            return;
        }
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const userId =
            document.getElementById("resetPasswordUser")?.value || "";
        const password =
            document.getElementById("resetAccountPassword")?.value || "";
        const passwordConfirmation =
            document.getElementById("resetAccountPasswordConfirmation")
                ?.value || "";
        if (!userId) {
            window.showToast?.("Please select a user account.", "error");

            return;
        }

        if (password !== passwordConfirmation) {
            window.showToast?.("Passwords do not match.", "error");

            return;
        }

        form.dataset.submitting = "true";
        const button = document.getElementById("resetUserPasswordBtn");
        if (button) {
            button.disabled = true;
            button.innerHTML = `
                    <i class="ph ph-spinner"></i>
                    Resetting...
                `;
        }

        try {
            const response = await fetch(
                `/settings/accounts/${userId}/reset-password`,
                {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",

                        Accept: "application/json",

                        "X-CSRF-TOKEN":
                            document.querySelector('meta[name="csrf-token"]')
                                ?.content || "",
                    },

                    body: JSON.stringify({
                        password: password,

                        password_confirmation: passwordConfirmation,
                    }),
                },
            );

            const data = await response.json();
            if (response.status === 422) {
                const firstError = data?.errors
                    ? Object.values(data.errors).flat()[0]
                    : null;
                window.showToast?.(
                    firstError || data?.message || "Please check the password.",
                    "error",
                );
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || "Failed to reset password.");
            }
            window.showToast?.(
                data?.message || "Password reset successfully.",
                "success",
            );
            form.reset();
        } catch (error) {
            console.error("RESET PASSWORD ERROR:", error);
            window.showToast?.(
                error?.message || "Failed to reset password.",
                "error",
            );
        } finally {
            form.dataset.submitting = "false";

            if (button) {
                button.disabled = false;
                button.innerHTML = `
                        <i class="ph ph-key"></i>
                        Reset Password
                    `;
            }
        }
    });
}

function initDeleteUserAccount() {
    const checkbox = document.getElementById("confirmDeleteUserAccount");
    const button = document.getElementById("deleteUserAccountBtn");
    if (!checkbox || !button) {
        return;
    }
    checkbox.addEventListener("change", () => {
        button.disabled = !checkbox.checked;
    });

    button.addEventListener("click", async () => {
        const userId = button.dataset.userId;
        if (!userId || !checkbox.checked) {
            return;
        }
        if (button.dataset.submitting === "true") {
            return;
        }
        button.dataset.submitting = "true";
        button.disabled = true;
        button.innerHTML = `
                <i class="ph ph-spinner"></i>
                Deleting...
            `;
        try {
            const response = await fetch(`/settings/accounts/${userId}`, {
                method: "DELETE",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN":
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "",
                },
            });
            const data = await response.json();
            if (response.status === 422) {
                window.showToast?.(
                    data?.message || "Unable to delete account.",
                    "error",
                );

                return;
            }
            if (!response.ok) {
                throw new Error(data?.message || "Failed to delete account.");
            }
            window.showToast?.(
                data?.message || "User account deleted successfully.",
                "success",
            );

            await renderAccountDeleteForm();
        } catch (error) {
            console.error("DELETE ACCOUNT ERROR:", error);

            window.showToast?.(
                error?.message || "Failed to delete account.",
                "error",
            );
        } finally {
            button.dataset.submitting = "false";

            /*
    |--------------------------------------------------------------------------
    | Restore delete button only if it still exists
    |--------------------------------------------------------------------------
    */
            if (document.body.contains(button)) {
                button.disabled = !checkbox.checked;

                button.innerHTML = `
            <i class="ph ph-trash"></i>
            Delete Account
        `;
            }
        }
    });
}

function initAccountModalCancelButtons() {
    document
        .querySelectorAll("[data-account-modal-cancel]")
        .forEach((button) => {
            if (button.dataset.initialized === "true") {
                return;
            }
            button.dataset.initialized = "true";
            button.addEventListener("click", closeAccountManagementModal);
        });
}

function buildAccountRoleOptions(selectedRole) {
    const roles = [
        ["fleet_manager", "Fleet Manager"],
        ["dispatcher", "Dispatcher"],
        ["department_head", "Department Head"],
        ["finance", "Finance"],
        ["maintenance", "Maintenance"],
        ["it_admin", "IT Admin"],
    ];

    if (selectedRole === "driver") {
        roles.push(["driver", "Driver"]);
    }

    return roles
        .map(
            ([value, label]) => `
                <option
                    value="${value}"
                    ${value === selectedRole ? "selected" : ""}
                >
                    ${label}
                </option>
            `,
        )
        .join("");
}

function renderAccountCreateForm() {
    const content = document.getElementById("accountManagementContent");

    if (!content) {
        return;
    }

    content.innerHTML = `
        <form id="createUserAccountForm">
            <div class="form-grid">

                <div class="form-group">
                    <label for="accountFirstName">
                        First Name *
                    </label>

                    <input
                        type="text"
                        id="accountFirstName"
                        required
                        maxlength="60"
                    >
                </div>

                <div class="form-group">
                    <label for="accountMiddleName">
                        Middle Name
                    </label>

                    <input
                        type="text"
                        id="accountMiddleName"
                        maxlength="60"
                    >
                </div>

                <div class="form-group">
                    <label for="accountLastName">
                        Last Name *
                    </label>

                    <input
                        type="text"
                        id="accountLastName"
                        required
                        maxlength="60"
                    >
                </div>

                <div class="form-group">
                    <label for="accountEmail">
                        Email *
                    </label>

                    <input
                        type="email"
                        id="accountEmail"
                        required
                        maxlength="120"
                    >
                </div>

                <div class="form-group">
                    <label for="accountRole">
                        Role *
                    </label>

                    <select
                        id="accountRole"
                        required
                    >
                        <option value="">
                            Select Role
                        </option>

                        <option value="fleet_manager">
                            Fleet Manager
                        </option>

                        <option value="dispatcher">
                            Dispatcher
                        </option>

                        <option value="department_head">
                            Department Head
                        </option>

                        <option value="finance">
                            Finance
                        </option>

                        <option value="maintenance">
                            Maintenance
                        </option>

                        <option value="it_admin">
                            IT Admin
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="accountDepartment">
                        Department
                    </label>

                    <input
                        type="text"
                        id="accountDepartment"
                        maxlength="120"
                    >
                </div>

                <div class="form-group">
                    <label for="accountJobTitle">
                        Job Title
                    </label>

                    <input
                        type="text"
                        id="accountJobTitle"
                        maxlength="120"
                    >
                </div>

                <div class="form-group">
                    <label for="accountPassword">
                        Password *
                    </label>

                    <input
                        type="password"
                        id="accountPassword"
                        required
                        minlength="8"
                    >
                </div>

                <div class="form-group">
                    <label for="accountPasswordConfirmation">
                        Confirm Password *
                    </label>

                    <input
                        type="password"
                        id="accountPasswordConfirmation"
                        required
                        minlength="8"
                    >
                </div>

            </div>

            <div class="modal-footer">
                <button
                    type="button"
                    class="btn-outline"
                    data-account-modal-cancel
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="btn-primary"
                    id="createUserAccountBtn"
                >
                    <i class="ph ph-user-plus"></i>
                    Create Account
                </button>
            </div>
        </form>
    `;

    initCreateUserAccountForm();
    initAccountModalCancelButtons();
}

function initCreateUserAccountForm() {
    const form = document.getElementById("createUserAccountForm");
    if (!form || form.dataset.initialized === "true") {
        return;
    }
    form.dataset.initialized = "true";
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.submitting === "true") {
            return;
        }
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const password =
            document.getElementById("accountPassword")?.value || "";
        const passwordConfirmation =
            document.getElementById("accountPasswordConfirmation")?.value || "";
        if (password !== passwordConfirmation) {
            window.showToast?.("Passwords do not match.", "error");

            return;
        }
        form.dataset.submitting = "true";
        const submitButton = document.getElementById("createUserAccountBtn");
        if (submitButton) {
            submitButton.disabled = true;

            submitButton.innerHTML = `
                    <i class="ph ph-spinner"></i>
                    Creating...
                `;
        }
        try {
            const response = await fetch("/settings/accounts", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN":
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "",
                },
                body: JSON.stringify({
                    first_name:
                        document
                            .getElementById("accountFirstName")
                            ?.value.trim() || "",
                    middle_name:
                        document
                            .getElementById("accountMiddleName")
                            ?.value.trim() || "",
                    last_name:
                        document
                            .getElementById("accountLastName")
                            ?.value.trim() || "",
                    email:
                        document.getElementById("accountEmail")?.value.trim() ||
                        "",
                    role: document.getElementById("accountRole")?.value || "",
                    department:
                        document
                            .getElementById("accountDepartment")
                            ?.value.trim() || "",
                    job_title:
                        document
                            .getElementById("accountJobTitle")
                            ?.value.trim() || "",
                    password: password,
                    password_confirmation: passwordConfirmation,
                }),
            });
            const data = await response.json();
            if (response.status === 422) {
                const firstError = data?.errors
                    ? Object.values(data.errors).flat()[0]
                    : null;
                window.showToast?.(
                    firstError ||
                        data?.message ||
                        "Please check the account information.",
                    "error",
                );
                return;
            }
            if (!response.ok) {
                throw new Error(data?.message || "Failed to create account.");
            }
            window.showToast?.(
                data?.message || "User account created successfully.",
                "success",
            );
            form.reset();
        } catch (error) {
            console.error("CREATE ACCOUNT ERROR:", error);
            window.showToast?.(
                error?.message || "Failed to create account.",
                "error",
            );
        } finally {
            form.dataset.submitting = "false";
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = `
                        <i class="ph ph-user-plus"></i>
                        Create Account
                    `;
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", initAccountManagementModal);
