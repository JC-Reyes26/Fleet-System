<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ForgotPasswordCodeNotification;
use App\Services\AuthenticationCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class ForgotPasswordController extends Controller
{
    public function __construct(
        private AuthenticationCodeService $codeService
    ) {
    }

    public function create(): View
    {
        return view('auth.forgot-password');
    }

    public function sendCode(
        Request $request
    ): RedirectResponse {
        $validated = $request->validate([
            'email' => [
                'required',
                'string',
                'email',
            ],
        ]);

        $email = strtolower(
            trim($validated['email'])
        );

        $user = User::query()
            ->whereRaw(
                'LOWER(email) = ?',
                [$email]
            )
            ->first();

        /*
         * Do not reveal whether the email
         * exists in the system.
         */
        if ($user) {
            $code = $this->codeService->issue(
                $user,
                AuthenticationCodeService::TYPE_FORGOT_PASSWORD
            );

            $user->notify(
                new ForgotPasswordCodeNotification(
                    $code
                )
            );
        }

        session([
            'password_recovery_email' => $email,
        ]);

        return redirect()
            ->route('password.verify')
            ->with(
                'status',
                'If an account is associated with that email address, a verification code has been sent.'
            );
    }

    public function showVerify(): View|RedirectResponse
    {
        if (!session()->has(
            'password_recovery_email'
        )) {
            return redirect()
                ->route('password.request');
        }

        return view(
            'auth.verify-forgot-password'
        );
    }

    public function verify(
        Request $request
    ): RedirectResponse {
        $validated = $request->validate([
            'code' => [
                'required',
                'digits:6',
            ],
        ]);

        $email = session(
            'password_recovery_email'
        );

        if (!$email) {
            return redirect()
                ->route('password.request')
                ->withErrors([
                    'email' =>
                        'Your recovery session has expired. Please request a new code.',
                ]);
        }

        $user = User::query()
            ->whereRaw(
                'LOWER(email) = ?',
                [$email]
            )
            ->first();

        if (
            !$user ||
            !$this->codeService->verify(
                $user,
                AuthenticationCodeService::TYPE_FORGOT_PASSWORD,
                $validated['code']
            )
        ) {
            return back()
                ->withErrors([
                    'code' =>
                        'The verification code is invalid or has expired.',
                ]);
        }

        session([
            'password_recovery_user_id' =>
                $user->id,

            'password_recovery_verified_at' =>
                now()->timestamp,
        ]);

        return redirect()
            ->route('password.recovery');
    }

    public function resendCode(
        Request $request
    ): RedirectResponse {
        $email = session(
            'password_recovery_email'
        );

        if (!$email) {
            return redirect()
                ->route('password.request')
                ->withErrors([
                    'email' =>
                        'Your recovery session has expired. Please request a new recovery code.',
                ]);
        }

        $user = User::query()
            ->whereRaw(
                'LOWER(email) = ?',
                [$email]
            )
            ->first();

        if ($user) {
            $code = $this->codeService->issue(
                $user,
                AuthenticationCodeService::TYPE_FORGOT_PASSWORD
            );

            $user->notify(
                new ForgotPasswordCodeNotification(
                    $code
                )
            );
        }

        return back()->with(
            'status',
            'A new verification code has been sent if the account exists.'
        );
    }

    public function showRecoveryPassword():
        View|RedirectResponse
    {
        if (!$this->hasValidRecoverySession()) {
            return redirect()
                ->route('password.request')
                ->withErrors([
                    'email' =>
                        'Your password recovery session has expired. Please start again.',
                ]);
        }

        return view(
            'auth.recovery-password'
        );
    }

    public function updateRecoveryPassword(
        Request $request
    ): RedirectResponse {
        if (!$this->hasValidRecoverySession()) {
            return redirect()
                ->route('password.request')
                ->withErrors([
                    'email' =>
                        'Your password recovery session has expired. Please start again.',
                ]);
        }

        $validated = $request->validate([
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $user = User::query()->find(
            session('password_recovery_user_id')
        );

        if (!$user) {
            session()->forget([
                'password_recovery_email',
                'password_recovery_user_id',
                'password_recovery_verified_at',
            ]);

            return redirect()
                ->route('password.request')
                ->withErrors([
                    'email' =>
                        'Unable to complete password recovery. Please try again.',
                ]);
        }

        $user->update([
            'password' =>
                Hash::make(
                    $validated['password']
                ),

            /*
             * Require 2FA again after password
             * recovery.
             */
            'two_factor_verified_at' => null,
        ]);

        session()->forget([
            'password_recovery_email',
            'password_recovery_user_id',
            'password_recovery_verified_at',
        ]);

        return redirect()
            ->route('login')
            ->with(
                'status',
                'Your password has been updated successfully. You can now log in with your new password.'
            );
    }

    private function hasValidRecoverySession(): bool
    {
        $userId = session(
            'password_recovery_user_id'
        );

        $verifiedAt = session(
            'password_recovery_verified_at'
        );

        if (!$userId || !$verifiedAt) {
            return false;
        }

        /*
         * Keep the recovery authorization short-lived.
         */
        return now()->timestamp
            <= ((int) $verifiedAt + 15 * 60);
    }
}