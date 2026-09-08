<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Approved Fleet Roles
    |--------------------------------------------------------------------------
    */

    'roles' => [
        'fleet_manager' => 'Fleet Manager',
        'dispatcher' => 'Dispatcher',
        'driver' => 'Driver',
        'department_head' => 'Department Head',
        'finance' => 'Finance',
        'maintenance' => 'Maintenance',
        'it_admin' => 'IT Admin',
    ],

    /*
    |--------------------------------------------------------------------------
    | Access levels
    |--------------------------------------------------------------------------
    */

    'access_levels' => [
        'full' => [
            'view',
            'create',
            'edit',
            'delete',
            'approve',
            'manage',
        ],

        'limited' => [
            'view',
        ],

        'view' => [
            'view',
        ],

        'none' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Module Access Matrix
    |--------------------------------------------------------------------------
    |
    | full    = Full Access
    | limited = Limited Access
    | view    = View Only
    | none    = No Access
    |
    */

    'modules' => [

        'dashboard' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'full',
            'driver' => 'limited',
            'department_head' => 'limited',
            'finance' => 'view',
            'maintenance' => 'limited',
            'it_admin' => 'view',
        ],

        'vehicles' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'limited',
            'driver' => 'view',
            'department_head' => 'view',
            'finance' => 'view',
            'maintenance' => 'limited',
            'it_admin' => 'view',
        ],

        'reservations' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'full',
            'driver' => 'limited',
            'department_head' => 'limited',
            'finance' => 'view',
            'maintenance' => 'none',
            'it_admin' => 'view',
        ],

        'dispatch' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'full',
            'driver' => 'limited',
            'department_head' => 'view',
            'finance' => 'none',
            'maintenance' => 'none',
            'it_admin' => 'view',
        ],

        'drivers' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'full',
            'driver' => 'view',
            'department_head' => 'none',
            'finance' => 'none',
            'maintenance' => 'view',
            'it_admin' => 'view',
        ],

        'maintenance' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'view',
            'driver' => 'none',
            'department_head' => 'none',
            'finance' => 'view',
            'maintenance' => 'full',
            'it_admin' => 'view',
        ],

        'fuel' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'view',
            'driver' => 'limited',
            'department_head' => 'none',
            'finance' => 'view',
            'maintenance' => 'full',
            'it_admin' => 'view',
        ],

        'route_planning' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'full',
            'driver' => 'view',
            'department_head' => 'none',
            'finance' => 'none',
            'maintenance' => 'none',
            'it_admin' => 'view',
        ],

        'cost_analysis' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'view',
            'driver' => 'none',
            'department_head' => 'view',
            'finance' => 'full',
            'maintenance' => 'view',
            'it_admin' => 'view',
        ],

        'reports' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'limited',
            'driver' => 'none',
            'department_head' => 'limited',
            'finance' => 'full',
            'maintenance' => 'limited',
            'it_admin' => 'view',
        ],

        'audit_logs' => [
            'fleet_manager' => 'view',
            'dispatcher' => 'none',
            'driver' => 'none',
            'department_head' => 'none',
            'finance' => 'none',
            'maintenance' => 'none',
            'it_admin' => 'view',
        ],

        'profile' => [
            'fleet_manager' => 'limited',
            'dispatcher' => 'limited',
            'driver' => 'limited',
            'department_head' => 'limited',
            'finance' => 'limited',
            'maintenance' => 'limited',
            'it_admin' => 'full',
        ],

        'settings' => [
            'fleet_manager' => 'full',
            'dispatcher' => 'none',
            'driver' => 'none',
            'department_head' => 'none',
            'finance' => 'none',
            'maintenance' => 'none',
            'it_admin' => 'full',
        ],

    ],

];