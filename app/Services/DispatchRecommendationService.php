<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\Reservation;
use App\Models\Vehicle;
use RuntimeException;

class DispatchRecommendationService
{
    public function __construct(
        private TomTomRoutingService $tomTomRouting
    ) {
    }

    /**
     * Generate ranked dispatch candidates for a Reservation.
     *
     * This is an explainable application-level recommendation engine.
     * It does NOT automatically modify the Reservation.
     */
    public function recommend(Reservation $reservation): array
    {
        $reservation->load([
            'vehicle',
            'driver',
            'routePlan',
        ]);

        $vehicles = Vehicle::query()
        ->with([
            'drivers' => function ($query) {
                $query
                    ->where('status', 'Available')
                    ->orderBy('id');
            },
            'latestLocation',
            'maintenances' => function ($query) {
                $query
                    ->orderByDesc('maintenance_date')
                    ->orderByDesc('id');
            },
        ])
            ->where('status', 'Available')
            ->get();

        $candidates = $vehicles
            ->flatMap(function (Vehicle $vehicle) use ($reservation) {
                $driver = $vehicle->drivers->first();

                if (!$driver) {
                    return [];
                }

                return [
                    $this->scoreCandidate(
                        $reservation,
                        $vehicle,
                        $driver
                    ),
                ];
            })
            ->sortByDesc('score')
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Current assigned resources
        |--------------------------------------------------------------------------
        */
        $assignedVehicle = $reservation->vehicle;
        $assignedDriver = $reservation->driver;

        $assignedCandidate = null;

        if ($assignedVehicle && $assignedDriver) {
            $assignedCandidate =
                $this->scoreAssignedResource(
                    $reservation,
                    $assignedVehicle,
                    $assignedDriver
                );
        }

        $recommended = $candidates->first();

        if (!$recommended) {
            return [
                'success' => true,
                'recommended' => null,
                'assigned' => $assignedCandidate,
                'candidates' => [],
                'message' =>
                    'No vehicle and driver combination is currently available for recommendation.',
            ];
        }

        return [
            'success' => true,
            'recommended' => $recommended,
            'assigned' => $assignedCandidate,
            'candidates' => $candidates->all(),
            'message' =>
                'Dispatch recommendation generated successfully.',
        ];
    }

