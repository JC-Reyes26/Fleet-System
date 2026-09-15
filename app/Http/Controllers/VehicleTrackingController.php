<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VehicleTrackingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $driver = Driver::where('user_id', $user->id)
            ->first();

        if (!$driver) {
            return response()->json([
                'message' => 'No driver profile is associated with this account.',
            ], 403);
        }

        if (!$driver->assigned_vehicle_id) {
            return response()->json([
                'message' => 'No vehicle is currently assigned to this driver.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'latitude' => [
                'required',
                'numeric',
                'between:-90,90',
            ],

            'longitude' => [
                'required',
                'numeric',
                'between:-180,180',
            ],

            'speed' => [
                'nullable',
                'numeric',
                'min:0',
                'max:400',
            ],

            'heading' => [
                'nullable',
                'numeric',
                'between:0,360',
            ],

            'accuracy' => [
                'nullable',
                'numeric',
                'min:0',
                'max:10000',
            ],

            'dispatch_id' => [
                'nullable',
                'integer',
                'exists:dispatch,id',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid GPS data.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $dispatchId = $request->input('dispatch_id');

        if ($dispatchId) {
            $dispatchBelongsToDriver = \App\Models\Dispatch::query()
                ->where('dispatch.id', $dispatchId)
                ->whereHas('reservation', function ($query) use ($driver) {
                    $query->where('driver_id', $driver->id);
                })
                ->exists();

            if (!$dispatchBelongsToDriver) {
                return response()->json([
                    'message' => 'The selected dispatch is not assigned to this driver.',
                ], 403);
            }
        }

        $location = VehicleLocation::create([
            'vehicle_id' => $driver->assigned_vehicle_id,
            'driver_id' => $driver->id,
            'dispatch_id' => $dispatchId,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'speed' => $request->input('speed'),
            'heading' => $request->input('heading'),
            'accuracy' => $request->input('accuracy'),
            'recorded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Vehicle location recorded successfully.',
            'location' => [
                'id' => $location->id,
                'vehicle_id' => $location->vehicle_id,
                'driver_id' => $location->driver_id,
                'dispatch_id' => $location->dispatch_id,
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
                'speed' => $location->speed !== null
                    ? (float) $location->speed
                    : null,
                'heading' => $location->heading !== null
                    ? (float) $location->heading
                    : null,
                'accuracy' => $location->accuracy !== null
                    ? (float) $location->accuracy
                    : null,
                'recorded_at' => $location->recorded_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function vehicles(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $query = Vehicle::query()
            ->with([
                'latestLocation.driver',
                'latestLocation.dispatch',
            ]);

        /*
         * Driver can only see their assigned vehicle.
         */
        if ($user->role === 'driver') {
            $driver = Driver::where('user_id', $user->id)
                ->first();

            if (!$driver || !$driver->assigned_vehicle_id) {
                return response()->json([
                    'vehicles' => [],
                    'server_time' => now()->toIso8601String(),
                ]);
            }

            $query->where(
                'id',
                $driver->assigned_vehicle_id
            );
        }

        /*
         * Department Head can only see vehicles
         * belonging to their department.
         */
        if ($user->role === 'department_head') {
            $query->where(
                'department',
                $user->department
            );
        }

        $vehicles = $query
            ->orderBy('plate_number')
            ->get();

        $data = $vehicles->map(function (Vehicle $vehicle) {
            $location = $vehicle->latestLocation;

            if (!$location) {
                return [
                    'vehicle_id' => $vehicle->id,
                    'plate_number' => $vehicle->plate_number,
                    'vehicle_label' => $vehicle->display_label,
                    'vehicle_status' => $vehicle->status,
                    'has_location' => false,
                    'location' => null,
                ];
            }

            $driver = $location->driver;
            $dispatch = $location->dispatch;

            return [
                'vehicle_id' => $vehicle->id,
                'plate_number' => $vehicle->plate_number,
                'vehicle_label' => $vehicle->display_label,
                'vehicle_status' => $vehicle->status,

                'has_location' => true,

                'location' => [
                    'latitude' => (float) $location->latitude,
                    'longitude' => (float) $location->longitude,

                    'speed' => $location->speed !== null
                        ? (float) $location->speed
                        : null,

                    'heading' => $location->heading !== null
                        ? (float) $location->heading
                        : null,

                    'accuracy' => $location->accuracy !== null
                        ? (float) $location->accuracy
                        : null,

                    'recorded_at' => $location->recorded_at
                        ?->toIso8601String(),

                    'age_seconds' => $location->recorded_at
                        ? $location->recorded_at->diffInSeconds(now())
                        : null,

                    'driver' => $driver
                        ? trim(
                            ($driver->first_name ?? '') .
                            ' ' .
                            ($driver->last_name ?? '')
                        )
                        : null,

                    'dispatch' => $dispatch
                        ? [
                            'id' => $dispatch->id,
                            'number' => $dispatch->dispatch_number,
                            'status' => $dispatch->trip_status,
                        ]
                        : null,
                ],
            ];
        })->values();

        return response()->json([
            'vehicles' => $data,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function activeDispatch(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $driver = Driver::where('user_id', $user->id)
            ->first();

        if (!$driver) {
            return response()->json([
                'message' => 'No driver profile is associated with this account.',
            ], 403);
        }

        if (!$driver->assigned_vehicle_id) {
            return response()->json([
                'active' => false,
                'dispatch' => null,
                'vehicle_id' => null,
            ]);
        }

        /*
        * Only En Route is considered an active trip
        * for continuous GPS tracking.
        */
        $dispatch = \App\Models\Dispatch::query()
            ->with([
                'reservation.vehicle',
                'reservation.driver',
            ])
            ->where('trip_status', 'En Route')
            ->whereHas('reservation', function ($query) use ($driver) {
                $query->where('driver_id', $driver->id);
            })
            ->latest('id')
            ->first();

        if (!$dispatch) {
            return response()->json([
                'active' => false,
                'dispatch' => null,
                'vehicle_id' => $driver->assigned_vehicle_id,
            ]);
        }

        $reservation = $dispatch->reservation;
        $vehicle = $reservation?->vehicle;

        return response()->json([
            'active' => true,

            'dispatch' => [
                'id' => $dispatch->id,
                'dispatch_number' => $dispatch->dispatch_number,
                'status' => $dispatch->trip_status,
            ],

            'vehicle' => [
                'id' => $vehicle?->id ?? $driver->assigned_vehicle_id,
                'label' => $vehicle?->display_label ?? 'Vehicle',
                'plate_number' => $vehicle?->plate_number,
            ],

            'driver_id' => $driver->id,
        ]);
    }
}