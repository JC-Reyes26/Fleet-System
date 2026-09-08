<?php

namespace App\Http\Controllers;

use App\Models\FuelLog;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\FleetSetting;
use App\Services\FleetNotificationService;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class FuelLogController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of fuel records.
     */
    private function getFuelSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();
        $settings = $record?->settings ?? [];
        $fuelSettings =
            $settings['fuel'] ?? [];
        return [
            'requireOdometer' =>
                $fuelSettings['requireOdometer'] ?? true,
            'requireStation' =>
                $fuelSettings['requireStation'] ?? false,
            'highCostAlert' =>
                max(
                    0,
                    (float) (
                        $fuelSettings['highCostAlert']
                        ?? 5000
                    )
                ),
        ];
    }

    public function page(Request $request)
    {
        $user = $request->user();
        $this->authorize(
            'viewAny',
            FuelLog::class
        );
        $fuelPermissions = [
            'role' => $user->role,
            'canView' =>
                $user->can(
                    'viewAny',
                    FuelLog::class
                ),
            'canCreate' =>
                $user->can(
                    'create',
                    FuelLog::class
                ),
            'canUpdate' =>
                $user->hasRole(
                    'fleet_manager',
                    'maintenance'
                ),
            /*
            |--------------------------------------------------------------------------
            | Fuel logs are intentionally non-deletable
            |--------------------------------------------------------------------------
            */
            'canDelete' => false,
            'canBulkDelete' => false,
            'isDriver' =>
                $user->hasRole(
                    'driver'
                ),
            'viewOnly' =>
                $user->hasRole(
                    'dispatcher',
                    'finance',
                    'it_admin'
                ),
        ];

        return view(
            'fuel.index',
            compact('fuelPermissions')
        );
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', FuelLog::class);

        $user = $request->user();

        $fuelSettings =
            $this->getFuelSettings();

        $highCostAlert =
            $fuelSettings['highCostAlert'];

        $query = FuelLog::with([
            'vehicle',
            'driver',
        ]);
        /*
        |--------------------------------------------------------------------------
        | Driver Scope
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;

            if ($driverId) {
                $query->where(
                    'driver_id',
                    $driverId
                );
            } else {
                $query->whereRaw('1 = 0');
            }
        }
        $fuelLogs = $query
            ->orderBy('date', 'desc')
            ->orderBy('refuel_time', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($fuelLog) use ($highCostAlert) {
                $cost =
                    (float) $fuelLog->cost;

                $fuelLog->setAttribute(
                    'high_cost_alert',
                    $highCostAlert > 0 &&
                    $cost >= $highCostAlert
                );

                $fuelLog->setAttribute(
                    'high_cost_threshold',
                    $highCostAlert
                );

                return $fuelLog;
            });

        return response()->json([
            'fuelLogs' => $fuelLogs,

            'settings' => [
                'high_cost_alert' =>
                    $highCostAlert,
            ],
        ]);
    }

    /**
     * Store a newly created fuel record.
     */
    public function store(Request $request)
    {
        $this->authorize('create', FuelLog::class);

        $user = $request->user();

        $isDriver = $user->hasRole('driver');

        $fuelSettings =
        $this->getFuelSettings();
        $requireOdometer =
            (bool) $fuelSettings['requireOdometer'];
        $requireStation =
            (bool) $fuelSettings['requireStation'];

        $validator = Validator::make(
            $request->all(),
            [
                'vehicle_id' =>
                    $isDriver
                        ? ['nullable', 'exists:vehicles,id']
                        : ['required', 'exists:vehicles,id'],

                'driver_id' =>
                    $isDriver
                        ? ['nullable', 'exists:drivers,id']
                        : ['required', 'exists:drivers,id'],
                'fuel_amount' => [
                    'required',
                    'numeric',
                    'min:0.01',
                ],
                'cost_per_liter' => [
                    'required',
                    'numeric',
                    'min:0.01',
                ],
                /*'cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],*/
                'odometer' => [
                    $requireOdometer
                        ? 'required'
                        : 'nullable',
                    'numeric',
                    'min:0',
                ],
                'date' => [
                    'required',
                    'date',
                ],
                'refuel_time' => [
                    'nullable',
                    'date_format:H:i',
                ],
                'fuel_type' =>
                    $isDriver
                        ? [
                            'nullable',
                            'in:Diesel,Gasoline,Premium Gasoline',
                        ]
                        : [
                            'required',
                            'in:Diesel,Gasoline,Premium Gasoline',
                        ],
                'fuel_station' => [
                    $requireStation
                        ? 'required'
                        : 'nullable',
                    'string',
                    'max:255',
                ],
                'receipt_number' => [
                    'nullable',
                    'string',
                    'max:40',
                ],
                'payment_method' => [
                    'nullable',
                    'in:Fleet Card,Cash,Company Account,Other',
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
                'message' => 'Please check the fuel record information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $fuelLog = DB::transaction(function () use (
                $validator,
                $fuelSettings,
                $user
            ) {
                $validated = $validator->validated();
                /*
                |--------------------------------------------------------------------------
                | Driver Limited Access
                |--------------------------------------------------------------------------
                */
                if ($user->hasRole('driver')) {
                    $driverProfile =
                        $user->driverProfile;

                    if (!$driverProfile) {
                        throw new \Exception(
                            'Your account is not linked to a driver profile.'
                        );
                    }
                    if (
                        !$driverProfile->assigned_vehicle_id
                    ) {
                        throw new \Exception(
                            'You do not have an assigned vehicle.'
                        );
                    }
                    $assignedVehicle =
                        Vehicle::lockForUpdate()
                            ->findOrFail(
                                $driverProfile
                                    ->assigned_vehicle_id
                            );

                    /*
                    |--------------------------------------------------------------------------
                    | Never trust Driver-supplied assignment data
                    |--------------------------------------------------------------------------
                    */
                    $validated['driver_id'] =
                        $driverProfile->id;
                    $validated['vehicle_id'] =
                        $assignedVehicle->id;
                    $validated['fuel_type'] =
                        $assignedVehicle->fuel_type;
                }
                
                $validated['fuel_number'] =
                    $this->generateFuelNumber();
                /*
                |--------------------------------------------------------------------------
                | Lock Vehicle
                |--------------------------------------------------------------------------
                */
                $vehicle = Vehicle::lockForUpdate()
                    ->findOrFail(
                        $validated['vehicle_id']
                    );
                /*
                |--------------------------------------------------------------------------
                | Validate Vehicle Fuel Type
                |--------------------------------------------------------------------------
                |
                | Electric vehicles are not supported by this
                | liquid-fuel module.
                |
                */
                if (
                    $vehicle->fuel_type === 'Electric'
                ) {
                    throw new \Exception(
                        'Electric vehicles cannot be processed by the fuel refueling module.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Prevent Invalid Fuel Type
                |--------------------------------------------------------------------------
                */
                $allowedFuelTypes = [
                    'Diesel',
                    'Gasoline',
                    'Premium Gasoline',
                ];

                if (
                    !in_array(
                        $validated['fuel_type'],
                        $allowedFuelTypes,
                        true
                    )
                ) {
                    throw new \Exception(
                        'Invalid fuel type.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Validate Fuel Capacity
                |--------------------------------------------------------------------------
                */
                $currentFuel = (float) $vehicle->current_fuel;
                $tankCapacity = (float) $vehicle->tank_capacity;
                $fuelAmount = (float) $validated['fuel_amount'];

                $newFuelLevel =
                    $currentFuel + $fuelAmount;

                if (
                    $tankCapacity <= 0
                ) {
                    throw new \Exception(
                        'Vehicle tank capacity is not configured.'
                    );
                }

                if (
                    $newFuelLevel > $tankCapacity
                ) {
                    throw new \Exception(
                        "Fuel amount exceeds the vehicle's available tank capacity."
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Validate Odometer
                |--------------------------------------------------------------------------
                */
                if (
                    isset($validated['odometer']) &&
                    $validated['odometer'] !== null
                ) {
                    if (
                        (float) $validated['odometer'] <
                        (float) $vehicle->current_odometer
                    ) {
                        throw new \Exception(
                            'Odometer reading cannot be lower than the vehicle\'s current mileage.'
                        );
                    }
                }
                /*
                |--------------------------------------------------------------------------
                | Calculate Total Cost
                |--------------------------------------------------------------------------
                */
                $calculatedCost =
                    round(
                        $fuelAmount *
                        (float) $validated['cost_per_liter'],
                        2
                    );
                /*
                |--------------------------------------------------------------------------
                | Use server-calculated total cost
                |--------------------------------------------------------------------------
                */
                $validated['cost'] =
                    $calculatedCost;
                /*
                |--------------------------------------------------------------------------
                | Save Fuel Record
                |--------------------------------------------------------------------------
                */
                $fuelLog = FuelLog::create(
                    $validated
                );
                /*
                |--------------------------------------------------------------------------
                | Update Vehicle Current Fuel + Mileage
                |--------------------------------------------------------------------------
                */
                $vehicleUpdate = [
                    'current_fuel' =>
                        $newFuelLevel,
                ];

                if (
                    isset($validated['odometer']) &&
                    $validated['odometer'] !== null
                ) {
                    $vehicleUpdate['current_odometer'] =
                        $validated['odometer'];
                }

                $vehicle->update(
                    $vehicleUpdate
                );
                /*
                |--------------------------------------------------------------------------
                | Load Relationships
                |--------------------------------------------------------------------------
                */
                $fuelLog->load([
                    'vehicle',
                    'driver',
                ]);

                AuditLogService::log(
                    module: 'Fuel Management',
                    action: 'Created',
                    description:
                        "Created fuel record {$fuelLog->fuel_number}.",
                    record: $fuelLog,
                    newValues:
                        $this->getFuelAuditValues(
                            $fuelLog
                        )
                );

                $fuelLog->setAttribute(
                    'high_cost_alert',
                    $fuelSettings['highCostAlert'] > 0 &&
                    $calculatedCost >= $fuelSettings['highCostAlert']
                );

                $fuelLog->setAttribute(
                    'high_cost_threshold',
                    $fuelSettings['highCostAlert']
                );

                return $fuelLog;
            });

            $threshold =
                (float) $fuelSettings['highCostAlert'];
            $fuelCost =
                (float) $fuelLog->cost;

            if (
                $threshold > 0 &&
                $fuelCost >= $threshold
            ) {
                $vehicleLabel = trim(
                    ($fuelLog->vehicle?->brand ?? '') .
                    ' ' .
                    ($fuelLog->vehicle?->model ?? '')
                );

                if ($vehicleLabel === '') {
                    $vehicleLabel = 'selected vehicle';
                }

                FleetNotificationService::createWhenEnabled(
                    'fuelHighCost',
                    'High Fuel Cost',
                    "Fuel record {$fuelLog->fuel_number} for {$vehicleLabel} reached ₱" .
                    number_format($fuelCost, 2) .
                    ", exceeding the configured ₱" .
                    number_format($threshold, 2) .
                    ' alert threshold.',
                    false
                );
            }

            return response()->json([
                'success' => true,
                'message' =>
                    'Fuel record added successfully.',
                'fuelLog' => $fuelLog,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display the specified fuel record.
     */
    public function show(FuelLog $fuelLog)
    {
        $this->authorize('view', $fuelLog);

        $fuelLog->load([
            'vehicle',
            'driver',
        ]);

        return response()->json([
            'fuelLog' => $fuelLog,
        ]);
    }

    /**
     * Update the specified fuel record.
     *
     * Only transaction details that do not affect the vehicle's
     * recorded fuel balance and mileage can be edited.
     */
    public function update(Request $request, FuelLog $fuelLog)
    {
        $this->authorize('update', $fuelLog);
        
        $fuelSettings =
            $this->getFuelSettings();
        $requireStation =
            (bool) $fuelSettings['requireStation'];

        $validator = Validator::make(
            $request->all(),
            [
                'date' => [
                    'required',
                    'date',
                ],
                'refuel_time' => [
                    'nullable',
                    'date_format:H:i',
                ],
                'cost_per_liter' => [
                    'required',
                    'numeric',
                    'min:0.01',
                ],
                'fuel_station' => [
                    $requireStation
                        ? 'required'
                        : 'nullable',
                    'string',
                    'max:255',
                ],
                'receipt_number' => [
                    'nullable',
                    'string',
                    'max:40',
                ],
                'payment_method' => [
                    'nullable',
                    'in:Fleet Card,Cash,Company Account,Other',
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
                'message' => 'Please check the fuel record information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = DB::transaction(function () use (
                $validator,
                $fuelLog
            ) {
                /*
                |--------------------------------------------------------------------------
                | Lock Fuel Record
                |--------------------------------------------------------------------------
                */
                $fuelLog = FuelLog::lockForUpdate()
                    ->findOrFail($fuelLog->id);

                $oldAuditValues =
                    $this->getFuelAuditValues(
                        $fuelLog
                    );

                $validated = $validator->validated();

                $previousCost =
                    (float) $fuelLog->cost;

                /*
                |--------------------------------------------------------------------------
                | Recalculate Total Cost
                |--------------------------------------------------------------------------
                |
                | Quantity is preserved from the original transaction.
                | Only Cost/L can be edited.
                |
                */
                $calculatedCost = round(
                    (float) $fuelLog->fuel_amount *
                    (float) $validated['cost_per_liter'],
                    2
                );

                $validated['cost'] =
                    $calculatedCost;

                /*
                |--------------------------------------------------------------------------
                | Update Fuel Transaction
                |--------------------------------------------------------------------------
                |
                | vehicle_id
                | driver_id
                | fuel_type
                | fuel_amount
                | odometer
                | fuel_number
                |
                | are intentionally NOT changed.
                |
                */
                $fuelLog->update($validated);

                $fuelLog->refresh();

                $newAuditValues =
                    $this->getFuelAuditValues(
                        $fuelLog
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
                    AuditLogService::log(
                        module: 'Fuel Management',
                        action: 'Updated',
                        description:
                            "Updated fuel record {$fuelLog->fuel_number}.",
                        record: $fuelLog,
                        oldValues:
                            $changedOldValues,
                        newValues:
                            $changedNewValues
                    );
                }

                $fuelLog->load([
                    'vehicle',
                    'driver',
                ]);

                return [
                    'fuelLog' =>
                        $fuelLog,
                    'previousCost' =>
                        $previousCost,
                ];
            });
            $fuelLogResult =
                $result['fuelLog'];
            $previousCost =
                (float) $result['previousCost'];
            $threshold =
                (float) $fuelSettings['highCostAlert'];
            $newCost =
                (float) $fuelLogResult->cost;

            if (
                $threshold > 0 &&
                $previousCost < $threshold &&
                $newCost >= $threshold
            ) {
                $vehicleLabel = trim(
                    ($fuelLogResult->vehicle?->brand ?? '') .
                    ' ' .
                    ($fuelLogResult->vehicle?->model ?? '')
                );

                if ($vehicleLabel === '') {
                    $vehicleLabel = 'selected vehicle';
                }

                FleetNotificationService::createWhenEnabled(
                    'fuelHighCost',
                    'High Fuel Cost',
                    "Fuel record {$fuelLogResult->fuel_number} for {$vehicleLabel} reached ₱" .
                    number_format($newCost, 2) .
                    ", exceeding the configured ₱" .
                    number_format($threshold, 2) .
                    ' alert threshold.',
                    false,
                    route('fuel')
                );
            }

            return response()->json([
                'success' => true,
                'message' =>
                    'Fuel record updated successfully.',
                'fuelLog' =>
                    $fuelLogResult,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Remove the specified fuel record.
     */
    public function destroy(FuelLog $fuelLog)
    {
        $this->authorize('delete', $fuelLog);
        /*
        |--------------------------------------------------------------------------
        | Important:
        | We should NOT simply delete a fuel record after it has
        | changed the vehicle's current_fuel/current_odometer.
        |
        | For now this endpoint is intentionally restricted.
        |--------------------------------------------------------------------------
        */
        return response()->json([
            'success' => false,
            'message' =>
                'Fuel records cannot be deleted because they affect vehicle fuel and mileage history.',
        ], 422);
    }

    /**
     * Bulk delete fuel records.
     *
     * Fuel records are intentionally protected because they affect
     * vehicle fuel and mileage history.
     */
    public function bulkDelete(Request $request)
    {
        $this->authorize('deleteAny', FuelLog::class);

        $validator = Validator::make(
            $request->all(),
            [
                'ids' => [
                    'required',
                    'array',
                    'min:1',
                ],
                'ids.*' => [
                    'integer',
                    'exists:fuel_logs,id',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please select valid fuel records.',
                'errors' => $validator->errors(),
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' =>
                'Fuel records cannot be deleted because they affect vehicle fuel and mileage history.',
        ], 422);
    }


    private function generateFuelNumber(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');

        $prefix = "FUEL-{$year}-{$month}";

        $lastFuel = FuelLog::where(
            'fuel_number',
            'like',
            $prefix . '%'
        )
        ->orderByDesc('fuel_number')
        ->first();

        $nextSequence = 1;

        if ($lastFuel) {
            $lastNumber = (int) substr(
                $lastFuel->fuel_number,
                strlen($prefix)
            );

            $nextSequence = $lastNumber + 1;
        }

        return $prefix . str_pad(
            $nextSequence,
            3,
            '0',
            STR_PAD_LEFT
        );
    }
    
    public function nextNumber()
    {
        $this->authorize('create', FuelLog::class);
        
        return response()->json([
            'fuel_number' => $this->generateFuelNumber(),
        ]);
    }

    private function getFuelAuditValues(
        FuelLog $fuelLog
    ): array {
        return [
            'fuel_number' =>
                $fuelLog->fuel_number,

            'vehicle_id' =>
                $fuelLog->vehicle_id,

            'driver_id' =>
                $fuelLog->driver_id,

            'fuel_amount' =>
                $fuelLog->fuel_amount,

            'cost_per_liter' =>
                $fuelLog->cost_per_liter,

            'cost' =>
                $fuelLog->cost,

            'odometer' =>
                $fuelLog->odometer,

            'date' =>
                $fuelLog->date
                    ? \Carbon\Carbon::parse(
                        $fuelLog->date
                    )->format('Y-m-d')
                    : null,

            'refuel_time' =>
                $fuelLog->refuel_time,

            'fuel_type' =>
                $fuelLog->fuel_type,

            'fuel_station' =>
                $fuelLog->fuel_station,

            'payment_method' =>
                $fuelLog->payment_method,
        ];
    }
}
