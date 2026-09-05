<div
    id="changePasswordModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="changePasswordModalTitle"
    aria-hidden="true"
    data-has-errors="{{ $errors->updatePassword->any() ? 'true' : 'false' }}"
>
    <div class="custom-modal profile-password-modal">

        <div class="modal-header">
            <div>
                <h3 id="changePasswordModalTitle">
                    Change Password
                </h3>

                <p class="card-subtitle">
                    Use a strong and unique password to keep your account secure.
                </p>
            </div>

            <button
                type="button"
                class="modal-close"
                id="closeChangePasswordModal"
                aria-label="Close change password modal"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>

        <form
            method="POST"
            action="{{ route('profile.password.update') }}"
            id="updatePasswordForm"
            class="profile-password-form"
            novalidate
        >
            @csrf
            @method('put')

            <div class="modal-body">

                <div class="form-grid">

                    {{-- Current Password --}}
                    <div class="form-group full-width">
                        <label for="update_password_current_password">
                            Current Password *
                        </label>

                        <div class="password-input-wrapper">
                            <input
                                id="update_password_current_password"
                                name="current_password"
                                type="password"
                                autocomplete="current-password"
                                required
                                class="@if($errors->updatePassword->has('current_password')) is-invalid @endif"
                            >

                            <button
                                type="button"
                                class="password-toggle-btn"
                                data-password-toggle="update_password_current_password"
                                aria-label="Show current password"
                            >
                                <i class="ph ph-eye"></i>
                            </button>
                        </div>

                        <p
                            class="profile-field-error"
                            id="update_password_current_passwordError"
                            @if(!$errors->updatePassword->has('current_password'))
                                hidden
                            @endif
                        >
                            {{ $errors->updatePassword->first('current_password') }}
                        </p>
                    </div>

                    {{-- New Password --}}
                    <div class="form-group">
                        <label for="update_password_password">
                            New Password *
                        </label>

                        <div class="password-input-wrapper">
                            <input
                                id="update_password_password"
                                name="password"
                                type="password"
                                minlength="8"
                                autocomplete="new-password"
                                required
                                class="@if($errors->updatePassword->has('password')) is-invalid @endif"
                            >

                            <button
                                type="button"
                                class="password-toggle-btn"
                                data-password-toggle="update_password_password"
                                aria-label="Show new password"
                            >
                                <i class="ph ph-eye"></i>
                            </button>
                        </div>

                        <p
                            class="profile-field-error"
                            id="update_password_passwordError"
                            @if(!$errors->updatePassword->has('password'))
                                hidden
                            @endif
                        >
                            {{ $errors->updatePassword->first('password') }}
                        </p>
                    </div>

                    {{-- Confirm Password --}}
                    <div class="form-group">
                        <label for="update_password_password_confirmation">
                            Confirm New Password *
                        </label>

                        <div class="password-input-wrapper">
                            <input
                                id="update_password_password_confirmation"
                                name="password_confirmation"
                                type="password"
                                minlength="8"
                                autocomplete="new-password"
                                required
                                class="@if($errors->updatePassword->has('password_confirmation')) is-invalid @endif"
                            >

                            <button
                                type="button"
                                class="password-toggle-btn"
                                data-password-toggle="update_password_password_confirmation"
                                aria-label="Show password confirmation"
                            >
                                <i class="ph ph-eye"></i>
                            </button>
                        </div>

                        <p
                            class="profile-field-error"
                            id="update_password_password_confirmationError"
                            @if(!$errors->updatePassword->has('password_confirmation'))
                                hidden
                            @endif
                        >
                            {{ $errors->updatePassword->first('password_confirmation') }}
                        </p>
                    </div>

                </div>

            </div>

            <div class="modal-footer">
                <button
                    type="button"
                    class="btn-outline"
                    id="cancelChangePasswordModal"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="btn-primary"
                    id="updatePasswordSubmitBtn"
                >
                    <i
                        class="ph ph-lock-key"
                        aria-hidden="true"
                    ></i>

                    Change Password
                </button>
            </div>

        </form>

    </div>
</div>