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
     *
     * Password authentication succeeds first,
     * but the user is NOT fully authenticated
     * until the 2FA code is verified.
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
            'last_user_activity',
        ]);

        /*
         * 2FA is REQUIRED for EVERY successful login.
         *
         * There is intentionally NO 7-day bypass here.
         */
        $code = $this->codeService->issue(
            $user,
            AuthenticationCodeService::TYPE_TWO_FACTOR
        );

        /*
         * Send the new 6-digit code to the
         * user's registered email address.
         */
        $user->notify(
            new TwoFactorCodeNotification(
                $code
            )
        );

        /*
         * Regenerate the session before storing
         * the pending authentication state.
         */
        $request
            ->session()
            ->regenerate();

        /*
         * Store only the pending 2FA information.
         *
         * The user is NOT authenticated yet.
         */
        $request->session()->put([
            'two_factor_user_id' =>
                $user->id,

            'two_factor_remember' =>
                $request->boolean('remember'),
        ]);

        /*
         * Redirect to the 2FA verification page.
         */
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