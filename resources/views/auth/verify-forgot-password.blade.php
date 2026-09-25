<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Verify Code | HIMS Fleet</title>

    <link
        rel="icon"
        href="{{ asset('assets/images/brand/favicon.svg') }}"
    >

    <script src="{{ asset('assets/js/core/theme-boot.js') }}"></script>

    <link
        rel="stylesheet"
        href="{{ asset('assets/css/variables.css') }}"
    >

    <link
        rel="stylesheet"
        href="{{ asset('assets/css/style.css') }}"
    >

    <link
        rel="stylesheet"
        href="{{ asset('assets/css/login.css') }}"
    >

    <script src="https://unpkg.com/@phosphor-icons/web"></script>
</head>

<body
    data-page="verify-forgot-password"
    class="login-body"
>

<main class="login-page">

    <div class="login-shell">

        <div class="login-brand">

            <div
                class="login-brand-mark"
                aria-hidden="true"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                    fill="none"
                >
                    <path
                        fill="currentColor"
                        fill-rule="evenodd"
                        d="M13.25 3.5h5.5c.97 0 1.75.78 1.75 1.75v5.75h5.75c.97 0 1.75.78 1.75 1.75v5.5c0 .97-.78 1.75-1.75 1.75H20.5v5.75c0 .97-.78 1.75-1.75 1.75h-5.5c-.97 0-1.75-.78-1.75-1.75V20h-5.75c-.97 0-1.75-.78-1.75-1.75v-5.5c0-.97.78-1.75 1.75-1.75H11.5V5.25c0-.97.78-1.75 1.75-1.75zm2.75 4.75a1.85 1.85 0 1 0 0 3.7 1.85 1.85 0 0 0 0 3.7zm-1.8 4.55h3.6c.72 0 1.3.58 1.3 1.3v2.55c0 .2-.08.4-.22.54l-1.48 1.48c-.14.14-.34.22-.54.22h-1.72c-.2 0-.4-.08-.54-.22l-1.48-1.48a.77.77 0 0 1-.22-.54V14.1c0-.72.58-1.3 1.3-1.3z"
                    />

                    <path
                        fill="currentColor"
                        d="M24.1 7.2c2.9.2 5.1 2.2 5.5 4.9-.4.15-1.05.3-1.85.35-1.95.12-3.55-.95-4.15-2.55-.35-.9-.3-1.85.05-2.7z"
                    />
                </svg>
            </div>

            <div>
                <h1>HIMS Fleet</h1>

                <p>
                    Tala Hospital · Fleet &amp; Transportation Management
                </p>
            </div>

        </div>


        <section
            class="auth-card"
            aria-labelledby="verifyForgotPasswordHeading"
        >

            <h2 id="verifyForgotPasswordHeading">
                Verify Your Code
            </h2>

            <p class="auth-lead">
                Enter the 6-digit verification code
                sent to your registered email address.
            </p>


            <div class="auth-code-note">
                Enter the code exactly as received in your email.
            </div>


            <form
                method="POST"
                action="{{ route('password.verify.submit') }}"
                id="verifyForgotPasswordForm"
            >
                @csrf

                <div class="form-group">

                    <label for="forgotPasswordCode">
                        Verification Code
                    </label>

                    <input
                        type="text"
                        id="forgotPasswordCode"
                        name="code"
                        class="auth-code-input @error('code') is-invalid @enderror"
                        placeholder="000000"
                        maxlength="6"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        required
                        autofocus
                    >

                    @error('code')
                        <p class="auth-input-error">
                            {{ $message }}
                        </p>
                    @enderror

                </div>


                <div
                    class="auth-actions"
                    style="margin-top: var(--space-5);"
                >

                    <button
                        type="submit"
                        class="btn-primary login-submit"
                        id="verifyForgotPasswordSubmitBtn"
                    >
                        Verify Code
                    </button>

                </div>

            </form>


            <form
                method="POST"
                action="{{ route('password.resend') }}"
                style="
                    margin-top: var(--space-4);
                    text-align: center;
                "
            >
                @csrf

                <button
                    type="submit"
                    class="auth-primary-link auth-resend-button"
                    id="forgotPasswordResendBtn"
                    @if (($resendCooldown ?? 0) > 0)
                        disabled
                    @endif
                >
                    <span id="forgotPasswordResendText">
                        @if (($resendCooldown ?? 0) > 0)
                            Resend available in {{ $resendCooldown }}s
                        @else
                            Didn't receive the code? Send again
                        @endif
                    </span>
                </button>
            </form>


            <div
                style="
                    margin-top: var(--space-3);
                    text-align: center;
                "
            >
                <a
                    href="{{ route('password.request') }}"
                    class="auth-back-link"
                >
                    <i
                        class="ph ph-arrow-left"
                        aria-hidden="true"
                    ></i>

                    <span>Use a different email</span>
                </a>
            </div>

        </section>


        <footer class="login-footer">

            <p>
                Hospital Operations Suite ·
                Fleet &amp; Transportation Management
            </p>

        </footer>

    </div>

