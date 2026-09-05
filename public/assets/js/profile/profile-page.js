/* ==========================================
   User Profile Page Controller

   Laravel / MySQL backed.
   JavaScript handles UI behavior only.
========================================== */

let profilePageInitialized = false;
let profileBaseline = null;
let profileDirty = false;
let profileSaving = false;
let profilePhotoChanged = false;
let profilePhotoRemoved = false;
let profilePreviewUrl = null;

/* ==========================================
   COMMON HELPERS
========================================== */
//   RBAC
function getProfilePermissions() {
    return window.FLEET_RBAC?.profile || {};
}
function canEditAdministrativeProfile() {
    return getProfilePermissions().canEditAdministrative === true;
}
function isDriverProfile() {
    return window.FLEET_RBAC?.role === "driver";
}

function profileToast(message, type = "info") {
    if (typeof showToast === "function") {
        showToast(message, type);
    }
}

function profileSetText(id, text) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = text ?? "";
    }
}

function profileGetValue(id) {
    const element = document.getElementById(id);
    return element ? String(element.value || "").trim() : "";
}

function profileSetError(id, message) {
    const input = document.getElementById(id);
    const errorElement = document.getElementById(id + "Error");

    if (input) {
        if (message) {
            input.setAttribute("aria-invalid", "true");
            input.classList.add("is-invalid");
        } else {
            input.removeAttribute("aria-invalid");
            input.classList.remove("is-invalid");
        }
    }

    if (errorElement) {
        errorElement.textContent = message || "";

        errorElement.hidden = !message;
    }
}

function profileClearErrors() {
    [
        "profileFirstName",
        "profileLastName",
        "profileDisplayName",
        "profileDepartment",
        "profileJobTitle",
        "profileEmail",
        "profileMobile",
    ].forEach((id) => {
        profileSetError(id, "");
    });
}

// LARAVEL PASSWORDTOGGLE
function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
        const inputId = button.getAttribute("data-password-toggle");
        const input = document.getElementById(inputId);
        const icon = button.querySelector("i");
        if (!input) {
            return;
        }
        function syncToggleState() {
            const isVisible = input.type === "text";
            if (icon) {
                icon.className = isVisible ? "ph ph-eye" : "ph ph-eye-slash";
            }
            button.setAttribute(
                "aria-label",
                isVisible ? "Hide password" : "Show password",
            );
        }
        syncToggleState();
        button.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
            syncToggleState();
        });
    });
}

/* ==========================================
   CHANGE PASSWORD MODAL
========================================== */
function initChangePasswordModal() {
    const modal =
        document.getElementById(
            "changePasswordModal"
        );
    if (!modal) {
        return;
    }
    const openButton =
        document.getElementById(
            "openChangePasswordModal"
        );
    const closeButton =
        document.getElementById(
            "closeChangePasswordModal"
        );
    const cancelButton =
        document.getElementById(
            "cancelChangePasswordModal"
        );
    const currentPasswordInput =
        document.getElementById(
            "update_password_current_password"
        );

    let triggerElement = null;

    function openModal() {
        triggerElement =
            document.activeElement;

        modal.classList.add(
            "show"
        );
        modal.setAttribute(
            "aria-hidden",
            "false"
        );
        document.body.style.overflow =
            "hidden";

        requestAnimationFrame(() => {
            currentPasswordInput?.focus();
        });
    }

    function closeModal() {
        /*
        |--------------------------------------------------------------
        | Remove focus before aria-hidden=true
        |--------------------------------------------------------------
        */
        if (
            modal.contains(
                document.activeElement
            )
        ) {
            document.activeElement?.blur();
        }
        modal.classList.remove(
            "show"
        );
        modal.setAttribute(
            "aria-hidden",
            "true"
        );
        document.body.style.overflow =
            "";
        requestAnimationFrame(() => {
            if (
                triggerElement &&
                document.body.contains(
                    triggerElement
                )
            ) {
                triggerElement.focus();
            }
            triggerElement = null;
        });
    }
    openButton?.addEventListener(
        "click",
        openModal
    );
    closeButton?.addEventListener(
        "click",
        closeModal
    );
    cancelButton?.addEventListener(
        "click",
        closeModal
    );
    /*
    |--------------------------------------------------------------
    | Click outside modal
    |--------------------------------------------------------------
    */
    modal.addEventListener(
        "click",
        (event) => {
            if (
                event.target ===
                modal
            ) {
                closeModal();
            }
        }
    );
    /*
    |--------------------------------------------------------------
    | Escape key
    |--------------------------------------------------------------
    */
    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key ===
                    "Escape" &&
                modal.classList.contains(
                    "show"
                )
            ) {
                closeModal();
            }
        }
    );
    /*
    |--------------------------------------------------------------
    | Laravel validation error
    |--------------------------------------------------------------
    |
    | If password validation redirects back,
    | automatically reopen the modal.
    |
    */
    if (
        modal.dataset.hasErrors ===
        "true"
    ) {
        openModal();
    }
}