    /**
     * Score one available Vehicle + Driver combination.
     */
    private function scoreCandidate(
        Reservation $reservation,
        Vehicle $vehicle,
        Driver $driver
    ): array {
        /*
        |--------------------------------------------------------------------------
        | Score Weights
        |--------------------------------------------------------------------------
        |
        | Total possible score = 100
        |
        | Availability          25
        | GPS Proximity         15
        | Assigned Fit          10
        | Priority Suitability  10
        | GPS Freshness           5
        | Traffic ETA            15
        | Fuel Level             10
        | Vehicle Suitability     5
        | Maintenance Status      5
        |
        */

        $availabilityScore = 25;

        $proximity =
            $this->calculateProximityScore(
                $reservation,
                $vehicle
            );

        $assignedFit = 0;

        if (
            $reservation->vehicle &&
            (int) $reservation->vehicle->id ===
                (int) $vehicle->id
        ) {
            $assignedFit += 5;
        }

        if (
            $reservation->driver &&
            (int) $reservation->driver->id ===
                (int) $driver->id
        ) {
            $assignedFit += 5;
        }

        $priorityScore =
            $this->calculatePrioritySuitability(
                $reservation,
                $vehicle
            );

        $gpsFreshness =
            $this->calculateGpsFreshnessScore(
                $vehicle
            );

        /*
        |--------------------------------------------------------------------------
        | Traffic-aware ETA
        |--------------------------------------------------------------------------
        */
        $traffic =
            $this->calculateTrafficScore(
                $reservation,
                $vehicle
            );

        /*
        |--------------------------------------------------------------------------
        | Fuel
        |--------------------------------------------------------------------------
        */
        $fuel =
            $this->calculateFuelScore(
                $vehicle
            );

        /*
        |--------------------------------------------------------------------------
        | Vehicle Suitability
        |--------------------------------------------------------------------------
        */
        $suitability =
            $this->calculateVehicleSuitabilityScore(
                $reservation,
                $vehicle
            );

        /*
        |--------------------------------------------------------------------------
        | Maintenance
        |--------------------------------------------------------------------------
        */
        $maintenance =
            $this->calculateMaintenanceScore(
                $vehicle
            );

        $score = (int) round(
            $availabilityScore +
            $proximity['score'] +
            $assignedFit +
            $priorityScore +
            $gpsFreshness +
            $traffic['score'] +
            $fuel['score'] +
            $suitability['score'] +
            $maintenance['score']
        );

        $score = max(
            0,
            min(100, $score)
        );

        $reasons =
            array_merge(
                [
                    'Vehicle is currently Available.',
                    'Driver is currently Available.',
                ],
                $proximity['reasons'],
                $this->getAssignedFitReasons(
                    $reservation,
                    $vehicle,
                    $driver
                ),
                $this->getPriorityReasons(
                    $reservation,
                    $vehicle
                ),
                $this->getGpsFreshnessReasons(
                    $vehicle
                ),
                $traffic['reasons'],
                $fuel['reasons'],
                $suitability['reasons'],
                $maintenance['reasons']
            );

        return [
            'vehicle_id' =>
                $vehicle->id,

            'vehicle_label' =>
                $this->getVehicleLabel(
                    $vehicle
                ),

            'plate_number' =>
                $vehicle->plate_number,

            'vehicle_type' =>
                $vehicle->vehicle_type,

            'vehicle_status' =>
                $vehicle->status,

            'driver_id' =>
                $driver->id,

            'driver_name' =>
                $this->getDriverName(
                    $driver
                ),

            'driver_status' =>
                $driver->status,

            'score' =>
                $score,

            'proximity_score' =>
                $proximity['score'],

            'assigned_fit_score' =>
                $assignedFit,

            'priority_score' =>
                $priorityScore,

            'gps_freshness_score' =>
                $gpsFreshness,

            'traffic_score' =>
                $traffic['score'],
            
            'fuel_score' =>
                $fuel['score'],

            'fuel_percentage' =>
                $fuel['percentage'],

            'vehicle_suitability_score' =>
                $suitability['score'],

            'maintenance_score' =>
                $maintenance['score'],

            'maintenance_status' =>
                $maintenance['status'],

            'maintenance_next_schedule' =>
                $maintenance['next_schedule'],

            'distance_to_pickup_km' =>
                $proximity['distance_km'],

            'traffic_eta_minutes' =>
                $traffic['eta_minutes'],

            'traffic_delay_minutes' =>
                $traffic['delay_minutes'],

            'traffic_live_travel_time_seconds' =>
                $traffic['live_travel_time_seconds'],

            'traffic_no_traffic_travel_time_seconds' =>
                $traffic['no_traffic_travel_time_seconds'],

            'traffic_provider' =>
                $traffic['provider'],

            'has_live_location' =>
                $proximity['has_location'],

            'location_age_seconds' =>
                $proximity['age_seconds'],

            'reasons' =>
                array_values(
                    array_unique(
                        $reasons
                    )
                ),

            'is_current_assignment' =>
                (
                    $reservation->vehicle &&
                    (int) $reservation->vehicle->id ===
                        (int) $vehicle->id
                ) &&
                (
                    $reservation->driver &&
                    (int) $reservation->driver->id ===
                        (int) $driver->id
                ),
        ];
    }

