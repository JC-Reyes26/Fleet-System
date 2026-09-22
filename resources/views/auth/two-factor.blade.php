<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8" />

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    />

    <title>Two-Factor Authentication | HIMS Fleet</title>

    <link
        rel="icon"
        href="{{ asset('assets/images/brand/favicon.svg') }}"
    >

    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
        rel="stylesheet"
    />

    <script src="https://unpkg.com/@phosphor-icons/web"></script>

    <script src="{{ asset('assets/js/core/theme-boot.js') }}"></script>

    <link
        rel="stylesheet"
        href="{{ asset('assets/css/style.css') }}"
    >
</head>

<body
    data-page="two-factor"
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
                        d="M13.25 3.5h5.5c.97 0 1.75.78 1.75 1.75v5.75h5.75c.97 0 1.75.78 1.75 1.75v5.5c0 .97-.78 1.75-1.75 1.75H20.5v5.75c0 .97-.78 1.75-1.75 1.75h-5.5c-.97 0-1.75-.78-1.75-1.75V20h-5.75c-.97 0-1.75-.78-1.75-1.75v-5.5c0-.97.78-1.75 1.75-1.75H11.5V5.25c0-.97.78-1.75 1.75-1.75zm2.75 4.75a1.85 1.85 0 1 0 0 3.7 1.85 1.85 0 0 0 0-3.7zM14.2 12.8h3.6c.72 0 1.3.58 1.3 1.3v2.55c0 .2-.08.4-.22.54l-1.48 1.48c-.14.14-.34.22-.54.22h-1.72c-.2 0-.4-.08-.54-.22l-1.48-1.48a.77.77 0 0 1-.22-.54V14.1c0-.72.58-1.3 1.3-1.3z"
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
            class="login-card card"
            aria-labelledby="twoFactorHeading"
        >

            <h2 id="twoFactorHeading">
                Verify your identity
            </h2>

            <p class="login-lead">
                Enter the 6-digit verification code
                sent to your registered email address.
            </p>

            <div
                style="
                    margin-bottom: 20px;
                    padding: 12px 14px;
                    border-radius: 8px;
                    background: #f0fdf4;
                    color: #166534;
                    font-size: 13px;
                "
            >
                The verification code expires in
                <strong id="twoFactorCountdown">02:00</strong>.
            </div>


            <form
                method="POST"
                action="{{ route('two-factor.verify') }}"
                class="login-form"
                id="twoFactorForm"
                novalidate
            >
                @csrf

                <div class="form-group">

                    <label for="twoFactorCode">
                        Verification Code
                    </label>

                    <input
                        type="text"
                        id="twoFactorCode"
                        name="code"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        maxlength="6"
                        required
                        autofocus
                        placeholder="Enter 6-digit code"
                        class="@error('code') is-invalid @enderror"
                        style="
                            text-align: center;
                            font-size: 24px;
                            font-weight: 600;
                            letter-spacing: 8px;
                        "
                    />

                    <p
                        class="login-field-error"
                        id="twoFactorCodeError"
                        @if (!$errors->has('code')) hidden @endif
                    >
                        @error('code')
                            {{ $message }}
                        @enderror
                    </p>

                </div>


                <button
                    type="submit"
                    class="btn-primary login-submit"
                    id="twoFactorSubmitBtn"
                >
                    Verify Code
                </button>

            </form>


            <form
                method="POST"
                action="{{ route('two-factor.resend') }}"
                class="text-center mt-3"
            >
                @csrf

                <button
                    type="submit"
                    class="btn btn-link text-decoration-none"
                    style="
                        color: #00A86B;
                        font-size: 13px;
                    "
                >
                    Didn't receive the code?
                    Send again
                </button>
            </form>


            <div class="text-center mt-2">

                <a
                    href="{{ route('login') }}"
                    class="text-decoration-none text-muted"
                    style="font-size: 13px;"
                >
                    Cancel and return to Login
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
                    typeof showToast ===
                    "function"
                ) {
                    showToast(
                        @json($errors->first()),
                        "error"
                    );
                }
            @endif


            @if (session('status'))
                if (
                    typeof showToast ===
                    "function"
                ) {
                    showToast(
                        @json(session('status')),
                        "success"
                    );
                }
            @endif


            /*
             * Restrict the code input to digits.
             */
            const codeInput =
                document.getElementById(
                    "twoFactorCode"
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


            /*
             * Prevent accidental double submission.
             */
            const form =
                document.getElementById(
                    "twoFactorForm"
                );

            const button =
                document.getElementById(
                    "twoFactorSubmitBtn"
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


            /*
            * 2-minute client-side countdown.
            *
            * Server-side expiry remains the
            * actual security check.
            */
            const countdown =
                document.getElementById(
                    "twoFactorCountdown"
                );

            const expiresAt =
                @json(
                    $expiresAt?->timestamp
                        ? $expiresAt->timestamp * 1000
                        : null
                );

            let countdownTimer = null;

            if (
                countdown &&
                expiresAt
            ) {
                function updateCountdown() {

                    const remaining =
                        Math.max(
                            0,
                            expiresAt -
                                Date.now()
                        );

                    const totalSeconds =
                        Math.floor(
                            remaining / 1000
                        );

                    const minutes =
                        Math.floor(
                            totalSeconds / 60
                        );

                    const seconds =
                        totalSeconds % 60;

                    countdown.textContent =
                        String(minutes)
                            .padStart(2, "0") +
                        ":" +
                        String(seconds)
                            .padStart(2, "0");

                    if (
                        totalSeconds <= 0
                    ) {
                        if (countdownTimer) {
                            clearInterval(
                                countdownTimer
                            );
                        }

                        countdown.textContent =
                            "Expired";
                    }
                }

                updateCountdown();

                countdownTimer =
                    setInterval(
                        updateCountdown,
                        1000
                    );
            }

        }
    );
</script>

</body>
</html>