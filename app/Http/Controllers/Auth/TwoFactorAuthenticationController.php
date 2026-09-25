<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\TwoFactorCodeNotification;
use App\Services\AuditLogService;
use App\Services\AuthenticationCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class TwoFactorAuthenticationController extends Controller
{
    public function __construct(
        private AuthenticationCodeService $codeService
    ) {
    }

    /**
     * Display the 2FA verification page.
     */
    public function create(
        Request $request
    ): View|RedirectResponse {
        $user = $this->pendingUser();

        if (!$user) {
            return redirect()
                ->route('login');
        }

        $expiresAt =
            $this->codeService->activeExpiry(
                $user,
                AuthenticationCodeService::TYPE_TWO_FACTOR
            );

        $resendStatus =
            $this->codeService->resendStatus(
                AuthenticationCodeService::TYPE_TWO_FACTOR
            );

        return view(
            'auth.two-factor',
            [
                'user' => $user,
                'expiresAt' => $expiresAt,
                'resendCooldown' =>
                    $resendStatus['cooldown'],
            ]
        );
    }

    /**
     * Verify the submitted 2FA code.
     */
    public function verify(
        Request $request
    ): RedirectResponse {
        $validated = $request->validate([
            'code' => [
                'required',
                'digits:6',
            ],
        ]);

        $user = $this->pendingUser();

        if (!$user) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'email' =>
                        'Your two-factor authentication session has expired. Please log in again.',
                ]);
        }

        $valid = $this->codeService->verify(
            $user,
            AuthenticationCodeService::TYPE_TWO_FACTOR,
            $validated['code']
        );

        if (!$valid) {
            return back()
                ->withErrors([
                    'code' =>
                        'The verification code is invalid or has expired.',
                ]);
        }

        /*
         * 2FA successfully verified.
         * Start the 7-day verification window.
         */
        $user->forceFill([
            'two_factor_verified_at' => now(),
        ])->save();

        /*
         * Complete authentication only after
         * successful 2FA verification.
         */
        Auth::login(
            $user,
            session('two_factor_remember', false)
        );

        $request
            ->session()
            ->regenerate();

        /*
         * Remove pending 2FA state.
         */
        $request->session()->forget([
            'two_factor_user_id',
            'two_factor_remember',
        ]);

        /*
         * Update last login only after the
         * complete authentication flow succeeds.
         */
        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        AuditLogService::log(
            module: 'Authentication',
            action: 'Login',
            description:
                'Logged in successfully after two-factor authentication.'
        );

        return redirect()->intended(
            route(
                'dashboard',
                absolute: false
            )
        );
    }

    /**
     * Send a new 2FA code.
     */
    public function resend(
        Request $request
    ): RedirectResponse {
        $user = $this->pendingUser();

        if (!$user) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'email' =>
                        'Your two-factor authentication session has expired. Please log in again.',
                ]);
        }

        $resendStatus =
            $this->codeService->consumeResendAttempt(
                AuthenticationCodeService::TYPE_TWO_FACTOR
            );

        if (!$resendStatus['allowed']) {
            return back()
                ->withErrors([
                    'code' =>
                        'Please wait ' .
                        $resendStatus['cooldown'] .
                        ' seconds before requesting another code.',
                ]);
        }

        $code = $this->codeService->issue(
            $user,
            AuthenticationCodeService::TYPE_TWO_FACTOR
        );

        $user->notify(
            new TwoFactorCodeNotification(
                $code
            )
        );

        return back()->with(
            'status',
            'A new two-factor authentication code has been sent to your email address.'
        );
    }

    /**
     * Get the user currently waiting for 2FA.
     */
    private function pendingUser(): ?User
    {
        $userId = session(
            'two_factor_user_id'
        );

        if (!$userId) {
            return null;
        }

        return User::query()->find(
            $userId
        );
    }
}