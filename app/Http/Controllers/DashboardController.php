<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\Dispatch;
use App\Models\Maintenance;
use App\Models\FleetNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private function buildDashboardData(Request $request): array
    {
        $user = $request->user();

        abort_unless(
            $user?->canViewModule('dashboard'),
            403
        );

        $role = $user->role;
        $department = $user->department;

        /*
        |--------------------------------------------------------------------------
        | Dashboard UI Permissions
        |--------------------------------------------------------------------------
        */
        $dashboardPermissions = [
            'role' => $role,

            'canSeeDispatchQueue' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher',
                    'driver',
                    'department_head',
                    'finance',
                    'it_admin'
                ),

            'canSeeDriverPool' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher',
                    'finance',
                    'it_admin'
                ),

            'canSeeMaintenance' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher',
                    'finance',
                    'maintenance',
                    'it_admin'
                ),

            'canSeeFleetStatus' => true,

            'canOpenVehicles' =>
                $user->canViewModule('vehicles'),

            'canOpenDispatch' =>
                $user->canViewModule('dispatch'),

            'canOpenMaintenance' =>
                $user->canViewModule('maintenance'),
        ];

        /*
        |--------------------------------------------------------------------------
        | Vehicle Scope
        |--------------------------------------------------------------------------
        |
        | Fleet Manager / Dispatcher / Finance / Maintenance / IT Admin
        |     -> fleet-wide
        |
        | Driver
        |     -> assigned vehicle only
        |
        | Department Head
        |     -> own department only
        |--------------------------------------------------------------------------
        */
        $vehicleScope = function () use (
            $user,
            $department
        ) {
            $query = Vehicle::query();

            /*
            |--------------------------------------------------------------------------
            | Driver
            |--------------------------------------------------------------------------
            */
            if ($user->hasRole('driver')) {
                $vehicleId =
                    $user->driverProfile
                        ?->assigned_vehicle_id;

                if ($vehicleId) {
                    $query->where(
                        'id',
                        $vehicleId
                    );
                } else {
                    $query->whereRaw('1 = 0');
                }
            }

            /*
            |--------------------------------------------------------------------------
            | Department Head
            |--------------------------------------------------------------------------
            */
            elseif (
                $user->hasRole(
                    'department_head'
                )
            ) {
                if ($department) {
                    $query->where(
                        'department',
                        $department
                    );
                } else {
                    $query->whereRaw('1 = 0');
                }
            }

            return $query;
        };

        /*
        |--------------------------------------------------------------------------
        | Dispatch Scope
        |--------------------------------------------------------------------------
        |
        | Fleet Manager / Dispatcher / Finance / IT Admin
        |     -> fleet-wide read
        |
        | Driver
        |     -> own assignments only
        |
        | Department Head
        |     -> own department only
        |
        | Maintenance
        |     -> no dispatch data on dashboard
        |--------------------------------------------------------------------------
        */
        $dispatchScope = function () use (
            $user,
            $department
        ) {
            $query = Dispatch::query();

            /*
            |--------------------------------------------------------------------------
            | Driver
            |--------------------------------------------------------------------------
            */
            if ($user->hasRole('driver')) {
                $driverId =
                    $user->driverProfile?->id;

                if ($driverId) {
                    $query->whereHas(
                        'reservation',
                        function ($reservationQuery) use ($driverId) {
                            $reservationQuery->where(
                                'driver_id',
                                $driverId
                            );
                        }
                    );
                } else {
                    $query->whereRaw('1 = 0');
                }
            }

            /*
            |--------------------------------------------------------------------------
            | Department Head
            |--------------------------------------------------------------------------
            */
            elseif (
                $user->hasRole(
                    'department_head'
                )
            ) {
                if (!$department) {
                    $query->whereRaw('1 = 0');

                    return $query;
                }

                $query->whereHas(
                    'reservation',
                    function ($reservationQuery) use ($department) {
                        $reservationQuery->where(
                            function ($scope) use ($department) {
                                $scope
                                    ->where(
                                        'department',
                                        $department
                                    )
                                    ->orWhereHas(
                                        'routePlan',
                                        function ($routeQuery) use ($department) {
                                            $routeQuery->where(
                                                'department',
                                                $department
                                            );
                                        }
                                    )
                                    ->orWhereHas(
                                        'vehicle',
                                        function ($vehicleQuery) use ($department) {
                                            $vehicleQuery->where(
                                                'department',
                                                $department
                                            );
                                        }
                                    );
                            }
                        );
                    }
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Maintenance
            |--------------------------------------------------------------------------
            */
            elseif (
                $user->hasRole(
                    'maintenance'
                )
            ) {
                $query->whereRaw('1 = 0');
            }

            return $query;
        };

        /*
        |--------------------------------------------------------------------------
        | Primary KPI - Available Vehicles
        |--------------------------------------------------------------------------
        */
        $availableVehicles =
            $vehicleScope()
                ->where(
                    'status',
                    'Available'
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Primary KPI - Active Dispatches
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | Must use scoped dispatch query.
        |--------------------------------------------------------------------------
        */
        $activeDispatches =
            $dispatchScope()
                ->whereIn(
                    'trip_status',
                    [
                        'Assigned',
                        'En Route',
                        'Arrived',
                    ]
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Primary KPI - Drivers On Duty
        |--------------------------------------------------------------------------
        */
        if (
            $user->hasRole(
                'fleet_manager',
                'dispatcher',
                'finance',
                'it_admin'
            )
        ) {
            $driversOnDuty =
                Driver::query()
                    ->where(
                        'status',
                        'On Duty'
                    )
                    ->count();
        }

        /*
        |--------------------------------------------------------------------------
        | Driver - own duty status only
        |--------------------------------------------------------------------------
        */
        elseif (
            $user->hasRole('driver')
        ) {
            $driverProfile =
                $user->driverProfile;

            $driversOnDuty =
                $driverProfile &&
                $driverProfile->status === 'On Duty'
                    ? 1
                    : 0;
        }

        /*
        |--------------------------------------------------------------------------
        | Department Head - department vehicle drivers only
        |--------------------------------------------------------------------------
        */
        elseif (
            $user->hasRole(
                'department_head'
            )
        ) {
            if ($department) {
                $driversOnDuty =
                    Driver::query()
                        ->where(
                            'status',
                            'On Duty'
                        )
                        ->whereHas(
                            'vehicle',
                            function ($query) use ($department) {
                                $query->where(
                                    'department',
                                    $department
                                );
                            }
                        )
                        ->count();
            } else {
                $driversOnDuty = 0;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Maintenance
        |--------------------------------------------------------------------------
        */
        else {
            $driversOnDuty = 0;
        }

        /*
        |--------------------------------------------------------------------------
        | Average Fuel Level
        |--------------------------------------------------------------------------
        */
        $vehiclesWithFuel =
            $vehicleScope()
                ->whereNotNull(
                    'tank_capacity'
                )
                ->where(
                    'tank_capacity',
                    '>',
                    0
                )
                ->whereNotNull(
                    'current_fuel'
                )
                ->get([
                    'tank_capacity',
                    'current_fuel',
                ]);

        $averageFuelLevel =
            $vehiclesWithFuel->isNotEmpty()
                ? (int) round(
                    $vehiclesWithFuel->avg(
                        function ($vehicle) {
                            return min(
                                100,
                                max(
                                    0,
                                    (
                                        (float) $vehicle->current_fuel
                                        /
                                        (float) $vehicle->tank_capacity
                                    ) * 100
                                )
                            );
                        }
                    )
                )
                : 0;

        /*
        |--------------------------------------------------------------------------
        | Today's Dispatch Queue
        |--------------------------------------------------------------------------
        */
        $dispatchQueue =
            $dispatchScope()
                ->with([
                    'reservation.vehicle',
                    'reservation.driver',
                ])
                ->whereDate(
                    'dispatch_date',
                    today()
                )
                ->whereIn(
                    'trip_status',
                    [
                        'Pending',
                        'Assigned',
                        'En Route',
                        'Arrived',
                    ]
                )
                ->orderByRaw("
                    CASE trip_status
                        WHEN 'En Route' THEN 1
                        WHEN 'Arrived' THEN 2
                        WHEN 'Assigned' THEN 3
                        WHEN 'Pending' THEN 4
                        ELSE 5
                    END
                ")
                ->orderBy(
                    'departure_time'
                )
                ->limit(5)
                ->get();
        /*
        |--------------------------------------------------------------------------
        | Dashboard Map Dispatch Data
        |--------------------------------------------------------------------------
        | Lightweight data only for Leaflet map markers.
        | Uses the already-scoped dispatch queue, so Driver and Department Head
        | still receive only the dispatch records they are allowed to see.
        |--------------------------------------------------------------------------
        */
        $dashboardMapDispatches =
            $dispatchQueue
                ->map(function ($dispatch) {
                    $reservation =
                        $dispatch->reservation;

                    if (!$reservation) {
                        return null;
                    }
                    return [
                        'id' =>
                            $dispatch->id,

                        'dispatch_number' =>
                            $dispatch->dispatch_number,
                        'status' =>
                            $dispatch->trip_status,
                        'pickup' =>
                            $reservation->pickup_location,
                        'destination' =>
                            $reservation->destination,
                        'vehicle' =>
                            $reservation->vehicle
                                ?->display_label,
                        'driver' =>
                            trim(
                                ($reservation->driver
                                    ?->first_name ?? '')
                                . ' ' .
                                ($reservation->driver
                                    ?->last_name ?? '')
                            ),
                    ];
                })
                ->filter()
                ->values();
        /*
        |--------------------------------------------------------------------------
        | Vehicle Status
        |--------------------------------------------------------------------------
        */
        $vehicles =
            $vehicleScope()
                ->with('drivers')
                ->orderByRaw("
                    CASE status
                        WHEN 'On Trip' THEN 1
                        WHEN 'Maintenance' THEN 2
                        WHEN 'Available' THEN 3
                        WHEN 'Out of Service' THEN 4
                        ELSE 5
                    END
                ")
                ->latest('id')
                ->limit(5)
                ->get();

        /*
        |--------------------------------------------------------------------------
        | Maintenance Alerts
        |--------------------------------------------------------------------------
        */
        $maintenanceQuery =
            Maintenance::query()
                ->with('vehicle')
                ->whereIn(
                    'status',
                    [
                        'Scheduled',
                        'In Progress',
                    ]
                );

        /*
        |--------------------------------------------------------------------------
        | Driver
        |--------------------------------------------------------------------------
        |
        | Dashboard currently does not display Maintenance Alerts
        | for Driver, so do not load unrelated service records.
        |--------------------------------------------------------------------------
        */
        if (
            $user->hasRole('driver')
        ) {
            $maintenanceQuery
                ->whereRaw('1 = 0');
        }

        /*
        |--------------------------------------------------------------------------
        | Department Head
        |--------------------------------------------------------------------------
        */
        elseif (
            $user->hasRole(
                'department_head'
            )
        ) {
            $maintenanceQuery
                ->whereRaw('1 = 0');
        }

        $maintenanceAlerts =
            $maintenanceQuery
                ->orderByRaw("
                    CASE priority
                        WHEN 'Emergency' THEN 1
                        WHEN 'High' THEN 2
                        WHEN 'Normal' THEN 3
                        WHEN 'Low' THEN 4
                        ELSE 5
                    END
                ")
                ->orderBy(
                    'maintenance_date'
                )
                ->limit(5)
                ->get();

        /*
        |--------------------------------------------------------------------------
        | Weekly Fleet Activity
        |--------------------------------------------------------------------------
        */
        $weekStart =
            now()->startOfWeek(
                Carbon::MONDAY
            );

        $weekEnd =
            now()->endOfWeek(
                Carbon::SUNDAY
            );

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        |
        | Your previous version accidentally repeated $dispatchQueue here.
        | This must be $weeklyRaw.
        |--------------------------------------------------------------------------
        */
        $weeklyRaw =
            $dispatchScope()
                ->selectRaw(
                    'dispatch_date, COUNT(*) AS total'
                )
                ->whereBetween(
                    'dispatch_date',
                    [
                        $weekStart->toDateString(),
                        $weekEnd->toDateString(),
                    ]
                )
                ->groupBy(
                    'dispatch_date'
                )
                ->pluck(
                    'total',
                    'dispatch_date'
                );

        $weeklyActivity =
            collect();

        for (
            $day = 0;
            $day < 7;
            $day++
        ) {
            $date =
                $weekStart
                    ->copy()
                    ->addDays($day);

            $dateKey =
                $date->toDateString();

            $weeklyActivity->push([
                'date' =>
                    $dateKey,

                'day' =>
                    $date->format('D'),

                'total' =>
                    (int) (
                        $weeklyRaw[
                            $dateKey
                        ] ?? 0
                    ),
            ]);
        }

        $weeklyActivityMax =
            max(
                1,
                (int)
                $weeklyActivity->max(
                    'total'
                )
            );

        /*
        |--------------------------------------------------------------------------
        | Recent Activity
        |--------------------------------------------------------------------------
        |
        | User-specific notifications only.
        |--------------------------------------------------------------------------
        */
        $recentActivity =
            FleetNotification::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->latest('id')
                ->limit(5)
                ->get();

        return compact(
            'availableVehicles',
            'activeDispatches',
            'driversOnDuty',
            'averageFuelLevel',
            'dispatchQueue',
            'dashboardMapDispatches',
            'vehicles',
            'maintenanceAlerts',
            'weeklyActivity',
            'weeklyActivityMax',
            'recentActivity',
            'dashboardPermissions'
        );
    }

    public function index(Request $request)
    {
        return view(
            'dashboard.index',
            $this->buildDashboardData($request)
        );
    }

    public function data(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | Reuse the exact same scoped Dashboard data
        |--------------------------------------------------------------------------
        |
        | This prevents the live endpoint from drifting away from the RBAC
        | rules already enforced by index().
        |--------------------------------------------------------------------------
        */

        $data =
            $this->buildDashboardData($request);

        $dispatchQueue =
            collect(
                $data['dispatchQueue'] ?? []
            )
                ->map(function ($dispatch) {
                    $reservation =
                        $dispatch->reservation;

                    $vehicle =
                        $reservation?->vehicle;

                    $driver =
                        $reservation?->driver;

                    return [
                        'id' =>
                            $dispatch->id,

                        'dispatch_number' =>
                            $dispatch->dispatch_number,

                        'status' =>
                            $dispatch->trip_status,

                        'title' =>
                            $reservation?->request_type
                            ?: $dispatch->dispatch_number,

                        'vehicle' =>
                            $vehicle?->display_label
                            ?? 'No vehicle',

                        'driver' =>
                            trim(
                                ($driver?->first_name ?? '') .
                                ' ' .
                                ($driver?->last_name ?? '')
                            ),
                    ];
                })
                ->values();

        $vehicles =
            collect(
                $data['vehicles'] ?? []
            )
                ->map(function ($vehicle) {
                    $driver =
                        $vehicle->drivers
                            ->first();

                    $driverName =
                        $driver
                            ? trim(
                                ($driver->first_name ?? '') .
                                ' ' .
                                ($driver->last_name ?? '')
                            )
                            : 'Unassigned';

                    $vehicleLabel =
                        trim(
                            ($vehicle->brand ?? '') .
                            ' ' .
                            ($vehicle->model ?? '')
                        );

                    if ($vehicleLabel === '') {
                        $vehicleLabel =
                            $vehicle->vehicle_type
                            ?? 'Vehicle';
                    }

                    $fuelPercent = null;

                    if (
                        $vehicle->tank_capacity !== null &&
                        (float) $vehicle->tank_capacity > 0 &&
                        $vehicle->current_fuel !== null
                    ) {
                        $fuelPercent =
                            min(
                                100,
                                max(
                                    0,
                                    round(
                                        (
                                            (float) $vehicle->current_fuel
                                            /
                                            (float) $vehicle->tank_capacity
                                        ) * 100
                                    )
                                )
                            );
                    }

                    return [
                        'id' =>
                            $vehicle->id,

                        'label' =>
                            $vehicleLabel,

                        'vehicle_type' =>
                            $vehicle->vehicle_type,

                        'driver' =>
                            $driverName,

                        'status' =>
                            $vehicle->status,

                        'fuel_percent' =>
                            $fuelPercent,
                    ];
                })
                ->values();

        $maintenanceAlerts =
            collect(
                $data['maintenanceAlerts'] ?? []
            )
                ->map(function ($maintenance) {
                    return [
                        'id' =>
                            $maintenance->id,

                        'maintenance_type' =>
                            $maintenance->maintenance_type,

                        'status' =>
                            $maintenance->status,

                        'priority' =>
                            $maintenance->priority,

                        'maintenance_date' =>
                            $maintenance->maintenance_date
                                ? Carbon::parse(
                                    $maintenance->maintenance_date
                                )->toDateString()
                                : null,

                        'vehicle' =>
                            $maintenance->vehicle
                                ?->display_label
                            ?? 'Vehicle',
                    ];
                })
                ->values();

        $recentActivity =
            collect(
                $data['recentActivity'] ?? []
            )
                ->map(function ($activity) {
                    return [
                        'id' =>
                            $activity->id,

                        'title' =>
                            $activity->title,

                        'link' =>
                            $activity->link,

                        'created_at_timestamp' =>
                            $activity->created_at
                                ?->getTimestamp(),
                    ];
                })
                ->values();

        return response()->json([
            'available_vehicles' =>
                $data['availableVehicles'] ?? 0,

            'active_dispatches' =>
                $data['activeDispatches'] ?? 0,

            'drivers_on_duty' =>
                $data['driversOnDuty'] ?? 0,

            'average_fuel_level' =>
                $data['averageFuelLevel'] ?? 0,

            'dispatch_queue' =>
                $dispatchQueue,

            'vehicles' =>
                $vehicles,

            'maintenance_alerts' =>
                $maintenanceAlerts,

            'weekly_activity' =>
                collect(
                    $data['weeklyActivity'] ?? []
                )->values(),

            'weekly_activity_max' =>
                $data['weeklyActivityMax'] ?? 1,

            'recent_activity' =>
                $recentActivity,

            'map_dispatches' =>
                collect(
                    $data['dashboardMapDispatches'] ?? []
                )->values(),
        ]);
    }

}