let passwordFormSubmitting = false;

function setPasswordFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(inputId + "Error");
    if (input) {
        if (message) {
            input.classList.add("is-invalid");
            input.setAttribute("aria-invalid", "true");
        } else {
            input.classList.remove("is-invalid");
            input.removeAttribute("aria-invalid");
        }
    }
    if (error) {
        error.textContent = message || "";

        error.hidden = !message;
    }
}

function clearPasswordErrors() {
    [
        "update_password_current_password",
        "update_password_password",
        "update_password_password_confirmation",
    ].forEach((id) => {
        setPasswordFieldError(id, "");
    });
}

function validatePasswordForm() {
    clearPasswordErrors();
    const current =
        document.getElementById("update_password_current_password")?.value ||
        "";
    const password =
        document.getElementById("update_password_password")?.value || "";
    const confirmation =
        document.getElementById("update_password_password_confirmation")
            ?.value || "";

    let valid = true;

    if (!current) {
        setPasswordFieldError(
            "update_password_current_password",
            "Current password is required.",
        );

        valid = false;
    }
    if (!password) {
        setPasswordFieldError(
            "update_password_password",
            "New password is required.",
        );

        valid = false;
    } else if (password.length < 8) {
        setPasswordFieldError(
            "update_password_password",
            "New password must be at least 8 characters.",
        );

        valid = false;
    }
    if (!confirmation) {
        setPasswordFieldError(
            "update_password_password_confirmation",
            "Please confirm your new password.",
        );

        valid = false;
    } else if (password !== confirmation) {
        setPasswordFieldError(
            "update_password_password_confirmation",
            "Password confirmation does not match.",
        );

        valid = false;
    }
    if (current && password && current === password) {
        setPasswordFieldError(
            "update_password_password",
            "New password must be different from your current password.",
        );

        valid = false;
    }

    if (!valid) {
        document.querySelector("#updatePasswordForm .is-invalid")?.focus();
    }

    return valid;
}

