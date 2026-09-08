<?php

namespace App\Http\Controllers;

use App\Models\FleetNotification;
use App\Services\FleetNotificationCheckService;
use App\Services\FleetNotificationService;
use Illuminate\Http\Request;

class FleetNotificationController extends Controller
{
    /**
     * Get notifications for the current user.
     */
    public function index(
        Request $request,
        FleetNotificationCheckService $checker
    ) {
        $user =
            $request->user();

        abort_unless(
            $user !== null,
            401
        );

        /*
        |--------------------------------------------------------------------------
        | Generate / check notification conditions
        |--------------------------------------------------------------------------
        */
        $checker->check();

        /*
        |--------------------------------------------------------------------------
        | Own notifications only
        |--------------------------------------------------------------------------
        */
        $notifications =
            FleetNotification::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->latest('id')
                ->limit(50)
                ->get()

                /*
                |--------------------------------------------------------------------------
                | RBAC filter
                |--------------------------------------------------------------------------
                |
                | Protects against stale notifications that were created before
                | RBAC notification filtering was added.
                |--------------------------------------------------------------------------
                */
                ->filter(
                    function ($notification) use ($user) {
                        /*
                        |--------------------------------------------------------------------------
                        | Module RBAC
                        |--------------------------------------------------------------------------
                        */
                        if (
                            !FleetNotificationService
                                ::userCanAccessLink(
                                    $user,
                                    $notification->link
                                )
                        ) {
                            return false;
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Driver - owned notifications only
                        |--------------------------------------------------------------------------
                        */
                        if (
                            $user->hasRole(
                                'driver'
                            )
                        ) {
                            return FleetNotificationService
                                ::driverOwnsNotification(
                                    $user,
                                    $notification
                                );
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Other Roles
                        |--------------------------------------------------------------------------
                        */
                        return true;
                    }
                )

                ->take(30)
                ->values();

        return response()->json([
            'notifications' =>
                $notifications
                    ->map(function ($notification) {
                        return [
                            'id' =>
                                $notification->id,

                            'user_id' =>
                                $notification->user_id,

                            'title' =>
                                $notification->title,

                            'message' =>
                                $notification->message,

                            'status' =>
                                $notification->status,

                            'event_key' =>
                                $notification->event_key,

                            'link' =>
                                $notification->link,

                            'created_at' =>
                                $notification->created_at
                                    ?->toIso8601String(),

                            'created_at_timestamp' =>
                                $notification->created_at
                                    ?->getTimestamp(),
                        ];
                    })
                    ->values(),

            'unread_count' =>
                $notifications
                    ->where(
                        'status',
                        'Unread'
                    )
                    ->count(),
        ]);
    }

    /**
     * Mark one notification as read.
     */
    public function markRead(
        Request $request,
        FleetNotification $notification
    ) {
        $user =
            $request->user();

        abort_unless(
            $user !== null,
            401
        );

        /*
        |--------------------------------------------------------------------------
        | Ownership Guard
        |--------------------------------------------------------------------------
        */
        abort_unless(
            (int)
            $notification->user_id ===
            (int)
            $user->id,
            403
        );

        /*
        |--------------------------------------------------------------------------
        | RBAC Guard
        |--------------------------------------------------------------------------
        */
        abort_unless(
            FleetNotificationService
                ::userCanAccessLink(
                    $user,
                    $notification->link
                ),
            403
        );

        if (
            $user->hasRole(
                'driver'
            )
        ) {
            abort_unless(
                FleetNotificationService
                    ::driverOwnsNotification(
                        $user,
                        $notification
                    ),
                403
            );
        }

        $notification->update([
            'status' =>
                'Read',
        ]);

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Notification marked as read.',
        ]);
    }

    /**
     * Mark all accessible notifications
     * for current user as read.
     */
    public function markAllRead(
        Request $request
    ) {
        $user =
            $request->user();

        abort_unless(
            $user !== null,
            401
        );

        /*
        |--------------------------------------------------------------------------
        | Fetch own unread notifications
        |--------------------------------------------------------------------------
        */
        $notifications =
            FleetNotification::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->where(
                    'status',
                    'Unread'
                )
                ->get();

        /*
        |--------------------------------------------------------------------------
        | Only update notifications that remain accessible
        |--------------------------------------------------------------------------
        */
        $accessibleIds =
            $notifications
                ->filter(
                    function ($notification) use ($user) {
                        if (
                            !FleetNotificationService
                                ::userCanAccessLink(
                                    $user,
                                    $notification->link
                                )
                        ) {
                            return false;
                        }

                        if (
                            $user->hasRole(
                                'driver'
                            )
                        ) {
                            return FleetNotificationService
                                ::driverOwnsNotification(
                                    $user,
                                    $notification
                                );
                        }

                        return true;
                    }
                )
                ->pluck('id');

        if (
            $accessibleIds->isNotEmpty()
        ) {
            FleetNotification::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->whereIn(
                    'id',
                    $accessibleIds
                )
                ->update([
                    'status' =>
                        'Read',
                ]);
        }

        return response()->json([
            'success' =>
                true,

            'message' =>
                'All notifications marked as read.',
        ]);
    }
}