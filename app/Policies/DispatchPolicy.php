<?php

namespace App\Policies;

use App\Models\Dispatch;
use App\Models\User;

class DispatchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canViewModule('dispatch');
    }

    public function view(
        User $user,
        Dispatch $dispatch
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | System-wide roles
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole(
            'fleet_manager',
            'dispatcher',
            'it_admin'
        )) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - assigned dispatch only
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;

            return
                $driverId !== null &&
                (int) $dispatch->reservation?->driver_id ===
                    (int) $driverId;
        }

        /*
        |--------------------------------------------------------------------------
        | Department Head - own department only
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole('department_head')) {
            return
                !empty($user->department) &&
                $dispatch->reservation?->department ===
                    $user->department;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }

    public function update(
        User $user,
        Dispatch $dispatch
    ): bool {

        /*
        |--------------------------------------------------------------------------
        | Fleet Manager / Dispatcher
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole(
            'fleet_manager',
            'dispatcher'
        )) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - assigned dispatch only
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;

            return
                $driverId !== null &&
                (int) $dispatch->reservation?->driver_id ===
                    (int) $driverId;
        }

        return false;
    }

    public function archive(
        User $user,
        Dispatch $dispatch
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }

    public function archiveAny(User $user): bool
    {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }

    public function restore(
        User $user,
        Dispatch $dispatch
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }
}