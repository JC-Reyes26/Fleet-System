<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Notifications\TwoFactorCodeNotification;
use App\Services\AuditLogService;
use App\Services\AuthenticationCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        private AuthenticationCodeService $codeService
    ) {
    }

    /**
     * Display the login view.
     */
    public function create(): View
    {
        return view('auth.login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(
        LoginRequest $request
    ): RedirectResponse {
        try {
            $user = $request->authenticate();
        } catch (ValidationException $e) {

            AuditLogService::log(
                module: 'Authentication',
                action: 'Failed Login',
                description:
                    'Failed login attempt for ' .
                    $request->input('email') .
                    '.',
                newValues: [
                    'email' =>
                        $request->input('email'),
                ]
            );

            throw $e;
        }

        /*
         * Clean up any previous pending 2FA state.
         */
        $request->session()->forget([
            'two_factor_user_id',
            'two_factor_remember',
        ]);

        /*
         * Check whether the user's 7-day 2FA
         * verification window is still valid.
         */
        if (
            $user->hasRecentTwoFactorVerification()
        ) {
            /*
             * 2FA is still valid.
             * Complete authentication now.
             */
            Auth::login(
                $user,
                $request->boolean('remember')
            );

            $request
                ->session()
                ->regenerate();

            $user->forceFill([
                'last_login_at' => now(),
            ])->save();

            AuditLogService::log(
                module: 'Authentication',
                action: 'Login',
                description:
                    'Logged in successfully.'
            );

            return redirect()->intended(
                route(
                    'dashboard',
                    absolute: false
                )
            );
        }

        /*
         * 2FA is required.
         *
         * User is still NOT authenticated.
         */
        $code = $this->codeService->issue(
            $user,
            AuthenticationCodeService::TYPE_TWO_FACTOR
        );

        $user->notify(
            new TwoFactorCodeNotification(
                $code
            )
        );

        /*
         * Regenerate the session before storing
         * pending authentication state.
         */
        $request
            ->session()
            ->regenerate();

        $request->session()->put([
            'two_factor_user_id' =>
                $user->id,

            'two_factor_remember' =>
                $request->boolean('remember'),
        ]);

        return redirect()
            ->route('two-factor');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(
        Request $request
    ): RedirectResponse {
        /*
         * Logout Audit
         */
        AuditLogService::log(
            module: 'Authentication',
            action: 'Logout',
            description:
                'Logged out successfully.'
        );

        Auth::guard('web')
            ->logout();

        $request
            ->session()
            ->invalidate();

        $request
            ->session()
            ->regenerateToken();

        return redirect('/');
    }
}