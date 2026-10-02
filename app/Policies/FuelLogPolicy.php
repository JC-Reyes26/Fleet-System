<?php

namespace App\Policies;

use App\Models\FuelLog;
use App\Models\User;

class FuelLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canViewModule('fuel');
    }

    public function view(
        User $user,
        FuelLog $fuelLog
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | System-wide viewers
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole(
            'fleet_manager',
            'dispatcher',
            'finance',
            'maintenance',
            'it_admin'
        )) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - own fuel records only
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;

            return
                $driverId !== null &&
                (int) $fuelLog->driver_id ===
                    (int) $driverId;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(
            'maintenance',
            'driver'
        );
    }

    public function update(
        User $user,
        FuelLog $fuelLog
    ): bool {
        return $user->hasRole(
            'maintenance'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Fuel transactions are non-deletable
    |--------------------------------------------------------------------------
    */

    public function delete(
        User $user,
        FuelLog $fuelLog
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'maintenance'
        );
    }

    public function deleteAny(
        User $user
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'maintenance'
        );
    }
}