    /**
     * Score current Reservation assignment for comparison.
     */
    private function scoreAssignedResource(
        Reservation $reservation,
        Vehicle $vehicle,
        Driver $driver
    ): array {
        $vehicleAvailable =
            $vehicle->status === 'Available';

        $driverAvailable =
            $driver->status === 'Available';

        $proximity =
            $this->calculateProximityScore(
                $reservation,
                $vehicle
            );

        $priorityScore =
            $this->calculatePrioritySuitability(
                $reservation,
                $vehicle
            );

        $gpsFreshness =
            $this->calculateGpsFreshnessScore(
                $vehicle
            );

        $traffic =
            $this->calculateTrafficScore(
                $reservation,
                $vehicle
            );
        
        $fuel =
            $this->calculateFuelScore(
                $vehicle
            );

        $suitability =
            $this->calculateVehicleSuitabilityScore(
                $reservation,
                $vehicle
            );

        $maintenance =
            $this->calculateMaintenanceScore(
                $vehicle
            );

        $assignedFit = 10;

        $score =
            25 +
            $proximity['score'] +
            $assignedFit +
            $priorityScore +
            $gpsFreshness +
            $traffic['score'] +
            $fuel['score'] +
            $suitability['score'] +
            $maintenance['score'];

        return [
            'vehicle_id' =>
                $vehicle->id,

            'driver_id' =>
                $driver->id,

            'vehicle_label' =>
                $this->getVehicleLabel(
                    $vehicle
                ),

            'driver_name' =>
                $this->getDriverName(
                    $driver
                ),

            'vehicle_available' =>
                $vehicleAvailable,

            'driver_available' =>
                $driverAvailable,

            'distance_to_pickup_km' =>
                $proximity['distance_km'],

            'traffic_eta_minutes' =>
                $traffic['eta_minutes'],

            'traffic_delay_minutes' =>
                $traffic['delay_minutes'],

            'traffic_score' =>
                $traffic['score'],

            'fuel_score' =>
                $fuel['score'],

            'fuel_percentage' =>
                $fuel['percentage'],

            'vehicle_suitability_score' =>
                $suitability['score'],

            'maintenance_score' =>
                $maintenance['score'],

            'maintenance_status' =>
                $maintenance['status'],

            'maintenance_next_schedule' =>
                $maintenance['next_schedule'],

            'priority_score' =>
                $priorityScore,

            'gps_freshness_score' =>
                $gpsFreshness,

            'score' =>
                max(
                    0,
                    min(100, $score)
                ),

            'traffic_provider' =>
                $traffic['provider'],

            'is_current_assignment' =>
                true,
        ];
    }

    /**
     * Calculate proximity score using latest GPS.
     *
     * Maximum: 15 points.
     */
    private function calculateProximityScore(
        Reservation $reservation,
        Vehicle $vehicle
    ): array {
        $routePlan =
            $reservation->routePlan;

        $pickupLatitude =
            $routePlan?->origin_latitude;

        $pickupLongitude =
            $routePlan?->origin_longitude;

        $location =
            $vehicle->latestLocation;

        if (
            $pickupLatitude === null ||
            $pickupLongitude === null ||
            !$location
        ) {
            return [
                'score' => 0,
                'distance_km' => null,
                'has_location' => false,
                'age_seconds' => null,
                'reasons' => [
                    'No current GPS proximity score available.',
                ],
            ];
        }

        $distanceKm =
            $this->haversineDistance(
                (float) $pickupLatitude,
                (float) $pickupLongitude,
                (float) $location->latitude,
                (float) $location->longitude
            );

        $score = max(
            0,
            15 * (
                1 -
                min($distanceKm, 20) / 20
            )
        );

        $ageSeconds = null;

        if ($location->recorded_at) {
            $ageSeconds =
                max(
                    0,
                    now()->diffInSeconds(
                        $location->recorded_at
                    )
                );
        }

        $reasons = [
            sprintf(
                'Vehicle is approximately %.1f km from pickup.',
                $distanceKm
            ),
        ];

        if (
            $ageSeconds !== null &&
            $ageSeconds <= 120
        ) {
            $reasons[] =
                'Vehicle GPS location is recent.';
        }

        return [
            'score' =>
                (int) round($score),

            'distance_km' =>
                round(
                    $distanceKm,
                    2
                ),

            'has_location' =>
                true,

            'age_seconds' =>
                $ageSeconds,

            'reasons' =>
                $reasons,
        ];
    }

