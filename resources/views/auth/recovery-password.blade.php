<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Create New Password - HIMS Fleet
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
                            Create New Password
                        </h4>

                        <p
                            class="text-muted mb-0"
                            style="font-size: 14px;"
                        >
                            Your verification was successful.
                            Create a new password for your account.
                        </p>

                    </div>

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
                        action="{{ route('password.recovery.update') }}"
                    >
                        @csrf
                        @method('PUT')

                        <div class="mb-3">

                            <label
                                for="password"
                                class="form-label fw-semibold"
                                style="font-size: 14px;"
                            >
                                New Password
                            </label>

                            <input
                                type="password"
                                id="password"
                                name="password"
                                class="form-control @error('password') is-invalid @enderror"
                                placeholder="Enter your new password"
                                required
                                autocomplete="new-password"
                            >

                            @error('password')
                                <div class="invalid-feedback">
                                    {{ $message }}
                                </div>
                            @enderror

                        </div>

                        <div class="mb-4">

                            <label
                                for="password_confirmation"
                                class="form-label fw-semibold"
                                style="font-size: 14px;"
                            >
                                Confirm New Password
                            </label>

                            <input
                                type="password"
                                id="password_confirmation"
                                name="password_confirmation"
                                class="form-control"
                                placeholder="Confirm your new password"
                                required
                                autocomplete="new-password"
                            >

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
                            Update Password
                        </button>

                    </form>

                </div>
            </div>

        </div>
    </div>
</div>

</body>
</html>