function initPasswordFormSubmission() {
    const form = document.getElementById("updatePasswordForm");
    const submitButton = document.getElementById("updatePasswordSubmitBtn");
    if (!form) {
        return;
    }
    form.addEventListener("submit", (event) => {
        if (passwordFormSubmitting) {
            event.preventDefault();
            return;
        }

        if (!validatePasswordForm()) {
            event.preventDefault();
            return;
        }
        passwordFormSubmitting = true;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                    <i class="ph ph-spinner"></i>
                    Updating...
                `;
        }
    });
    form.addEventListener("input", (event) => {
        const input = event.target;
        if (input?.id?.startsWith("update_password_")) {
            setPasswordFieldError(input.id, "");
        }
    });
}

/* ==========================================
   PROFILE STATE
========================================== */
function readProfileFormState() {
    return {
        firstName: profileGetValue("profileFirstName"),
        middleName: profileGetValue("profileMiddleName"),
        lastName: profileGetValue("profileLastName"),
        displayName: profileGetValue("profileDisplayName"),
        employeeId: profileGetValue("profileEmployeeId"),
        department: profileGetValue("profileDepartment"),
        jobTitle: profileGetValue("profileJobTitle"),
        email: profileGetValue("profileEmail"),
        mobile: profileGetValue("profileMobile"),
        extension: profileGetValue("profileExtension"),
        location: profileGetValue("profileLocation"),
    };
}

function captureProfileBaseline() {
    profileBaseline = JSON.stringify(readProfileFormState());
    profilePhotoChanged = false;
    profilePhotoRemoved = false;
    profileDirty = false;
    updateProfileDirtyUi();
}

function calculateProfileDirty() {
    const current = JSON.stringify(readProfileFormState());

    return (
        current !== profileBaseline ||
        profilePhotoChanged ||
        profilePhotoRemoved
    );
}

function updateProfileDirtyUi() {
    profileDirty = calculateProfileDirty();

    const saveButton = document.getElementById("profileSaveBtn");
    const resetButton = document.getElementById("profileResetBtn");
    const badge = document.getElementById("profileDirtyBadge");
    const hint = document.getElementById("profileDirtyHint");

    if (saveButton) {
        saveButton.disabled = !profileDirty || profileSaving;
    }
    if (resetButton) {
        resetButton.disabled = !profileDirty || profileSaving;
    }
    if (badge) {
        badge.hidden = !profileDirty;
    }
    if (hint) {
        hint.textContent = profileDirty
            ? "You have unsaved changes"
            : "All changes saved";
    }
}

/* ==========================================
   VALIDATION
========================================== */
function isValidProfileEmail(value) {
    if (!value) {
        return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidProfilePhone(value) {
    if (!value) {
        return true;
    }
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
}

function validateProfileForm() {
    profileClearErrors();

    let valid = true;

    const firstName = profileGetValue("profileFirstName");
    const lastName = profileGetValue("profileLastName");
    const displayName = profileGetValue("profileDisplayName");
    const department = profileGetValue("profileDepartment");
    const jobTitle = profileGetValue("profileJobTitle");
    const email = profileGetValue("profileEmail");
    const mobile = profileGetValue("profileMobile");

    if (!isDriverProfile()) {
        if (!firstName) {
            profileSetError("profileFirstName", "First name is required.");

            valid = false;
        }
        if (!lastName) {
            profileSetError("profileLastName", "Last name is required.");

            valid = false;
        }
        if (!displayName) {
            profileSetError("profileDisplayName", "Display name is required.");

            valid = false;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Administrative Profile Fields
    |--------------------------------------------------------------------------
    | Only IT Admin may edit these fields.
    |--------------------------------------------------------------------------
    */
    if (canEditAdministrativeProfile()) {
        if (!department) {
            profileSetError("profileDepartment", "Department is required.");

            valid = false;
        }
        if (!jobTitle) {
            profileSetError("profileJobTitle", "Job title is required.");

            valid = false;
        }
    }
    /*
    if (!isValidProfileEmail(email)) {
        profileSetError("profileEmail", "Enter a valid email address.");

        valid = false;
    }
    */
    if (!isDriverProfile() && !isValidProfilePhone(mobile)) {
        profileSetError("profileMobile", "Enter a valid mobile number.");

        valid = false;
    }
    if (!valid) {
        document.querySelector("#userProfileForm .is-invalid")?.focus();
    }
    return valid;
}

/* ==========================================
   LIVE PROFILE OVERVIEW
========================================== */
function getProfileInitialsFromForm() {
    const firstName = profileGetValue("profileFirstName");
    const lastName = profileGetValue("profileLastName");
    const displayName = profileGetValue("profileDisplayName");
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    if (initials) {
        return initials;
    }
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (
            parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase() || "U";
}

function applyProfileLivePreview() {
    const displayName = profileGetValue("profileDisplayName") || "User";
    const department =
        profileGetValue("profileDepartment") || "No department assigned";
    const email = profileGetValue("profileEmail") || "No email on file";
    profileSetText("profileOverviewName", displayName);
    profileSetText("profileOverviewDepartment", department);
    profileSetText("profileOverviewEmail", email);
    profileSetText("profileAccountUsername", displayName);
    const initials = document.getElementById("profileAvatarInitials");
    const image = document.getElementById("profileAvatarImage");
    const preview = document.getElementById("profileAvatarPreview");
    if (!image || !initials || !preview) {
        return;
    }
    if (!image.hidden && image.src) {
        initials.hidden = true;
        preview.classList.add("has-photo");
    } else {
        initials.textContent = getProfileInitialsFromForm();
        initials.hidden = false;
        preview.classList.remove("has-photo");
    }
}

/* ==========================================
   PROFILE PHOTO PREVIEW
========================================== */
function clearProfilePreviewUrl() {
    if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
        profilePreviewUrl = null;
    }
}

function previewProfilePhoto(file) {
    if (!file) {
        return false;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        profileToast("Profile photo must be JPG, PNG, or WEBP.", "warning");
        return false;
    }

    if (file.size > 2 * 1024 * 1024) {
        profileToast("Profile photo must not exceed 2 MB.", "warning");
        return false;
    }

    clearProfilePreviewUrl();
    profilePreviewUrl = URL.createObjectURL(file);
    const image = document.getElementById("profileAvatarImage");
    const initials = document.getElementById("profileAvatarInitials");
    const preview = document.getElementById("profileAvatarPreview");
    if (image) {
        image.src = profilePreviewUrl;
        image.alt =
            (profileGetValue("profileDisplayName") || "User") +
            " profile photo";
        image.hidden = false;
    }
    if (initials) {
        initials.hidden = true;
    }
    if (preview) {
        preview.classList.add("has-photo");
    }
    const removeButton = document.getElementById("profileRemovePhotoBtn");
    if (removeButton) {
        removeButton.hidden = false;
        removeButton.disabled = false;
    }
    const removeInput = document.getElementById("removeProfilePhoto");
    if (removeInput) {
        removeInput.value = "0";
    }
    profilePhotoChanged = true;
    profilePhotoRemoved = false;
    updateProfileDirtyUi();
    return true;
}

function removeProfilePhotoPreview() {
    clearProfilePreviewUrl();
    const photoInput = document.getElementById("profilePhotoInput");
    if (photoInput) {
        photoInput.value = "";
    }
    const image = document.getElementById("profileAvatarImage");
    const initials = document.getElementById("profileAvatarInitials");
    const preview = document.getElementById("profileAvatarPreview");
    if (image) {
        image.removeAttribute("src");
        image.hidden = true;
    }
    if (initials) {
        initials.textContent = getProfileInitialsFromForm();
        initials.hidden = false;
    }
    if (preview) {
        preview.classList.remove("has-photo");
    }
    const removeButton = document.getElementById("profileRemovePhotoBtn");
    if (removeButton) {
        removeButton.hidden = true;
        removeButton.disabled = true;
    }
    const removeInput = document.getElementById("removeProfilePhoto");
    if (removeInput) {
        removeInput.value = "1";
    }
    profilePhotoChanged = false;
    profilePhotoRemoved = true;
    updateProfileDirtyUi();
}

/* ==========================================
   RESET
========================================== */
function resetUserProfilePage() {
    const form = document.getElementById("userProfileForm");

    if (!form) {
        return;
    }
    clearProfilePreviewUrl();
    /*
    |--------------------------------------------------------------------------
    | Restore original form values
    |--------------------------------------------------------------------------
    */
    form.reset();
    const removeInput = document.getElementById("removeProfilePhoto");
    if (removeInput) {
        removeInput.value = "0";
    }
    /*
    |--------------------------------------------------------------------------
    | Reset photo state
    |--------------------------------------------------------------------------
    */
    profilePhotoChanged = false;
    profilePhotoRemoved = false;
    /*
    |--------------------------------------------------------------------------
    | Restore preview/UI
    |--------------------------------------------------------------------------
    */
    applyProfileLivePreview();
    captureProfileBaseline();
    /*
    |--------------------------------------------------------------------------
    | Reset Toast
    |--------------------------------------------------------------------------
    */
    profileToast("Unsave changes discarded.", "info");
}

/* ==========================================
   FORM SUBMISSION
========================================== */
function prepareProfileSubmission(event) {
    if (profileSaving) {
        event.preventDefault();
        return;
    }
    if (!validateProfileForm()) {
        event.preventDefault();
        profileToast("Please correct the highlighted fields.", "warning");
        return;
    }
    profileSaving = true;

    /*
  |--------------------------------------------------------------------------
  | IMPORTANT
  |--------------------------------------------------------------------------
  |
  | DO NOT preventDefault here.
  |
  | Browser submits the real multipart form:
  |
  | PATCH /profile
  | → ProfileUpdateRequest
  | → ProfileController@update
  | → MySQL / storage
  |
  */
    profileDirty = false;
    const saveButton = document.getElementById("profileSaveBtn");
    const resetButton = document.getElementById("profileResetBtn");
    const hint = document.getElementById("profileDirtyHint");
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = `
      <i class="ph ph-spinner"></i>
      Saving...
    `;
    }
    if (resetButton) {
        resetButton.disabled = true;
    }
    if (hint) {
        hint.textContent = "Saving changes...";
    }
}

function initProfilePage() {
    if (profilePageInitialized) {
        return;
    }
    if (!document.getElementById("userProfilePage")) {
        return;
    }
    profilePageInitialized = true;
    const form = document.getElementById("userProfileForm");
    const photoInput = document.getElementById("profilePhotoInput");

    /*
  |--------------------------------------------------------------------------
  | Baseline is server-rendered DB data
  |--------------------------------------------------------------------------
  */
    captureProfileBaseline();
    applyProfileLivePreview();
    if (typeof syncUserProfileUI === "function") {
        syncUserProfileUI();
    }

    /*
  |--------------------------------------------------------------------------
  | Form Changes
  |--------------------------------------------------------------------------
  */
    form?.addEventListener("input", () => {
        applyProfileLivePreview();
        updateProfileDirtyUi();
    });
    form?.addEventListener("change", () => {
        applyProfileLivePreview();
        updateProfileDirtyUi();
    });

    /*
  |--------------------------------------------------------------------------
  | Real Laravel submission
  |--------------------------------------------------------------------------
  */
    form?.addEventListener("submit", prepareProfileSubmission);

    /*
  |--------------------------------------------------------------------------
  | Reset Changes
  |--------------------------------------------------------------------------
  */
    document
        .getElementById("profileResetBtn")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            if (!profileDirty) {
                return;
            }
            resetUserProfilePage();
        });

    /*
  |--------------------------------------------------------------------------
  | Change Photo
  |--------------------------------------------------------------------------
  */
    document
        .getElementById("profileChangePhotoBtn")
        ?.addEventListener("click", (event) => {
            event.preventDefault();

            photoInput?.click();
        });

    /*
  |--------------------------------------------------------------------------
  | Photo Selected
  |--------------------------------------------------------------------------
  */
    photoInput?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const valid = previewProfilePhoto(file);

        /*
         * Clear only invalid selections.
         * Valid file MUST stay in the input
         * so Laravel receives it.
         */
        if (!valid) {
            event.target.value = "";
        } else {
            profileToast(
                "Photo preview ready. Save changes to upload it.",
                "success",
            );
        }
    });

    /*
  |--------------------------------------------------------------------------
  | Remove Photo
  |--------------------------------------------------------------------------
  */
    document
        .getElementById("profileRemovePhotoBtn")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            removeProfilePhotoPreview();
            profileToast(
                "Profile photo marked for removal. Save changes to continue.",
                "info",
            );
        });

    /*
  |--------------------------------------------------------------------------
  | Warn before leaving with unsaved changes
  |--------------------------------------------------------------------------
  */
    window.addEventListener("beforeunload", (event) => {
        if (!profileDirty || profileSaving) {
            return;
        }
        event.preventDefault();
        event.returnValue = "";
    });
}

function initializeProfileScripts() {
    initProfilePage();
    initPasswordToggles();
    initChangePasswordModal();
    initPasswordFormSubmission();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeProfileScripts);
} else {
    initializeProfileScripts();
}
