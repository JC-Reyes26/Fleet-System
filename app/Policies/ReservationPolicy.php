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
            $driverId = $user->driverProfile?->id;

            return $driverId !== null
                && (int) $reservation->driver_id === (int) $driverId;
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
                $reservation->department === $user->department;
        }

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    | Department Head only
    |--------------------------------------------------------------------------
    */
    public function create(User $user): bool
    {
        return $user->hasRole('department_head');
    }
    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    | Dispatcher:
    | - Can edit active reservations
    | - Cannot edit archived reservations
    |
    | Department Head:
    | - Own department only
    | - Can edit active reservations
    | - Cannot edit archived reservations
    |--------------------------------------------------------------------------
    */
    public function update(
        User $user,
        Reservation $reservation
    ): bool {

        if ($user->hasRole('dispatcher')) {
            return $reservation->archived_at === null;
        }

        if ($user->hasRole('department_head')) {
            return
                $reservation->archived_at === null &&
                !empty($user->department) &&
                $reservation->department === $user->department;
        }

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Archive
    |--------------------------------------------------------------------------
    | Fleet Manager only
    |--------------------------------------------------------------------------
    */
    public function archive(
        User $user,
        Reservation $reservation
    ): bool {
        return $user->hasRole('fleet_manager');
    }

    public function archiveAny(User $user): bool
    {
        return $user->hasRole('fleet_manager');
    }

    /*
    |--------------------------------------------------------------------------
    | Restore
    |--------------------------------------------------------------------------
    | Fleet Manager only
    |--------------------------------------------------------------------------
    */
    public function restore(
        User $user,
        Reservation $reservation
    ): bool {
        return $user->hasRole('fleet_manager');
    }

    /*
    |--------------------------------------------------------------------------
    | Approve
    |--------------------------------------------------------------------------
    | Dispatcher + Fleet Manager
    |--------------------------------------------------------------------------
    */
    public function approve(
        User $user,
        Reservation $reservation
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Reject
    |--------------------------------------------------------------------------
    | Dispatcher + Fleet Manager
    |--------------------------------------------------------------------------
    */
    public function reject(
        User $user,
        Reservation $reservation
    ): bool {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher'
        );
    }
}