    /**
     * Calculate traffic-aware ETA score.
     *
     * Maximum: 15 points.
     */
    private function calculateTrafficScore(
        Reservation $reservation,
        Vehicle $vehicle
    ): array {
        $routePlan =
            $reservation->routePlan;

        $pickupLatitude =
            $routePlan?->origin_latitude;

        $pickupLongitude =
            $routePlan?->origin_longitude;

        $location =
            $vehicle->latestLocation;

        $empty = [
            'score' => 0,
            'eta_minutes' => null,
            'delay_minutes' => null,
            'live_travel_time_seconds' => null,
            'no_traffic_travel_time_seconds' => null,
            'provider' => null,
            'reasons' => [
                'Traffic-aware ETA is unavailable without a current vehicle GPS position.',
            ],
        ];

        if (
            $pickupLatitude === null ||
            $pickupLongitude === null ||
            !$location
        ) {
            return $empty;
        }

        /*
        |--------------------------------------------------------------------------
        | Ignore stale GPS for traffic routing.
        |--------------------------------------------------------------------------
        */
        if ($location->recorded_at) {
            $ageSeconds =
                max(
                    0,
                    now()->diffInSeconds(
                        $location->recorded_at
                    )
                );

            if ($ageSeconds > 120) {
                return [
                    ...$empty,
                    'reasons' => [
                        'Traffic-aware ETA skipped because the vehicle GPS position is stale.',
                    ],
                ];
            }
        }

        try {
            $result =
                $this->tomTomRouting->calculateRoute(
                    [
                        [
                            'latitude' =>
                                (float) $location->latitude,
                            'longitude' =>
                                (float) $location->longitude,
                        ],
                        [
                            'latitude' =>
                                (float) $pickupLatitude,
                            'longitude' =>
                                (float) $pickupLongitude,
                        ],
                    ],
                    now()->toIso8601String()
                );

            $liveSeconds =
                isset(
                    $result['live_traffic_travel_time_seconds']
                )
                    ? (int)
                        $result['live_traffic_travel_time_seconds']
                    : null;

            $noTrafficSeconds =
                isset(
                    $result['no_traffic_travel_time_seconds']
                )
                    ? (int)
                        $result['no_traffic_travel_time_seconds']
                    : null;

            $travelSeconds =
                isset(
                    $result['travel_time_seconds']
                )
                    ? (int)
                        $result['travel_time_seconds']
                    : null;

            if (
                !$travelSeconds &&
                $liveSeconds
            ) {
                $travelSeconds =
                    $liveSeconds;
            }

            if (
                !$travelSeconds ||
                $travelSeconds <= 0
            ) {
                return [
                    ...$empty,
                    'reasons' => [
                        'TomTom did not return a valid traffic-aware ETA.',
                    ],
                ];
            }

            $etaMinutes =
                round(
                    $travelSeconds / 60,
                    1
                );

            $delaySeconds =
                $result['traffic_delay_seconds'] ??
                null;

            if (
                $delaySeconds === null &&
                $liveSeconds !== null &&
                $noTrafficSeconds !== null
            ) {
                $delaySeconds =
                    max(
                        0,
                        $liveSeconds -
                        $noTrafficSeconds
                    );
            }

            $delayMinutes =
                $delaySeconds !== null
                    ? round(
                        max(
                            0,
                            (int) $delaySeconds
                        ) / 60,
                        1
                    )
                    : null;

            /*
            |--------------------------------------------------------------------------
            | ETA Component
            |--------------------------------------------------------------------------
            |
            | 10 points maximum.
            |--------------------------------------------------------------------------
            */
            $etaScore =
                match (true) {
                    $etaMinutes <= 5 => 10,
                    $etaMinutes <= 10 => 8,
                    $etaMinutes <= 20 => 6,
                    $etaMinutes <= 30 => 4,
                    $etaMinutes <= 45 => 2,
                    default => 0,
                };

            /*
            |--------------------------------------------------------------------------
            | Traffic Condition Component
            |--------------------------------------------------------------------------
            |
            | 5 points maximum.
            |--------------------------------------------------------------------------
            */
            $trafficScore = 5;

            if (
                $delaySeconds !== null &&
                $noTrafficSeconds !== null &&
                $noTrafficSeconds > 0
            ) {
                $delayRatio =
                    max(
                        0,
                        $delaySeconds /
                            $noTrafficSeconds
                    );

                $trafficScore =
                    match (true) {
                        $delayRatio <= 0.05 => 5,
                        $delayRatio <= 0.15 => 4,
                        $delayRatio <= 0.30 => 2,
                        default => 0,
                    };
            } elseif (
                $delayMinutes !== null &&
                $delayMinutes <= 1
            ) {
                $trafficScore = 5;
            } elseif (
                $delayMinutes !== null &&
                $delayMinutes <= 3
            ) {
                $trafficScore = 3;
            } elseif (
                $delayMinutes !== null
            ) {
                $trafficScore = 1;
            }

            $totalScore =
                min(
                    15,
                    $etaScore +
                    $trafficScore
                );

            $reasons = [
                sprintf(
                    'Traffic-aware ETA to pickup is approximately %.1f minutes.',
                    $etaMinutes
                ),
            ];

            if (
                $delayMinutes !== null &&
                $delayMinutes > 0
            ) {
                $reasons[] =
                    sprintf(
                        'TomTom estimates approximately %.1f minutes of traffic delay.',
                        $delayMinutes
                    );
            } else {
                $reasons[] =
                    'TomTom detected little or no traffic delay on the approach to pickup.';
            }

            return [
                'score' =>
                    $totalScore,

                'eta_minutes' =>
                    $etaMinutes,

                'delay_minutes' =>
                    $delayMinutes,

                'live_travel_time_seconds' =>
                    $liveSeconds,

                'no_traffic_travel_time_seconds' =>
                    $noTrafficSeconds,

                'provider' =>
                    $result['provider'] ??
                    'TomTom',

                'reasons' =>
                    $reasons,
            ];
        } catch (\Throwable $error) {
            return [
                ...$empty,
                'reasons' => [
                    'Traffic-aware ETA could not be calculated at this time.',
                ],
            ];
        }
    }

