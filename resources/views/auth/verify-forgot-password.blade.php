<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Verify Code - HIMS Fleet
    </title>

    <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    >

    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >
</head>

<body
    style="
        font-family: 'Poppins', sans-serif;
        background: #f3f6f5;
    "
>

<div class="container">
    <div
        class="row justify-content-center align-items-center"
        style="min-height: 100vh;"
    >
        <div class="col-12 col-sm-10 col-md-7 col-lg-5">

            <div
                class="card border-0 shadow-sm"
                style="border-radius: 16px;"
            >

                <div
                    class="card-body p-4 p-md-5"
                >

                    <div class="text-center mb-4">

                        <img
                            src="{{ asset('assets/images/brand/favicon.png') }}"
                            alt="HIMS Fleet"
                            width="56"
                            height="56"
                            class="mb-3"
                        >

                        <h4
                            class="fw-bold mb-2"
                            style="color: #1f2937;"
                        >
                            Verify Your Code
                        </h4>

                        <p
                            class="text-muted mb-0"
                            style="font-size: 14px;"
                        >
                            Enter the 6-digit code sent to
                            your registered email address.
                        </p>

                    </div>

                    @if (session('status'))
                        <div
                            class="alert alert-success"
                            style="font-size: 13px;"
                        >
                            {{ session('status') }}
                        </div>
                    @endif

                    @if ($errors->any())
                        <div
                            class="alert alert-danger"
                            style="font-size: 13px;"
                        >
                            {{ $errors->first() }}
                        </div>
                    @endif

                    <form
                        method="POST"
                        action="{{ route('password.verify.submit') }}"
                    >
                        @csrf

                        <div class="mb-3">

                            <label
                                for="code"
                                class="form-label fw-semibold"
                                style="font-size: 14px;"
                            >
                                Verification Code
                            </label>

                            <input
                                type="text"
                                id="code"
                                name="code"
                                class="form-control text-center @error('code') is-invalid @enderror"
                                placeholder="000000"
                                maxlength="6"
                                inputmode="numeric"
                                autocomplete="one-time-code"
                                required
                                autofocus
                                style="
                                    font-size: 24px;
                                    letter-spacing: 8px;
                                    font-weight: 600;
                                "
                            >

                            @error('code')
                                <div class="invalid-feedback">
                                    {{ $message }}
                                </div>
                            @enderror

                        </div>

                        <button
                            type="submit"
                            class="btn w-100 text-white fw-semibold"
                            style="
                                background: #00A86B;
                                border-radius: 8px;
                                padding: 11px;
                            "
                        >
                            Verify Code
                        </button>

                    </form>

                    <form
                        method="POST"
                        action="{{ route('password.resend') }}"
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
                            href="{{ route('password.request') }}"
                            class="text-decoration-none text-muted"
                            style="font-size: 13px;"
                        >
                            Use a different email
                        </a>

                    </div>

                </div>
            </div>

        </div>
    </div>
</div>

<script>
    document
        .getElementById('code')
        .addEventListener('input', function () {
            this.value =
                this.value
                    .replace(/\D/g, '')
                    .slice(0, 6);
        });
</script>

</body>
</html>