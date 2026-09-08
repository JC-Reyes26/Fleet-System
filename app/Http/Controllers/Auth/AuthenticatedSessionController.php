<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthenticatedSessionController extends Controller
{
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
            /*
            |--------------------------------------------------------------------------
            | Authenticate
            |--------------------------------------------------------------------------
            */
            $request->authenticate();

        } catch (ValidationException $e) {

            /*
            |--------------------------------------------------------------------------
            | Failed Login Audit
            |--------------------------------------------------------------------------
            |
            | Never log the submitted password.
            |--------------------------------------------------------------------------
            */
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
        |--------------------------------------------------------------------------
        | Regenerate Session
        |--------------------------------------------------------------------------
        */
        $request
            ->session()
            ->regenerate();

        /*
        |--------------------------------------------------------------------------
        | Successful Login Audit
        |--------------------------------------------------------------------------
        |
        | At this point auth()->user() is available, so AuditLogService
        | automatically records the authenticated user.
        |--------------------------------------------------------------------------
        */
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

    /**
     * Destroy an authenticated session.
     */
    public function destroy(
        Request $request
    ): RedirectResponse {
        /*
        |--------------------------------------------------------------------------
        | Logout Audit
        |--------------------------------------------------------------------------
        |
        | Must be logged BEFORE Auth::logout(), otherwise the authenticated
        | actor would no longer be available to AuditLogService.
        |--------------------------------------------------------------------------
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