    /**
     * Calculate fuel level score.
     *
     * Maximum: 10 points.
     */
    private function calculateFuelScore(
        Vehicle $vehicle
    ): array {
        $currentFuel =
            $vehicle->current_fuel;

        $tankCapacity =
            $vehicle->tank_capacity;

        if (
            $currentFuel === null ||
            $tankCapacity === null ||
            (float) $tankCapacity <= 0
        ) {
            return [
                'score' => 0,
                'percentage' => null,
                'reasons' => [
                    'Fuel level could not be evaluated.',
                ],
            ];
        }

        $percentage =
            max(
                0,
                min(
                    100,
                    ((float) $currentFuel /
                        (float) $tankCapacity) * 100
                )
            );

        $score =
            match (true) {
                $percentage >= 75 => 10,
                $percentage >= 50 => 8,
                $percentage >= 35 => 6,
                $percentage >= 20 => 3,
                default => 0,
            };

        $reasons = [
            sprintf(
                'Vehicle fuel level is approximately %.0f%%.',
                $percentage
            ),
        ];

        if ($percentage >= 50) {
            $reasons[] =
                'Vehicle has sufficient fuel for dispatch consideration.';
        } elseif ($percentage >= 20) {
            $reasons[] =
                'Vehicle fuel level is moderate and should be monitored.';
        } else {
            $reasons[] =
                'Vehicle fuel level is low and may require refueling before dispatch.';
        }

        return [
            'score' =>
                $score,

            'percentage' =>
                round(
                    $percentage,
                    1
                ),

            'reasons' =>
                $reasons,
        ];
    }

