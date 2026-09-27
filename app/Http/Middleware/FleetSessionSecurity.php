<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class FleetSessionSecurity
{
    private const IDLE_TIMEOUT = 300; // 5 minutes

    public function handle(
        Request $request,
        Closure $next
    ): Response {
        /*
        |--------------------------------------------------------------------------
        | Only enforce this for authenticated users
        |--------------------------------------------------------------------------
        */
        if (!Auth::check()) {
            return $next($request);
        }

        /*
        |--------------------------------------------------------------------------
        | Activity endpoint is responsible for updating the timestamp.
        | Do not block it based on the previous timestamp.
        |--------------------------------------------------------------------------
        */
        if ($request->routeIs('session.activity')) {
            return $next($request);
        }

        $lastActivity = $request->session()->get(
            'last_user_activity'
        );

        /*
        |--------------------------------------------------------------------------
        | Initialize activity timestamp for existing sessions.
        |--------------------------------------------------------------------------
        */
        if (!$lastActivity) {
            $request->session()->put(
                'last_user_activity',
                now()->timestamp
            );

            return $next($request);
        }

        $idleSeconds =
            now()->timestamp -
            (int) $lastActivity;

        /*
        |--------------------------------------------------------------------------
        | Automatic logout after 5 minutes of inactivity.
        |--------------------------------------------------------------------------
        */
        if ($idleSeconds >= self::IDLE_TIMEOUT) {
            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if (
                $request->expectsJson() ||
                $request->ajax()
            ) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Your session expired due to inactivity.',
                    'code' =>
                        'SESSION_IDLE_TIMEOUT',
                ], 401);
            }

            return redirect()
                ->route('login')
                ->with(
                    'session_timeout',
                    'Your session expired after 5 minutes of inactivity.'
                );
        }

        return $next($request);
    }
}