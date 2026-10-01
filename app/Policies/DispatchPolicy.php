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
            $driverId = $user->driverProfile?->id;

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
        /*
        |--------------------------------------------------------------------------
        | Dispatcher only
        |--------------------------------------------------------------------------
        */
        return $user->hasRole('dispatcher');
    }

    public function update(
        User $user,
        Dispatch $dispatch
    ): bool {
        /*
        |--------------------------------------------------------------------------
        | Dispatcher - full edit/update access
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('dispatcher')) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - assigned dispatch only
        |--------------------------------------------------------------------------
        | Needed for driver lifecycle actions such as:
        | Pending -> Assigned
        | Assigned -> En Route
        | En Route -> Arrived
        | Arrived -> Completed
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driverId = $user->driverProfile?->id;

            return
                $driverId !== null &&
                (int) $dispatch->reservation?->driver_id ===
                    (int) $driverId;
        }

        /*
        |--------------------------------------------------------------------------
        | Fleet Manager - NO update access
        |--------------------------------------------------------------------------
        */
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

    public function accept(
        User $user,
        Dispatch $dispatch
    ): bool {
        if (!$user->hasRole('driver')) {
            return false;
        }

        if ($dispatch->archived_at) {
            return false;
        }

        $driverId = $user->driverProfile?->id;

        return
            $driverId !== null &&
            (int) $dispatch->reservation?->driver_id ===
                (int) $driverId;
    }

    public function requestReassignment(
        User $user,
        Dispatch $dispatch
    ): bool {
        if (!$user->hasRole('driver')) {
            return false;
        }

        if ($dispatch->archived_at) {
            return false;
        }

        $driverId = $user->driverProfile?->id;

        return
            $driverId !== null &&
            (int) $dispatch->reservation?->driver_id ===
                (int) $driverId;
    }

    public function reviewReassignment(
        User $user,
        Dispatch $dispatch
    ): bool {
        return $user->hasRole(
            'dispatcher',
        );
    }

    public function approveReassignment(
        User $user,
        Dispatch $dispatch
    ): bool {
        return $user->hasRole(
            'dispatcher',
        );
    }

    public function rejectReassignment(
        User $user,
        Dispatch $dispatch
    ): bool {
        return $user->hasRole(
            'dispatcher',
        );
    }

    public function reviewReassignmentList(User $user): bool
    {
        return $user->hasRole('dispatcher');
    }

}