    /**
     * Calculate vehicle suitability for the reservation.
     *
     * Maximum: 5 points.
     */
    private function calculateVehicleSuitabilityScore(
        Reservation $reservation,
        Vehicle $vehicle
    ): array {
        $requestType =
            strtolower(
                trim(
                    (string)
                        $reservation->request_type
                )
            );

        $vehicleType =
            strtolower(
                trim(
                    (string)
                        $vehicle->vehicle_type
                )
            );

        $score = 0;
        $reason = null;

        /*
        |--------------------------------------------------------------------------
        | Emergency / Patient Transport
        |--------------------------------------------------------------------------
        */
        if (
            str_contains(
                $requestType,
                'emergency'
            )
        ) {
            if (
                str_contains(
                    $vehicleType,
                    'ambulance'
                )
            ) {
                $score = 5;
                $reason =
                    'Ambulance is suitable for emergency transport.';
            } else {
                $score = 2;
                $reason =
                    'Vehicle is available, but it is not an ambulance.';
            }
        } elseif (
            str_contains(
                $requestType,
                'patient'
            ) ||
            str_contains(
                $requestType,
                'medical'
            ) ||
            str_contains(
                $requestType,
                'laboratory'
            )
        ) {
            if (
                str_contains(
                    $vehicleType,
                    'ambulance'
                ) ||
                str_contains(
                    $vehicleType,
                    'patient'
                ) ||
                str_contains(
                    $vehicleType,
                    'van'
                )
            ) {
                $score = 5;
                $reason =
                    'Vehicle type is suitable for patient-related transport.';
            } else {
                $score = 3;
                $reason =
                    'Vehicle can be considered for the requested transport type.';
            }
        } elseif (
            str_contains(
                $requestType,
                'supply'
            )
        ) {
            if (
                str_contains(
                    $vehicleType,
                    'van'
                ) ||
                str_contains(
                    $vehicleType,
                    'truck'
                ) ||
                str_contains(
                    $vehicleType,
                    'delivery'
                )
            ) {
                $score = 5;
                $reason =
                    'Vehicle type is suitable for supply transport.';
            } else {
                $score = 3;
                $reason =
                    'Vehicle is available for supply transport consideration.';
            }
        } elseif (
            str_contains(
                $requestType,
                'staff'
            )
        ) {
            if (
                str_contains(
                    $vehicleType,
                    'van'
                ) ||
                str_contains(
                    $vehicleType,
                    'suv'
                ) ||
                str_contains(
                    $vehicleType,
                    'car'
                )
            ) {
                $score = 5;
                $reason =
                    'Vehicle type is suitable for staff transport.';
            } else {
                $score = 3;
                $reason =
                    'Vehicle is available for staff transport consideration.';
            }
        } else {
            $score = 3;
            $reason =
                'Vehicle is available and suitable for general dispatch consideration.';
        }

        return [
            'score' =>
                $score,

            'reasons' =>
                $reason
                    ? [$reason]
                    : [],
        ];
    }

