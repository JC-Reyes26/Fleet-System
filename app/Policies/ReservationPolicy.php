<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;

class ReservationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canViewModule('reservations');
    }

    public function view(
        User $user,
        Reservation $reservation
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | Full / View-only system-wide roles
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole(
            'fleet_manager',
            'dispatcher',
            'finance',
            'it_admin'
        )) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - assigned reservations only
        |--------------------------------------------------------------------------
        */

        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;

            return $driverId !== null
                && (int) $reservation->driver_id ===
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
                !empty($reservation->department) &&
                $reservation->department ===
                    $user->department;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher',
            'department_head'
        );
    }

    public function update(
        User $user,
        Reservation $reservation
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | Full roles
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
        | Department Head
        |--------------------------------------------------------------------------
        |
        | Can update department-owned requests only while still Pending.
        |
        */

        if ($user->hasRole('department_head')) {
            return
                !empty($user->department) &&
                $reservation->department ===
                    $user->department &&
                $reservation->status === 'Pending';
        }

        return false;
    }

    public function archive(
        User $user,
        Reservation $reservation
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
        Reservation $reservation
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }

    public function approve(
        User $user,
        Reservation $reservation
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }
}