</main>


<div id="toast"></div>


<script src="{{ asset('assets/js/core/toast.js') }}"></script>

<script src="{{ asset('assets/js/core/main.js') }}"></script>


<script>
    document.addEventListener(
        "DOMContentLoaded",
        function () {

            if (
                typeof applyEarlyTheme === "function"
            ) {
                applyEarlyTheme();
            }

            if (
                typeof initToast === "function"
            ) {
                initToast();
            }

            const host =
                document.getElementById("toast");

            if (
                host &&
                !document.getElementById(
                    "toastContainer"
                )
            ) {
                const box =
                    document.createElement(
                        "div"
                    );

                box.id =
                    "toastContainer";

                box.className =
                    "toast-container";

                host.appendChild(box);
            }


            @if ($errors->any())
                if (
                    typeof showToast === "function"
                ) {
                    showToast(
                        @json($errors->first()),
                        "error"
                    );
                }
            @endif


            @if (session('status'))
                if (
                    typeof showToast === "function"
                ) {
                    showToast(
                        @json(session('status')),
                        "success"
                    );
                }
            @endif


            const codeInput =
                document.getElementById(
                    "forgotPasswordCode"
                );

            codeInput?.addEventListener(
                "input",
                function () {

                    this.value =
                        this.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                }
            );


            const form =
                document.getElementById(
                    "verifyForgotPasswordForm"
                );

            const button =
                document.getElementById(
                    "verifyForgotPasswordSubmitBtn"
                );

            form?.addEventListener(
                "submit",
                function () {

                    if (button) {

                        button.disabled =
                            true;

                        button.setAttribute(
                            "aria-busy",
                            "true"
                        );

                        button.textContent =
                            "Verifying…";
                    }
                }
            );

            const forgotResendButton =
                document.getElementById(
                    "forgotPasswordResendBtn"
                );

            const forgotResendText =
                document.getElementById(
                    "forgotPasswordResendText"
                );

            let forgotResendSeconds =
                Number(
                    @json($resendCooldown ?? 0)
                );

            let forgotResendTimer = null;

            function updateForgotResendState() {

                if (
                    forgotResendSeconds > 0
                ) {
                    forgotResendButton.disabled = true;

                    forgotResendText.textContent =
                        `Resend available in ${forgotResendSeconds}s`;

                    forgotResendSeconds--;

                    return;
                }

                forgotResendButton.disabled = false;

                forgotResendText.textContent =
                    "Didn't receive the code? Send again";

                if (forgotResendTimer) {
                    clearInterval(
                        forgotResendTimer
                    );

                    forgotResendTimer = null;
                }
            }

            if (
                forgotResendButton &&
                forgotResendText
            ) {
                updateForgotResendState();

                if (
                    forgotResendSeconds > 0
                ) {
                    forgotResendTimer =
                        setInterval(
                            updateForgotResendState,
                            1000
                        );
                }
            }

        }
    );
</script>

</body>
</html>