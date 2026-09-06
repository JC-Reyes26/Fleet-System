<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sign In | HIMS Fleet</title>
    <link rel="icon" href="{{ asset('assets/images/brand/favicon.svg') }}">
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <script src="{{ asset('assets/js/core/theme-boot.js') }}"></script>
    <!--<script src="{{ asset('assets/js/core/auth-boot.js') }}"></script>-->
    <link rel="stylesheet" href="{{ asset('assets/css/style.css') }}">
  </head>

  <body data-page="login" class="login-body">
    <main class="login-page">
      <div class="login-shell">
        <div class="login-brand">
          <div class="login-brand-mark" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
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
            <p>Tala Hospital · Fleet &amp; Transportation Management</p>
          </div>
        </div>

        <section class="login-card card" aria-labelledby="loginHeading">
          <h2 id="loginHeading">Sign in</h2>
          <p class="login-lead">
              Sign in with your HIMS Fleet account to continue.
          </p>

          <p class="login-field-error" id="loginFormError" hidden role="alert"></p>

          <form
              class="login-form"
              id="loginForm"
              method="POST"
              action="{{ route('login') }}"
              novalidate
          >
            @csrf
            <div class="form-group">
                <label for="loginEmail">
                    Email
                </label>

                <input
                    type="email"
                    id="loginEmail"
                    name="email"
                    value="{{ old('email') }}"
                    autocomplete="username"
                    required
                    autofocus
                    maxlength="120"
                    placeholder="Enter email"
                    @class([
                        'is-invalid' => $errors->has('email'),
                    ])
                />

                <p
                    class="login-field-error"
                    id="loginEmailError"
                    @if (!$errors->has('email')) hidden @endif
                >
                    @error('email')
                        {{ $message }}
                    @enderror
                </p>
            </div>

            <div class="form-group">
                <label for="loginPassword">
                    Password
                </label>

                <div class="login-password-wrapper">
                    <input
                        type="password"
                        id="loginPassword"
                        name="password"
                        autocomplete="current-password"
                        required
                        maxlength="120"
                        placeholder="Enter password"
                        @class([
                            'is-invalid' => $errors->has('password'),
                        ])
                    />

                    <button
                        type="button"
                        class="login-password-toggle"
                        id="loginPasswordToggle"
                        aria-label="Show password"
                        aria-controls="loginPassword"
                    >
                        <i
                            class="ph ph-eye-slash"
                            aria-hidden="true"
                        ></i>
                    </button>
                </div>

                <p
                    class="login-field-error"
                    id="loginPasswordError"
                    @if (!$errors->has('password')) hidden @endif
                >
                    @error('password')
                        {{ $message }}
                    @enderror
                </p>
            </div>

            <div class="login-row">
              <label class="login-remember">
                <input type="checkbox" id="loginRemember" name="remember" />
                Remember me
              </label>
              @if (Route::has('password.request'))
              <a href="{{ route('password.request') }}" class="login-forgot">
                  Forgot password?
              </a>
              @endif
            </div>

            <button type="submit" class="btn-primary login-submit" id="loginSubmitBtn">
              Sign In
            </button>
          </form>
        </section>

        <footer class="login-footer">
            <p>Hospital Operations Suite · Fleet &amp; Transportation Management</p>
        </footer>
      </div>
    </main>

    <div id="toast"></div>

    <!--<script src="/assets/js/auth/login.js"></script>-->
    <script src="{{ asset('assets/js/core/toast.js') }}"></script>
    <script src="{{ asset('assets/js/core/main.js') }}"></script>
    <script src="{{ asset('assets/js/auth/login.js') }}"></script>

    <script>
        document.addEventListener("DOMContentLoaded", function () {
            if (typeof applyEarlyTheme === "function") {
                applyEarlyTheme();
            }

            if (typeof initToast === "function") {
                initToast();
            }

            const host = document.getElementById("toast");

            if (
                host &&
                !document.getElementById("toastContainer")
            ) {
                const box = document.createElement("div");

                box.id = "toastContainer";
                box.className = "toast-container";

                host.appendChild(box);
            }

            @if ($errors->any())
                if (typeof showToast === "function") {
                    showToast(
                        @json($errors->first()),
                        "error"
                    );
                }
            @endif
        });
    </script>
  </body>
</html>
