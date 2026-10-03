<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\TripLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TripLogController extends Controller
{
    /**
     * Display trip logs.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = TripLog::with([
            'dispatch.reservation.vehicle',
            'dispatch.reservation.driver',
            'submittedBy',
        ])
            ->latest();

        /*
        |--------------------------------------------------------------------------
        | Driver scope
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driverId = $user->driverProfile?->id;

            if ($driverId) {
                $query->whereHas(
                    'dispatch.reservation',
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

        return response()->json([
            'success' => true,
            'trip_logs' => $query->get(),
        ]);
    }

    /**
     * Display a specific trip log.
     */
    public function show(
        Request $request,
        TripLog $tripLog
    ): JsonResponse {
        $user = $request->user();

        $tripLog->load([
            'dispatch.reservation.vehicle',
            'dispatch.reservation.driver',
            'dispatch.reservation.routePlan',
            'submittedBy',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Driver ownership check
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $driverId = $user->driverProfile?->id;

            if (
                !$driverId ||
                (int) $tripLog->dispatch
                    ?->reservation
                    ?->driver_id !== (int) $driverId
            ) {
                abort(403);
            }
        }

        return response()->json([
            'success' => true,
            'trip_log' => $tripLog,
        ]);
    }

    /**
     * Create a Trip Log for a completed dispatch.
     */
    public function store(
        Request $request,
        Dispatch $dispatch
    ): JsonResponse {
        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Only authenticated drivers can submit Trip Logs.
        |--------------------------------------------------------------------------
        */
        if (!$user->hasRole('driver')) {
            abort(403);
        }

        $driverId = $user->driverProfile?->id;

        if (!$driverId) {
            abort(403);
        }

        /*
        |--------------------------------------------------------------------------
        | Load dispatch relationships.
        |--------------------------------------------------------------------------
        */
        $dispatch->load([
            'reservation.vehicle',
            'reservation.driver',
        ]);

        $reservation = $dispatch->reservation;

        if (!$reservation) {
            throw ValidationException::withMessages([
                'dispatch' => 'This dispatch has no associated reservation.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Verify current driver owns the dispatch.
        |--------------------------------------------------------------------------
        */
        if ((int) $reservation->driver_id !== (int) $driverId) {
            abort(403);
        }

        /*
        |--------------------------------------------------------------------------
        | Only Completed dispatches can receive a Trip Log.
        |--------------------------------------------------------------------------
        */
        if (
            strtolower(
                trim((string) $dispatch->trip_status)
            ) !== 'completed'
        ) {
            throw ValidationException::withMessages([
                'dispatch' =>
                    'A Trip Log can only be submitted for a completed dispatch.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent duplicate Trip Logs.
        |--------------------------------------------------------------------------
        */
        if ($dispatch->tripLog()->exists()) {
            throw ValidationException::withMessages([
                'dispatch' =>
                    'A Trip Log has already been submitted for this dispatch.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Trip Log data and photos.
        |--------------------------------------------------------------------------
        */
        $validated = $request->validate([
            'start_odometer' => [
                'required',
                'numeric',
                'min:0',
            ],

            'end_odometer' => [
                'required',
                'numeric',
                'min:0',
            ],

            'distance' => [
                'required',
                'numeric',
                'min:0',
            ],

            'fuel_used' => [
                'required',
                'numeric',
                'min:0',
            ],

            'logbook_photo' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'arrival_proof_photo' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'delivery_proof_photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Delivery Proof Requirement
        |--------------------------------------------------------------------------
        | Proof of delivery is only required for Supply Delivery dispatches.
        |--------------------------------------------------------------------------
        */
        $isSupplyDelivery =
            strtolower(
                trim((string) $reservation->request_type)
            ) === 'supply delivery';

        if (
            $isSupplyDelivery &&
            !$request->hasFile('delivery_proof_photo')
        ) {
            throw ValidationException::withMessages([
                'delivery_proof_photo' =>
                    'Proof of delivery is required for Supply Delivery dispatches.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Odometer validation
        |--------------------------------------------------------------------------
        */
        if (
            (float) $validated['end_odometer'] <
            (float) $validated['start_odometer']
        ) {
            throw ValidationException::withMessages([
                'end_odometer' =>
                    'End odometer cannot be lower than start odometer.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Store proof images.
        |--------------------------------------------------------------------------
        */
        $storedFiles = [];

        try {
            $logbookPath = $request
                ->file('logbook_photo')
                ->store(
                    'trip-logs/logbook',
                    'public'
                );

            $storedFiles[] = $logbookPath;

            $arrivalPath = $request
                ->file('arrival_proof_photo')
                ->store(
                    'trip-logs/arrival',
                    'public'
                );

            $storedFiles[] = $arrivalPath;

            $deliveryPath = null;

            if ($request->hasFile('delivery_proof_photo')) {
                $deliveryPath = $request
                    ->file('delivery_proof_photo')
                    ->store(
                        'trip-logs/delivery',
                        'public'
                    );

                $storedFiles[] = $deliveryPath;
            }

            /*
            |--------------------------------------------------------------------------
            | Create Trip Log
            |--------------------------------------------------------------------------
            */
            $tripLog = DB::transaction(
                function () use (
                    $dispatch,
                    $user,
                    $validated,
                    $logbookPath,
                    $arrivalPath,
                    $deliveryPath
                ) {
                    return TripLog::create([
                        'dispatch_id' =>
                            $dispatch->id,

                        'start_odometer' =>
                            $validated['start_odometer'],

                        'end_odometer' =>
                            $validated['end_odometer'],

                        'distance' =>
                            $validated['distance'],

                        'fuel_used' =>
                            $validated['fuel_used'],

                        'logbook_photo' =>
                            $logbookPath,

                        'arrival_proof_photo' =>
                            $arrivalPath,

                        'delivery_proof_photo' =>
                            $deliveryPath,

                        'submitted_at' =>
                            now(),

                        'submitted_by' =>
                            $user->id,

                        'notes' =>
                            $validated['notes'] ?? null,
                    ]);
                }
            );

            $tripLog->load([
                'dispatch.reservation.vehicle',
                'dispatch.reservation.driver',
                'submittedBy',
            ]);

            return response()->json([
                'success' => true,
                'message' =>
                    'Trip Log submitted successfully.',
                'trip_log' => $tripLog,
            ], 201);
        } catch (\Throwable $e) {
            /*
            |--------------------------------------------------------------------------
            | Clean up uploaded files if database save fails.
            |--------------------------------------------------------------------------
            */
            foreach ($storedFiles as $path) {
                if (
                    $path &&
                    Storage::disk('public')->exists($path)
                ) {
                    Storage::disk('public')->delete($path);
                }
            }

            report($e);

            throw $e;
        }
    }
}