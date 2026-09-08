<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\Reservation;
use App\Models\Dispatch;
use App\Models\Maintenance;
use App\Models\FuelLog;
use Illuminate\Http\Request;
use App\Services\AuditLogService;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        abort_unless(
            $user?->canViewModule('reports'),
            403
        );

        $reportPermissions = [
            'role' => $user->role,

            'canExport' => true,

            'departmentScoped' =>
                $user->hasRole('department_head'),

            'operationalOnly' =>
                $user->hasRole('dispatcher'),

            'maintenanceLimited' =>
                $user->hasRole('maintenance'),

            'viewOnly' =>
                $user->hasRole('it_admin'),

            'allowedReportTypes' =>
                $this->allowedReportTypes(
                    $user->role
                ),
        ];

        return view(
            'reports.index',
            compact('reportPermissions')
        );
    }

    public function data(Request $request)
    {
        $user = $request->user();

        abort_unless(
            $user?->canViewModule('reports'),
            403
        );

        /*
        |--------------------------------------------------------------------------
        | Default Empty Sources
        |--------------------------------------------------------------------------
        */
        $vehicles = collect();
        $drivers = collect();
        $reservations = collect();
        $dispatches = collect();
        $maintenance = collect();
        $fuel = collect();

        /*
        |--------------------------------------------------------------------------
        | Fleet Manager / Finance / IT Admin
        |--------------------------------------------------------------------------
        |
        | Full report datasets.
        |
        | IT Admin remains read-only because this endpoint is GET only.
        |--------------------------------------------------------------------------
        */
        if (
            $user->hasRole(
                'fleet_manager',
                'finance',
                'it_admin'
            )
        ) {
            $vehicles = Vehicle::query()
                ->with('drivers')
                ->get();

            $drivers = Driver::query()
                ->with('vehicle')
                ->get();

            $reservations = Reservation::query()
                ->with([
                    'vehicle',
                    'driver',
                    'routePlan',
                ])
                ->get();

            $dispatches = Dispatch::query()
                ->with([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan',
                ])
                ->get();

            $maintenance = Maintenance::query()
                ->with('vehicle')
                ->get();

            $fuel = FuelLog::query()
                ->with([
                    'vehicle',
                    'driver',
                ])
                ->get();
        }

        /*
        |--------------------------------------------------------------------------
        | Dispatcher
        |--------------------------------------------------------------------------
        |
        | Operational reports only.
        | No raw Fuel / Maintenance financial datasets.
        |--------------------------------------------------------------------------
        */
        elseif ($user->hasRole('dispatcher')) {

            $vehicles = Vehicle::query()
                ->with('drivers')
                ->get();

            $drivers = Driver::query()
                ->with('vehicle')
                ->get();

            $reservations = Reservation::query()
                ->with([
                    'vehicle',
                    'driver',
                    'routePlan',
                ])
                ->get();

            $dispatches = Dispatch::query()
                ->with([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan',
                ])
                ->get();
        }

        /*
        |--------------------------------------------------------------------------
        | Maintenance
        |--------------------------------------------------------------------------
        |
        | Limited to vehicle condition / maintenance / fuel reporting.
        |--------------------------------------------------------------------------
        */
        elseif ($user->hasRole('maintenance')) {

            $vehicles = Vehicle::query()
                ->with('drivers')
                ->get();

            $maintenance = Maintenance::query()
                ->with('vehicle')
                ->get();

            $fuel = FuelLog::query()
                ->with([
                    'vehicle',
                    'driver',
                ])
                ->get();
        }

        /*
        |--------------------------------------------------------------------------
        | Department Head
        |--------------------------------------------------------------------------
        |
        | Reports are scoped to the user's own department.
        |--------------------------------------------------------------------------
        */
        elseif ($user->hasRole('department_head')) {

            /*
            |--------------------------------------------------------------------------
            | IMPORTANT
            |--------------------------------------------------------------------------
            |
            | Assumes the users table has:
            |
            | department
            |
            | If your actual field has another name, replace this one line.
            |--------------------------------------------------------------------------
            */
            $department =
                $user->department ?? null;

            if (!$department) {
                return response()->json([
                    'vehicles' => [],
                    'drivers' => [],
                    'reservations' => [],
                    'dispatches' => [],
                    'maintenance' => [],
                    'fuel' => [],

                    'scope' => [
                        'department' => null,
                        'allowedReportTypes' =>
                            $this->allowedReportTypes(
                                $user->role
                            ),
                    ],
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Vehicles
            |--------------------------------------------------------------------------
            */
            $vehicles = Vehicle::query()
                ->with('drivers')
                ->where(
                    'department',
                    $department
                )
                ->get();

            /*
            |--------------------------------------------------------------------------
            | Reservations
            |--------------------------------------------------------------------------
            |
            | We filter after loading so Reservation.department / RoutePlan
            | fallback logic remains compatible with the existing project.
            |--------------------------------------------------------------------------
            */
            $reservations = Reservation::query()
                ->with([
                    'vehicle',
                    'driver',
                    'routePlan',
                ])
                ->get()
                ->filter(function ($reservation) use ($department) {

                    return
                        $reservation->department === $department ||

                        $reservation->routePlan?->department ===
                            $department ||

                        $reservation->vehicle?->department ===
                            $department;
                })
                ->values();

            /*
            |--------------------------------------------------------------------------
            | Dispatch
            |--------------------------------------------------------------------------
            */
            $dispatches = Dispatch::query()
                ->with([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan',
                ])
                ->get()
                ->filter(function ($dispatch) use ($department) {

                    $reservation =
                        $dispatch->reservation;

                    return
                        $reservation?->department ===
                            $department ||

                        $reservation?->routePlan?->department ===
                            $department ||

                        $reservation?->vehicle?->department ===
                            $department;
                })
                ->values();

            /*
            |--------------------------------------------------------------------------
            | Maintenance
            |--------------------------------------------------------------------------
            */
            $maintenance = Maintenance::query()
                ->with('vehicle')
                ->get()
                ->filter(
                    fn ($record) =>
                        $record->vehicle?->department ===
                            $department
                )
                ->values();

            /*
            |--------------------------------------------------------------------------
            | Fuel
            |--------------------------------------------------------------------------
            */
            $fuel = FuelLog::query()
                ->with([
                    'vehicle',
                    'driver',
                ])
                ->get()
                ->filter(
                    fn ($record) =>
                        $record->vehicle?->department ===
                            $department
                )
                ->values();

            /*
            |--------------------------------------------------------------------------
            | Drivers
            |--------------------------------------------------------------------------
            */
            $vehicleIds = $vehicles
                ->pluck('id')
                ->map(
                    fn ($id) => (string) $id
                );

            $drivers = Driver::query()
                ->with('vehicle')
                ->get()
                ->filter(
                    fn ($driver) =>
                        $driver->assigned_vehicle_id &&
                        $vehicleIds->contains(
                            (string)
                            $driver->assigned_vehicle_id
                        )
                )
                ->values();
        }

        return response()->json([
            'vehicles' =>
                $vehicles->values(),

            'drivers' =>
                $drivers->values(),

            'reservations' =>
                $reservations->values(),

            'dispatches' =>
                $dispatches->values(),

            'maintenance' =>
                $maintenance->values(),

            'fuel' =>
                $fuel->values(),

            'scope' => [
                'department' =>
                    $user->hasRole(
                        'department_head'
                    )
                        ? ($user->department ?? null)
                        : null,

                'allowedReportTypes' =>
                    $this->allowedReportTypes(
                        $user->role
                    ),

                'operationalOnly' =>
                    $user->hasRole(
                        'dispatcher'
                    ),

                'maintenanceLimited' =>
                    $user->hasRole(
                        'maintenance'
                    ),

                'viewOnly' =>
                    $user->hasRole(
                        'it_admin'
                    ),
            ],
        ]);
    }

    public function auditExport(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        abort_unless(
            $user?->canViewModule('reports'),
            403
        );

        $validated =
            $request->validate([
                'format' => [
                    'required',
                    Rule::in([
                        'print',
                        'pdf',
                        'excel',
                    ]),
                ],

                'report_type' => [
                    'required',
                    Rule::in(
                        $this->allowedReportTypes(
                            $user->role
                        )
                    ),
                ],

                'date_range' => [
                    'nullable',
                    'string',
                    'max:50',
                ],

                'start_date' => [
                    'nullable',
                    'date',
                ],

                'end_date' => [
                    'nullable',
                    'date',
                    'after_or_equal:start_date',
                ],

                'vehicle_id' => [
                    'nullable',
                    'integer',
                ],

                'department' => [
                    'nullable',
                    'string',
                    'max:120',
                ],
            ]);

        /*
        |--------------------------------------------------------------------------
        | Department Head Scope
        |--------------------------------------------------------------------------
        |
        | Never trust a department submitted by a Department Head.
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('department_head')) {
            $validated['department'] =
                $user->department;
        }

        $formatLabel =
            match ($validated['format']) {
                'pdf' =>
                    'PDF',

                'excel' =>
                    'Excel',

                'print' =>
                    'Print',

                default =>
                    strtoupper(
                        $validated['format']
                    ),
            };

        $reportLabel =
            match ($validated['report_type']) {
                'overview' =>
                    'Overview',

                'utilization' =>
                    'Fleet Utilization',

                'trips' =>
                    'Trip & Dispatch',

                'reservations' =>
                    'Reservations',

                'maintenance' =>
                    'Maintenance',

                'fuel' =>
                    'Fuel & Cost',

                'drivers' =>
                    'Driver Performance',

                default =>
                    $validated['report_type'],
            };

        AuditLogService::log(
            module: 'Reports',
            action:
                $validated['format'] === 'print'
                    ? 'Printed'
                    : 'Exported',

            description:
                "{$formatLabel} report generated for {$reportLabel}.",

            newValues: [
                'format' =>
                    $validated['format'],

                'report_type' =>
                    $validated['report_type'],

                'date_range' =>
                    $validated['date_range']
                    ?? null,

                'start_date' =>
                    $validated['start_date']
                    ?? null,

                'end_date' =>
                    $validated['end_date']
                    ?? null,

                'vehicle_id' =>
                    $validated['vehicle_id']
                    ?? null,

                'department' =>
                    $validated['department']
                    ?? null,
            ]
        );

        return response()->json([
            'success' => true,
        ]);
    }

    private function allowedReportTypes(
        string $role
    ): array {
        return match ($role) {

            /*
            |--------------------------------------------------------------------------
            | Dispatcher
            |--------------------------------------------------------------------------
            */
            'dispatcher' => [
                'overview',
                'utilization',
                'trips',
                'reservations',
                'drivers',
            ],

            /*
            |--------------------------------------------------------------------------
            | Maintenance
            |--------------------------------------------------------------------------
            */
            'maintenance' => [
                'overview',
                'utilization',
                'maintenance',
                'fuel',
            ],

            /*
            |--------------------------------------------------------------------------
            | Fleet Manager / Finance /
            | Department Head / IT Admin
            |--------------------------------------------------------------------------
            */
            default => [
                'overview',
                'utilization',
                'trips',
                'reservations',
                'maintenance',
                'fuel',
                'drivers',
            ],
        };
    }
}