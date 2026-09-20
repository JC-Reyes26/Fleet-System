<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vehicle;

class VehiclePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canViewModule('vehicles');
    }

    public function view(User $user, Vehicle $vehicle): bool
    {
        return $user->canViewModule('vehicles');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('fleet_manager');
    }

    public function update(User $user, Vehicle $vehicle): bool
    {
        return $user->hasRole(
            'fleet_manager',
            'dispatcher',
            'maintenance'
        );
    }

    public function archive(User $user, Vehicle $vehicle): bool
    {
        return $user->hasRole('fleet_manager');
    }

    public function archiveAny(User $user): bool
    {
        return $user->hasRole('fleet_manager');
    }

    public function restore(User $user, Vehicle $vehicle): bool
    {
        return $user->hasRole('fleet_manager');
    }
}