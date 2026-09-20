<?php

namespace App\Policies;

use App\Models\Driver;
use App\Models\User;

class DriverPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canViewModule('drivers');
    }

    public function view(
        User $user,
        Driver $driver
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | System-wide viewers
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole(
            'fleet_manager',
            'dispatcher',
            'maintenance',
            'it_admin'
        )) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - own Driver profile only
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole('driver')) {
            return
                $driver->user_id !== null &&
                (int) $driver->user_id ===
                    (int) $user->id;
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
        Driver $driver
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }

    public function archive(
        User $user,
        Driver $driver
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
        Driver $driver
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }
}