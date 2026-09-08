<?php

namespace App\Http\Controllers;

use App\Models\Maintenance;
use App\Models\Vehicle;
use App\Models\FleetSetting;
use App\Services\FleetNotificationService;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MaintenanceController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of maintenance records.
     */
    private function getMaintenanceSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();
        $settings = $record?->settings ?? [];
        $maintenanceSettings =
            $settings['maintenance'] ?? [];
        return [
            'overdueWarnDays' => max(
                1,
                min(
                    90,
                    (int) (
                        $maintenanceSettings['overdueWarnDays']
                        ?? 3
                    )
                )
            ),

            'requireCost' =>
                $maintenanceSettings['requireCost']
                ?? true,

            'defaultType' =>
                trim(
                    (string) (
                        $maintenanceSettings['defaultType']
                        ?? 'Preventive Maintenance'
                    )
                ) ?: 'Preventive Maintenance',
        ];
    }

    private function getMaintenanceScheduleState(
        ?string $nextSchedule,
        int $warningDays
    ): array {
        if (!$nextSchedule) {
            return [
                'days' => null,
                'overdue' => false,
                'dueSoon' => false,
            ];
        }

        $today = now()->startOfDay();

        $schedule = Carbon::parse(
            $nextSchedule
        )->startOfDay();

        $days =
            $today->diffInDays(
                $schedule,
                false
            );

        return [
            'days' => $days,
            'overdue' => $days < 0,
            'dueSoon' =>
                $days >= 0 &&
                $days <= $warningDays,
        ];
    }

    private function createMaintenanceDueNotification(
        Maintenance $maintenance,
        int $warningDays
    ): void {
        if (!$maintenance->next_schedule) {
            return;
        }

        $state =
            $this->getMaintenanceScheduleState(
                Carbon::parse(
                    $maintenance->next_schedule
                )->format('Y-m-d'),
                $warningDays
            );

        if (
            !$state['overdue'] &&
            !$state['dueSoon']
        ) {
            return;
        }

        $vehicleLabel = trim(
            ($maintenance->vehicle?->brand ?? '') .
            ' ' .
            ($maintenance->vehicle?->model ?? '')
        );

        if ($vehicleLabel === '') {
            $vehicleLabel = 'Vehicle';
        }

        if ($state['overdue']) {
            $daysOverdue =
                abs($state['days']);

            $message =
                "{$vehicleLabel} maintenance {$maintenance->maintenance_number} is overdue by {$daysOverdue} day" .
                ($daysOverdue === 1 ? '' : 's') .
                '.';
        } else {
            $days =
                $state['days'];

            $when =
                $days === 0
                    ? 'today'
                    : "in {$days} day" .
                        ($days === 1 ? '' : 's');

            $message =
                "{$vehicleLabel} maintenance {$maintenance->maintenance_number} is due {$when}.";
        }

        $eventKey =
            'maintenance_due:' .
            $maintenance->id .
            ':' .
            Carbon::parse(
                $maintenance->next_schedule
            )->format('Y-m-d');

        FleetNotificationService::createUniqueWhenEnabled(
            'maintenanceDue',
            $state['overdue']
                ? 'Maintenance Overdue'
                : 'Maintenance Due Soon',
            $message,
            $eventKey,
            true,
            route('maintenance')
        );
    }

    /**
     * Generate the next maintenance number.
     *
     * Format:
     * MNT-YYYYMM-0001
     */
    private function generateMaintenanceNumber(): string
    {
        $year =
            now()->format('Y');

        $month =
            now()->format('m');

        $prefix =
            'MNT-' .
            $year .
            '-' .
            $month;

        $latestNumber =
            Maintenance::query()
                ->where(
                    'maintenance_number',
                    'like',
                    $prefix . '%'
                )
                ->orderByDesc(
                    'maintenance_number'
                )
                ->value(
                    'maintenance_number'
                );

        $nextSequence = 1;

        if ($latestNumber) {
            /*
            |--------------------------------------------------------------------------
            | Example:
            |
            | MNT-2026-08015
            |
            | Prefix:
            | MNT-2026-08
            |
            | Sequence:
            | 015
            |--------------------------------------------------------------------------
            */
            $lastSequence =
                (int) substr(
                    $latestNumber,
                    strlen($prefix)
                );

            $nextSequence =
                $lastSequence + 1;
        }

        return
            $prefix .
            str_pad(
                (string) $nextSequence,
                3,
                '0',
                STR_PAD_LEFT
            );
    }

    /**
     * Preview next maintenance number
     * for the Add Maintenance modal.
     */
    public function nextNumber()
    {
        $this->authorize(
            'create',
            Maintenance::class
        );

        return response()->json([
            'maintenance_number' =>
                $this->generateMaintenanceNumber(),
        ]);
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Maintenance::class);

        $user = $request->user();

        $maintenanceSettings =
            $this->getMaintenanceSettings();

        $warningDays =
            $maintenanceSettings['overdueWarnDays'];

        $maintenances = Maintenance::with('vehicle')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($maintenance) use ($warningDays) {
                $daysUntilNextSchedule = null;
                $isOverdue = false;
                $isDueSoon = false;

                if ($maintenance->next_schedule) {
                    $today = now()->startOfDay();

                    $nextSchedule =
                        Carbon::parse(
                            $maintenance->next_schedule
                        )->startOfDay();

                    $daysUntilNextSchedule =
                        $today->diffInDays(
                            $nextSchedule,
                            false
                        );

                    $isOverdue =
                        $daysUntilNextSchedule < 0;

                    $isDueSoon =
                        !$isOverdue &&
                        $daysUntilNextSchedule <=
                            $warningDays;
                }

                $maintenance->setAttribute(
                    'days_until_next_schedule',
                    $daysUntilNextSchedule
                );

                $maintenance->setAttribute(
                    'maintenance_overdue',
                    $isOverdue
                );

                $maintenance->setAttribute(
                    'maintenance_due_soon',
                    $isDueSoon
                );

                return $maintenance;
            });

        if ($request->expectsJson()) {
            return response()->json([
                'maintenances' =>
                    $maintenances,

                'settings' => [
                    'overdue_warn_days' =>
                        $warningDays,
                ],
            ]);
        }

        $maintenancePermissions = [
            'role' =>
                $user->role,
            'canCreate' =>
                $user->can(
                    'create',
                    Maintenance::class
                ),
            'canUpdate' =>
                $user->hasRole(
                    'fleet_manager',
                    'maintenance'
                ),
            'canDelete' =>
                $user->hasRole(
                    'fleet_manager',
                    'maintenance'
                ),
            'canBulkDelete' =>
                $user->hasRole(
                    'fleet_manager',
                    'maintenance'
                ),
        ];
        return view(
            'maintenance.index',
            compact('maintenancePermissions')
        );
    }

    /**
     * Get vehicles available for maintenance scheduling.
     */
    public function availableVehicles()
    {
        $this->authorize('create', Maintenance::class);

        $vehicles = Vehicle::where('status', 'Available')
            ->orderBy('brand')
            ->orderBy('model')
            ->get();

        return response()->json([
            'vehicles' => $vehicles,
        ]);
    }

    /**
     * Store a newly created maintenance record.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Maintenance::class);

        $maintenanceSettings =
        $this->getMaintenanceSettings();
        if (!$request->filled('maintenance_type')) {
            $request->merge([
                'maintenance_type' =>
                    $maintenanceSettings['defaultType'],
            ]);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'vehicle_id' => [
                    'required',
                    'exists:vehicles,id',
                ],

                'maintenance_type' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'description' => [
                    'required',
                    'string',
                ],

                'maintenance_date' => [
                    'required',
                    'date',
                ],

                'completion_date' => [
                    'nullable',
                    'date',
                    'after_or_equal:maintenance_date',
                ],

                'next_schedule' => [
                    'nullable',
                    'date',
                ],

                'technician' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'priority' => [
                    'required',
                    'in:Low,Normal,High,Emergency',
                ],

                'odometer' => [
                    'nullable',
                    'integer',
                    'min:0',
                ],

                'parts_used' => [
                    'nullable',
                    'string',
                ],

                'cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],

                'status' => [
                    'required',
                    'in:Scheduled,In Progress,Completed,Cancelled',
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
                'message' => 'Please check the maintenance information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = DB::transaction(function () use (
                $validator,
                $maintenanceSettings
            ) {
                $validated = $validator->validated();

                $validated['maintenance_number'] =
                    $this->generateMaintenanceNumber();

                if (
                    $maintenanceSettings['requireCost'] &&
                    ($validated['status'] ?? null) === 'Completed' &&
                    (
                        !isset($validated['cost']) ||
                        $validated['cost'] === null ||
                        $validated['cost'] === ''
                    )
                ) {
                    throw new \Exception(
                        'Cost is required when maintenance is completed.'
                    );
                }

                $vehicle = Vehicle::lockForUpdate()
                    ->findOrFail($validated['vehicle_id']);

                /*
                |--------------------------------------------------------------------------
                | Vehicle must be Available for a new maintenance record
                |--------------------------------------------------------------------------
                */
                if ($vehicle->status !== 'Available') {
                    throw new \Exception(
                        "Vehicle {$vehicle->brand} {$vehicle->model} is currently {$vehicle->status} and cannot be scheduled for maintenance."
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Create Maintenance
                |--------------------------------------------------------------------------
                */
                $maintenance = Maintenance::create(
                    $validated
                );

                /*
                |--------------------------------------------------------------------------
                | If created directly as In Progress,
                | set Vehicle to Maintenance.
                |--------------------------------------------------------------------------
                */
                if ($validated['status'] === 'In Progress') {
                    $vehicle->update([
                        'status' => 'Maintenance',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | If created as Completed,
                | keep Vehicle Available.
                |--------------------------------------------------------------------------
                */
                if ($validated['status'] === 'Completed') {
                    $vehicle->update([
                        'status' => 'Available',
                    ]);
                }

                $maintenance->load('vehicle');

                AuditLogService::log(
                    module: 'Maintenance Management',
                    action: 'Created',
                    description:
                        "Created maintenance record {$maintenance->maintenance_number}.",
                    record: $maintenance,
                    newValues:
                        $this->getMaintenanceAuditValues(
                            $maintenance
                        )
                );

                return $maintenance;
            });

            $this->createMaintenanceDueNotification(
                $result,
                $maintenanceSettings['overdueWarnDays']
            );

            return response()->json([
                'success' => true,
                'message' => 'Maintenance record added successfully.',
                'maintenance' => $result,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display the specified maintenance record.
     */
    public function show(Maintenance $maintenance)
    {
        $this->authorize('view', $maintenance);

        $maintenance->load('vehicle');

        return response()->json([
            'maintenance' => $maintenance,
        ]);
    }

    /**
     * Update the specified maintenance record.
     */
    public function update(
        Request $request,
        Maintenance $maintenance
    ) {
        $this->authorize('update', $maintenance);
        
        $maintenanceSettings =
            $this->getMaintenanceSettings();

        $validator = Validator::make(
            $request->all(),
            [
                'vehicle_id' => [
                    'required',
                    'exists:vehicles,id',
                ],
                'maintenance_type' => [
                    'required',
                    'string',
                    'max:100',
                ],
                'description' => [
                    'required',
                    'string',
                ],
                'maintenance_date' => [
                    'required',
                    'date',
                ],
                'completion_date' => [
                    'nullable',
                    'date',
                    'after_or_equal:maintenance_date',
                ],
                'next_schedule' => [
                    'nullable',
                    'date',
                ],
                'technician' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
                'priority' => [
                    'required',
                    'in:Low,Normal,High,Emergency',
                ],
                'odometer' => [
                    'nullable',
                    'integer',
                    'min:0',
                ],
                'parts_used' => [
                    'nullable',
                    'string',
                ],
                'cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'status' => [
                    'required',
                    'in:Scheduled,In Progress,Completed,Cancelled',
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
                'message' => 'Please check the maintenance information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = DB::transaction(function () use (
                $validator,
                $maintenance,
                $maintenanceSettings
            ) {
                /*
                |--------------------------------------------------------------------------
                | Lock Maintenance
                |--------------------------------------------------------------------------
                */
                $maintenance = Maintenance::lockForUpdate()
                    ->findOrFail($maintenance->id);

                $oldAuditValues =
                    $this->getMaintenanceAuditValues(
                        $maintenance
                    );

                $previousNextSchedule =
                    $maintenance->next_schedule
                        ? Carbon::parse(
                            $maintenance->next_schedule
                        )->format('Y-m-d')
                        : null;

                $previousStatus =
                    $maintenance->status;

                /*
                |--------------------------------------------------------------------------
                | Get Current + Requested Vehicle
                |--------------------------------------------------------------------------
                */
                $currentVehicle = Vehicle::lockForUpdate()
                    ->findOrFail($maintenance->vehicle_id);

                $validated = $validator->validated();

                $maintenance->fill($validated);

                $newVehicleId = (int) $validated['vehicle_id'];
                $currentVehicleId = (int) $maintenance->vehicle_id;

                $currentStatus = $maintenance->status;
                $newStatus = $validated['status'];

                if (
                    $maintenanceSettings['requireCost'] &&
                    $newStatus === 'Completed' &&
                    (
                        !isset($validated['cost']) ||
                        $validated['cost'] === null ||
                        $validated['cost'] === ''
                    )
                ) {
                    throw new \Exception(
                        'Cost is required before maintenance can be completed.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Maintenance Status Lifecycle
                |--------------------------------------------------------------------------
                */
                $allowedTransitions = [
                    'Scheduled' => [
                        'In Progress',
                        'Cancelled',
                    ],
                    'In Progress' => [
                        'Completed',
                        'Cancelled',
                    ],
                    'Completed' => [],
                    'Cancelled' => [],
                ];
                /*
                |--------------------------------------------------------------------------
                | Prevent Invalid Status Transition
                |--------------------------------------------------------------------------
                */
                if (
                    $currentStatus !== $newStatus &&
                    !in_array(
                        $newStatus,
                        $allowedTransitions[$currentStatus] ?? []
                    )
                ) {
                    throw new \Exception(
                        "Cannot change maintenance status from {$currentStatus} to {$newStatus}."
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Vehicle Change Rules
                |--------------------------------------------------------------------------
                |
                | Only Scheduled maintenance may change vehicle.
                |
                */
                if ($newVehicleId !== $currentVehicleId) {

                    if ($currentStatus !== 'Scheduled') {
                        throw new \Exception(
                            'The vehicle cannot be changed once maintenance has started or has already been completed or cancelled.'
                        );
                    }

                    $newVehicle = Vehicle::lockForUpdate()
                        ->findOrFail($newVehicleId);

                    if ($newVehicle->status !== 'Available') {
                        throw new \Exception(
                            "Vehicle {$newVehicle->brand} {$newVehicle->model} is currently {$newVehicle->status} and cannot be assigned."
                        );
                    }
                    /*
                    | Current vehicle remains Available because Scheduled
                    | maintenance has not started yet.
                    |
                    */
                    $maintenance->vehicle_id = $newVehicleId;
                }
                /*
                |--------------------------------------------------------------------------
                | Start Maintenance
                |--------------------------------------------------------------------------
                |
                | Scheduled → In Progress
                | Vehicle: Available → Maintenance
                |
                */
                if (
                    $currentStatus !== 'In Progress' &&
                    $newStatus === 'In Progress'
                ) {
                    /*
                    | If vehicle was changed above, use the new vehicle.
                    */
                    $activeVehicle = $newVehicleId !== $currentVehicleId
                        ? Vehicle::lockForUpdate()
                            ->findOrFail($newVehicleId)
                        : $currentVehicle;

                    if ($activeVehicle->status !== 'Available') {
                        throw new \Exception(
                            "Vehicle {$activeVehicle->brand} {$activeVehicle->model} is currently {$activeVehicle->status} and cannot start maintenance."
                        );
                    }

                    $activeVehicle->update([
                        'status' => 'Maintenance',
                    ]);
                }
                /*
                |--------------------------------------------------------------------------
                | Complete Maintenance
                |--------------------------------------------------------------------------
                |
                | In Progress → Completed
                | Vehicle: Maintenance → Available
                |
                */
                if (
                    $currentStatus !== 'Completed' &&
                    $newStatus === 'Completed'
                ) {
                    /*
                    | The vehicle associated with this maintenance becomes
                    | available again.
                    */
                    $completionVehicle = $newVehicleId !== $currentVehicleId
                        ? Vehicle::lockForUpdate()
                            ->findOrFail($newVehicleId)
                        : $currentVehicle;

                    if ($completionVehicle->status === 'Maintenance') {
                        $completionVehicle->update([
                            'status' => 'Available',
                        ]);
                    }

                    if (empty($validated['completion_date'])) {
                        $validated['completion_date'] =
                            now()->toDateString();
                    }
                }
                /*
                |--------------------------------------------------------------------------
                | Cancel Maintenance
                |--------------------------------------------------------------------------
                |
                | If maintenance was In Progress:
                | Vehicle: Maintenance → Available
                |
                */
                if (
                    $currentStatus !== 'Cancelled' &&
                    $newStatus === 'Cancelled'
                ) {
                    if (
                        $currentVehicle->status === 'Maintenance'
                    ) {
                        $currentVehicle->update([
                            'status' => 'Available',
                        ]);
                    }
                    /*
                    | If it was never started, its vehicle stays Available.
                    */
                }
                /*
                |--------------------------------------------------------------------------
                | Update Maintenance
                |--------------------------------------------------------------------------
                */
                $maintenance->fill($validated);
                $maintenance->save();

                $maintenance->refresh();

                $newAuditValues =
                    $this->getMaintenanceAuditValues(
                        $maintenance
                    );

                $this->logMaintenanceUpdate(
                    $maintenance,
                    $oldAuditValues,
                    $newAuditValues
                );

                /*
                |--------------------------------------------------------------------------
                | Load Updated Vehicle
                |--------------------------------------------------------------------------
                */
                $maintenance->load('vehicle');

                return [
                    'maintenance' =>
                        $maintenance,
                    'previousNextSchedule' =>
                        $previousNextSchedule,
                    'previousStatus' =>
                        $previousStatus,
                ];
            });

            $updatedMaintenance =
                $result['maintenance'];
            $currentNextSchedule =
                $updatedMaintenance->next_schedule
                    ? Carbon::parse(
                        $updatedMaintenance->next_schedule
                    )->format('Y-m-d')
                    : null;
            $scheduleChanged =
                $result['previousNextSchedule'] !==
                $currentNextSchedule;
            $statusChanged =
                $result['previousStatus'] !==
                $updatedMaintenance->status;

            if (
                $currentNextSchedule &&
                (
                    $scheduleChanged ||
                    $statusChanged
                )
            ) {
                $this->createMaintenanceDueNotification(
                    $updatedMaintenance,
                    $maintenanceSettings['overdueWarnDays']
                );
            }

            return response()->json([
                'success' => true,
                'message' =>
                    'Maintenance record updated successfully.',
                'maintenance' =>
                    $updatedMaintenance,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Remove the specified maintenance record.
     */
    public function destroy(Maintenance $maintenance)
    {
        $this->authorize('delete', $maintenance);

        try {
            DB::transaction(function () use ($maintenance) {
                $maintenance->load('vehicle');

                /*
                |--------------------------------------------------------------------------
                | Do not delete active maintenance
                |--------------------------------------------------------------------------
                */
                if ($maintenance->status === 'In Progress') {
                    throw new \Exception(
                        'In-progress maintenance cannot be deleted.'
                    );
                }

                $vehicle = $maintenance->vehicle;

                $deletedValues =
                    $this->getMaintenanceAuditValues(
                        $maintenance
                    );

                AuditLogService::log(
                    module: 'Maintenance Management',
                    action: 'Deleted',
                    description:
                        "Deleted maintenance record {$maintenance->maintenance_number}.",
                    record: $maintenance,
                    oldValues:
                        $deletedValues
                );

                $maintenance->delete();

                $maintenance->delete();

                /*
                |--------------------------------------------------------------------------
                | If the deleted record was controlling the vehicle,
                | release the vehicle.
                |--------------------------------------------------------------------------
                */
                if (
                    $vehicle &&
                    $vehicle->status === 'Maintenance'
                ) {
                    $vehicle->update([
                        'status' => 'Available',
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Maintenance record deleted successfully.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Bulk delete maintenance records.
     */
    public function bulkDelete(Request $request)
    {
        $this->authorize('deleteAny', Maintenance::class);
        
        $validator = Validator::make(
            $request->all(),
            [
                'maintenance_ids' => [
                    'required',
                    'array',
                    'min:1',
                ],

                'maintenance_ids.*' => [
                    'integer',
                    'exists:maintenances,id',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please select valid maintenance records.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $deletedIds = [];

            DB::transaction(function () use (
                $validator,
                &$deletedIds
            ) {
                $maintenanceIds =
                    $validator->validated()['maintenance_ids'];

                $maintenances = Maintenance::with('vehicle')
                    ->whereIn('id', $maintenanceIds)
                    ->lockForUpdate()
                    ->get();

                foreach ($maintenances as $maintenance) {
                    if ($maintenance->status === 'In Progress') {
                        continue;
                    }

                    $vehicle = $maintenance->vehicle;

                    $deletedValues =
                        $this->getMaintenanceAuditValues(
                            $maintenance
                        );

                    AuditLogService::log(
                        module: 'Maintenance Management',
                        action: 'Deleted',
                        description:
                            "Deleted maintenance record {$maintenance->maintenance_number}.",
                        record: $maintenance,
                        oldValues:
                            $deletedValues
                    );

                    $maintenance->delete();

                    if (
                        $vehicle &&
                        $vehicle->status === 'Maintenance'
                    ) {
                        $vehicle->update([
                            'status' => 'Available',
                        ]);
                    }

                    $deletedIds[] = $maintenance->id;
                }
            });

            if (empty($deletedIds)) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'In-progress maintenance records cannot be deleted.',
                    'deleted_ids' => [],
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' =>
                    count($deletedIds) === 1
                        ? 'Maintenance record deleted successfully.'
                        : count($deletedIds) . ' maintenance records deleted successfully.',
                'deleted_ids' => $deletedIds,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete maintenance records.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function getMaintenanceAuditValues(
        Maintenance $maintenance
    ): array {
        return [
            'maintenance_number' =>
                $maintenance->maintenance_number,

            'vehicle_id' =>
                $maintenance->vehicle_id,

            'maintenance_type' =>
                $maintenance->maintenance_type,

            'maintenance_date' =>
                $maintenance->maintenance_date
                    ? Carbon::parse(
                        $maintenance->maintenance_date
                    )->format('Y-m-d')
                    : null,

            'completion_date' =>
                $maintenance->completion_date
                    ? Carbon::parse(
                        $maintenance->completion_date
                    )->format('Y-m-d')
                    : null,

            'next_schedule' =>
                $maintenance->next_schedule
                    ? Carbon::parse(
                        $maintenance->next_schedule
                    )->format('Y-m-d')
                    : null,

            'technician' =>
                $maintenance->technician,

            'priority' =>
                $maintenance->priority,

            'odometer' =>
                $maintenance->odometer,

            'cost' =>
                $maintenance->cost,

            'status' =>
                $maintenance->status,
        ];
    }

    private function logMaintenanceUpdate(
        Maintenance $maintenance,
        array $oldValues,
        array $newValues
    ): void {
        $changedOldValues = [];
        $changedNewValues = [];

        foreach ($newValues as $field => $newValue) {
            $oldValue =
                $oldValues[$field] ?? null;

            if ((string) $oldValue !== (string) $newValue) {
                $changedOldValues[$field] =
                    $oldValue;

                $changedNewValues[$field] =
                    $newValue;
            }
        }

        if (empty($changedNewValues)) {
            return;
        }

        $oldStatus =
            $oldValues['status'] ?? null;

        $newStatus =
            $newValues['status'] ?? null;

        $action = 'Updated';

        if (
            $oldStatus !== $newStatus &&
            $newStatus
        ) {
            $action = match ($newStatus) {
                'In Progress' =>
                    'Started',

                'Completed' =>
                    'Completed',

                'Cancelled' =>
                    'Cancelled',

                'Scheduled' =>
                    'Scheduled',

                default =>
                    'Updated',
            };
        }

        $description = match ($action) {
            'Started' =>
                "Started maintenance {$maintenance->maintenance_number}.",

            'Completed' =>
                "Completed maintenance {$maintenance->maintenance_number}.",

            'Cancelled' =>
                "Cancelled maintenance {$maintenance->maintenance_number}.",

            'Scheduled' =>
                "Scheduled maintenance {$maintenance->maintenance_number}.",

            default =>
                "Updated maintenance {$maintenance->maintenance_number}.",
        };

        AuditLogService::log(
            module: 'Maintenance Management',
            action: $action,
            description: $description,
            record: $maintenance,
            oldValues: $changedOldValues,
            newValues: $changedNewValues
        );
    }
}