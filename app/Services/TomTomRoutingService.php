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
            'traffic' => 'true',
            'routeType' => 'fastest',
            'travelMode' => 'car',
            'computeBestOrder' => 'true',
            'routeRepresentation' => 'polyline',
            'computeTravelTimeFor' => 'all',
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

            'points' =>
                $points,

            'route' =>
                $route,
        ];
    }
}