    /**
     * Calculate maintenance suitability.
     *
     * Maximum: 5 points.
     */
    private function calculateMaintenanceScore(
        Vehicle $vehicle
    ): array {
        $maintenance =
            $vehicle->maintenances
                ?->first();

        /*
        |--------------------------------------------------------------------------
        | No maintenance record
        |--------------------------------------------------------------------------
        */
        if (!$maintenance) {
            return [
                'score' => 3,
                'status' => 'No maintenance record',
                'next_schedule' => null,
                'reasons' => [
                    'No recent maintenance record is available for this vehicle.'
                ],
            ];
        }

        $status = strtolower(
            trim(
                (string) $maintenance->status
            )
        );

        /*
        |--------------------------------------------------------------------------
        | Active maintenance
        |--------------------------------------------------------------------------
        */
        $activeStatuses = [
            'in progress',
            'in-progress',
            'ongoing',
            'under maintenance',
            'maintenance',
            'repair',
            'repairing',
        ];

        if (
            in_array(
                $status,
                $activeStatuses,
                true
            )
        ) {
            return [
                'score' => 0,
                'status' => $maintenance->status,
                'next_schedule' =>
                    $maintenance->next_schedule
                        ?->format('Y-m-d'),
                'reasons' => [
                    'Vehicle has an active maintenance status.'
                ],
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Normalize scheduled / pending states
        |--------------------------------------------------------------------------
        */
        $scheduledStatuses = [
            'scheduled',
            'pending',
            'upcoming',
        ];

        if (
            in_array(
                $status,
                $scheduledStatuses,
                true
            )
        ) {
            $nextSchedule =
                $maintenance->next_schedule;

            if (
                $nextSchedule &&
                $nextSchedule->isPast()
            ) {
                return [
                    'score' => 1,
                    'status' => 'Overdue maintenance',
                    'next_schedule' =>
                        $nextSchedule->format('Y-m-d'),
                    'reasons' => [
                        'Vehicle has an overdue maintenance schedule.'
                    ],
                ];
            }

            return [
                'score' => 3,
                'status' => $maintenance->status,
                'next_schedule' =>
                    $nextSchedule
                        ?->format('Y-m-d'),
                'reasons' => [
                    $nextSchedule
                        ? 'Vehicle has scheduled maintenance on ' .
                            $nextSchedule->format('M d, Y') . '.'
                        : 'Vehicle has scheduled maintenance.'
                ],
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Completed / clear maintenance
        |--------------------------------------------------------------------------
        */
        if (
            str_contains(
                $status,
                'completed'
            ) ||
            str_contains(
                $status,
                'complete'
            ) ||
            str_contains(
                $status,
                'done'
            ) ||
            str_contains(
                $status,
                'closed'
            )
        ) {
            $nextSchedule =
                $maintenance->next_schedule;

            /*
            |--------------------------------------------------------------------------
            | Completed but next maintenance is overdue
            |--------------------------------------------------------------------------
            */
            if (
                $nextSchedule &&
                $nextSchedule->isPast()
            ) {
                return [
                    'score' => 1,
                    'status' => 'Maintenance overdue',
                    'next_schedule' =>
                        $nextSchedule->format('Y-m-d'),
                    'reasons' => [
                        'Vehicle maintenance schedule is overdue.'
                    ],
                ];
            }

            return [
                'score' => 5,
                'status' => $maintenance->status,
                'next_schedule' =>
                    $nextSchedule
                        ?->format('Y-m-d'),
                'reasons' => [
                    'Vehicle has a completed maintenance record and is not overdue for its next schedule.'
                ],
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Unknown status
        |--------------------------------------------------------------------------
        |
        | Avoid giving full points when the maintenance state
        | cannot be confidently evaluated.
        |--------------------------------------------------------------------------
        */
        return [
            'score' => 3,
            'status' => $maintenance->status,
            'next_schedule' =>
                $maintenance->next_schedule
                    ?->format('Y-m-d'),
            'reasons' => [
                'Vehicle maintenance status is available but requires monitoring.'
            ],
        ];
    }

    /**
     * Maximum: 10 points.
     */
    private function calculatePrioritySuitability(
        Reservation $reservation,
        Vehicle $vehicle
    ): int {
        $priority =
            strtolower(
                trim(
                    (string)
                        $reservation->priority
                )
            );

        $vehicleType =
            strtolower(
                trim(
                    (string)
                        $vehicle->vehicle_type
                )
            );

        if (
            in_array(
                $priority,
                [
                    'emergency',
                    'high',
                ],
                true
            )
        ) {
            return str_contains(
                $vehicleType,
                'ambulance'
            )
                ? 10
                : 6;
        }

        return 8;
    }

    /**
     * Maximum: 5 points.
     */
    private function calculateGpsFreshnessScore(
        Vehicle $vehicle
    ): int {
        $location =
            $vehicle->latestLocation;

        if (
            !$location ||
            !$location->recorded_at
        ) {
            return 0;
        }

        $age =
            now()->diffInSeconds(
                $location->recorded_at
            );

        if ($age <= 30) {
            return 5;
        }

        if ($age <= 120) {
            return 4;
        }

        if ($age <= 300) {
            return 2;
        }

        return 0;
    }

    private function getAssignedFitReasons(
        Reservation $reservation,
        Vehicle $vehicle,
        Driver $driver
    ): array {
        $reasons = [];

        if (
            $reservation->vehicle &&
            (int) $reservation->vehicle->id ===
                (int) $vehicle->id
        ) {
            $reasons[] =
                'Vehicle is already assigned to this Reservation.';
        }

        if (
            $reservation->driver &&
            (int) $reservation->driver->id ===
                (int) $driver->id
        ) {
            $reasons[] =
                'Driver is already assigned to this Reservation.';
        }

        return $reasons;
    }

    private function getPriorityReasons(
        Reservation $reservation,
        Vehicle $vehicle
    ): array {
        $priority =
            strtolower(
                trim(
                    (string)
                        $reservation->priority
                )
            );

        $vehicleType =
            strtolower(
                trim(
                    (string)
                        $vehicle->vehicle_type
                )
            );

        if (
            in_array(
                $priority,
                ['emergency', 'high'],
                true
            ) &&
            str_contains(
                $vehicleType,
                'ambulance'
            )
        ) {
            return [
                'Vehicle type is suitable for the Reservation priority.',
            ];
        }

        return [];
    }

    private function getGpsFreshnessReasons(
        Vehicle $vehicle
    ): array {
        $location =
            $vehicle->latestLocation;

        if (
            !$location ||
            !$location->recorded_at
        ) {
            return [
                'No recent GPS location is available.',
            ];
        }

        $age =
            now()->diffInSeconds(
                $location->recorded_at
            );

        if ($age <= 120) {
            return [
                'Recent GPS position is available.',
            ];
        }

        return [
            'GPS position is older than two minutes.',
        ];
    }

    private function getVehicleLabel(
        Vehicle $vehicle
    ): string {
        $brandModel =
            trim(
                implode(
                    ' ',
                    array_filter([
                        $vehicle->brand,
                        $vehicle->model,
                    ])
                )
            );

        if (
            $brandModel &&
            $vehicle->vehicle_type
        ) {
            return $brandModel .
                ' - ' .
                $vehicle->vehicle_type;
        }

        return $brandModel ||
            $vehicle->vehicle_type ||
            $vehicle->plate_number ||
            'Vehicle';
    }

    private function getDriverName(
        Driver $driver
    ): string {
        return trim(
            ($driver->first_name ?? '') .
            ' ' .
            ($driver->last_name ?? '')
        ) ?: 'Driver';
    }

    /**
     * Haversine distance in kilometers.
     */
    private function haversineDistance(
        float $latitude1,
        float $longitude1,
        float $latitude2,
        float $longitude2
    ): float {
        $earthRadiusKm = 6371.0088;

        $latitudeDelta =
            deg2rad(
                $latitude2 -
                $latitude1
            );

        $longitudeDelta =
            deg2rad(
                $longitude2 -
                $longitude1
            );

        $a =
            sin($latitudeDelta / 2) ** 2 +
            cos(
                deg2rad($latitude1)
            ) *
            cos(
                deg2rad($latitude2)
            ) *
            sin($longitudeDelta / 2) ** 2;

        $c =
            2 *
            atan2(
                sqrt($a),
                sqrt(1 - $a)
            );

        return $earthRadiusKm * $c;
    }
}