<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\Reservation;
use App\Models\FleetSetting;
use App\Models\DispatchReassignment;
use App\Models\User;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Services\FleetNotificationService;
use App\Services\AuditLogService;
use App\Services\DispatchRecommendationService;
use App\Services\GeminiDispatchExplanationService;
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

            'reassignments.requestedBy',
            'reassignments.reviewedBy',

            'reassignments.originalVehicle',
            'reassignments.originalDriver',

            'reassignments.recommendedVehicle',
            'reassignments.recommendedDriver',

            'reassignments.newVehicle',
            'reassignments.newDriver',

            'tripLog',
        ]);

        if ($request->boolean('show_archived')) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

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
        if (!$request->boolean('show_archived')) {
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
        }
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
                    'dispatcher'
                ),
            'canArchive' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canBulkArchive' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canRestore' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
            'canReviewReassignment' => $user->hasRole('dispatcher'),
        ];
        return view(
            'dispatch.index',
            compact('dispatchPermissions')
        );
    }

    /**
    * Generate an explainable AI-based dispatch recommendation
    * for an approved Reservation.
    */
    public function recommendation(
        Reservation $reservation,
        DispatchRecommendationService $recommendationService,
        GeminiDispatchExplanationService $geminiService
    ) {
        $this->authorize('create', Dispatch::class);

        $reservation->load([
            'vehicle',
            'driver',
            'routePlan.stops',
        ]);

        if ($reservation->status !== 'Approved') {
            return response()->json([
                'success' => false,
                'message' =>
                    'Only Approved reservations can receive a dispatch recommendation.',
            ], 422);
        }

        if (!$reservation->routePlan) {
            return response()->json([
                'success' => false,
                'message' =>
                    'A Route Plan is required before generating a dispatch recommendation.',
            ], 422);
        }

        if (
            $reservation->routePlan->status !==
            'Ready For Dispatch'
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'The Route Plan must be Ready For Dispatch before generating a dispatch recommendation.',
            ], 422);
        }

        if ($reservation->dispatch()->exists()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This reservation already has a Dispatch.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Generate Smart Dispatch Recommendation
        |--------------------------------------------------------------------------
        */
        $recommendation =
            $recommendationService->recommend(
                $reservation
            );

        /*
        |--------------------------------------------------------------------------
        | Gemini Explanation
        |--------------------------------------------------------------------------
        |
        | Gemini explains the already-computed recommendation.
        | Gemini does NOT select the vehicle or driver.
        |
        */
        $recommendation['gemini_available'] = false;
        $recommendation['gemini_explanation'] = null;

        if (!empty($recommendation['recommended'])) {
            $recommended =
                $recommendation['recommended'];

            try {
                $recommendation['gemini_explanation'] =
                    $geminiService->explain([
                        'reservation_number' =>
                            $reservation->reservation_number,

                        'priority' =>
                            $reservation->priority,

                        'vehicle_label' =>
                            $recommended['vehicle_label']
                                ?? 'Unavailable',

                        'driver_name' =>
                            $recommended['driver_name']
                                ?? 'Unavailable',

                        'score' =>
                            $recommended['score']
                                ?? 0,

                        'availability_score' =>
                            25,

                        'proximity_score' =>
                            $recommended['proximity_score']
                                ?? 0,

                        'assigned_fit_score' =>
                            $recommended['assigned_fit_score']
                                ?? 0,

                        'priority_score' =>
                            $recommended['priority_score']
                                ?? 0,

                        'gps_freshness_score' =>
                            $recommended['gps_freshness_score']
                                ?? 0,

                        'traffic_score' =>
                            $recommended['traffic_score']
                                ?? 0,

                        'fuel_score' =>
                            $recommended['fuel_score']
                                ?? 0,

                        'fuel_percentage' =>
                            $recommended['fuel_percentage']
                                ?? null,

                        'vehicle_suitability_score' =>
                            $recommended['vehicle_suitability_score']
                                ?? 0,

                        'maintenance_score' =>
                            $recommended['maintenance_score']
                                ?? 0,

                        'maintenance_status' =>
                            $recommended['maintenance_status']
                                ?? 'Unavailable',

                        'maintenance_next_schedule' =>
                            $recommended['maintenance_next_schedule']
                                ?? null,

                        'distance_to_pickup_km' =>
                            $recommended['distance_to_pickup_km']
                                ?? 'Unavailable',

                        'traffic_eta_minutes' =>
                            $recommended['traffic_eta_minutes']
                                ?? 'Unavailable',

                        'traffic_delay_minutes' =>
                            $recommended['traffic_delay_minutes']
                                ?? 'Unavailable',

                        'traffic_provider' =>
                            $recommended['traffic_provider']
                                ?? 'Unavailable',

                        'has_live_location' =>
                            $recommended['has_live_location']
                                ?? false,

                        'location_age_seconds' =>
                            $recommended['location_age_seconds']
                                ?? null,

                        'reasons' =>
                            $recommended['reasons']
                                ?? [],
                    ]);
                
                $recommendation['gemini_summary'] =
                    $recommendation['gemini_explanation']['summary']
                        ?? null;

                $recommendation['gemini_factors'] =
                    $recommendation['gemini_explanation']['key_factors']
                        ?? [];

                $recommendation['gemini_limitations'] =
                    $recommendation['gemini_explanation']['limitations']
                        ?? [];

                $recommendation['gemini_available'] = true;

            } catch (\Throwable $e) {
                report($e);
                /*
                |--------------------------------------------------------------------------
                | Gemini Failure Must NOT Break Dispatch Recommendation
                |--------------------------------------------------------------------------
                */
                $recommendation['gemini_available'] = false;
                $recommendation['gemini_explanation'] = null;
                $recommendation['gemini_error'] = $e->getMessage();
            }
        }

        return response()->json(
            $recommendation
        );
    }

   public function reassignmentRecommendation(
        Request $request,
        DispatchReassignment $reassignment,
        DispatchRecommendationService $recommendationService,
        GeminiDispatchExplanationService $geminiService
    ) {
        $lockedReassignment = DispatchReassignment::query()
            ->with([
                'dispatch.reservation.vehicle',
                'dispatch.reservation.driver',
                'dispatch.reservation.routePlan',
            ])
            ->findOrFail($reassignment->id);

        $dispatch = $lockedReassignment->dispatch;

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */
        $this->authorize(
            'reviewReassignment',
            $dispatch
        );

        /*
        |--------------------------------------------------------------------------
        | Reassignment State Validation
        |--------------------------------------------------------------------------
        */
        if ($dispatch->archived_at) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Archived dispatch cannot receive a reassignment recommendation.',
            ], 422);
        }

        if ($lockedReassignment->status !== 'Requested') {
            return response()->json([
                'success' => false,
                'message' =>
                    'This reassignment request has already been reviewed.',
            ], 422);
        }

        if ($dispatch->trip_status !== 'Pending') {
            return response()->json([
                'success' => false,
                'message' =>
                    'AI reassignment recommendation is only available while the dispatch is Pending.',
            ], 422);
        }

        $reservation = $dispatch->reservation;

        if (!$reservation) {
            return response()->json([
                'success' => false,
                'message' =>
                    'The reservation associated with this dispatch was not found.',
            ], 422);
        }

        if ($reservation->status !== 'Approved') {
            return response()->json([
                'success' => false,
                'message' =>
                    'Only Approved reservations can receive a reassignment recommendation.',
            ], 422);
        }

        if (!$reservation->vehicle) {
            return response()->json([
                'success' => false,
                'message' =>
                    'The reservation has no assigned vehicle.',
            ], 422);
        }

        $currentDriverId = (int) $reservation->driver_id;

        if ($currentDriverId <= 0) {
            return response()->json([
                'success' => false,
                'message' =>
                    'The dispatch does not have a valid current driver assignment.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Generate Replacement Driver Recommendation
        |--------------------------------------------------------------------------
        |
        | The scoring engine determines the recommendation.
        | Gemini only explains the computed result.
        |
        */
        $recommendation =
            $recommendationService->recommendReplacementDriver(
                $reservation,
                $currentDriverId
            );

        /*
        |--------------------------------------------------------------------------
        | Gemini Explanation
        |--------------------------------------------------------------------------
        */
        $recommendation['gemini_available'] = false;
        $recommendation['gemini_explanation'] = null;
        $recommendation['gemini_summary'] = null;
        $recommendation['gemini_factors'] = [];
        $recommendation['gemini_limitations'] = [];

        if (!empty($recommendation['recommended'])) {
            $recommended = $recommendation['recommended'];
            /*
            |--------------------------------------------------------------------------
            | Persist AI Recommendation
            |--------------------------------------------------------------------------
            | Store the exact vehicle + driver recommended by the scoring engine.
            | This allows the Dispatch View modal to show the recommendation later
            | even after the reassignment request has already been approved.
            */
            $lockedReassignment->update([
                'recommended_vehicle_id' =>
                    $recommended['vehicle_id'] ?? null,
                'recommended_driver_id' =>
                    $recommended['driver_id'] ?? null,
            ]);

            try {
                $recommendation['gemini_explanation'] =
                    $geminiService->explain([
                        'reservation_number' =>
                            $reservation->reservation_number,

                        'priority' =>
                            $reservation->priority,

                        'vehicle_label' =>
                            $recommended['vehicle_label']
                                ?? 'Unavailable',

                        'driver_name' =>
                            $recommended['driver_name']
                                ?? 'Unavailable',

                        'score' =>
                            $recommended['score']
                                ?? 0,

                        'availability_score' =>
                            $recommended['availability_score']
                                ?? 25,

                        'proximity_score' =>
                            $recommended['proximity_score']
                                ?? 0,

                        'assigned_fit_score' =>
                            $recommended['assigned_fit_score']
                                ?? 0,

                        'priority_score' =>
                            $recommended['priority_score']
                                ?? 0,

                        'gps_freshness_score' =>
                            $recommended['gps_freshness_score']
                                ?? 0,

                        'traffic_score' =>
                            $recommended['traffic_score']
                                ?? 0,

                        'fuel_score' =>
                            $recommended['fuel_score']
                                ?? 0,

                        'fuel_percentage' =>
                            $recommended['fuel_percentage']
                                ?? null,

                        'vehicle_suitability_score' =>
                            $recommended['vehicle_suitability_score']
                                ?? 0,

                        'maintenance_score' =>
                            $recommended['maintenance_score']
                                ?? 0,

                        'maintenance_status' =>
                            $recommended['maintenance_status']
                                ?? 'Unavailable',

                        'maintenance_next_schedule' =>
                            $recommended['maintenance_next_schedule']
                                ?? null,

                        'distance_to_pickup_km' =>
                            $recommended['distance_to_pickup_km']
                                ?? 'Unavailable',

                        'traffic_eta_minutes' =>
                            $recommended['traffic_eta_minutes']
                                ?? 'Unavailable',

                        'traffic_delay_minutes' =>
                            $recommended['traffic_delay_minutes']
                                ?? 'Unavailable',

                        'traffic_provider' =>
                            $recommended['traffic_provider']
                                ?? 'Unavailable',

                        'has_live_location' =>
                            $recommended['has_live_location']
                                ?? false,

                        'location_age_seconds' =>
                            $recommended['location_age_seconds']
                                ?? null,

                        'reasons' =>
                            $recommended['reasons']
                                ?? [],
                    ]);

                $recommendation['gemini_summary'] =
                    $recommendation['gemini_explanation']['summary']
                        ?? null;

                $recommendation['gemini_factors'] =
                    $recommendation['gemini_explanation']['key_factors']
                        ?? [];

                $recommendation['gemini_limitations'] =
                    $recommendation['gemini_explanation']['limitations']
                        ?? [];

                $recommendation['gemini_available'] = true;

            } catch (\Throwable $e) {
                report($e);

                /*
                |--------------------------------------------------------------------------
                | Gemini Failure Must NOT Break Manual Reassignment
                |--------------------------------------------------------------------------
                */
                $recommendation['gemini_available'] = false;
                $recommendation['gemini_explanation'] = null;
                $recommendation['gemini_summary'] = null;
                $recommendation['gemini_factors'] = [];
                $recommendation['gemini_limitations'] = [];
                $recommendation['gemini_error'] = $e->getMessage();
            }
        }

        return response()->json(
            $recommendation
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

            /*
            |--------------------------------------------------------------------------
            | Notify Dispatcher + Fleet Manager
            |--------------------------------------------------------------------------
            |
            | These roles receive fleet-wide Dispatch notifications.
            |
            */
            FleetNotificationService::createForRolesWhenEnabled(
                settingKey: 'dispatchUpdates',
                roles: [
                    'dispatcher',
                    'fleet_manager',
                ],
                title: 'Dispatch Created',
                message:
                    "Dispatch {$dispatch->dispatch_number} was created and is currently Pending.",
                default: true,
                link: route('dispatch'),
                excludeUserId: $request->user()->id
            );

            /*
            |--------------------------------------------------------------------------
            | Notify Assigned Driver
            |--------------------------------------------------------------------------
            |
            | Driver receives only the notification for the Dispatch
            | assigned to that driver's profile.
            |
            */
            $assignedDriverUser = User::query()
                ->whereHas(
                    'driverProfile',
                    function ($query) use ($dispatch) {
                        $query->where(
                            'id',
                            $dispatch->reservation->driver_id
                        );
                    }
                )
                ->first();

            if ($assignedDriverUser) {
                FleetNotificationService::createForUserWhenEnabled(
                    user: $assignedDriverUser,
                    settingKey: 'dispatchUpdates',
                    title: 'New Dispatch Assigned',
                    message:
                        "You have been assigned Dispatch {$dispatch->dispatch_number}. Please review and accept the dispatch.",
                    eventKey:
                        "dispatch:{$dispatch->id}:created",
                    default: true,
                    link: route('dispatch')
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Dispatch requested successfully.',
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
     * Driver accepts an assigned Pending dispatch.
     */
    public function accept(
        Request $request,
        Dispatch $dispatch
    ) {
        $this->authorize(
            'accept',
            $dispatch
        );

        try {
            $result = DB::transaction(function () use (
                $request,
                $dispatch
            ) {
                $dispatch = Dispatch::with([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan',
                ])
                    ->lockForUpdate()
                    ->findOrFail($dispatch->id);

                if ($dispatch->archived_at) {
                    throw new \Exception(
                        'Archived dispatches cannot be accepted.'
                    );
                }

                if ($dispatch->trip_status !== 'Pending') {
                    throw new \Exception(
                        "Dispatch {$dispatch->dispatch_number} is no longer Pending."
                    );
                }

                $reservation = $dispatch->reservation;

                if (!$reservation) {
                    throw new \Exception(
                        'Reservation associated with this dispatch was not found.'
                    );
                }

                $driverId =
                    $request->user()->driverProfile?->id;

                if (!$driverId) {
                    throw new \Exception(
                        'Driver profile was not found.'
                    );
                }

                if (
                    (int) $reservation->driver_id !==
                    (int) $driverId
                ) {
                    throw new \Exception(
                        'You are not the driver assigned to this dispatch.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Prevent acceptance when an active reassignment request exists
                |--------------------------------------------------------------------------
                */
                $hasOpenReassignment =
                    $dispatch->reassignments()
                        ->where(
                            'status',
                            'Requested'
                        )
                        ->exists();

                if ($hasOpenReassignment) {
                    throw new \Exception(
                        'This dispatch has a pending reassignment request and cannot be accepted yet.'
                    );
                }

                $oldAuditValues =
                    $this->getDispatchAuditValues(
                        $dispatch
                    );

                /*
                |--------------------------------------------------------------------------
                | Accept Dispatch
                |--------------------------------------------------------------------------
                */
                $dispatch->update([
                    'trip_status' => 'Assigned',
                    'accepted_at' => now(),
                    'accepted_by' => $request->user()->id,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Reservation
                |--------------------------------------------------------------------------
                |
                | Approved -> Scheduled
                |
                |--------------------------------------------------------------------------
                */
                $reservation->update([
                    'status' => 'Scheduled',
                ]);

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

                $dispatch->load([
                    'reservation.vehicle',
                    'reservation.driver',
                    'reservation.routePlan.stops',
                ]);

                return $dispatch;
            });

            /*
            |--------------------------------------------------------------------------
            | Notify Dispatcher + Fleet Manager
            |--------------------------------------------------------------------------
            |
            | Dispatcher and Fleet Manager receive the fleet-wide
            | Dispatch acceptance notification.
            |
            */
            FleetNotificationService::createForRolesWhenEnabled(
                settingKey: 'dispatchUpdates',
                roles: [
                    'dispatcher',
                    'fleet_manager',
                ],
                title: 'Dispatch Accepted',
                message:
                    "Dispatch {$result->dispatch_number} was accepted by the assigned driver.",
                default: true,
                link: route('dispatch'),
                excludeUserId: $request->user()->id
            );

            /*
            |--------------------------------------------------------------------------
            | Notify Assigned Driver
            |--------------------------------------------------------------------------
            |
            | The driver receives a notification for his/her own
            | Dispatch task.
            |
            */
            FleetNotificationService::createForUserWhenEnabled(
                user: $request->user(),
                settingKey: 'dispatchUpdates',
                title: 'Dispatch Accepted',
                message:
                    "You accepted Dispatch {$result->dispatch_number}. The dispatch is now Assigned.",
                eventKey:
                    "dispatch:{$result->id}:accepted",
                default: true,
                link: route('dispatch')
            );

            return response()->json([
                'success' => true,
                'message' =>
                    'Dispatch accepted successfully.',
                'dispatch' =>
                    $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Driver requests reassignment of a Pending dispatch.
     */
    public function requestReassignment(
        Request $request,
        Dispatch $dispatch
    ) {
        $this->authorize(
            'requestReassignment',
            $dispatch
        );

        $validator = Validator::make(
            $request->all(),
            [
                'reason' => [
                    'required',
                    'string',
                    'min:10',
                    'max:2000',
                ],
            ],
            [
                'reason.required' =>
                    'Please provide a reason for the reassignment request.',
                'reason.min' =>
                    'The reassignment reason must be at least 10 characters.',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Please provide a valid reassignment reason.',
                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        try {
            $reassignment = DB::transaction(
                function () use (
                    $request,
                    $dispatch,
                    $validator
                ) {
                    $dispatch = Dispatch::with([
                        'reservation.driver',
                    ])
                        ->lockForUpdate()
                        ->findOrFail(
                            $dispatch->id
                        );

                    if ($dispatch->archived_at) {
                        throw new \Exception(
                            'Archived dispatches cannot request reassignment.'
                        );
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Only Pending dispatch can request reassignment
                    |--------------------------------------------------------------------------
                    */
                    if ($dispatch->trip_status !== 'Pending') {
                        throw new \Exception(
                            'A reassignment request can only be submitted while the dispatch is Pending.'
                        );
                    }

                    $reservation =
                        $dispatch->reservation;

                    if (!$reservation) {
                        throw new \Exception(
                            'Reservation associated with this dispatch was not found.'
                        );
                    }

                    $driverId =
                        $request->user()->driverProfile?->id;

                    if (!$driverId) {
                        throw new \Exception(
                            'Driver profile was not found.'
                        );
                    }

                    if (
                        (int) $reservation->driver_id !==
                        (int) $driverId
                    ) {
                        throw new \Exception(
                            'You are not the driver assigned to this dispatch.'
                        );
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Prevent duplicate open requests
                    |--------------------------------------------------------------------------
                    */
                    $existingRequest =
                        $dispatch->reassignments()
                            ->where(
                                'status',
                                'Requested'
                            )
                            ->exists();

                    if ($existingRequest) {
                        throw new \Exception(
                            'A reassignment request is already pending for this dispatch.'
                        );
                    }

                    $reassignment = DispatchReassignment::create([
                        'dispatch_id' => $dispatch->id,
                        'requested_by' => $request->user()->id,
                        'reason' => $request->string('reason')->trim(),
                        'status' => 'Requested',
                        'original_vehicle_id' =>
                            $dispatch->reservation->vehicle_id,
                        'original_driver_id' =>
                            $dispatch->reservation->driver_id,
                    ]);

                    return $reassignment;
                }
            );

            /*
            |--------------------------------------------------------------------------
            | Notify Dispatcher + Fleet Manager
            |--------------------------------------------------------------------------
            */
            FleetNotificationService::createForRolesWhenEnabled(
                settingKey: 'dispatchUpdates',
                roles: [
                    'dispatcher',
                    'fleet_manager',
                ],
                title: 'Dispatch Reassignment Requested',
                message:
                    "A reassignment was requested for Dispatch {$dispatch->dispatch_number}.",
                default: true,
                link: route('dispatch'),
                excludeUserId: $request->user()->id
            );

            /*
            |--------------------------------------------------------------------------
            | Notify Requesting Driver
            |--------------------------------------------------------------------------
            */
            FleetNotificationService::createForUserWhenEnabled(
                user: $request->user(),
                settingKey: 'dispatchUpdates',
                title: 'Reassignment Request Submitted',
                message:
                    "Your reassignment request for Dispatch {$dispatch->dispatch_number} has been submitted for review.",
                eventKey:
                    "dispatch_reassignment_request:{$dispatch->id}:{$reassignment->id}:requester:{$request->user()->id}",
                default: true,
                link: route('dispatch')
            );

            return response()->json([
                'success' => true,
                'message' =>
                    'Reassignment request submitted successfully.',
                'reassignment' =>
                    $reassignment,
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
     * Update the specified dispatch.
     */
    public function update(
        Request $request,
        Dispatch $dispatch
    ) {
        $this->authorize('update', $dispatch);

        $isDriver = $request->user()->hasRole('driver');

        if ($dispatch->archived_at) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Archived dispatches cannot be modified.',
            ], 422);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'dispatch_number' => $isDriver
                ? [
                    'nullable',
                    'string',
                    'max:50',
                ]
                : [
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
                $dispatch,
                $isDriver,
                $request
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

                if ($isDriver) {
                    $driverTransitions = [
                        'Assigned' => 'En Route',
                        'En Route' => 'Arrived',
                        'Arrived' => 'Completed',
                    ];

                    if (
                        !isset($driverTransitions[$currentStatus]) ||
                        $driverTransitions[$currentStatus] !== $newStatus
                    ) {
                        throw new \Exception(
                            "Driver cannot change dispatch status from {$currentStatus} to {$newStatus}."
                        );
                    }
                }

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
                    'dispatch_number' => $isDriver
                        ? $dispatch->dispatch_number
                        : $validated['dispatch_number'],

                    'trip_status' => $newStatus,

                    'remarks' => $isDriver
                        ? $dispatch->remarks
                        : ($validated['remarks'] ?? null),
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
                /*
                |--------------------------------------------------------------------------
                | Notify Dispatcher + Fleet Manager
                |--------------------------------------------------------------------------
                */
                FleetNotificationService::createForRolesWhenEnabled(
                    settingKey: 'dispatchUpdates',
                    roles: [
                        'dispatcher',
                        'fleet_manager',
                    ],
                    title: 'Dispatch Status Updated',
                    message:
                        "Dispatch {$updatedDispatch->dispatch_number} changed from {$previousStatus} to {$newStatus}.",
                    default: true,
                    link: route('dispatch'),
                    excludeUserId: $request->user()->id
                );

                /*
                |--------------------------------------------------------------------------
                | Notify Current Assigned Driver
                |--------------------------------------------------------------------------
                |
                | Driver sees only notifications related to his/her
                | currently assigned Dispatch.
                |
                */
                $assignedDriver = $updatedDispatch
                    ->reservation
                    ?->driver;

                /*
                |--------------------------------------------------------------------------
                | Resolve Driver User Account
                |--------------------------------------------------------------------------
                |
                | This assumes the Driver model has an associated
                | User account through the project's existing relationship.
                |
                */
                $driverUser = $assignedDriver
                    ?->user;

                if ($driverUser) {
                    FleetNotificationService::createForUserWhenEnabled(
                        user: $driverUser,
                        settingKey: 'dispatchUpdates',
                        title: 'Dispatch Status Updated',
                        message:
                            "Dispatch {$updatedDispatch->dispatch_number} changed from {$previousStatus} to {$newStatus}.",
                        eventKey:
                            "dispatch:{$updatedDispatch->id}:status:{$newStatus}",
                        default: true,
                        link: route('dispatch')
                    );
                }
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
    public function archive(
        Request $request,
        Dispatch $dispatch
    ) {
        $this->authorize(
            'archive',
            $dispatch
        );

        try {
            DB::transaction(function () use (
                $request,
                $dispatch
            ) {
                $dispatch = Dispatch::with([
                    'reservation.vehicle',
                    'reservation.driver',
                ])->lockForUpdate()->findOrFail($dispatch->id);

                $reservation =
                    $dispatch->reservation;

                if (!$reservation) {
                    throw new \Exception(
                        'Reservation associated with this dispatch was not found.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Only Pending or Assigned may be archived.
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
                        "Dispatch {$dispatch->dispatch_number} cannot be archived because its current status is {$dispatch->trip_status}."
                    );
                }

                $oldValues =
                    $this->getDispatchAuditValues(
                        $dispatch
                    );

                $oldReservationStatus =
                    $reservation->status;

                $dispatch->update([
                    'archived_at' => now(),
                    'archived_by' =>
                        $request->user()->id,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Release reservation from archived dispatch.
                |--------------------------------------------------------------------------
                */
                $reservation->update([
                    'status' => 'Approved',
                ]);

                AuditLogService::log(
                    module: 'Dispatch Management',
                    action: 'Archived',
                    description:
                        "Archived dispatch {$dispatch->dispatch_number}.",
                    record: $dispatch,
                    oldValues: $oldValues,
                    newValues: [
                        'archived_at' =>
                            $dispatch->archived_at
                                ?->toDateTimeString(),

                        'archived_by' =>
                            $request->user()->id,

                        'reservation_status_before' =>
                            $oldReservationStatus,

                        'reservation_status_after' =>
                            'Approved',
                    ]
                );
            });

            return response()->json([
                'success' => true,
                'message' =>
                    'Dispatch archived successfully.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    public function restore(
        Request $request,
        Dispatch $dispatch
    ) {
        $this->authorize(
            'restore',
            $dispatch
        );

        try {
            DB::transaction(function () use (
                $request,
                $dispatch
            ) {
                $dispatch = Dispatch::with([
                    'reservation',
                ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $dispatch->id
                    );

                if (!$dispatch->archived_at) {
                    throw new \Exception(
                        'Dispatch is not archived.'
                    );
                }

                $reservation =
                    $dispatch->reservation;

                if (!$reservation) {
                    throw new \Exception(
                        'Reservation associated with this dispatch was not found.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Restore Reservation Status
                |--------------------------------------------------------------------------
                |
                | Pending dispatch:
                | Reservation → Approved
                |
                | Assigned dispatch:
                | Reservation → Scheduled
                |--------------------------------------------------------------------------
                */
                $reservationStatus =
                    $dispatch->trip_status === 'Assigned'
                        ? 'Scheduled'
                        : 'Approved';

                $oldValues = [
                    'archived_at' =>
                        $dispatch->archived_at
                            ?->toDateTimeString(),

                    'archived_by' =>
                        $dispatch->archived_by,
                ];

                $dispatch->update([
                    'archived_at' => null,
                    'archived_by' => null,
                ]);

                $reservation->update([
                    'status' =>
                        $reservationStatus,
                ]);

                AuditLogService::log(
                    module: 'Dispatch Management',
                    action: 'Restored',
                    description:
                        "Restored dispatch {$dispatch->dispatch_number}.",
                    record: $dispatch,
                    oldValues: $oldValues,
                    newValues: [
                        'archived_at' => null,
                        'archived_by' => null,
                        'reservation_status' =>
                            $reservationStatus,
                    ]
                );
            });

            $dispatch->refresh();

            $dispatch->load([
                'reservation.vehicle',
                'reservation.driver',
                'reservation.routePlan.stops',
            ]);

            return response()->json([
                'success' => true,
                'message' =>
                    'Dispatch restored successfully.',
                'dispatch' =>
                    $dispatch,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Bulk delete selected dispatches.
     */
    public function bulkArchive(Request $request)
    {
        $this->authorize(
            'archiveAny',
            Dispatch::class
        );

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
                'message' =>
                    'Please select valid dispatches.',
                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        $dispatchIds =
            $validator->validated()['dispatch_ids'];

        try {
            $archivedIds = [];

            DB::transaction(function () use (
                $dispatchIds,
                &$archivedIds,
                $request
            ) {
                $dispatches =
                    Dispatch::with([
                        'reservation',
                    ])
                    ->whereIn(
                        'id',
                        $dispatchIds
                    )
                    ->whereNull('archived_at')
                    ->lockForUpdate()
                    ->get();

                foreach ($dispatches as $dispatch) {

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

                    $oldValues =
                        $this->getDispatchAuditValues(
                            $dispatch
                        );

                    $oldReservationStatus =
                        $dispatch->reservation?->status;

                    $dispatch->update([
                        'archived_at' => now(),
                        'archived_by' =>
                            $request->user()->id,
                    ]);

                    if ($dispatch->reservation) {
                        $dispatch->reservation->update([
                            'status' => 'Approved',
                        ]);
                    }

                    AuditLogService::log(
                        module: 'Dispatch Management',
                        action: 'Archived',
                        description:
                            "Archived dispatch {$dispatch->dispatch_number}.",
                        record: $dispatch,
                        oldValues: $oldValues,
                        newValues: [
                            'archived_at' =>
                                $dispatch->archived_at
                                    ?->toDateTimeString(),

                            'archived_by' =>
                                $request->user()->id,

                            'reservation_status_before' =>
                                $oldReservationStatus,

                            'reservation_status_after' =>
                                $dispatch->reservation
                                    ? 'Approved'
                                    : null,
                        ]
                    );

                    $archivedIds[] =
                        $dispatch->id;
                }
            });

            if (empty($archivedIds)) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Only Pending or Assigned dispatches can be archived.',
                    'archived_ids' => [],
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' =>
                    count($archivedIds) === 1
                        ? 'Dispatch archived successfully.'
                        : count($archivedIds) .
                            ' dispatches archived successfully.',
                'archived_ids' =>
                    $archivedIds,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Failed to archive dispatches.',
                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }

    public function approveReassignment(
        Request $request,
        DispatchReassignment $reassignment
    ) {
        $request->validate([
            'new_vehicle_id' => [
                'required',
                'integer',
                'exists:vehicles,id',
            ],

            'new_driver_id' => [
                'required',
                'integer',
                'exists:drivers,id',
            ],
        ]);

        $result = DB::transaction(function () use (
            $request,
            $reassignment
        ) {
            /*
            |--------------------------------------------------------------------------
            | Lock Reassignment
            |--------------------------------------------------------------------------
            */
            $lockedReassignment = DispatchReassignment::query()
                ->lockForUpdate()
                ->findOrFail(
                    $reassignment->id
                );

            /*
            |--------------------------------------------------------------------------
            | Lock Dispatch
            |--------------------------------------------------------------------------
            */
            $dispatch = Dispatch::query()
                ->with('reservation')
                ->lockForUpdate()
                ->findOrFail(
                    $lockedReassignment->dispatch_id
                );

            /*
            |--------------------------------------------------------------------------
            | Authorization
            |--------------------------------------------------------------------------
            */
            $this->authorize(
                'approveReassignment',
                $dispatch
            );

            /*
            |--------------------------------------------------------------------------
            | Dispatch Validation
            |--------------------------------------------------------------------------
            */
            if ($dispatch->archived_at) {
                abort(
                    422,
                    'Archived dispatch cannot be reassigned.'
                );
            }

            if (
                $lockedReassignment->status !==
                'Requested'
            ) {
                abort(
                    422,
                    'This reassignment request has already been reviewed.'
                );
            }

            if (
                $dispatch->trip_status !==
                'Pending'
            ) {
                abort(
                    422,
                    'Reassignment is only allowed while the dispatch is Pending.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Lock Reservation
            |--------------------------------------------------------------------------
            */
            $reservation = Reservation::query()
                ->lockForUpdate()
                ->findOrFail(
                    $dispatch->reservation_id
                );

            if (
                $reservation->status !==
                'Approved'
            ) {
                abort(
                    422,
                    'The reservation must remain Approved during reassignment review.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Current Driver
            |--------------------------------------------------------------------------
            */
            $currentDriverId =
                (int) $reservation->driver_id;

            if ($currentDriverId <= 0) {
                abort(
                    422,
                    'The dispatch does not have a valid current driver assignment.'
                );
            }

            $oldDriver = Driver::query()
                ->with('user')
                ->findOrFail(
                    $currentDriverId
                );

            $oldDriverUser =
                $oldDriver->user;

            /*
            |--------------------------------------------------------------------------
            | Lock Replacement Vehicle
            |--------------------------------------------------------------------------
            */
            $newVehicle = Vehicle::query()
                ->lockForUpdate()
                ->findOrFail(
                    $request->integer('new_vehicle_id')
                );

            /*
            |--------------------------------------------------------------------------
            | Lock Replacement Driver
            |--------------------------------------------------------------------------
            */
            $newDriver = Driver::query()
                ->lockForUpdate()
                ->findOrFail(
                    $request->integer('new_driver_id')
                );

            /*
            |--------------------------------------------------------------------------
            | Prevent Same Driver
            |--------------------------------------------------------------------------
            */
            if (
                $currentDriverId ===
                (int) $newDriver->id
            ) {
                abort(
                    422,
                    'The selected driver is already assigned to this dispatch.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Validate Replacement Vehicle
            |--------------------------------------------------------------------------
            */
            if ($newVehicle->archived_at) {
                abort(
                    422,
                    'The selected vehicle is archived.'
                );
            }

            if (
                $newVehicle->status !==
                'Available'
            ) {
                abort(
                    422,
                    'The selected vehicle is not available.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Validate Replacement Driver
            |--------------------------------------------------------------------------
            */
            if ($newDriver->archived_at) {
                abort(
                    422,
                    'The selected driver is archived.'
                );
            }

            if (
                $newDriver->status !==
                'Available'
            ) {
                abort(
                    422,
                    'The selected driver is not available.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Validate Vehicle + Driver Pair
            |--------------------------------------------------------------------------
            |
            | The selected driver must actually belong to
            | the selected vehicle.
            |
            */
            if (
                (int) $newDriver->assigned_vehicle_id !==
                (int) $newVehicle->id
            ) {
                abort(
                    422,
                    'The selected driver is not assigned to the selected vehicle.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Approve Reassignment Request
            |--------------------------------------------------------------------------
            */
            $lockedReassignment->update([
                'status' =>
                    'Approved',
                'reviewed_by' =>
                    $request->user()->id,
                'reviewed_at' =>
                    now(),
                'new_vehicle_id' =>
                    $newVehicle->id,
                'new_driver_id' =>
                    $newDriver->id,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Update Reservation Assignment
            |--------------------------------------------------------------------------
            |
            | IMPORTANT:
            | Both vehicle AND driver are replaced.
            |
            */
            $reservation->update([
                'vehicle_id' =>
                    $newVehicle->id,

                'driver_id' =>
                    $newDriver->id,

                'status' =>
                    'Approved',
            ]);

            /*
            |--------------------------------------------------------------------------
            | Reset Dispatch Acceptance State
            |--------------------------------------------------------------------------
            |
            | Dispatch remains Pending because the new driver
            | must still accept the assignment.
            |
            */
            $dispatch->update([
                'trip_status' =>
                    'Pending',

                'accepted_at' =>
                    null,

                'accepted_by' =>
                    null,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Return Updated Data
            |--------------------------------------------------------------------------
            */
            return [
                'dispatch' =>
                    $dispatch->fresh([
                        'reservation.vehicle',
                        'reservation.driver',
                    ]),

                'reassignment' =>
                    $lockedReassignment->fresh([
                        'requestedBy',
                        'reviewedBy',
                    ]),

                'old_driver_user' =>
                    $oldDriverUser,

                'new_driver_user' =>
                    $newDriver->user,
            ];
        });

        $dispatch =
            $result['dispatch'];

        $reassignment =
            $result['reassignment'];

        $oldDriverUser =
            $result['old_driver_user'];

        $newDriverUser =
            $result['new_driver_user'];

        /*
        |--------------------------------------------------------------------------
        | Notify Dispatcher + Fleet Manager
        |--------------------------------------------------------------------------
        */
        FleetNotificationService::createForRolesWhenEnabled(
            settingKey: 'dispatchUpdates',
            roles: [
                'dispatcher',
                'fleet_manager',
            ],
            title: 'Dispatch Reassignment Approved',
            message:
                "Reassignment for Dispatch {$dispatch->dispatch_number} was approved.",
            default: true,
            link: route('dispatch'),
            excludeUserId:
                $request->user()->id
        );

        /*
        |--------------------------------------------------------------------------
        | Notify Original / Requesting Driver
        |--------------------------------------------------------------------------
        */
        if ($oldDriverUser) {
            FleetNotificationService::createForUserWhenEnabled(
                user: $oldDriverUser,
                settingKey: 'dispatchUpdates',
                title: 'Reassignment Approved',
                message:
                    "Your reassignment request for Dispatch {$dispatch->dispatch_number} was approved. The dispatch has been reassigned to another vehicle and driver.",
                eventKey:
                    "dispatch_reassignment_request:{$dispatch->id}:{$reassignment->id}:requester:{$oldDriverUser->id}",
                default: true,
                link: route('dispatch')
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Notify New Driver
        |--------------------------------------------------------------------------
        */
        if ($newDriverUser) {
            FleetNotificationService::createForUserWhenEnabled(
                user: $newDriverUser,
                settingKey: 'dispatchUpdates',
                title: 'New Dispatch Assignment',
                message:
                    "Dispatch {$dispatch->dispatch_number} has been assigned to you with vehicle {$dispatch->reservation->vehicle?->brand} {$dispatch->reservation->vehicle?->model}. Please review and accept the dispatch.",
                eventKey:
                    "dispatch:{$dispatch->id}:reassignment-approved:new-driver",
                default: true,
                link: route('dispatch')
            );
        }

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' =>
                    'Reassignment approved successfully.',
                'dispatch' =>
                    $dispatch,
                'reassignment' =>
                    $reassignment,
            ]);
        }

        return redirect()
            ->route('dispatch')
            ->with(
                'success',
                'Reassignment approved successfully.'
            );
    }

    public function rejectReassignment(
        Request $request,
        DispatchReassignment $reassignment
    ) {
        $result = DB::transaction(function () use (
            $request,
            $reassignment
        ) {
            $lockedReassignment = DispatchReassignment::query()
                ->with('requestedBy')
                ->lockForUpdate()
                ->findOrFail(
                    $reassignment->id
                );

            $dispatch = Dispatch::query()
                ->with('reservation')
                ->lockForUpdate()
                ->findOrFail(
                    $lockedReassignment->dispatch_id
                );

            $this->authorize(
                'rejectReassignment',
                $dispatch
            );

            if ($dispatch->archived_at) {
                abort(
                    422,
                    'Archived dispatch cannot be reviewed.'
                );
            }

            if (
                $lockedReassignment->status !==
                'Requested'
            ) {
                abort(
                    422,
                    'This reassignment request has already been reviewed.'
                );
            }

            if (
                $dispatch->trip_status !==
                'Pending'
            ) {
                abort(
                    422,
                    'Reassignment is only allowed while the dispatch is Pending.'
                );
            }

            $requestingDriverUser =
                $lockedReassignment->requestedBy;

            $lockedReassignment->update([
                'status' => 'Rejected',
                'reviewed_by' =>
                    $request->user()->id,
                'reviewed_at' =>
                    now(),
            ]);

            return [
                'dispatch' =>
                    $dispatch->fresh([
                        'reservation.vehicle',
                        'reservation.driver',
                    ]),

                'reassignment' =>
                    $lockedReassignment->fresh([
                        'requestedBy',
                        'reviewedBy',
                    ]),

                'requesting_driver_user' =>
                    $requestingDriverUser,
            ];
        });

        $dispatch =
            $result['dispatch'];

        $reassignment =
            $result['reassignment'];

        $requestingDriverUser =
            $result['requesting_driver_user'];

        /*
        |--------------------------------------------------------------------------
        | Notify Dispatcher + Fleet Manager
        |--------------------------------------------------------------------------
        */
        FleetNotificationService::createForRolesWhenEnabled(
            settingKey: 'dispatchUpdates',
            roles: [
                'dispatcher',
                'fleet_manager',
            ],
            title: 'Dispatch Reassignment Rejected',
            message:
                "The reassignment request for Dispatch {$dispatch->dispatch_number} was rejected.",
            default: true,
            link: route('dispatch'),
            excludeUserId: $request->user()->id
        );

        /*
        |--------------------------------------------------------------------------
        | Notify Requesting Driver
        |--------------------------------------------------------------------------
        */
        if ($requestingDriverUser) {
            FleetNotificationService::createForUserWhenEnabled(
                user: $requestingDriverUser,
                settingKey: 'dispatchUpdates',
                title: 'Reassignment Request Rejected',
                message:
                    "Your reassignment request for Dispatch {$dispatch->dispatch_number} was rejected.",
                eventKey:
                    "dispatch_reassignment_request:{$dispatch->id}:{$reassignment->id}:rejected:{$requestingDriverUser->id}",
                default: true,
                link: route('dispatch')
            );
        }

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' =>
                    'Reassignment request rejected.',
                'dispatch' =>
                    $dispatch,
                'reassignment' =>
                    $reassignment,
            ]);
        }

        return redirect()
            ->route('dispatch')
            ->with(
                'success',
                'Reassignment request rejected.'
            );
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

            'reassignments.requestedBy',
            'reassignments.reviewedBy',

            'reassignments.originalVehicle',
            'reassignments.originalDriver',

            'reassignments.recommendedVehicle',
            'reassignments.recommendedDriver',

            'reassignments.newVehicle',
            'reassignments.newDriver',
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
                    ? (string) $dispatch->dispatch_date
                    : null,

            'departure_time' =>
                $dispatch->departure_time,

            'arrival_time' =>
                $dispatch->arrival_time,

            'trip_status' =>
                $dispatch->trip_status,

            'accepted_at' =>
                $dispatch->accepted_at
                    ?->toDateTimeString(),

            'accepted_by' =>
                $dispatch->accepted_by,
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

    /**
     * Get all available vehicle + driver combinations
     * for reassignment review.
     */
    public function availableReassignmentPairs(
        Request $request,
        DispatchReassignment $reassignment
    ) {
        $dispatch = Dispatch::query()
            ->with([
                'reservation.driver',
                'reservation.vehicle',
            ])
            ->findOrFail(
                $reassignment->dispatch_id
            );

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */
        $this->authorize(
            'reviewReassignmentList',
            Dispatch::class
        );

        /*
        |--------------------------------------------------------------------------
        | Validate Reassignment State
        |--------------------------------------------------------------------------
        */
        if ($dispatch->archived_at) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Archived dispatch cannot receive replacement options.',
            ], 422);
        }

        if (
            $reassignment->status !==
            'Requested'
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This reassignment request has already been reviewed.',
            ], 422);
        }

        if (
            $dispatch->trip_status !==
            'Pending'
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Replacement options are only available while the dispatch is Pending.',
            ], 422);
        }

        $currentDriverId =
            (int) $dispatch->reservation?->driver_id;

        /*
        |--------------------------------------------------------------------------
        | Get Available Vehicle + Driver Pairs
        |--------------------------------------------------------------------------
        */
        $vehicles = Vehicle::query()
            ->with([
                'drivers' => function ($query) use (
                    $currentDriverId
                ) {
                    $query
                        ->where(
                            'status',
                            'Available'
                        )
                        ->whereNull(
                            'archived_at'
                        )
                        ->where(
                            'id',
                            '!=',
                            $currentDriverId
                        )
                        ->orderBy(
                            'first_name'
                        )
                        ->orderBy(
                            'last_name'
                        );
                },
            ])
            ->where(
                'status',
                'Available'
            )
            ->whereNull(
                'archived_at'
            )
            ->orderBy(
                'brand'
            )
            ->orderBy(
                'model'
            )
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Flatten Vehicle + Driver Pairs
        |--------------------------------------------------------------------------
        */
        $pairs = $vehicles
            ->flatMap(
                function (
                    Vehicle $vehicle
                ) {
                    if (
                        $vehicle->drivers->isEmpty()
                    ) {
                        return [];
                    }

                    return $vehicle->drivers
                        ->map(
                            function (
                                Driver $driver
                            ) use (
                                $vehicle
                            ) {
                                $driverName =
                                    trim(
                                        ($driver->first_name ?? '') .
                                        ' ' .
                                        ($driver->last_name ?? '')
                                    );

                                $vehicleLabel =
                                    trim(
                                        ($vehicle->brand ?? '') .
                                        ' ' .
                                        ($vehicle->model ?? '')
                                    );

                                return [
                                    'vehicle_id' =>
                                        $vehicle->id,

                                    'vehicle_label' =>
                                        $vehicleLabel !== ''
                                            ? $vehicleLabel
                                            : "Vehicle #{$vehicle->id}",

                                    'driver_id' =>
                                        $driver->id,

                                    'driver_name' =>
                                        $driverName !== ''
                                            ? $driverName
                                            : "Driver #{$driver->id}",

                                    'license_number' =>
                                        $driver->license_number,

                                    'vehicle_status' =>
                                        $vehicle->status,

                                    'driver_status' =>
                                        $driver->status,
                                ];
                            }
                        );
                }
            )
            ->values();

        return response()->json([
            'success' => true,

            'current_vehicle_id' =>
                $dispatch->reservation?->vehicle_id,

            'current_driver_id' =>
                $currentDriverId,

            'pairs' =>
                $pairs,
        ]);
    }
}