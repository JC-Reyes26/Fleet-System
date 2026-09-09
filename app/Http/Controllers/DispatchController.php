<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\Reservation;
use App\Models\FleetSetting;
use App\Services\FleetNotificationService;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;


class DispatchController extends Controller
{   
    use AuthorizesRequests;

    private function getDispatchSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();
        $settings =
            $record?->settings ?? [];
        $dispatchSettings =
            $settings['dispatch'] ?? [];
        return [
            'showCompletedDays' =>
                max(
                    1,
                    min(
                        90,
                        (int) (
                            $dispatchSettings['showCompletedDays']
                            ?? 7
                        )
                    )
                ),
        ];
    }
    /**
     * Set vehicle and driver statuses when the trip starts.
     */
    private function setTripResourcesOnEnRoute(Reservation $reservation): void
    {
        if ($reservation->vehicle) {
            $reservation->vehicle->update([
                'status' => 'On Trip',
            ]);
        }

        if ($reservation->driver) {
            $reservation->driver->update([
                'status' => 'On Duty',
            ]);
        }
    }

    /**
     * Release vehicle and driver after completion/cancellation.
     */
    private function releaseTripResources(Reservation $reservation): void
    {
        if (
            $reservation->vehicle &&
            $reservation->vehicle->status === 'On Trip'
        ) {
            $reservation->vehicle->update([
                'status' => 'Available',
            ]);
        }

        if (
            $reservation->driver &&
            $reservation->driver->status === 'On Duty'
        ) {
            $reservation->driver->update([
                'status' => 'Available',
            ]);
        }
    }

    /**
     * Validate vehicle and driver before starting a trip.
     */
    private function validateTripResourcesAvailable(
        Reservation $reservation
    ): void {
        $vehicle = $reservation->vehicle;
        $driver = $reservation->driver;

        /*
        |--------------------------------------------------------------------------
        | Vehicle Validation
        |--------------------------------------------------------------------------
        */
        if (!$vehicle) {
            throw new \Exception(
                'No vehicle is assigned to this reservation.'
            );
        }

        if ($vehicle->status !== 'Available') {
            throw new \Exception(
                "Vehicle {$vehicle->brand} {$vehicle->model} is currently {$vehicle->status} and cannot start the trip."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Driver Validation
        |--------------------------------------------------------------------------
        */
        if (!$driver) {
            throw new \Exception(
                'No driver is assigned to this reservation.'
            );
        }

        if ($driver->status !== 'Available') {
            $driverName = trim(
                ($driver->first_name ?? '') . ' ' .
                ($driver->last_name ?? '')
            );

            throw new \Exception(
                "Driver {$driverName} is currently {$driver->status} and cannot start the trip."
            );
        }
    }

    /**
     * Display a listing of dispatches.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Dispatch::class);

        $user = $request->user();

        $dispatchSettings =
            $this->getDispatchSettings();
        $completedCutoff =
            now()->subDays(
                $dispatchSettings['showCompletedDays']
            );
        $query = Dispatch::with([
            'reservation.vehicle',
            'reservation.driver',
            'reservation.routePlan.stops',
        ]);

        /*
        |--------------------------------------------------------------------------
        | RBAC Data Scope
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;
            if ($driverId) {
                $query->whereHas(
                    'reservation',
                    function ($reservation) use ($driverId) {
                        $reservation->where(
                            'driver_id',
                            $driverId
                        );
                    }
                );
            } else {
                $query->whereRaw('1 = 0');
            }
        }
        if ($user->hasRole('department_head')) {
            if ($user->department) {
                $query->whereHas(
                    'reservation',
                    function ($reservation) use ($user) {
                        $reservation->where(
                            'department',
                            $user->department
                        );
                    }
                );
            } else {
                $query->whereRaw('1 = 0');
            }
        }
        /*
        |--------------------------------------------------------------------------
        | Completed Trip Visibility
        |--------------------------------------------------------------------------
        | Active / Cancelled dispatches remain visible.
        | Completed dispatches are shown only within the number
        | of days configured in Fleet Settings.
        */
        $query->where(function ($query) use ($completedCutoff) {
            $query
                ->where(
                    'trip_status',
                    '!=',
                    'Completed'
                )
                ->orWhere(function ($completed) use ($completedCutoff) {
                    $completed
                        ->where(
                            'trip_status',
                            'Completed'
                        )
                        ->where(
                            'updated_at',
                            '>=',
                            $completedCutoff
                        );
                });
        });
        $dispatches = $query
            ->orderBy('id', 'asc')
            ->get();

        if ($request->expectsJson()) {
            return response()->json([
                'dispatches' => $dispatches,

                'settings' => [
                    'show_completed_days' =>
                        $dispatchSettings['showCompletedDays'],
                ],
            ]);
        }

        $dispatchPermissions = [
            'role' =>
                $user->role,
            'canCreate' =>
                $user->can(
                    'create',
                    Dispatch::class
                ),
            'canUpdate' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canDelete' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canBulkDelete' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
        ];
        return view(
            'dispatch.index',
            compact('dispatchPermissions')
        );
    }

    /**
     * Get reservations available for dispatch.
     *
     * Requirements:
     * - Reservation must be Approved.
     * - Reservation must have a Route Plan.
     * - Route Plan must be Ready For Dispatch.
     * - Reservation must not already have a Dispatch.
     */
    public function availableReservations()
    {
        $this->authorize('create', Dispatch::class);

        $reservations = Reservation::with([
            'vehicle',
            'driver',
            'routePlan.stops',
        ])
            ->where('status', 'Approved')
            ->whereHas('routePlan', function ($query) {
                $query->where(
                    'status',
                    'Ready For Dispatch'
                );
            })
            ->whereDoesntHave('dispatch')
            ->orderBy('schedule_date', 'asc')
            ->orderBy('schedule_time', 'asc')
            ->get();

        return response()->json([
            'reservations' => $reservations,
        ]);
    }

    /**
     * Store a newly created dispatch.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Dispatch::class);

        $validator = Validator::make(
            $request->all(),
            [
                'dispatch_number' => [
                    'nullable',
                    'string',
                    'max:50',
                    'unique:dispatch,dispatch_number',
                ],
                'reservation_id' => [
                    'required',
                    'integer',
                    'exists:reservations,id',
                ],
                'arrival_time' => [
                    'nullable',
                ],
                'remarks' => [
                    'nullable',
                    'string',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the dispatch information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $dispatch = DB::transaction(function () use ($validator) {
                $validated = $validator->validated();

                /*
                |--------------------------------------------------------------------------
                | Find and Lock Reservation
                |--------------------------------------------------------------------------
                */
                $reservation = Reservation::with([
                    'vehicle',
                    'driver',
                    'routePlan.stops',
                ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $validated['reservation_id']
                    );

                /*
                |--------------------------------------------------------------------------
                | Reservation must be Approved
                |--------------------------------------------------------------------------
                */
                if ($reservation->status !== 'Approved') {
                    throw new \Exception(
                        'Only approved reservations can be dispatched.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Route Plan must exist
                |--------------------------------------------------------------------------
                */
                $routePlan = $reservation->routePlan;

                if (!$routePlan) {
                    throw new \Exception(
                        'This reservation does not have a route plan yet.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Route Plan must be Ready For Dispatch
                |--------------------------------------------------------------------------
                */
                if ($routePlan->status !== 'Ready For Dispatch') {
                    throw new \Exception(
                        'The route plan must be Ready For Dispatch before a dispatch can be created.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Prevent Duplicate Dispatch
                |--------------------------------------------------------------------------
                */
                if ($reservation->dispatch()->exists()) {
                    throw new \Exception(
                        'This reservation already has a dispatch.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Make sure required trip resources exist
                |--------------------------------------------------------------------------
                |
                | We do not mark them On Trip yet.
                | That only happens when Dispatch becomes En Route.
                |
                */
                if (!$reservation->vehicle) {
                    throw new \Exception(
                        'No vehicle is assigned to this reservation.'
                    );
                }

                if (!$reservation->driver) {
                    throw new \Exception(
                        'No driver is assigned to this reservation.'
                    );
                }

                $dispatchNumber = $validated['dispatch_number']
                    ?? $this->generateDispatchNumber();    

                /*
                |--------------------------------------------------------------------------
                | Create Dispatch
                |--------------------------------------------------------------------------
                |
                | Schedule source:
                |
                | RoutePlan.departure_date
                | RoutePlan.departure_time
                |
                | New dispatch always starts as Pending.
                |
                */
                $dispatch = Dispatch::create([
                    'dispatch_number' => $dispatchNumber,
                    'reservation_id' => $reservation->id,
                    'dispatch_date' => $routePlan->departure_date,
                    'departure_time' => $routePlan->departure_time,
                    'arrival_time' => $validated['arrival_time'] ?? null,
                    'trip_status' => 'Pending',
                    'remarks' => $validated['remarks'] ?? null,
                ]);

                /*
                |--------------------------------------------------------------------------
                | IMPORTANT
                |--------------------------------------------------------------------------
                |
                | Reservation remains Approved while Dispatch is Pending.
                |
                | It becomes Scheduled only when Dispatch:
                |
                | Pending → Assigned
                |
                */

                $dispatch->load([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan.stops',
                ]);

                AuditLogService::log(
                    module: 'Dispatch Management',
                    action: 'Created',
                    description:
                        "Created dispatch {$dispatch->dispatch_number}.",
                    record: $dispatch,
                    newValues:
                        $this->getDispatchAuditValues(
                            $dispatch
                        )
                );

                return $dispatch;
            });

            FleetNotificationService::createWhenEnabled(
                'dispatchUpdates',
                'Dispatch Created',
                "Dispatch {$dispatch->dispatch_number} was created and is currently Pending.",
                true,
                route('dispatch')
            );

            return response()->json([
                'success' => true,
                'message' => 'Dispatch added successfully.',
                'dispatch' => $dispatch,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Update the specified dispatch.
     */
    public function update(
        Request $request,
        Dispatch $dispatch
    ) {
        $this->authorize('update', $dispatch);

        $validator = Validator::make(
            $request->all(),
            [
                'dispatch_number' => [
                    'required',
                    'string',
                    'max:50',
                    'unique:dispatch,dispatch_number,' .
                        $dispatch->id,
                ],
                'trip_status' => [
                    'required',
                    'string',
                    'max:50',
                    'in:Pending,Assigned,En Route,Arrived,Completed,Cancelled',
                ],
                'remarks' => [
                    'nullable',
                    'string',
                ]
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the dispatch information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = DB::transaction(function () use (
                $validator,
                $dispatch
            ) {
                $validated = $validator->validated();

                /*
                |--------------------------------------------------------------------------
                | Lock Dispatch + Related Data
                |--------------------------------------------------------------------------
                */
                $dispatch = Dispatch::with([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan',
                ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $dispatch->id
                    );

                $reservation = $dispatch->reservation;

                if (!$reservation) {
                    throw new \Exception(
                        'Reservation associated with this dispatch was not found.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Dispatch Status Lifecycle
                |--------------------------------------------------------------------------
                |
                | Pending
                |    ↓
                | Assigned
                |    ↓
                | En Route
                |    ↓
                | Arrived
                |    ↓
                | Completed
                |
                | Pending / Assigned / En Route can be cancelled.
                |
                */
                $allowedTransitions = [
                    'Pending' => [
                        'Assigned',
                        'Cancelled',
                    ],
                    'Assigned' => [
                        'En Route',
                        'Cancelled',
                    ],
                    'En Route' => [
                        'Arrived',
                        'Cancelled',
                    ],
                    'Arrived' => [
                        'Completed',
                    ],
                    'Completed' => [],
                    'Cancelled' => [],
                ];

                $currentStatus =
                    $dispatch->trip_status;

                $newStatus =
                    $validated['trip_status'];

                $oldAuditValues =
                    $this->getDispatchAuditValues(
                        $dispatch
                    );

                /*
                |--------------------------------------------------------------------------
                | Prevent Invalid Transition
                |--------------------------------------------------------------------------
                */
                if (
                    $currentStatus !== $newStatus &&
                    !in_array(
                        $newStatus,
                        $allowedTransitions[$currentStatus] ?? [],
                        true
                    )
                ) {
                    throw new \Exception(
                        "Cannot change dispatch status from {$currentStatus} to {$newStatus}."
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Validate resources BEFORE entering En Route
                |--------------------------------------------------------------------------
                */
                if (
                    $currentStatus !== 'En Route' &&
                    $newStatus === 'En Route'
                ) {
                    $this->validateTripResourcesAvailable(
                        $reservation
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Update Dispatch
                |--------------------------------------------------------------------------
                */
                $dispatch->update([
                    'dispatch_number' =>
                        $validated['dispatch_number'],

                    'trip_status' =>
                        $newStatus,

                    'remarks' =>
                        $validated['remarks'] ?? null,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Pending → Assigned
                |--------------------------------------------------------------------------
                |
                | Reservation:
                |
                | Approved → Scheduled
                |
                */
                if (
                    $currentStatus === 'Pending' &&
                    $newStatus === 'Assigned'
                ) {
                    $reservation->update([
                        'status' => 'Scheduled',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Assigned → En Route
                |--------------------------------------------------------------------------
                |
                | Vehicle:
                | Available → On Trip
                |
                | Driver:
                | Available → On Duty
                |
                */
                if (
                    $currentStatus === 'Assigned' &&
                    $newStatus === 'En Route'
                ) {
                    $this->setTripResourcesOnEnRoute(
                        $reservation
                    );
                }
                // En Route → Arrived
                if (
                    $currentStatus === 'En Route' &&
                    $newStatus === 'Arrived'
                ) {
                    $dispatch->update([
                        'arrival_time' => now()->format('H:i:s'),
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Arrived → Completed
                |--------------------------------------------------------------------------
                */
                if (
                    $currentStatus === 'Arrived' &&
                    $newStatus === 'Completed'
                ) {
                    /*
                    |--------------------------------------------------------------------------
                    | Reservation becomes Completed
                    |--------------------------------------------------------------------------
                    */
                    $reservation->update([
                        'status' => 'Completed',
                    ]);

                    /*
                    |--------------------------------------------------------------------------
                    | Route Plan becomes Completed
                    |--------------------------------------------------------------------------
                    */
                    if (
                        $reservation->routePlan &&
                        $reservation->routePlan->status ===
                            'Ready For Dispatch'
                    ) {
                        $reservation->routePlan->update([
                            'status' => 'Completed',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Release Vehicle + Driver
                    |--------------------------------------------------------------------------
                    */
                    $this->releaseTripResources(
                        $reservation
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Cancellation
                |--------------------------------------------------------------------------
                */
                if ($newStatus === 'Cancelled') {
                    $reservation->update([
                        'status' => 'Cancelled',
                    ]);

                    /*
                    |--------------------------------------------------------------------------
                    | If trip already started, release resources.
                    |--------------------------------------------------------------------------
                    */
                    $this->releaseTripResources(
                        $reservation
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Audit Dispatch Changes
                |--------------------------------------------------------------------------
                */
                $dispatch->refresh();

                $newAuditValues =
                    $this->getDispatchAuditValues(
                        $dispatch
                    );

                $this->logDispatchUpdate(
                    $dispatch,
                    $oldAuditValues,
                    $newAuditValues
                );

                /*
                |--------------------------------------------------------------------------
                | Reload Relationships
                |--------------------------------------------------------------------------
                */
                $dispatch->load([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan.stops',
                ]);

                return [
                    'dispatch' =>
                        $dispatch,
                    'previousStatus' =>
                        $currentStatus,
                    'newStatus' =>
                        $newStatus,
                ];
            });

            $updatedDispatch =
                $result['dispatch'];
            $previousStatus =
                $result['previousStatus'];
            $newStatus =
                $result['newStatus'];

            if (
                $previousStatus !==
                $newStatus
            ) {
                FleetNotificationService::createWhenEnabled(
                    'dispatchUpdates',
                    'Dispatch Status Updated',
                    "Dispatch {$updatedDispatch->dispatch_number} changed from {$previousStatus} to {$newStatus}.",
                    true,
                    route('dispatch')
                );
            }

            return response()->json([
                'success' => true,
                'message' =>
                    'Dispatch updated successfully.',
                'dispatch' =>
                    $updatedDispatch,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Remove the specified dispatch.
     */
    public function destroy(Dispatch $dispatch)
    {
        $this->authorize('delete', $dispatch);

        try {
            DB::transaction(function () use ($dispatch) {
                $dispatch = Dispatch::with([
                    'reservation',
                ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $dispatch->id
                    );

                $reservation =
                    $dispatch->reservation;

                if (!$reservation) {
                    throw new \Exception(
                        'Reservation associated with this dispatch was not found.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Only Pending or Assigned can be deleted.
                |--------------------------------------------------------------------------
                */
                if (
                    !in_array(
                        $dispatch->trip_status,
                        [
                            'Pending',
                            'Assigned',
                        ],
                        true
                    )
                ) {
                    throw new \Exception(
                        "Dispatch {$dispatch->dispatch_number} cannot be deleted because its current status is {$dispatch->trip_status}."
                    );
                }

                $deletedDispatchValues =
                $this->getDispatchAuditValues(
                    $dispatch
                );

                AuditLogService::log(
                    module: 'Dispatch Management',
                    action: 'Deleted',
                    description:
                        "Deleted dispatch {$dispatch->dispatch_number}.",
                    record: $dispatch,
                    oldValues:
                        $deletedDispatchValues
                );
                /*
                |--------------------------------------------------------------------------
                | Delete Dispatch
                |--------------------------------------------------------------------------
                */
                $dispatch->delete();

                /*
                |--------------------------------------------------------------------------
                | Return Reservation to Approved
                |--------------------------------------------------------------------------
                |
                | Pending:
                | Reservation should already be Approved.
                |
                | Assigned:
                | Reservation was Scheduled, so return to Approved.
                |
                */
                $reservation->update([
                    'status' => 'Approved',
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Dispatch deleted successfully.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Bulk delete selected dispatches.
     */
    public function bulkDelete(Request $request)
    {
        $this->authorize('deleteAny', Dispatch::class);

        $validator = Validator::make(
            $request->all(),
            [
                'dispatch_ids' => [
                    'required',
                    'array',
                    'min:1',
                ],

                'dispatch_ids.*' => [
                    'integer',
                    'exists:dispatch,id',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please select valid dispatches.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $dispatchIds =
            $validator->validated()['dispatch_ids'];

        try {
            $deletedIds = [];

            DB::transaction(function () use (
                $dispatchIds,
                &$deletedIds
            ) {
                $dispatches = Dispatch::with([
                    'reservation',
                ])
                    ->whereIn(
                        'id',
                        $dispatchIds
                    )
                    ->lockForUpdate()
                    ->get();

                foreach ($dispatches as $dispatch) {
                    /*
                    |--------------------------------------------------------------------------
                    | Only Pending or Assigned may be deleted.
                    |--------------------------------------------------------------------------
                    */
                    if (
                        !in_array(
                            $dispatch->trip_status,
                            [
                                'Pending',
                                'Assigned',
                            ],
                            true
                        )
                    ) {
                        continue;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Restore Reservation status.
                    |--------------------------------------------------------------------------
                    */
                    if ($dispatch->reservation) {
                        $dispatch->reservation->update([
                            'status' => 'Approved',
                        ]);
                    }

                    $deletedIds[] =
                        $dispatch->id;

                    $deletedDispatchValues =
                        $this->getDispatchAuditValues(
                            $dispatch
                        );

                    AuditLogService::log(
                        module: 'Dispatch Management',
                        action: 'Deleted',
                        description:
                            "Deleted dispatch {$dispatch->dispatch_number}.",
                        record: $dispatch,
                        oldValues:
                            $deletedDispatchValues
                    );

                    $dispatch->delete();
                }
            });

            if (empty($deletedIds)) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Only Pending or Assigned dispatches can be deleted.',
                    'deleted_ids' => [],
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' =>
                    count($deletedIds) === 1
                        ? 'Dispatch deleted successfully.'
                        : count($deletedIds) .
                            ' dispatches deleted successfully.',

                'deleted_ids' =>
                    $deletedIds,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Failed to delete dispatches.',
                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified dispatch.
     */
    public function show(Dispatch $dispatch)
    {
        $dispatch->load([
            'reservation.vehicle',
            'reservation.driver',
            'reservation.routePlan.stops',
        ]);

        $this->authorize('view', $dispatch);

        return response()->json([
            'dispatch' => $dispatch,
        ]);
    }

    /**
     * Generate the next dispatch number.
     */
    private function generateDispatchNumber(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $prefix = "DSP-{$year}-{$month}";
        $latestDispatch = Dispatch::query()
            ->where(
                'dispatch_number',
                'like',
                $prefix . '%'
            )
            ->orderByDesc('id')
            ->first();
        if (!$latestDispatch) {
            $nextSequence = 1;
        } else {
            $lastNumber = $latestDispatch->dispatch_number;
            $lastSequence = (int) substr(
                $lastNumber,
                -3
            );
            $nextSequence = $lastSequence + 1;
        }
        return $prefix . str_pad(
            $nextSequence,
            3,
            '0',
            STR_PAD_LEFT
        );
    }


    /**
     * Preview the next dispatch number.
     */
    public function nextNumber()
    {
        $this->authorize('create', Dispatch::class);
        
        return response()->json([
            'success' => true,
            'dispatch_number' => $this->generateDispatchNumber(),
        ]);
    }

    private function getDispatchAuditValues(
        Dispatch $dispatch
    ): array {
        return [
            'dispatch_number' =>
                $dispatch->dispatch_number,

            'reservation_id' =>
                $dispatch->reservation_id,

            'dispatch_date' =>
                $dispatch->dispatch_date
                    ?->format('Y-m-d'),

            'departure_time' =>
                $dispatch->departure_time,

            'arrival_time' =>
                $dispatch->arrival_time,

            'trip_status' =>
                $dispatch->trip_status,
        ];
    }

    private function logDispatchUpdate(
        Dispatch $dispatch,
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
            $oldValues['trip_status'] ?? null;

        $newStatus =
            $newValues['trip_status'] ?? null;

        $action = 'Updated';

        if (
            $oldStatus !== $newStatus &&
            $newStatus
        ) {
            $action = match ($newStatus) {
                'Assigned' =>
                    'Assigned',

                'En Route' =>
                    'En Route',

                'Arrived' =>
                    'Arrived',

                'Completed' =>
                    'Completed',

                'Cancelled' =>
                    'Cancelled',

                default =>
                    'Updated',
            };
        }

        $description = match ($action) {
            'Assigned' =>
                "Assigned dispatch {$dispatch->dispatch_number}.",

            'En Route' =>
                "Dispatch {$dispatch->dispatch_number} started the trip.",

            'Arrived' =>
                "Dispatch {$dispatch->dispatch_number} arrived at its destination.",

            'Completed' =>
                "Completed dispatch {$dispatch->dispatch_number}.",

            'Cancelled' =>
                "Cancelled dispatch {$dispatch->dispatch_number}.",

            default =>
                "Updated dispatch {$dispatch->dispatch_number}.",
        };

        AuditLogService::log(
            module: 'Dispatch Management',
            action: $action,
            description: $description,
            record: $dispatch,
            oldValues: $changedOldValues,
            newValues: $changedNewValues
        );
    }
}