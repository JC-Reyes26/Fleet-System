<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\RoutePlan;
use App\Models\FleetSetting;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class RoutePlanController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display route plans.
     */
    private function getRouteSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();

        $settings =
            $record?->settings ?? [];

        $routeSettings =
            $settings['routes'] ?? [];

        return [
            'preferOptimized' =>
                $routeSettings['preferOptimized']
                ?? true,
        ];
    }
    
    public function index(Request $request)
    {
        $this->authorize('viewAny', RoutePlan::class);

        $user = $request->user();

        $query = RoutePlan::with([
            'reservation.vehicle',
            'reservation.driver',
            'stops',
        ]);

        $query =
            $this->applyRouteVisibility(
                $query,
                $user
            );
        
        
        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */
        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('route_number', 'like', "%{$search}%")
                    ->orWhere('origin', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%")
                    ->orWhereHas('reservation', function ($reservation) use ($search) {
                        $reservation->where('reservation_number', 'like', "%{$search}%")
                            ->orWhere('patient_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('reservation.vehicle', function ($vehicle) use ($search) {
                        $vehicle->where('brand', 'like', "%{$search}%")
                            ->orWhere('model', 'like', "%{$search}%")
                            ->orWhere('plate_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('reservation.driver', function ($driver) use ($search) {
                        $driver->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        if ($request->filled('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('department') && $request->department !== 'all') {
            $query->where('department', $request->department);
        }

        if ($request->filled('date')) {
            $query->whereDate('departure_date', $request->date);
        }

        if (!$request->boolean('show_archived')) {
            $query->where('status', '!=', 'Archived');
        }

        /*
        |--------------------------------------------------------------------------
        | Sorting
        |--------------------------------------------------------------------------
        */

        $allowedSorts = [
            'route_number',
            'priority',
            'estimated_distance',
            'estimated_time',
            'status',
            'departure_date',
            'created_at',
        ];

        $sort = $request->get('sort', 'id');

        $direction = strtolower(
            $request->get('direction', 'asc')
        ) === 'desc'
            ? 'desc'
            : 'asc';

        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'id';
        }

        $routePlans = $query
            ->orderBy($sort, $direction)
            ->get();

        if ($request->expectsJson()) {
            return response()->json([
                'routePlans' => $routePlans,
            ]);
        }

        $routePermissions = [
            'role' =>
                $user->role,
            'canCreate' =>
                $user->can(
                    'create',
                    RoutePlan::class
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
            'canArchive' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canRestore' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canDuplicate' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
        ];
        return view(
            'route-planning.index',
            compact('routePermissions')
        );
    }

    /**
     * Get approved reservations that are still available for route planning.
     */
    public function availableReservations()
    {
        $this->authorize('create', RoutePlan::class);

        $reservations = Reservation::with([
            'vehicle',
            'driver',
        ])
            ->where('status', 'Approved')
            ->whereDoesntHave('routePlan')
            ->orderBy('schedule_date', 'asc')
            ->orderBy('schedule_time', 'asc')
            ->get();

        return response()->json([
            'reservations' => $reservations,
        ]);
    }

    /**
     * Store a new route plan.
     */
   public function store(Request $request)
    {
        $this->authorize('create', RoutePlan::class);

        $validator = Validator::make(
            $request->all(),
            [
                'route_number' => [
                    'nullable',
                    'string',
                    'max:50',
                    'unique:route_plans,route_number',
                ],
                'reservation_id' => [
                    'required',
                    'integer',
                    'exists:reservations,id',
                ],
                'department' => [
                    'required',
                    'string',
                    'max:100',
                ],
                'origin_latitude' => [
                    'nullable',
                    'required_with:origin_longitude',
                    'numeric',
                    'between:-90,90',
                ],
                'origin_longitude' => [
                    'nullable',
                    'required_with:origin_latitude',
                    'numeric',
                    'between:-180,180',
                ],
                'destination_latitude' => [
                    'nullable',
                    'required_with:destination_longitude',
                    'numeric',
                    'between:-90,90',
                ],
                'destination_longitude' => [
                    'nullable',
                    'required_with:destination_latitude',
                    'numeric',
                    'between:-180,180',
                ],
                'estimated_distance' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'estimated_time' => [
                    'nullable',
                    'integer',
                    'min:0',
                ],
                'optimization_strategy' => [
                    'nullable',
                    'string',
                    'max:100',
                ],
                'optimization_score' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:100',
                ],
                'purpose' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
                'notes' => [
                    'nullable',
                    'string',
                ],
                'stops' => [
                    'nullable',
                    'array',
                ],
                'stops.*.location' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'stops.*.latitude' => [
                    'nullable',
                    'required_with:stops.*.longitude',
                    'numeric',
                    'between:-90,90',
                ],
                'stops.*.longitude' => [
                    'nullable',
                    'required_with:stops.*.latitude',
                    'numeric',
                    'between:-180,180',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the route information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $routePlan = DB::transaction(function () use ($validator) {
                $validated = $validator->validated();
                /*
                |--------------------------------------------------------------------------
                | Lock Reservation
                |--------------------------------------------------------------------------
                */
                $reservation = Reservation::with([
                    'vehicle',
                    'driver',
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
                        'Only approved reservations can be planned into a route.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Prevent Duplicate Route Plan
                |--------------------------------------------------------------------------
                */
                if ($reservation->routePlan()->exists()) {
                    throw new \Exception(
                        'This reservation already has a route plan.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Vehicle and Driver are required before Route Planning
                |--------------------------------------------------------------------------
                */
                if (!$reservation->vehicle) {
                    throw new \Exception(
                        'This reservation does not have an assigned vehicle.'
                    );
                }

                if (!$reservation->driver) {
                    throw new \Exception(
                        'This reservation does not have an assigned driver.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Generate Route Number
                |--------------------------------------------------------------------------
                */
                $routeNumber = !empty($validated['route_number'])
                    ? $validated['route_number']
                    : $this->generateRouteNumber();
                /*
                |--------------------------------------------------------------------------
                | Create Draft Route Plan
                |--------------------------------------------------------------------------
                |
                | Reservation supplies the initial transportation information.
                |
                */
                $routePlan = RoutePlan::create([
                    'route_number' =>
                        $routeNumber,
                    'reservation_id' =>
                        $reservation->id,
                    'origin' =>
                        $reservation->pickup_location,
                    'origin_latitude' =>
                        $validated['origin_latitude'] ?? null,
                    'origin_longitude' =>
                        $validated['origin_longitude'] ?? null,
                    'destination' =>
                        $reservation->destination,
                    'destination_latitude' =>
                        $validated['destination_latitude'] ?? null,
                    'destination_longitude' =>
                        $validated['destination_longitude'] ?? null,
                    'priority' =>
                        $reservation->priority,
                    'department' =>
                        $validated['department'],
                    'status' =>
                        'Draft',
                    'departure_date' =>
                        $reservation->schedule_date,
                    'departure_time' =>
                        $reservation->schedule_time,
                    'estimated_distance' =>
                        $validated['estimated_distance'] ?? null,
                    'estimated_time' =>
                        $validated['estimated_time'] ?? null,
                    'optimization_strategy' =>
                        $validated['optimization_strategy'] ?? null,
                    'optimization_score' =>
                        $validated['optimization_score'] ?? null,
                    'purpose' =>
                        $validated['purpose'] ?? null,
                    'notes' =>
                        $validated['notes'] ?? null,
                ]);
                /*
                |--------------------------------------------------------------------------
                | Create Stops
                |--------------------------------------------------------------------------
                */
                foreach (
                    $validated['stops'] ?? []
                    as $index => $stop
                ) {
                    $routePlan->stops()->create([
                        'stop_order' =>
                            $index + 1,
                        'location' =>
                            $stop['location'],
                        'latitude' =>
                            $stop['latitude'] ?? null,
                        'longitude' =>
                            $stop['longitude'] ?? null,
                    ]);
                }

                $routePlan->load([
                    'reservation.vehicle',
                    'reservation.driver',
                    'stops',
                ]);

                AuditLogService::log(
                    module: 'Route Planning',
                    action: 'Created',
                    description:
                        "Created route plan {$routePlan->route_number}.",
                    record: $routePlan,
                    newValues:
                        $this->getRoutePlanAuditValues(
                            $routePlan
                        )
                );

                return $routePlan;
            });

            return response()->json([
                'success' => true,
                'message' => 'Route plan created successfully.',
                'routePlan' => $routePlan,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display a specific route plan.
     */
    public function show(RoutePlan $routePlan)
    {
        $this->authorize('view', $routePlan);

        $routePlan->load([
            'reservation.vehicle',
            'reservation.driver',
            'stops',
        ]);

        return response()->json([
            'routePlan' => $routePlan,
        ]);
    }

    /**
     * Update route plan.
     */
    public function update(
        Request $request,
        RoutePlan $routePlan
    ) {

        $this->authorize('update', $routePlan);

        $validator = Validator::make(
            $request->all(),
            [
                'origin' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'destination' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'priority' => [
                    'required',
                    'in:Low,Normal,High,Emergency',
                ],
                'department' => [
                    'required',
                    'string',
                    'max:100',
                ],
                'origin_latitude' => [
                    'nullable',
                    'required_with:origin_longitude',
                    'numeric',
                    'between:-90,90',
                ],
                'origin_longitude' => [
                    'nullable',
                    'required_with:origin_latitude',
                    'numeric',
                    'between:-180,180',
                ],
                'destination_latitude' => [
                    'nullable',
                    'required_with:destination_longitude',
                    'numeric',
                    'between:-90,90',
                ],
                'destination_longitude' => [
                    'nullable',
                    'required_with:destination_latitude',
                    'numeric',
                    'between:-180,180',
                ],
                'status' => [
                    'required',
                    'in:Draft,Planned,Ready For Dispatch,Completed,Archived',
                ],
                'estimated_distance' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'estimated_time' => [
                    'nullable',
                    'integer',
                    'min:0',
                ],
                'optimization_strategy' => [
                    'nullable',
                    'string',
                    'max:100',
                ],
                'optimization_score' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:100',
                ],
                'purpose' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
                'notes' => [
                    'nullable',
                    'string',
                ],
                'stops' => [
                    'nullable',
                    'array',
                ],
                'stops.*.location' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'stops.*.latitude' => [
                    'nullable',
                    'required_with:stops.*.longitude',
                    'numeric',
                    'between:-90,90',
                ],
                'stops.*.longitude' => [
                    'nullable',
                    'required_with:stops.*.latitude',
                    'numeric',
                    'between:-180,180',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the route information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = DB::transaction(function () use (
                $validator,
                $routePlan
            ) {
                $routePlan = RoutePlan::with([
                    'reservation.dispatch',
                ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $routePlan->id
                    );

                $validated = $validator->validated();
                /*
                |--------------------------------------------------------------------------
                | Lock Route Plan once Dispatch exists
                |--------------------------------------------------------------------------
                */
                if (
                    $routePlan->reservation &&
                    $routePlan->reservation->dispatch
                ) {
                    throw new \Exception(
                        'This route plan can no longer be modified because a dispatch has already been created.'
                    );
                }

                $currentStatus =
                    $routePlan->status;

                $newStatus =
                    $validated['status'];

                $oldAuditValues =
                    $this->getRoutePlanAuditValues(
                        $routePlan
                    );

                /*
                |--------------------------------------------------------------------------
                | Route Status Lifecycle
                |--------------------------------------------------------------------------
                */

                $allowedTransitions = [
                    'Draft' => [
                        'Planned',
                        'Archived',
                    ],
                    'Planned' => [
                        'Draft',
                        'Ready For Dispatch',
                        'Archived',
                    ],
                    'Ready For Dispatch' => [
                        'Archived',
                    ],
                    'Completed' => [
                        'Archived',
                    ],
                    'Archived' => [],
                ];

                if (
                    $currentStatus !== $newStatus &&
                    !in_array(
                        $newStatus,
                        $allowedTransitions[$currentStatus] ?? [],
                        true
                    )
                ) {
                    throw new \Exception(
                        "Cannot change route status from {$currentStatus} to {$newStatus}."
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Reservation must still be Approved
                |--------------------------------------------------------------------------
                */

                if (
                    $routePlan->reservation &&
                    $routePlan->reservation->status !== 'Approved' &&
                    $newStatus !== 'Archived'
                ) {
                    throw new \Exception(
                        'This route can no longer be modified because the reservation is no longer Approved.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Ready For Dispatch Requirements
                |--------------------------------------------------------------------------
                */

                if (
                    $newStatus === 'Ready For Dispatch'
                ) {
                    if (
                        $validated['estimated_distance'] === null ||
                        $validated['estimated_time'] === null
                    ) {
                        throw new \Exception(
                            'Estimated distance and travel time are required before marking the route Ready For Dispatch.'
                        );
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | Update Route Plan
                |--------------------------------------------------------------------------
                */

                $routePlan->update([
                    'origin' =>
                        $validated['origin'],
                    'origin_latitude' =>
                        $validated['origin_latitude'] ?? null,
                    'origin_longitude' =>
                        $validated['origin_longitude'] ?? null,
                    'destination' =>
                        $validated['destination'],
                    'destination_latitude' =>
                        $validated['destination_latitude'] ?? null,
                    'destination_longitude' =>
                        $validated['destination_longitude'] ?? null,
                    'priority' =>
                        $validated['priority'],
                    'department' =>
                        $validated['department'],
                    'status' =>
                        $newStatus,
                    'departure_date' =>
                        $routePlan->reservation->schedule_date,
                    'departure_time' =>
                        $routePlan->reservation->schedule_time,
                    'estimated_distance' =>
                        $validated['estimated_distance'] ?? null,
                    'estimated_time' =>
                        $validated['estimated_time'] ?? null,
                    'optimization_strategy' =>
                        $validated['optimization_strategy'] ?? null,
                    'optimization_score' =>
                        $validated['optimization_score'] ?? null,
                    'purpose' =>
                        $validated['purpose'] ?? null,
                    'notes' =>
                        $validated['notes'] ?? null,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Replace Stops
                |--------------------------------------------------------------------------
                */

                $routePlan->stops()->delete();

                foreach (
                    $validated['stops'] ?? []
                    as $index => $stop
                ) {
                    $routePlan->stops()->create([
                        'stop_order' =>
                            $index + 1,
                        'location' =>
                            $stop['location'],
                        'latitude' =>
                            $stop['latitude'] ?? null,
                        'longitude' =>
                            $stop['longitude'] ?? null,
                    ]);
                }

                $routePlan->refresh();

                $newAuditValues =
                    $this->getRoutePlanAuditValues(
                        $routePlan
                    );

                $this->logRoutePlanUpdate(
                    $routePlan,
                    $oldAuditValues,
                    $newAuditValues
                );

                $routePlan->load([
                    'reservation.vehicle',
                    'reservation.driver',
                    'stops',
                ]);

                return $routePlan;
            });

            return response()->json([
                'success' => true,
                'message' => 'Route plan updated successfully.',
                'routePlan' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Archive route.
     */
    public function archive(RoutePlan $routePlan)
    {
        $this->authorize('update', $routePlan);

        $routePlan->load([
            'reservation.dispatch',
        ]);
        /*
        |--------------------------------------------------------------------------
        | Prevent archiving when Dispatch already exists
        |--------------------------------------------------------------------------
        | Once the route has already been handed off to Dispatch,
        | it becomes part of the operational trip history.
        */
        if (
            $routePlan->reservation &&
            $routePlan->reservation->dispatch
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This route plan cannot be archived because a dispatch already exists for its reservation.',
            ], 422);
        }
        /*
        |--------------------------------------------------------------------------
        | Already Archived
        |--------------------------------------------------------------------------
        */
        if ($routePlan->status === 'Archived') {
            return response()->json([
                'success' => false,
                'message' => 'This route plan is already archived.',
            ], 422);
        }

        $oldValues =
            $this->getRoutePlanAuditValues(
                $routePlan
            );
        /*
        |--------------------------------------------------------------------------
        | Archive Route
        |--------------------------------------------------------------------------
        */
        $routePlan->update([
            'status' => 'Archived',
        ]);

        $routePlan->refresh();

        $newValues =
            $this->getRoutePlanAuditValues(
                $routePlan
            );

        $this->logRoutePlanUpdate(
            $routePlan,
            $oldValues,
            $newValues
        );

        return response()->json([
            'success' => true,
            'message' => 'Route plan archived successfully.',
            'routePlan' => $routePlan->fresh(),
        ]);
    }

    /**
     * Restore archived route.
     */
    public function restore(RoutePlan $routePlan)
    {
        $this->authorize('update', $routePlan);

        $routePlan->load([
            'reservation.dispatch',
        ]);
        /*
        |--------------------------------------------------------------------------
        | Only Archived Routes Can Be Restored
        |--------------------------------------------------------------------------
        */
        if ($routePlan->status !== 'Archived') {
            return response()->json([
                'success' => false,
                'message' => 'Only archived routes can be restored.',
            ], 422);
        }
        /*
        |--------------------------------------------------------------------------
        | Prevent Restore When Dispatch Exists
        |--------------------------------------------------------------------------
        | A route connected to an existing dispatch must remain part of
        | the operational trip history.
        */
        if (
            $routePlan->reservation &&
            $routePlan->reservation->dispatch
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This route plan cannot be restored because a dispatch already exists for its reservation.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Reservation Must Still Be Approved
        |--------------------------------------------------------------------------
        */
        if (
            !$routePlan->reservation ||
            $routePlan->reservation->status !== 'Approved'
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This route plan cannot be restored because its reservation is no longer Approved.',
            ], 422);
        }

        $oldValues =
            $this->getRoutePlanAuditValues(
                $routePlan
            );

        /*
        |--------------------------------------------------------------------------
        | Restore Route To Draft
        |--------------------------------------------------------------------------
        */
        $routePlan->update([
            'status' => 'Draft',
        ]);

        $routePlan->refresh();

        $newValues =
            $this->getRoutePlanAuditValues(
                $routePlan
            );

        AuditLogService::log(
            module: 'Route Planning',
            action: 'Restored',
            description:
                "Restored route {$routePlan->route_number} to Draft.",
            record: $routePlan,
            oldValues: [
                'status' =>
                    $oldValues['status'] ?? null,
            ],
            newValues: [
                'status' =>
                    $newValues['status'] ?? null,
            ]
        );

        $routePlan->load([
            'reservation.vehicle',
            'reservation.driver',
            'stops',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Route plan restored successfully.',
            'routePlan' => $routePlan,
        ]);
    }

    /**
     * Delete route plan.
     */
    public function destroy(RoutePlan $routePlan)
    {
        $this->authorize('delete', $routePlan);

        $routePlan->load([
            'reservation.dispatch',
        ]);
        /*
        |--------------------------------------------------------------------------
        | Only Draft or Planned Routes Can Be Deleted
        |--------------------------------------------------------------------------
        */
        if (
            !in_array(
                $routePlan->status,
                [
                    'Draft',
                    'Planned',
                ],
                true
            )
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Only Draft or Planned routes can be deleted.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent deletion when Dispatch exists
        |--------------------------------------------------------------------------
        | A dispatched route must remain available as part of the trip history.
        */
        if (
            $routePlan->reservation &&
            $routePlan->reservation->dispatch
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This route plan cannot be deleted because a dispatch already exists for its reservation.',
            ], 422);
        }

        $deletedValues =
            $this->getRoutePlanAuditValues(
                $routePlan
            );
        /*
        |--------------------------------------------------------------------------
        | Delete Route Plan
        |--------------------------------------------------------------------------
        | Related route stops will be deleted automatically because
        | route_stops.route_plan_id uses cascadeOnDelete().
        */
        DB::transaction(
            function () use (
                $routePlan,
                $deletedValues
            ) {
                AuditLogService::log(
                    module: 'Route Planning',
                    action: 'Deleted',
                    description:
                        "Deleted route plan {$routePlan->route_number}.",
                    record: $routePlan,
                    oldValues:
                        $deletedValues
                );

                $routePlan->delete();
            }
        );

        return response()->json([
            'success' => true,
            'message' => 'Route plan deleted successfully.',
        ]);
    }

    /**
     * Duplicate a route plan using another approved reservation.
     */
    public function duplicate(
        Request $request,
        RoutePlan $routePlan
    ) {
        $this->authorize('view', $routePlan);

        $this->authorize('create', RoutePlan::class);

        $validator = Validator::make(
            $request->all(),
            [
                'reservation_id' => [
                    'required',
                    'integer',
                    'exists:reservations,id',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Please select a valid reservation for the duplicated route.',
                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        try {
            $newRoutePlan = DB::transaction(function () use (
                $validator,
                $routePlan
            ) {
                $validated =
                    $validator->validated();
                /*
                |--------------------------------------------------------------------------
                | Load Original Route
                |--------------------------------------------------------------------------
                */
                $routePlan->load([
                    'stops',
                ]);
                /*
                |--------------------------------------------------------------------------
                | Find And Lock Target Reservation
                |--------------------------------------------------------------------------
                */
                $reservation = Reservation::with([
                    'vehicle',
                    'driver',
                ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $validated['reservation_id']
                    );
                /*
                |--------------------------------------------------------------------------
                | Target Reservation Must Be Approved
                |--------------------------------------------------------------------------
                */
                if ($reservation->status !== 'Approved') {
                    throw new \Exception(
                        'Only approved reservations can be used for a duplicated route.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Prevent Duplicate Route Plan
                |--------------------------------------------------------------------------
                */
                if ($reservation->routePlan()->exists()) {
                    throw new \Exception(
                        'The selected reservation already has a route plan.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Vehicle And Driver Must Exist
                |--------------------------------------------------------------------------
                */
                if (!$reservation->vehicle) {
                    throw new \Exception(
                        'The selected reservation does not have an assigned vehicle.'
                    );
                }
                if (!$reservation->driver) {
                    throw new \Exception(
                        'The selected reservation does not have an assigned driver.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Prevent Using Same Reservation
                |--------------------------------------------------------------------------
                */
                if (
                    (int) $routePlan->reservation_id ===
                    (int) $reservation->id
                ) {
                    throw new \Exception(
                        'The duplicated route must use a different reservation.'
                    );
                }
                /*
                |--------------------------------------------------------------------------
                | Create New Draft Route Plan
                |--------------------------------------------------------------------------
                | Reservation-derived information comes from the target Reservation.
                | Planning-specific reusable information may be copied from
                | the original route.
                */
                $copy = RoutePlan::create([
                    'route_number' =>
                        $this->generateRouteNumber(),
                    'reservation_id' =>
                        $reservation->id,
                    'origin' =>
                        $reservation->pickup_location,
                    'origin_latitude' =>
                        null,
                    'origin_longitude' =>
                        null,
                    'destination' =>
                        $reservation->destination,
                    'destination_latitude' =>
                        null,
                    'destination_longitude' =>
                        null,
                    'priority' =>
                        $reservation->priority,
                    'department' =>
                        $routePlan->department,
                    'status' =>
                        'Draft',
                    'departure_date' =>
                        $reservation->schedule_date,
                    'departure_time' =>
                        $reservation->schedule_time,
                    'estimated_distance' =>
                        null,
                    'estimated_time' =>
                        null,
                    'optimization_strategy' =>
                        $routePlan->optimization_strategy,
                    'optimization_score' =>
                        null,
                    'purpose' =>
                        $routePlan->purpose,
                    'notes' =>
                        $routePlan->notes,
                ]);
                /*
                |--------------------------------------------------------------------------
                | Copy Stops
                |--------------------------------------------------------------------------
                */
                foreach ($routePlan->stops as $stop) {
                    $copy->stops()->create([
                        'stop_order' =>
                            $stop->stop_order,
                        'location' =>
                            $stop->location,
                        'latitude' =>
                            $stop->latitude,
                        'longitude' =>
                            $stop->longitude,
                    ]);
                }
                $copy->load([
                    'reservation.vehicle',
                    'reservation.driver',
                    'stops',
                ]);

                AuditLogService::log(
                    module: 'Route Planning',
                    action: 'Duplicated',
                    description:
                        "Duplicated route {$routePlan->route_number} as {$copy->route_number}.",
                    record: $copy,
                    newValues:
                        $this->getRoutePlanAuditValues(
                            $copy
                        )
                );

                return $copy;
            });
            return response()->json([
                'success' => true,
                'message' =>
                    'Route plan duplicated successfully.',
                'routePlan' =>
                    $newRoutePlan,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }
    /**
     * Route Planning statistics.
     */
    public function stats(
        Request $request
    ) {
        $this->authorize('viewAny', RoutePlan::class);

        $user = $request->user();

        $query = RoutePlan::with([
            'reservation.vehicle',
        ]);
        $query =
            $this->applyRouteVisibility(
                $query,
                $user
            );

        $routes =
            $query->get();
        $activeRoutes =
            $routes->where(
                'status',
                '!=',
                'Archived'
            );
        $ready =
            $activeRoutes
                ->where(
                    'status',
                    'Ready For Dispatch'
                )
                ->count();
        $highPriority =
            $activeRoutes
                ->whereIn(
                    'priority',
                    [
                        'High',
                        'Emergency',
                    ]
                )
                ->count();
        $distances =
            $activeRoutes
                ->pluck(
                    'estimated_distance'
                )
                ->filter(
                    fn ($value) =>
                        $value !== null &&
                        (float) $value >= 0
                );
        $times =
            $activeRoutes
                ->pluck(
                    'estimated_time'
                )
                ->filter(
                    fn ($value) =>
                        $value !== null &&
                        (int) $value >= 0
                );
        $averageDistance =
            $distances->count() > 0
                ? round(
                    $distances->avg(),
                    1
                )
                : 0;
        $averageTime =
            $times->count() > 0
                ? round(
                    $times->avg()
                )
                : 0;
        $assignedVehicles =
            $activeRoutes
                ->map(
                    fn ($route) =>
                        $route
                            ->reservation
                            ?->vehicle_id
                )
                ->filter()
                ->unique()
                ->count();

        return response()->json([
            'total' =>
                $activeRoutes->count(),
            'ready' =>
                $ready,
            'high_priority' =>
                $highPriority,
            'average_distance' =>
                $averageDistance,
            'average_time' =>
                $averageTime,
            'assigned_vehicles' =>
                $assignedVehicles,
        ]);
    }

    /**
     * Generate route number.
     *
     * Format:
     * ROUTE-YYYY-MM###
     *
     * Example:
     * ROUTE-2026-08001
     */
    private function generateRouteNumber(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');

        $prefix =
            "ROUTE-{$year}-{$month}";

        $lastRoute = RoutePlan::where(
            'route_number',
            'like',
            $prefix . '%'
        )
            ->orderByDesc('route_number')
            ->first();

        $nextSequence = 1;

        if ($lastRoute) {
            $lastNumber = (int) substr(
                $lastRoute->route_number,
                strlen($prefix)
            );

            $nextSequence =
                $lastNumber + 1;
        }

        return $prefix .
            str_pad(
                $nextSequence,
                3,
                '0',
                STR_PAD_LEFT
            );
    }

    /**
     * Get next route number.
     */
    public function nextNumber()
    {
        $this->authorize('create', RoutePlan::class);

        return response()->json([
            'route_number' =>
                $this->generateRouteNumber(),
        ]);
    }

    private function applyRouteVisibility(
        $query,
        $user
    ) {
        if ($user->hasRole('driver')) {
            $driverId =
                $user->driverProfile?->id;

            if ($driverId) {
                $query->whereHas(
                    'reservation',
                    fn ($reservation) =>
                        $reservation->where(
                            'driver_id',
                            $driverId
                        )
                );
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        return $query;
    }

    private function getRoutePlanAuditValues(
        RoutePlan $routePlan
    ): array {
        return [
            'route_number' =>
                $routePlan->route_number,
            'reservation_id' =>
                $routePlan->reservation_id,
            'origin' =>
                $routePlan->origin,
            'destination' =>
                $routePlan->destination,
            'priority' =>
                $routePlan->priority,
            'department' =>
                $routePlan->department,
            'status' =>
                $routePlan->status,
            'departure_date' =>
                $routePlan->departure_date
                    ?->format('Y-m-d'),
            'departure_time' =>
                $routePlan->departure_time,
            'estimated_distance' =>
                $routePlan->estimated_distance,
            'estimated_time' =>
                $routePlan->estimated_time,
            'optimization_strategy' =>
                $routePlan->optimization_strategy,
            'optimization_score' =>
                $routePlan->optimization_score,
        ];
    }

    private function logRoutePlanUpdate(
        RoutePlan $routePlan,
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
                'Planned' =>
                    'Planned',
                'Ready For Dispatch' =>
                    'Ready For Dispatch',
                'Completed' =>
                    'Completed',
                'Archived' =>
                    'Archived',
                'Draft' =>
                    'Returned To Draft',
                default =>
                    'Updated',
            };
        }

        $description = match ($action) {
            'Planned' =>
                "Planned route {$routePlan->route_number}.",
            'Ready For Dispatch' =>
                "Marked route {$routePlan->route_number} as Ready For Dispatch.",
            'Completed' =>
                "Completed route {$routePlan->route_number}.",
            'Archived' =>
                "Archived route {$routePlan->route_number}.",
            'Returned To Draft' =>
                "Returned route {$routePlan->route_number} to Draft.",
            default =>
                "Updated route {$routePlan->route_number}.",
        };

        AuditLogService::log(
            module: 'Route Planning',
            action: $action,
            description: $description,
            record: $routePlan,
            oldValues: $changedOldValues,
            newValues: $changedNewValues
        );
    }
}