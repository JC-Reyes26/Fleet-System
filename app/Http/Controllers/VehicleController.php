<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\FleetSetting;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class VehicleController extends Controller
{   
    use AuthorizesRequests;
    /**
     * Display a listing of the resource.
     */

    private function getVehicleSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();

        $settings = $record?->settings ?? [];

        $vehicleSettings = $settings['vehicles'] ?? [];

        $allowedStatuses = [
            'Available',
            'On Trip',
            'Maintenance',
            'Out of Service',
        ];

        $defaultStatus =
            $vehicleSettings['defaultStatus'] ?? 'Available';

        if (!in_array($defaultStatus, $allowedStatuses, true)) {
            $defaultStatus = 'Available';
        }

        return [
            'requirePlateNumber' =>
                $vehicleSettings['requirePlateNumber'] ?? true,
            
            'requireDepartment' =>
                $vehicleSettings['requireDepartment'] ?? false,

            'defaultStatus' =>
                $defaultStatus,
        ];
    }

    public function index(Request $request)
    {   
        $this->authorize('viewAny', Vehicle::class);

        $user = $request->user();


        $query = Vehicle::with([
            'drivers',
            'lastCompletedMaintenance',
        ]);

        $query =
        $this->applyVehicleVisibility(
            $query,
            $user
        );

        if ($request->filled('search')) {

            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('brand', 'like', "%{$search}%")
                ->orWhere('model', 'like', "%{$search}%")
                ->orWhere('plate_number', 'like', "%{$search}%")
                ->orWhere('department', 'like', "%{$search}%")
                    ->orWhereHas('drivers', function ($driver) use ($search) {
                    $driver->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                });
            });
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('vehicle_type', $request->type);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $sort = $request->get('sort', 'id');
        $direction = $request->get('direction', 'asc');

        $query->orderBy($sort, $direction);

        $vehicles = $query->get()->map(function ($vehicle) {
            $driver = $vehicle->drivers->first();

            return [
                'id'                => $vehicle->id,
                'plate_number'      => $vehicle->plate_number,
                'vehicle_type'      => $vehicle->vehicle_type,
                'department'        => $vehicle->department,
                'brand'             => $vehicle->brand,
                'model'             => $vehicle->model,
                'purchase_date'     => $vehicle->purchase_date,
                'insurance_expiry'  => $vehicle->insurance_expiry,
                'capacity'          => $vehicle->capacity,
                'fuel_type'         => $vehicle->fuel_type,
                'tank_capacity'     => $vehicle->tank_capacity,
                'current_fuel'      => $vehicle->current_fuel,
                'current_odometer'  => $vehicle->current_odometer,
                'status'            => $vehicle->status,

                'driver_name' => $driver
                    ? $driver->first_name . ' ' . $driver->last_name
                    : null,

                'driver_license' => $driver?->license_number,

                'notes' => $vehicle->notes,
                /*
                |--------------------------------------------------------------------------
                | Include assigned drivers for Fuel Management
                |--------------------------------------------------------------------------
                */
                'drivers' => $vehicle->drivers->map(function ($driver) {
                    return [
                        'id' => $driver->id,
                        'first_name' => $driver->first_name,
                        'last_name' => $driver->last_name,
                        'license_number' => $driver->license_number,
                        'status' => $driver->status,
                    ];
                })->values(),
                // Last Service from Last Maintenance Complete
                'last_service' =>
                    $vehicle->lastCompletedMaintenance?->completion_date
                        ?->format('Y-m-d'),
                'last_service_record' =>
                    $vehicle->lastCompletedMaintenance
                        ? [
                            'id' =>
                                $vehicle->lastCompletedMaintenance->id,
                            'maintenance_number' =>
                                $vehicle->lastCompletedMaintenance->maintenance_number,
                            'maintenance_type' =>
                                $vehicle->lastCompletedMaintenance->maintenance_type,
                            'completion_date' =>
                                optional(
                                    $vehicle->lastCompletedMaintenance->completion_date
                                )->format('Y-m-d'),
                            'cost' =>
                                $vehicle->lastCompletedMaintenance->cost,
                        ]
                        : null,
            
            ];
        });
        
        // if AJAX request
        if ($request->expectsJson()) {

            return response()->json([
                'vehicles' => $vehicles
            ]);

        }

        $vehiclePermissions = [
            'role' => $request->user()->role,
            'canCreate' =>
                $request->user()->can(
                    'create',
                    Vehicle::class
                ),
            'canUpdate' =>
                $request->user()->hasRole(
                    'fleet_manager',
                    'dispatcher',
                    'maintenance'
                ),
            'canDelete' =>
                $request->user()->hasRole(
                    'fleet_manager'
                ),
            'canBulkDelete' =>
                $request->user()->hasRole(
                    'fleet_manager'
                ),
        ];
        return view(
            'fleet.index',
            compact('vehiclePermissions')
        );
    }
    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {   
        $this->authorize('create', Vehicle::class);

        $vehicleSettings = $this->getVehicleSettings();
        $requirePlateNumber =
            (bool) $vehicleSettings['requirePlateNumber'];
        $requireDepartment =
            (bool) $vehicleSettings['requireDepartment'];
        if (!$request->filled('status')) {
            $request->merge([
                'status' => $vehicleSettings['defaultStatus'],
            ]);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'plate_number' => [
                    $requirePlateNumber
                        ? 'required'
                        : 'nullable',
                    'string',
                    'max:255',
                    Rule::unique(
                        'vehicles',
                        'plate_number'
                    ),
                ],
                'vehicle_type'      => 'required',
                'department' => [
                    $requireDepartment
                        ? 'required'
                        : 'nullable',

                    Rule::in([
                        'Emergency',
                        'Outpatient',
                        'Laboratory',
                        'Facilities',
                        'Admin',
                        'Logistics',
                    ]),
                ],
                'brand'             => 'required',
                'model'             => 'required',
                'purchase_date'     => 'nullable|date',
                'insurance_expiry'  => 'nullable|date',
                'capacity'          => 'required|integer',
                'fuel_type'         => 'required',
                'tank_capacity' => [
                    'required',
                    'numeric',
                    'min:0.01',
                ],
                'current_fuel' => [
                    'required',
                    'numeric',
                    'min:0',
                    'lte:tank_capacity',
                ],
                'current_odometer' => [
                    'required',
                    'numeric',
                    'min:0',
                ],
                'status' => [
                    'required',
                    Rule::in([
                        'Available',
                        'On Trip',
                        'Maintenance',
                        'Out of Service',
                    ]),
                ],
                'assigned_driver_id'=> 'nullable|exists:drivers,id',
                'notes'             => 'nullable|string',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the vehicle information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $driverId = $validated['assigned_driver_id'] ?? null;

        unset($validated['assigned_driver_id']);

        $vehicle = Vehicle::create($validated);

        if ($driverId) {
            Driver::where('id', $driverId)
                ->update([
                    'assigned_vehicle_id' => $vehicle->id,
                ]);
        }

        $vehicle->load('drivers');

        AuditLogService::log(
            module: 'Vehicle Management',
            action: 'Created',
            description:
                "Created vehicle {$vehicle->plate_number}.",
            record: $vehicle,
            newValues:
                $this->getVehicleAuditValues(
                    $vehicle
                )
        );

        return response()->json([
            'success' => true,
            'message' => 'Vehicle added successfully.',
            'vehicle' => $vehicle->load('drivers'),
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(
        Request $request,
        Vehicle $vehicle
    ) {
        $this->authorize(
            'view',
            $vehicle
        );

        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Driver - Assigned Vehicle Only
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driver =
                $user->driverProfile;

            abort_unless(
                $driver &&
                (int) $driver->assigned_vehicle_id ===
                (int) $vehicle->id,
                403
            );
        }

        $vehicle->load([
            'drivers',
            'lastCompletedMaintenance',
        ]);

        $availableDrivers =
            Driver::whereNull(
                'assigned_vehicle_id'
            )
                ->orWhere(
                    'assigned_vehicle_id',
                    $vehicle->id
                )
                ->get();

        return response()->json([
            'vehicle' =>
                $vehicle,

            'drivers' =>
                $availableDrivers,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(
        Request $request,
        Vehicle $vehicle
    ) {
        $this->authorize('update', $vehicle);

        $user = $request->user();

        $vehicle->load('drivers');

        $oldAuditValues =
            $this->getVehicleAuditValues(
                $vehicle
            );

        /*
        |--------------------------------------------------------------------------
        | Fleet Manager
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('fleet_manager')) {

            $vehicleSettings = $this->getVehicleSettings();
            $requirePlateNumber =
                (bool) $vehicleSettings['requirePlateNumber'];
            $requireDepartment =
                (bool) ($vehicleSettings['requireDepartment'] ?? false);
            $validator = Validator::make(
                $request->all(),
                [
                    'plate_number' => [
                        $requirePlateNumber
                            ? 'required'
                            : 'nullable',
                        'string',
                        'max:255',
                        Rule::unique(
                            'vehicles',
                            'plate_number'
                        )->ignore($vehicle->id),
                    ],
                    'vehicle_type' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'department' => [
                        $requireDepartment
                            ? 'required'
                            : 'nullable',
                        Rule::in([
                            'Emergency',
                            'Outpatient',
                            'Laboratory',
                            'Facilities',
                            'Admin',
                            'Logistics',
                        ]),
                    ],
                    /*
                    |--------------------------------------------------------------------------
                    | Brand / Model
                    |--------------------------------------------------------------------------
                    | Wala sila currently sa Edit Vehicle form,
                    | kaya hindi sila dapat required sa update.
                    |--------------------------------------------------------------------------
                    */
                    'brand' => [
                        'sometimes',
                        'string',
                        'max:255',
                    ],
                    'model' => [
                        'sometimes',
                        'string',
                        'max:255',
                    ],
                    'purchase_date' => [
                        'sometimes',
                        'nullable',
                        'date',
                    ],
                    'insurance_expiry' => [
                        'sometimes',
                        'nullable',
                        'date',
                    ],
                    'capacity' => [
                        'required',
                        'integer',
                        'min:0',
                    ],
                    'fuel_type' => [
                        'required',
                        Rule::in([
                            'Diesel',
                            'Gasoline',
                            'Premium Gasoline',
                            'Electric',
                            'Hybrid',
                        ]),
                    ],
                    'tank_capacity' => [
                        'required',
                        'numeric',
                        'min:0.01',
                    ],
                    /*
                    |--------------------------------------------------------------------------
                    | Fuel + Odometer
                    |--------------------------------------------------------------------------
                    | Hindi sila galing sa Vehicle Edit form.
                    | Existing values remain unchanged.
                    |--------------------------------------------------------------------------
                    */
                    'current_fuel' => [
                        'sometimes',
                        'numeric',
                        'min:0',
                    ],
                    'current_odometer' => [
                        'sometimes',
                        'numeric',
                        'min:0',
                    ],
                    'status' => [
                        'required',
                        Rule::in([
                            'Available',
                            'On Trip',
                            'Maintenance',
                            'Out of Service',
                        ]),
                    ],
                    'assigned_driver_id' => [
                        'nullable',
                        'exists:drivers,id',
                    ],
                    'notes' => [
                        'nullable',
                        'string',
                    ],
                ]
            );

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Please check the vehicle information.',
                    'errors' =>
                        $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();
            /*
            |--------------------------------------------------------------------------
            | Tank Capacity Safety
            |--------------------------------------------------------------------------
            | Vehicle Edit does not submit current_fuel.
            | Compare against the vehicle's existing fuel value instead.
            |--------------------------------------------------------------------------
            */
            if (
                isset($validated['tank_capacity']) &&
                $vehicle->current_fuel !== null &&
                (float) $validated['tank_capacity'] <
                    (float) $vehicle->current_fuel
            ) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Tank capacity cannot be lower than the vehicle\'s current fuel level.',
                ], 422);
            }

            $driverFieldProvided =
                array_key_exists(
                    'assigned_driver_id',
                    $validated
                );

            $driverId =
                $validated['assigned_driver_id']
                ?? null;

            unset(
                $validated['assigned_driver_id']
            );

            $vehicle->update($validated);

            /*
            |--------------------------------------------------------------------------
            | Driver Assignment
            |--------------------------------------------------------------------------
            */
            if ($driverFieldProvided) {

                Driver::where(
                    'assigned_vehicle_id',
                    $vehicle->id
                )->update([
                    'assigned_vehicle_id' => null,
                ]);

                if ($driverId) {
                    Driver::where(
                        'id',
                        $driverId
                    )->update([
                        'assigned_vehicle_id' =>
                            $vehicle->id,
                    ]);
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Dispatcher
        |--------------------------------------------------------------------------
        */
        elseif ($user->hasRole('dispatcher')) {

            $validated =
                $request->validate([
                    'status' => [
                        'sometimes',
                        Rule::in([
                            'Available',
                            'Out of Service',
                        ]),
                    ],
                    'current_fuel' => [
                        'sometimes',
                        'numeric',
                        'min:0',
                    ],
                    'current_odometer' => [
                        'sometimes',
                        'numeric',
                        'min:0',
                    ],
                    'notes' => [
                        'sometimes',
                        'nullable',
                        'string',
                    ],
                ]);

            if (
                isset($validated['current_fuel']) &&
                $vehicle->tank_capacity !== null &&
                (float) $validated['current_fuel'] >
                    (float) $vehicle->tank_capacity
            ) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Current fuel cannot exceed tank capacity.',
                ], 422);
            }

            if (empty($validated)) {
                abort(
                    403,
                    'You do not have permission to modify these vehicle fields.'
                );
            }

            $vehicle->update($validated);
        }

        /*
        |--------------------------------------------------------------------------
        | Maintenance
        |--------------------------------------------------------------------------
        */
        elseif ($user->hasRole('maintenance')) {

            $validated =
                $request->validate([
                    'status' => [
                        'sometimes',
                        Rule::in([
                            'Available',
                            'Maintenance',
                            'Out of Service',
                        ]),
                    ],
                    'current_odometer' => [
                        'sometimes',
                        'numeric',
                        'min:0',
                    ],
                    'notes' => [
                        'sometimes',
                        'nullable',
                        'string',
                    ],
                ]);

            if (empty($validated)) {
                abort(
                    403,
                    'You do not have permission to modify these vehicle fields.'
                );
            }

            $vehicle->update($validated);
        }

        else {
            abort(403);
        }

        $vehicle =
            $vehicle
                ->fresh()
                ->load('drivers');

        $newAuditValues =
            $this->getVehicleAuditValues(
                $vehicle
            );

        $changedOldValues = [];
        $changedNewValues = [];

        foreach (
            $newAuditValues
            as $field => $newValue
        ) {
            $oldValue =
                $oldAuditValues[$field]
                ?? null;

            if (
                (string) $oldValue !==
                (string) $newValue
            ) {
                $changedOldValues[$field] =
                    $oldValue;

                $changedNewValues[$field] =
                    $newValue;
            }
        }

        if (!empty($changedNewValues)) {
            $action = 'Updated';

            if (
                array_key_exists(
                    'assigned_driver_id',
                    $changedNewValues
                )
            ) {
                if (
                    $changedNewValues[
                        'assigned_driver_id'
                    ] === null
                ) {
                    $action =
                        'Driver Unassigned';
                } elseif (
                    $changedOldValues[
                        'assigned_driver_id'
                    ] === null
                ) {
                    $action =
                        'Driver Assigned';
                } else {
                    $action =
                        'Driver Reassigned';
                }
            } elseif (
                array_key_exists(
                    'status',
                    $changedNewValues
                )
            ) {
                $action =
                    'Status Changed';
            }

            $description = match ($action) {
                'Driver Assigned' =>
                    "Assigned a driver to vehicle {$vehicle->plate_number}.",
                'Driver Unassigned' =>
                    "Unassigned the driver from vehicle {$vehicle->plate_number}.",
                'Driver Reassigned' =>
                    "Reassigned the driver for vehicle {$vehicle->plate_number}.",
                'Status Changed' =>
                    "Changed the status of vehicle {$vehicle->plate_number}.",
                default =>
                    "Updated vehicle {$vehicle->plate_number}.",
            };

            AuditLogService::log(
                module: 'Vehicle Management',
                action: $action,
                description: $description,
                record: $vehicle,
                oldValues:
                    $changedOldValues,
                newValues:
                    $changedNewValues
            );
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Vehicle updated successfully.',
            'vehicle' =>
                $vehicle->fresh()->load('drivers'),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vehicle $vehicle)
    {
        $this->authorize('delete', $vehicle);

        $vehicle->load('drivers');

        $deletedValues =
            $this->getVehicleAuditValues(
                $vehicle
            );

        DB::transaction(
            function () use (
                $vehicle,
                $deletedValues
            ) {
                AuditLogService::log(
                    module: 'Vehicle Management',
                    action: 'Deleted',
                    description:
                        "Deleted vehicle {$vehicle->plate_number}.",
                    record: $vehicle,
                    oldValues:
                        $deletedValues
                );

                $vehicle->delete();
            }
        );

        return response()->json([
            'success' => true,
            'message' => 'Vehicle deleted successfully.'
        ]);
    }

    // Bulk Delete
    public function bulkDelete(Request $request)
    {   
        $this->authorize('deleteAny', Vehicle::class);

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:vehicles,id',
        ]);

        $vehicles =
            Vehicle::with('drivers')
                ->whereIn(
                    'id',
                    $request->ids
                )
                ->get();

        DB::transaction(
            function () use ($vehicles) {
                foreach ($vehicles as $vehicle) {
                    $deletedValues =
                        $this->getVehicleAuditValues(
                            $vehicle
                        );

                    AuditLogService::log(
                        module: 'Vehicle Management',
                        action: 'Deleted',
                        description:
                            "Deleted vehicle {$vehicle->plate_number}.",
                        record: $vehicle,
                        oldValues:
                            $deletedValues
                    );

                    $vehicle->delete();
                }
            }
        );

        return response()->json([
            'success' => true,
            'message' => 'Vehicle(s) deleted successfully.',
        ]);
    }

    public function stats(
        Request $request
    ) {
        $this->authorize(
            'viewAny',
            Vehicle::class
        );

        $user =
            $request->user();

        $baseQuery =
            $this->applyVehicleVisibility(
                Vehicle::query(),
                $user
            );

        return response()->json([
            'total' =>
                (clone $baseQuery)
                    ->count(),
            'available' =>
                (clone $baseQuery)
                    ->where(
                        'status',
                        'Available'
                    )
                    ->count(),
            'on_trip' =>
                (clone $baseQuery)
                    ->where(
                        'status',
                        'On Trip'
                    )
                    ->count(),
            'maintenance' =>
                (clone $baseQuery)
                    ->where(
                        'status',
                        'Maintenance'
                    )
                    ->count(),
            'out_of_service' =>
                (clone $baseQuery)
                    ->where(
                        'status',
                        'Out of Service'
                    )
                    ->count(),
        ]);
    }

    public function available(
        Request $request
    ) {
        $this->authorize(
            'viewAny',
            Vehicle::class
        );

        $query =
            Vehicle::with('drivers');

        $query =
            $this->applyVehicleVisibility(
                $query,
                $request->user()
            );

        $vehicles =
            $query
                ->where(
                    'status',
                    'Available'
                )
                ->orderBy('brand')
                ->orderBy('model')
                ->get([
                    'id',
                    'brand',
                    'model',
                    'vehicle_type',
                    'department',
                    'fuel_type',
                    'tank_capacity',
                    'current_fuel',
                    'current_odometer',
                    'status',
                ]);

        return response()->json(
            $vehicles
        );
    }

    private function applyVehicleVisibility(
        $query,
        $user
    ) {
        /*
        |--------------------------------------------------------------------------
        | Driver - Assigned Vehicle Only
        |--------------------------------------------------------------------------
        |
        | Drivers may only see the vehicle currently assigned to
        | their Driver profile.
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driver =
                $user->driverProfile;

            if (
                $driver &&
                $driver->assigned_vehicle_id
            ) {
                $query->where(
                    'vehicles.id',
                    $driver->assigned_vehicle_id
                );
            } else {
                /*
                |--------------------------------------------------------------------------
                | Driver Has No Assigned Vehicle
                |--------------------------------------------------------------------------
                |
                | Return zero vehicles instead of exposing the full fleet.
                |--------------------------------------------------------------------------
                */
                $query->whereRaw('1 = 0');
            }
        }

        return $query;
    }

    private function getVehicleAuditValues(
        Vehicle $vehicle
    ): array {
        $vehicle->loadMissing('drivers');

        $driver =
            $vehicle->drivers->first();

        return [
            'plate_number' =>
                $vehicle->plate_number,

            'vehicle_type' =>
                $vehicle->vehicle_type,

            'department' =>
                $vehicle->department,

            'brand' =>
                $vehicle->brand,

            'model' =>
                $vehicle->model,

            'capacity' =>
                $vehicle->capacity,

            'fuel_type' =>
                $vehicle->fuel_type,

            'tank_capacity' =>
                $vehicle->tank_capacity,

            'current_fuel' =>
                $vehicle->current_fuel,

            'current_odometer' =>
                $vehicle->current_odometer,

            'status' =>
                $vehicle->status,

            'assigned_driver_id' =>
                $driver?->id,
        ];
    }

}

