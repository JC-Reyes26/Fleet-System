<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class TomTomRoutingService
{
    public function calculateRoute(
        array $coordinates,
        ?string $departAt = null
    ): array {
        if (count($coordinates) < 2) {
            throw new RuntimeException(
                'At least an origin and destination are required.'
            );
        }

        $apiKey = config('services.tomtom.key');

        if (!$apiKey) {
            throw new RuntimeException(
                'TomTom API key is not configured.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | TomTom locations
        |--------------------------------------------------------------------------
        |
        | longitude is NOT first here.
        | TomTom route locations use:
        |
        | latitude,longitude:latitude,longitude
        |
        */
        $locations = collect($coordinates)
            ->map(function (array $coordinate) {
                return sprintf(
                    '%s,%s',
                    $coordinate['latitude'],
                    $coordinate['longitude']
                );
            })
            ->implode(':');

        /*
        |--------------------------------------------------------------------------
        | Routing Options
        |--------------------------------------------------------------------------
        |
        | traffic=true
        |   Use traffic information during route calculation.
        |
        | computeBestOrder=true
        |   Re-order intermediate waypoints.
        |
        | routeRepresentation=polyline
        |   Return route geometry as points.
        |
        | computeTravelTimeFor=all
        |   Return no-traffic, historical and live traffic times.
        |
        */
        $query = [
            'key' => $apiKey,
            /*
            |--------------------------------------------------------------------------
            | Traffic-aware routing
            |--------------------------------------------------------------------------
            */
            'traffic' => 'true',
            /*
            |--------------------------------------------------------------------------
            | Route calculation
            |--------------------------------------------------------------------------
            */
            'routeType' => 'fastest',
            'travelMode' => 'car',
            'computeBestOrder' => 'true',
            /*
            |--------------------------------------------------------------------------
            | Route geometry
            |--------------------------------------------------------------------------
            */
            'routeRepresentation' => 'polyline',
            /*
            |--------------------------------------------------------------------------
            | Traffic metrics
            |--------------------------------------------------------------------------
            */
            'computeTravelTimeFor' => 'all',
            /*
            |--------------------------------------------------------------------------
            | Turn-by-turn guidance
            |--------------------------------------------------------------------------
            |
            | TomTom returns human-readable maneuver messages together
            | with maneuver metadata.
            |
            */
            'instructionsType' => 'text',
            'language' => 'en-GB',
            'sectionType' => 'lanes',
            /*
            |--------------------------------------------------------------------------
            | Fine-grained announcement points
            |--------------------------------------------------------------------------
            |
            | Allows the navigation frontend to later use early,
            | main, and confirmation announcement points.
            |
            */
            'instructionAnnouncementPoints' => 'all',
        ];

        if ($departAt) {
            $query['departAt'] = $departAt;
        }

        $response = Http::timeout(15)
            ->acceptJson()
            ->get(
                "https://api.tomtom.com/routing/1/calculateRoute/{$locations}/json",
                $query
            );

        if (!$response->successful()) {
            $message =
                $response->json('detailedError.message')
                ?? $response->json('message')
                ?? 'TomTom routing request failed.';

            throw new RuntimeException($message);
        }

        $data = $response->json();

        $route = $data['routes'][0] ?? null;

        if (!$route) {
            throw new RuntimeException(
                'TomTom did not return a route.'
            );
        }

        $summary = $route['summary'] ?? [];

        /*
        |--------------------------------------------------------------------------
        | Flatten route geometry
        |--------------------------------------------------------------------------
        |
        | Each leg may contain points.
        |
        */
        $points = [];

        foreach ($route['legs'] ?? [] as $leg) {
            foreach ($leg['points'] ?? [] as $point) {
                $latitude = $point['latitude'] ?? null;
                $longitude = $point['longitude'] ?? null;

                if (
                    $latitude === null ||
                    $longitude === null
                ) {
                    continue;
                }

                $points[] = [
                    'latitude' => (float) $latitude,
                    'longitude' => (float) $longitude,
                ];
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Optimized waypoint order
        |--------------------------------------------------------------------------
        |
        | Index refers to the ORIGINAL route locations.
        |
        | Example:
        |
        | [0, 2, 1, 3]
        |
        | means:
        | Origin → Stop 2 → Stop 1 → Destination
        |
        */
        $optimizedWaypoints =
            array_values(
                $data['optimizedWaypoints'] ?? []
            );
        /*
        |--------------------------------------------------------------------------
        | Turn-by-Turn Guidance
        |--------------------------------------------------------------------------
        |
        | TomTom returns guidance instructions under:
        |
        | routes[0].guidance.instructions
        |
        | Normalize the response so the frontend does not have to
        | depend directly on every TomTom field name.
        |
        */
        $guidanceInstructions = [];
        foreach (
            $route['guidance']['instructions'] ?? []
            as $instruction
        ) {
            $point = $instruction['point'] ?? null;
            $latitude = isset($point['latitude'])
                ? (float) $point['latitude']
                : null;
            $longitude = isset($point['longitude'])
                ? (float) $point['longitude']
                : null;
            $guidanceInstructions[] = [
                'route_offset_meters' =>
                    isset($instruction['routeOffsetInMeters'])
                        ? (int) $instruction['routeOffsetInMeters']
                        : null,
                'travel_time_seconds' =>
                    isset($instruction['travelTimeInSeconds'])
                        ? (int) $instruction['travelTimeInSeconds']
                        : null,
                'point' => (
                    $latitude !== null &&
                    $longitude !== null
                )
                    ? [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ]
                    : null,
                'point_index' =>
                    isset($instruction['pointIndex'])
                        ? (int) $instruction['pointIndex']
                        : null,
                'instruction_type' =>
                    $instruction['instructionType'] ?? null,
                'maneuver' =>
                    $instruction['maneuver'] ?? null,
                'message' =>
                    $instruction['message'] ?? null,
                'combined_message' =>
                    $instruction['combinedMessage'] ?? null,
                'street' =>
                    $instruction['street'] ?? null,
                'road_numbers' =>
                    array_values(
                        $instruction['roadNumbers'] ?? []
                    ),
                'signpost_text' =>
                    $instruction['signpostText'] ?? null,
                'junction_type' =>
                    $instruction['junctionType'] ?? null,
                'turn_angle_degrees' =>
                    isset(
                        $instruction['turnAngleInDecimalDegrees']
                    )
                        ? (int) $instruction[
                            'turnAngleInDecimalDegrees'
                        ]
                        : null,
                'roundabout_exit_number' =>
                    isset(
                        $instruction['roundaboutExitNumber']
                    )
                        ? (int) $instruction[
                            'roundaboutExitNumber'
                        ]
                        : null,
                'driving_side' =>
                    $instruction['drivingSide'] ?? null,
                /*
                |--------------------------------------------------------------------------
                | Optional announcement points
                |--------------------------------------------------------------------------
                */
                'announcements' => [
                    'early' =>
                        $instruction[
                            'earlyWarningAnnouncement'
                        ] ?? null,
                    'main' =>
                        $instruction[
                            'mainAnnouncement'
                        ] ?? null,
                    'confirmation' =>
                        $instruction[
                            'confirmationAnnouncement'
                        ] ?? null,
                ],
            ];
        }

        return [
            'provider' => 'TomTom',
            'distance_meters' =>
                isset($summary['lengthInMeters'])
                    ? (int) $summary['lengthInMeters']
                    : null,
            'travel_time_seconds' =>
                isset($summary['travelTimeInSeconds'])
                    ? (int) $summary['travelTimeInSeconds']
                    : null,
            'traffic_delay_seconds' =>
                isset($summary['trafficDelayInSeconds'])
                    ? (int) $summary['trafficDelayInSeconds']
                    : null,
            'traffic_length_meters' =>
                isset($summary['trafficLengthInMeters'])
                    ? (int) $summary['trafficLengthInMeters']
                    : null,
            'no_traffic_travel_time_seconds' =>
                isset($summary['noTrafficTravelTimeInSeconds'])
                    ? (int) $summary['noTrafficTravelTimeInSeconds']
                    : null,
            'historic_traffic_travel_time_seconds' =>
                isset($summary['historicTrafficTravelTimeInSeconds'])
                    ? (int) $summary['historicTrafficTravelTimeInSeconds']
                    : null,
            'live_traffic_travel_time_seconds' =>
                isset($summary['liveTrafficIncidentsTravelTimeInSeconds'])
                    ? (int) $summary['liveTrafficIncidentsTravelTimeInSeconds']
                    : null,
            'departure_time' =>
                $summary['departureTime'] ?? null,
            'arrival_time' =>
                $summary['arrivalTime'] ?? null,
            'optimized_waypoints' =>
                $optimizedWaypoints,
            /*
            |--------------------------------------------------------------------------
            | Navigation Guidance
            |--------------------------------------------------------------------------
            */
            'instructions' =>
                $guidanceInstructions,
            'points' =>
                $points,
            'route' =>
                $route,
        ];
    }
}