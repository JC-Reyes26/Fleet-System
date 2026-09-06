/* ==========================================
   Login Page
   Laravel Breeze handles authentication
   JS handles UI validation + custom toast
========================================== */

let loginPageInitialized = false;

function loginSetError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById(id + "Error");

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

function loginClearErrors() {
    loginSetError("loginEmail", "");
    loginSetError("loginPassword", "");
}

function loginToast(message, type = "info") {
    if (typeof showToast === "function") {
        showToast(message, type);
        return;
    }

    const fallback = document.getElementById("loginFormError");

    if (fallback) {
        fallback.hidden = false;
        fallback.textContent = message;
    }
}

function initLoginPasswordToggle() {
    const input = document.getElementById("loginPassword");
    const button = document.getElementById("loginPasswordToggle");
    const icon = button?.querySelector("i");
    if (!input || !button) {
        return;
    }

    function syncState() {
        const visible = input.type === "text";

        if (icon) {
            icon.className = visible ? "ph ph-eye" : "ph ph-eye-slash";
        }

        button.setAttribute(
            "aria-label",
            visible ? "Hide password" : "Show password",
        );
    }

    syncState();
    button.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
        syncState();
        input.focus();
    });
}

function initLoginPage() {
    if (loginPageInitialized) {
        return;
    }

    const form = document.getElementById("loginForm");

    if (!form) {
        return;
    }

    loginPageInitialized = true;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const submitButton = document.getElementById("loginSubmitBtn");

    /*
    |--------------------------------------------------------------------------
    | Clear local field errors while typing
    |--------------------------------------------------------------------------
    */

    emailInput?.addEventListener("input", () => {
        loginSetError("loginEmail", "");
    });

    passwordInput?.addEventListener("input", () => {
        loginSetError("loginPassword", "");
    });

    /*
    |--------------------------------------------------------------------------
    | Client-side validation only
    |--------------------------------------------------------------------------
    */

    form.addEventListener("submit", (event) => {
        loginClearErrors();
        const email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";

        let valid = true;

        if (!email) {
            loginSetError("loginEmail", "Email is required.");

            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            loginSetError("loginEmail", "Enter a valid email address.");

            valid = false;
        }

        if (!password) {
            loginSetError("loginPassword", "Password is required.");

            valid = false;
        }

        if (!valid) {
            event.preventDefault();

            loginToast("Please correct the highlighted fields.", "warning");

            form.querySelector(".is-invalid")?.focus();

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        | Valid form is submitted normally to Laravel Breeze.
        |--------------------------------------------------------------------------
        */

        if (submitButton) {
            submitButton.disabled = true;

            submitButton.setAttribute("aria-busy", "true");

            submitButton.textContent = "Signing in…";
        }
    });
}

function initializeLoginScripts() {
    initLoginPage();
    initLoginPasswordToggle();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLoginScripts);
} else {
    initializeLoginScripts();
}
