<?php

namespace App\Services;

use App\Models\FleetNotification;
use App\Models\FleetSetting;
use App\Models\User;
use App\Models\Driver;
use App\Models\Reservation;
use App\Models\Dispatch;

class FleetNotificationService
{
    /**
     * Check if a notification preference is enabled.
     */
    public static function enabled(
        string $key,
        bool $default = true
    ): bool {
        $record =
            FleetSetting::query()
                ->latest('id')
                ->first();

        $settings =
            $record?->settings ?? [];

        $notificationSettings =
            $settings['notifications'] ?? [];

        if (
            !array_key_exists(
                $key,
                $notificationSettings
            )
        ) {
            return $default;
        }

        return (bool)
            $notificationSettings[$key];
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve Module From Notification Link
    |--------------------------------------------------------------------------
    */
    public static function moduleFromLink(
        ?string $link
    ): ?string {
        if (!$link) {
            return null;
        }

        $path =
            parse_url(
                $link,
                PHP_URL_PATH
            );

        if (!$path) {
            return null;
        }

        $path =
            '/' .
            ltrim(
                $path,
                '/'
            );

        if (
            str_starts_with(
                $path,
                '/fleet'
            )
        ) {
            return 'vehicles';
        }

        if (
            str_starts_with(
                $path,
                '/reservation'
            )
        ) {
            return 'reservations';
        }

        if (
            str_starts_with(
                $path,
                '/dispatch'
            )
        ) {
            return 'dispatch';
        }

        if (
            str_starts_with(
                $path,
                '/driver'
            )
        ) {
            return 'drivers';
        }

        if (
            str_starts_with(
                $path,
                '/maintenance'
            )
        ) {
            return 'maintenance';
        }

        if (
            str_starts_with(
                $path,
                '/fuel'
            )
        ) {
            return 'fuel';
        }

        if (
            str_starts_with(
                $path,
                '/route-planning'
            )
        ) {
            return 'route_planning';
        }

        if (
            str_starts_with(
                $path,
                '/cost-analysis'
            )
        ) {
            return 'cost_analysis';
        }

        if (
            str_starts_with(
                $path,
                '/reports'
            )
        ) {
            return 'reports';
        }

        if (
            str_starts_with(
                $path,
                '/settings'
            )
        ) {
            return 'settings';
        }

        if (
            str_starts_with(
                $path,
                '/dashboard'
            )
        ) {
            return 'dashboard';
        }

        if (
            str_starts_with(
                $path,
                '/profile'
            )
        ) {
            return 'profile';
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Check Notification Module Access
    |--------------------------------------------------------------------------
    */
    public static function userCanAccessLink(
        User $user,
        ?string $link
    ): bool {
        /*
         * Notifications without links are informational
         * and may still be shown.
         */
        if (!$link) {
            return true;
        }

        $module =
            self::moduleFromLink(
                $link
            );

        /*
         * Unknown internal destination:
         * do not trust it automatically.
         */
        if (!$module) {
            return false;
        }

        return $user
            ->canViewModule(
                $module
            );
    }

    public static function driverOwnsNotification(
        User $user,
        FleetNotification $notification
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | Non-driver
        |--------------------------------------------------------------------------
        */
        if (
            !$user->hasRole(
                'driver'
            )
        ) {
            return true;
        }

        $driver =
            $user->driverProfile;

        if (!$driver) {
            return false;
        }

        $eventKey =
            trim(
                (string) (
                    $notification->event_key
                    ?? ''
                )
            );

        /*
        |--------------------------------------------------------------------------
        | Driver License Notification
        |--------------------------------------------------------------------------
        |
        | Example:
        | driver_license_expiring:12:2026-09-15
        |--------------------------------------------------------------------------
        */
        if (
            str_starts_with(
                $eventKey,
                'driver_license_expiring:'
            )
        ) {
            $parts =
                explode(
                    ':',
                    $eventKey
                );

            $notificationDriverId =
                isset($parts[1])
                    ? (int) $parts[1]
                    : 0;

            return (
                $notificationDriverId ===
                (int) $driver->id
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Reservation Notification
        |--------------------------------------------------------------------------
        |
        | Supported event key:
        | reservation:{reservation_id}:...
        |--------------------------------------------------------------------------
        */
        if (
            str_starts_with(
                $eventKey,
                'reservation:'
            )
        ) {
            $parts =
                explode(
                    ':',
                    $eventKey
                );

            $reservationId =
                isset($parts[1])
                    ? (int) $parts[1]
                    : 0;

            if (!$reservationId) {
                return false;
            }

            return Reservation::query()
                ->where(
                    'id',
                    $reservationId
                )
                ->where(
                    'driver_id',
                    $driver->id
                )
                ->exists();
        }

        /*
        |--------------------------------------------------------------------------
        | Dispatch Notification
        |--------------------------------------------------------------------------
        |
        | Supported event key:
        | dispatch:{dispatch_id}:...
        |--------------------------------------------------------------------------
        */
        if (
            str_starts_with(
                $eventKey,
                'dispatch:'
            )
        ) {
            $parts =
                explode(
                    ':',
                    $eventKey
                );

            $dispatchId =
                isset($parts[1])
                    ? (int) $parts[1]
                    : 0;

            if (!$dispatchId) {
                return false;
            }

            return Dispatch::query()
                ->where(
                    'id',
                    $dispatchId
                )
                ->whereHas(
                    'reservation',
                    function ($query) use ($driver) {
                        $query->where(
                            'driver_id',
                            $driver->id
                        );
                    }
                )
                ->exists();
        }

        /*
        |--------------------------------------------------------------------------
        | Unknown / generic notification
        |--------------------------------------------------------------------------
        |
        | Driver should not receive fleet-wide generic notifications.
        |--------------------------------------------------------------------------
        */
        return false;
    }

    /**
     * Create notification for current user.
     */
    public static function create(
        string $title,
        string $message,
        ?string $link = null
    ): ?FleetNotification {
        $user = auth()->user();

        if (!$user) {
            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | RBAC Guard
        |--------------------------------------------------------------------------
        */
        if (
            !self::userCanAccessLink(
                $user,
                $link
            )
        ) {
            return null;
        }

        return FleetNotification::create([
            'user_id' =>
                $user->id,

            'title' =>
                $title,

            'message' =>
                $message,

            'status' =>
                'Unread',

            'link' =>
                $link,
        ]);
    }

    /**
     * Create notification if setting is enabled.
     */
    public static function createWhenEnabled(
        string $settingKey,
        string $title,
        string $message,
        bool $default = true,
        ?string $link = null
    ): ?FleetNotification {
        if (
            !self::enabled(
                $settingKey,
                $default
            )
        ) {
            return null;
        }

        return self::create(
            title: $title,
            message: $message,
            link: $link,
        );
    }

    /**
     * Create notification for multiple role recipients
     * if the notification setting is enabled.
     */
    public static function createForRolesWhenEnabled(
        string $settingKey,
        array $roles,
        string $title,
        string $message,
        bool $default = true,
        ?string $link = null,
        ?int $excludeUserId = null
    ): array {
        if (
            !self::enabled(
                $settingKey,
                $default
            )
        ) {
            return [];
        }

        $users = User::query()
            ->whereIn(
                'role',
                $roles
            )
            ->when(
                $excludeUserId,
                function ($query) use ($excludeUserId) {
                    $query->where(
                        'id',
                        '!=',
                        $excludeUserId
                    );
                }
            )
            ->get();

        $created = [];

        foreach ($users as $user) {

            /*
            |--------------------------------------------------------------------------
            | Respect module-level RBAC
            |--------------------------------------------------------------------------
            */
            if (
                !self::userCanAccessLink(
                    $user,
                    $link
                )
            ) {
                continue;
            }

            $created[] = FleetNotification::create([
                'user_id' =>
                    $user->id,

                'title' =>
                    $title,

                'message' =>
                    $message,

                'status' =>
                    'Unread',

                'link' =>
                    $link,
            ]);
        }

        return $created;
    }

    /**
     * Create unique notification if setting is enabled.
     */
    public static function createUniqueWhenEnabled(
        string $settingKey,
        string $title,
        string $message,
        string $eventKey,
        bool $default = true,
        ?string $link = null
    ): ?FleetNotification {
        if (
            !self::enabled(
                $settingKey,
                $default
            )
        ) {
            return null;
        }

        $user =
            auth()->user();

        if (!$user) {
            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | RBAC Guard
        |--------------------------------------------------------------------------
        */
        if (
            !self::userCanAccessLink(
                $user,
                $link
            )
        ) {
            return null;
        }

        $existing =
            FleetNotification::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->where(
                    'event_key',
                    $eventKey
                )
                ->first();

        /*
        |--------------------------------------------------------------------------
        | Existing Notification
        |--------------------------------------------------------------------------
        */
        if ($existing) {
            $updates = [];

            if (
                $existing->title !==
                $title
            ) {
                $updates['title'] =
                    $title;
            }

            if (
                $existing->message !==
                $message
            ) {
                $updates['message'] =
                    $message;
            }

            if (
                $link &&
                $existing->link !==
                    $link
            ) {
                $updates['link'] =
                    $link;
            }

            if (!empty($updates)) {
                $existing
                    ->update(
                        $updates
                    );

                $existing
                    ->refresh();
            }

            return $existing;
        }

        return FleetNotification::create([
            'user_id' =>
                $user->id,

            'title' =>
                $title,

            'message' =>
                $message,

            'status' =>
                'Unread',

            'event_key' =>
                $eventKey,

            'link' =>
                $link,
        ]);
    }
}