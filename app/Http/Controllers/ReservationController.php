<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\Vehicle;
use App\Models\Driver;
use Illuminate\Http\Request;
use App\Models\FleetSetting;
use App\Services\FleetNotificationService;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{   
    use AuthorizesRequests;

    private function getReservationSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();
        $settings = $record?->settings ?? [];
        $reservationSettings =
            $settings['reservations'] ?? [];
        return [
            'requireApproval' =>
                $reservationSettings['requireApproval'] ?? true,
            'allowSameDay' =>
                $reservationSettings['allowSameDay'] ?? true,
            'maxAdvanceDays' =>
                max(
                    1,
                    min(
                        365,
                        (int) (
                            $reservationSettings['maxAdvanceDays']
                            ?? 30
                        )
                    )
                ),
            'defaultDurationHours' =>
                max(
                    1,
                    min(
                        72,
                        (int) (
                            $reservationSettings['defaultDurationHours']
                            ?? 2
                        )
                    )
                ),
        ];
    }

    private function validateVehicleAndDriverAvailability(
        ?int $vehicleId,
        ?int $driverId
    ): void {
        /*
        |--------------------------------------------------------------------------
        | Vehicle is required if a driver is assigned
        |--------------------------------------------------------------------------
        */
        if (!$vehicleId && $driverId) {
            throw new \Exception(
                'A driver cannot be assigned without a vehicle.'
            );
        }
        /*
        |--------------------------------------------------------------------------
        | Vehicle Validation
        |--------------------------------------------------------------------------
        */
        if ($vehicleId) {
            $vehicle = Vehicle::find($vehicleId);

            if (!$vehicle) {
                throw new \Exception(
                    'Selected vehicle was not found.'
                );
            }

            if ($vehicle->status !== 'Available') {
                throw new \Exception(
                    "Vehicle {$vehicle->brand} {$vehicle->model} is currently {$vehicle->status} and cannot be assigned."
                );
            }
        }
        /*
        |--------------------------------------------------------------------------
        | Driver Validation
        |--------------------------------------------------------------------------
        */
        if ($driverId) {
            $driver = Driver::find($driverId);

            if (!$driver) {
                throw new \Exception(
                    'Selected driver was not found.'
                );
            }

            if ($driver->status !== 'Available') {
                $driverName = trim(
                    ($driver->first_name ?? '') . ' ' .
                    ($driver->last_name ?? '')
                );

                throw new \Exception(
                    "Driver {$driverName} is currently {$driver->status} and cannot be assigned."
                );
            }
            /*
            |--------------------------------------------------------------------------
            | Driver must belong to selected vehicle
            |--------------------------------------------------------------------------
            */
            if (
                !$vehicleId ||
                (int) $driver->assigned_vehicle_id !== (int) $vehicleId
            ) {
                throw new \Exception(
                    'The selected driver is not assigned to the selected vehicle.'
                );
            }
        }
    }

    /**
     * Display a listing of reservations.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Reservation::class);

        $user = $request->user();

        $query = Reservation::with([
            'vehicle',
            'driver',
            'requester',
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
                    $query->where(
                        'driver_id',
                        $driverId
                    );
                } else {
                    /*
                    | Driver account not linked to a Driver profile.
                    | Return no reservation records.
                    */
                    $query->whereRaw('1 = 0');
                }
            }
            if ($user->hasRole('department_head')) {
                if ($user->department) {
                    $query->where(
                        'department',
                        $user->department
                    );
                } else {
                    $query->whereRaw('1 = 0');
                }
            }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where(
                    'reservation_number',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'patient_name',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'pickup_location',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'destination',
                    'like',
                    "%{$search}%"
                )
                ->orWhereHas('vehicle', function ($vehicle) use ($search) {
                    $vehicle
                        ->where('brand', 'like', "%{$search}%")
                        ->orWhere('model', 'like', "%{$search}%")
                        ->orWhere('plate_number', 'like', "%{$search}%");
                })
                ->orWhereHas('driver', function ($driver) use ($search) {
                    $driver
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                });
            });
        }
        if (
            $request->filled('request_type') &&
            $request->request_type !== 'all'
        ) {
            $query->where(
                'request_type',
                $request->request_type
            );
        }
        if (
            $request->filled('priority') &&
            $request->priority !== 'all'
        ) {
            $query->where(
                'priority',
                $request->priority
            );
        }
        if (
            $request->filled('status') &&
            $request->status !== 'all'
        ) {
            $query->where(
                'status',
                $request->status
            );
        }

        $allowedSorts = [
            'id',
            'reservation_number',
            'patient_name',
            'schedule_date',
            'schedule_time',
            'priority',
            'status',
        ];

        $sort = $request->get('sort', 'id');

        if (!in_array($sort, $allowedSorts)) {
            $sort = 'id';
        }

        $direction = $request->get('direction', 'asc');

        if (!in_array($direction, ['asc', 'desc'])) {
            $direction = 'asc';
        }

        $query->orderBy($sort, $direction);

        $reservations = $query->get();

        if ($request->expectsJson()) {
            return response()->json([
                'reservations' => $reservations
            ]);
        }

        $reservationPermissions = [
            'role' =>
                $user->role,
            'canCreate' =>
                $user->can(
                    'create',
                    Reservation::class
                ),
            'canUpdate' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher',
                    'department_head'
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
            'canApprove' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
                ),
        ];
        return view(
            'reservation.index',
            compact('reservationPermissions')
        );
    }

    /**
     * Store a newly created reservation.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Reservation::class);

        $reservationSettings =
            $this->getReservationSettings();
        $minimumDate =
            $reservationSettings['allowSameDay']
                ? now()->toDateString()
                : now()->addDay()->toDateString();
        $maximumDate =
            now()
                ->addDays(
                    $reservationSettings['maxAdvanceDays']
                )
                ->toDateString();

        $validator = Validator::make(
            $request->all(),
            [
                'reservation_number' => [
                    'nullable',
                    'string',
                    'max:50',
                    'unique:reservations,reservation_number',
                ],
                'patient_name' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'request_type' => [
                    'required',
                    'in:Patient Transport,Emergency Transfer,Medical Appointment,Laboratory Transport,Staff Transport,Supply Delivery',
                ],
                'vehicle_id' => [
                    'nullable',
                    'exists:vehicles,id',
                ],
                'driver_id' => [
                    'nullable',
                    'exists:drivers,id',
                ],
                'pickup_location' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'destination' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'schedule_date' => [
                    'required',
                    'date',
                    'after_or_equal:' . $minimumDate,
                    'before_or_equal:' . $maximumDate,
                ],
                'schedule_time' => [
                    'required',
                ],
                'priority' => [
                    'required',
                    'in:Low,Normal,High,Emergency',
                ],
                'status' => [
                    'nullable',
                    'in:Pending,Approved',
                ],
                'contact_number' => [
                    'nullable',
                    'string',
                    'max:50',
                ],
                'notes' => [
                    'nullable',
                    'string',
                ],
            ],
            [
                'schedule_date.after_or_equal' =>
                    $reservationSettings['allowSameDay']
                        ? 'Reservation date cannot be earlier than today.'
                        : 'Same-day reservations are disabled. Please select a future date.',

                'schedule_date.before_or_equal' =>
                    'Reservation date cannot be more than ' .
                    $reservationSettings['maxAdvanceDays'] .
                    ' days in advance.',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the reservation information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $validated = $validator->validated();

            $validated['requested_by'] =
                $request->user()->id;
            /*
            |--------------------------------------------------------------------------
            | Department Head ownership
            |--------------------------------------------------------------------------
            */
            if (
                $request->user()->hasRole(
                    'department_head'
                )
            ) {
                if (!$request->user()->department) {
                    return response()->json([
                        'success' => false,
                        'message' =>
                            'Your account does not have an assigned department.',
                    ], 422);
                }
                $validated['department'] =
                    $request->user()->department;
                /*
                |--------------------------------------------------------------------------
                | Department Heads do not assign operational resources
                |--------------------------------------------------------------------------
                */
                $validated['vehicle_id'] = null;
                $validated['driver_id'] = null;
            }

            $validated['requested_by'] =
                $request->user()->id;

            $validated['department'] =
                $request->user()->department;
            
            $validated['status'] =
                $reservationSettings['requireApproval']
                    ? 'Pending'
                    : 'Approved';
            
            $validated['reservation_number'] = $validated['reservation_number']
                ?? $this->generateReservationNumber();

            $this->validateVehicleAndDriverAvailability(
                $validated['vehicle_id'] ?? null,
                $validated['driver_id'] ?? null
            );

            $reservation = Reservation::create(
                $validated
            );

            $reservation->load([
                'vehicle',
                'driver'
            ]);

            AuditLogService::log(
                module: 'Reservation Management',
                action: 'Created',
                description:
                    "Created reservation {$reservation->reservation_number}.",
                record: $reservation,
                newValues:
                    $this->getReservationAuditValues(
                        $reservation
                    )
            );

            if ($reservation->status === 'Pending') {
                FleetNotificationService::createWhenEnabled(
                    'reservationPending',
                    'Pending Reservation',
                    "Reservation {$reservation->reservation_number} is waiting for approval.",
                    true,
                    route('reservation.index')
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Reservation added successfully.',
                'reservation' => $reservation,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display the specified reservation.
     */
    public function show(Reservation $reservation)
    {
        $this->authorize('view', $reservation);

        $reservation->load([
            'vehicle',
            'driver',
            'requester',
        ]);

        return response()->json([
            'reservation' => $reservation,
        ]);
    }

    /**
     * Update the specified reservation.
     */
    public function update(
        Request $request,
        Reservation $reservation
    ) {
        $this->authorize('update', $reservation);

        $reservation->load([
            'routePlan',
            'vehicle',
            'driver',
            'dispatch',
        ]);

        if ($reservation->dispatch) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This reservation can no longer be modified because a dispatch has already been created.',
            ], 422);
        }
        if ($reservation->routePlan) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This reservation can no longer be modified because a route plan has already been created.',
            ], 422);
        }

        $user = $request->user();

        $reservationSettings =
            $this->getReservationSettings();
        $minimumDate =
            $reservationSettings['allowSameDay']
                ? now()->toDateString()
                : now()->addDay()->toDateString();
        $maximumDate =
            now()
                ->addDays(
                    $reservationSettings['maxAdvanceDays']
                )
                ->toDateString();

        /*
        |--------------------------------------------------------------------------
        | Fleet Manager / Dispatcher
        |--------------------------------------------------------------------------
        */
        if (
            $user->hasRole(
                'fleet_manager',
                'dispatcher'
            )
        ) {
            $validator = Validator::make(
                $request->all(),
                [
                    'reservation_number' => [
                        'required',
                        'string',
                        'max:50',
                        'unique:reservations,reservation_number,' .
                            $reservation->id,
                    ],
                    'patient_name' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'request_type' => [
                        'required',
                        'in:Patient Transport,Emergency Transfer,Medical Appointment,Laboratory Transport,Staff Transport,Supply Delivery',
                    ],
                    'vehicle_id' => [
                        'nullable',
                        'exists:vehicles,id',
                    ],
                    'driver_id' => [
                        'nullable',
                        'exists:drivers,id',
                    ],
                    'pickup_location' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'destination' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'schedule_date' => [
                        'required',
                        'date',
                        'after_or_equal:' . $minimumDate,
                        'before_or_equal:' . $maximumDate,
                    ],
                    'schedule_time' => [
                        'required',
                    ],
                    'priority' => [
                        'required',
                        'in:Low,Normal,High,Emergency',
                    ],
                    'status' => [
                        'required',
                        'in:Pending,Approved,Scheduled,Completed,Rejected,Cancelled',
                    ],
                    'contact_number' => [
                        'nullable',
                        'string',
                        'max:50',
                    ],
                    'notes' => [
                        'nullable',
                        'string',
                    ],
                ],
                [
                    'schedule_date.after_or_equal' =>
                        $reservationSettings['allowSameDay']
                            ? 'Reservation date cannot be earlier than today.'
                            : 'Same-day reservations are disabled. Please select a future date.',

                    'schedule_date.before_or_equal' =>
                        'Reservation date cannot be more than ' .
                        $reservationSettings['maxAdvanceDays'] .
                        ' days in advance.',
                ]
            );

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Please check the reservation information.',
                    'errors' =>
                        $validator->errors(),
                ], 422);
            }

            try {
                $validated =
                    $validator->validated();

                $this->validateVehicleAndDriverAvailability(
                    $validated['vehicle_id'] ?? null,
                    $validated['driver_id'] ?? null
                );

                /*
                |--------------------------------------------------------------------------
                | Capture Previous Audit State
                |--------------------------------------------------------------------------
                */
                $oldAuditValues =
                    $this->getReservationAuditValues(
                        $reservation
                    );

                /*
                |--------------------------------------------------------------------------
                | RBAC-Protected Ownership
                |--------------------------------------------------------------------------
                | requested_by and department are not accepted from the request.
                */
                $reservation->update(
                    $validated
                );

                $reservation->refresh();

                $newAuditValues =
                    $this->getReservationAuditValues(
                        $reservation
                    );

                $this->logReservationUpdate(
                    $reservation,
                    $oldAuditValues,
                    $newAuditValues
                );

                $reservation->load([
                    'vehicle',
                    'driver',
                    'requester',
                ]);

                return response()->json([
                    'success' => true,
                    'message' =>
                        'Reservation updated successfully.',
                    'reservation' =>
                        $reservation,
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        $e->getMessage(),
                ], 422);
            }
        }
        /*
        |--------------------------------------------------------------------------
        | Department Head - Limited Edit
        |--------------------------------------------------------------------------
        | Policy already ensures:
        | - same department
        | - Pending reservation only
        |
        | Department Head cannot modify:
        | - reservation number
        | - assigned vehicle
        | - assigned driver
        | - operational status
        | - ownership
        */
        if ($user->hasRole('department_head')) {
            if (!$user->department) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Your account does not have an assigned department.',
                ], 422);
            }

            $validator = Validator::make(
                $request->all(),
                [
                    'patient_name' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'request_type' => [
                        'required',
                        'in:Patient Transport,Emergency Transfer,Medical Appointment,Laboratory Transport,Staff Transport,Supply Delivery',
                    ],
                    'pickup_location' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'destination' => [
                        'required',
                        'string',
                        'max:255',
                    ],
                    'schedule_date' => [
                        'required',
                        'date',
                        'after_or_equal:' . $minimumDate,
                        'before_or_equal:' . $maximumDate,
                    ],
                    'schedule_time' => [
                        'required',
                    ],
                    'priority' => [
                        'required',
                        'in:Low,Normal,High,Emergency',
                    ],
                    'contact_number' => [
                        'nullable',
                        'string',
                        'max:50',
                    ],
                    'notes' => [
                        'nullable',
                        'string',
                    ],
                ],
                [
                    'schedule_date.after_or_equal' =>
                        $reservationSettings['allowSameDay']
                            ? 'Reservation date cannot be earlier than today.'
                            : 'Same-day reservations are disabled. Please select a future date.',

                    'schedule_date.before_or_equal' =>
                        'Reservation date cannot be more than ' .
                        $reservationSettings['maxAdvanceDays'] .
                        ' days in advance.',
                ]
            );

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Please check the reservation information.',
                    'errors' =>
                        $validator->errors(),
                ], 422);
            }

            $validated =
                $validator->validated();

            $oldAuditValues =
                $this->getReservationAuditValues(
                    $reservation
                );

            $reservation->update(
                $validated
            );

            $reservation->refresh();

            $newAuditValues =
                $this->getReservationAuditValues(
                    $reservation
                );

            $this->logReservationUpdate(
                $reservation,
                $oldAuditValues,
                $newAuditValues
            );

            $reservation->load([
                'vehicle',
                'driver',
                'requester',
            ]);

            return response()->json([
                'success' => true,
                'message' =>
                    'Reservation updated successfully.',
                'reservation' =>
                    $reservation,
            ]);
        }

        abort(
            403,
            'You do not have permission to update this reservation.'
        );
    }

    /**
     * Remove the specified reservation.
     */
    public function destroy(Reservation $reservation)
    {
        $this->authorize('delete', $reservation);

        try {
            $reservation->load([
                'routePlan',
                'dispatch',
            ]);
            if ($reservation->dispatch) {
                throw new \Exception(
                    'This reservation cannot be deleted because it already has a dispatch.'
                );
            }
            if ($reservation->routePlan) {
                throw new \Exception(
                    'This reservation cannot be deleted because it already has a route plan.'
                );
            }

            $deletedReservationValues =
                $this->getReservationAuditValues(
                    $reservation
                );

            DB::transaction(
                function () use (
                    $reservation,
                    $deletedReservationValues
                ) {
                    AuditLogService::log(
                        module: 'Reservation Management',
                        action: 'Deleted',
                        description:
                            "Deleted reservation {$reservation->reservation_number}.",
                        record: $reservation,
                        oldValues:
                            $deletedReservationValues
                    );

                    $reservation->delete();
                }
            );
            return response()->json([
                'success' => true,
                'message' => 'Reservation deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Bulk delete reservations.
     */
    public function bulkDelete(Request $request)
    {
        $this->authorize('deleteAny', Reservation::class);

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
                    'exists:reservations,id',
                ],
            ]
        );
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please select valid reservations.',
                'errors' => $validator->errors(),
            ], 422);
        }
        $deletedIds = [];
        try {
            $reservations = Reservation::with([
                'routePlan',
                'dispatch',
            ])
                ->whereIn(
                    'id',
                    $validator->validated()['ids']
                )
                ->get();
            DB::transaction(
                function () use (
                    $reservations,
                    &$deletedIds
                ) {
                    foreach ($reservations as $reservation) {
                        if (
                            $reservation->routePlan ||
                            $reservation->dispatch
                        ) {
                            continue;
                        }

                        $deletedReservationValues =
                            $this->getReservationAuditValues(
                                $reservation
                            );

                        AuditLogService::log(
                            module: 'Reservation Management',
                            action: 'Deleted',
                            description:
                                "Deleted reservation {$reservation->reservation_number}.",
                            record: $reservation,
                            oldValues:
                                $deletedReservationValues
                        );

                        $deletedIds[] =
                            $reservation->id;

                        $reservation->delete();
                    }
                }
            );
            if (empty($deletedIds)) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Selected reservations cannot be deleted because they are already linked to route planning or dispatch.',
                    'deleted_ids' => [],
                ], 422);
            }
            return response()->json([
                'success' => true,
                'message' =>
                    count($deletedIds) === 1
                        ? 'Reservation deleted successfully.'
                        : count($deletedIds) . ' reservations deleted successfully.',
                'deleted_ids' => $deletedIds,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete reservations.',
            ], 500);
        }
    }

    /**
     * Reservation statistics.
     */
    public function stats(Request $request)
    {
        $this->authorize('viewAny', Reservation::class);

        $user =
            $request->user();
        $query =
            Reservation::query();

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

        if (
            $user->hasRole(
                'department_head'
            )
        ) {
            if ($user->department) {
                $query->where(
                    'department',
                    $user->department
                );
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        return response()->json([
            'total' =>
                (clone $query)->count(),
            'pending' =>
                (clone $query)
                    ->where(
                        'status',
                        'Pending'
                    )
                    ->count(),
            'approved' =>
                (clone $query)
                    ->where(
                        'status',
                        'Approved'
                    )
                    ->count(),
            'scheduled' =>
                (clone $query)
                    ->where(
                        'status',
                        'Scheduled'
                    )
                    ->count(),
            'completed' =>
                (clone $query)
                    ->where(
                        'status',
                        'Completed'
                    )
                    ->count(),
            'cancelled' =>
                (clone $query)
                    ->where(
                        'status',
                        'Cancelled'
                    )
                    ->count(),
        ]);
    }

    private function generateReservationNumber(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $prefix = "RES-{$year}-{$month}";
        $latestReservation = Reservation::query()
            ->where(
                'reservation_number',
                'like',
                $prefix . '%'
            )
            ->orderByDesc('id')
            ->first();

        if (!$latestReservation) {
            $nextSequence = 1;
        } else {
            $lastSequence = (int) substr(
                $latestReservation->reservation_number,
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

    public function nextNumber()
    {
        $this->authorize('create', Reservation::class);

        return response()->json([
            'success' => true,
            'reservation_number' =>
                $this->generateReservationNumber(),
        ]);
    }

    private function getReservationAuditValues(
        Reservation $reservation
    ): array {
        /*
        |--------------------------------------------------------------------------
        | Audit-safe Reservation Snapshot
        |--------------------------------------------------------------------------
        |
        | Do not unnecessarily store patient/contact/notes information
        | inside the security audit trail.
        |--------------------------------------------------------------------------
        */
        return [
            'reservation_number' =>
                $reservation->reservation_number,

            'request_type' =>
                $reservation->request_type,

            'vehicle_id' =>
                $reservation->vehicle_id,

            'driver_id' =>
                $reservation->driver_id,

            'department' =>
                $reservation->department,

            'pickup_location' =>
                $reservation->pickup_location,

            'destination' =>
                $reservation->destination,

            'schedule_date' =>
                $reservation->schedule_date
                    ?->format('Y-m-d'),

            'schedule_time' =>
                $reservation->schedule_time,

            'priority' =>
                $reservation->priority,

            'status' =>
                $reservation->status,

            'requested_by' =>
                $reservation->requested_by,
        ];
    }

    private function logReservationUpdate(
        Reservation $reservation,
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

        /*
        |--------------------------------------------------------------------------
        | Determine Meaningful Reservation Action
        |--------------------------------------------------------------------------
        */
        $action = 'Updated';

        if (
            $oldStatus !== $newStatus &&
            $newStatus
        ) {
            $action = match ($newStatus) {
                'Approved' =>
                    'Approved',

                'Rejected' =>
                    'Rejected',

                'Cancelled' =>
                    'Cancelled',

                'Scheduled' =>
                    'Scheduled',

                'Completed' =>
                    'Completed',

                default =>
                    'Updated',
            };
        }

        $description = match ($action) {
            'Approved' =>
                "Approved reservation {$reservation->reservation_number}.",

            'Rejected' =>
                "Rejected reservation {$reservation->reservation_number}.",

            'Cancelled' =>
                "Cancelled reservation {$reservation->reservation_number}.",

            'Scheduled' =>
                "Scheduled reservation {$reservation->reservation_number}.",

            'Completed' =>
                "Completed reservation {$reservation->reservation_number}.",

            default =>
                "Updated reservation {$reservation->reservation_number}.",
        };

        AuditLogService::log(
            module: 'Reservation Management',
            action: $action,
            description: $description,
            record: $reservation,
            oldValues: $changedOldValues,
            newValues: $changedNewValues
        );
    }
}