<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiDispatchExplanationService
{
    public function explain(array $recommendationData): array
    {
        $apiKey = config('services.gemini.key');

        $primaryModel = config(
            'services.gemini.model',
            'gemini-3.6-flash'
        );

        $fallbackModel = config(
            'services.gemini.fallback_model',
            'gemini-3.5-flash-lite'
        );

        if (!$apiKey) {
            throw new RuntimeException(
                'Gemini API key is not configured.'
            );
        }

        $prompt = $this->buildPrompt(
            $recommendationData
        );

        $models = array_values(
            array_unique([
                $primaryModel,
                $fallbackModel,
            ])
        );

        $lastError = null;

        foreach ($models as $model) {
            try {
                return $this->requestModel(
                    $apiKey,
                    $model,
                    $prompt
                );
            } catch (\Throwable $e) {
                $lastError = $e;

                report(
                    new RuntimeException(
                        "Gemini model {$model} failed: " .
                        $e->getMessage(),
                        0,
                        $e
                    )
                );
            }
        }

        throw new RuntimeException(
            $lastError?->getMessage()
                ?? 'All configured Gemini models failed.'
        );
    }

    private function requestModel(
        string $apiKey,
        string $model,
        string $prompt
    ): array {
        $response = Http::timeout(30)
            ->acceptJson()
            ->withHeaders([
                'x-goog-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])
            ->post(
                'https://generativelanguage.googleapis.com/v1beta/interactions',
                [
                    'model' => $model,

                    'input' => $prompt,

                    'system_instruction' =>
                        'You are a professional AI decision-support assistant for a hospital fleet dispatch management system.',

                    'generation_config' => [
                        'max_output_tokens' => 500,
                        'thinking_level' => 'low',
                    ],

                    'response_format' => [
                        'type' => 'text',
                        'mime_type' => 'application/json',
                        'schema' => [
                            'type' => 'object',
                            'properties' => [
                                'summary' => [
                                    'type' => 'string',
                                ],

                                'key_factors' => [
                                    'type' => 'array',
                                    'items' => [
                                        'type' => 'string',
                                    ],
                                ],

                                'limitations' => [
                                    'type' => 'array',
                                    'items' => [
                                        'type' => 'string',
                                    ],
                                ],
                            ],
                            'required' => [
                                'summary',
                                'key_factors',
                                'limitations',
                            ],
                        ],
                    ],

                    'store' => false,
                ]
            );

        if (!$response->successful()) {
            $message =
                $response->json('error.message')
                ?? "Gemini model {$model} request failed.";

            throw new RuntimeException(
                $message
            );
        }

        $data = $response->json();

        $text = null;

        foreach ($data['steps'] ?? [] as $step) {
            if (
                ($step['type'] ?? null) !==
                'model_output'
            ) {
                continue;
            }

            foreach ($step['content'] ?? [] as $content) {
                if (
                    ($content['type'] ?? null) !==
                    'text'
                ) {
                    continue;
                }

                $candidateText = trim(
                    (string) (
                        $content['text'] ?? ''
                    )
                );

                if ($candidateText !== '') {
                    $text = $candidateText;
                    break 2;
                }
            }
        }

        if (!$text) {
            throw new RuntimeException(
                "Gemini model {$model} returned no output."
            );
        }

        $decoded = json_decode(
            $text,
            true
        );

        if (
            !is_array($decoded) ||
            !isset($decoded['summary'])
        ) {
            throw new RuntimeException(
                'Gemini returned an invalid explanation format.'
            );
        }

        return [
            'summary' =>
                trim(
                    (string) $decoded['summary']
                ),

            'key_factors' =>
                array_values(
                    array_filter(
                        $decoded['key_factors'] ?? [],
                        fn ($value) =>
                            is_string($value) &&
                            trim($value) !== ''
                    )
                ),

            'limitations' =>
                array_values(
                    array_filter(
                        $decoded['limitations'] ?? [],
                        fn ($value) =>
                            is_string($value) &&
                            trim($value) !== ''
                    )
                ),
        ];
    }

    private function buildPrompt(
        array $data
    ): string {
        $reasons = $data['reasons'] ?? [];

        if (is_array($reasons)) {
            $reasonsText = empty($reasons)
                ? 'No specific recommendation reasons were provided.'
                : '- ' . implode("\n- ", $reasons);
        } else {
            $reasonsText = (string) $reasons;
        }

        $hasLiveLocation =
            !empty($data['has_live_location'])
                ? 'Yes'
                : 'No';

        $locationAge =
            isset($data['location_age_seconds'])
                ? $data['location_age_seconds'] . ' seconds'
                : 'Unavailable';

        $fuelPercentage =
            isset($data['fuel_percentage'])
                ? $data['fuel_percentage'] . '%'
                : 'Unavailable';

        $maintenanceSchedule =
            !empty($data['maintenance_next_schedule'])
                ? $data['maintenance_next_schedule']
                : 'Unavailable';

        return <<<PROMPT
        Analyze and explain this already-computed hospital dispatch recommendation.

        The hospital system has already selected the recommended vehicle and driver
        using a deterministic 100-point scoring model.

        You are an explanation and decision-support assistant.
        You are NOT responsible for selecting or changing the recommendation.

        IMPORTANT RULES:
        - Never choose a different vehicle or driver.
        - Never modify the recommendation score.
        - Never invent missing data.
        - Never assume GPS exists when it does not.
        - Never assume traffic data exists when it does not.
        - Never assume maintenance is clear when the data is unavailable.
        - Treat all supplied scores and reasons as authoritative.
        - Explain the strongest factors that contributed to the score.
        - Explain important limitations or unavailable data.
        - Do not expose internal API details.
        - Use professional language suitable for a hospital dispatcher.
        - Keep the summary to 2-4 sentences.
        - Keep key_factors to 2-6 items.
        - Keep limitations to 0-4 items.
        - Do not use markdown.
        - Return only JSON matching the requested schema.

        RESERVATION
        Reservation Number: {$data['reservation_number']}
        Priority: {$data['priority']}

        RECOMMENDED ASSIGNMENT
        Vehicle: {$data['vehicle_label']}
        Driver: {$data['driver_name']}

        TOTAL SCORE
        {$data['score']}/100

        SCORE BREAKDOWN
        Availability: {$data['availability_score']}/25
        GPS Proximity: {$data['proximity_score']}/15
        Assigned Fit: {$data['assigned_fit_score']}/10
        Priority Suitability: {$data['priority_score']}/10
        GPS Freshness: {$data['gps_freshness_score']}/5
        Traffic ETA: {$data['traffic_score']}/15
        Fuel Level: {$data['fuel_score']}/10
        Vehicle Suitability: {$data['vehicle_suitability_score']}/5
        Maintenance Status: {$data['maintenance_score']}/5

        LOCATION AND TRAFFIC
        Distance to pickup: {$data['distance_to_pickup_km']}
        Traffic ETA: {$data['traffic_eta_minutes']}
        Traffic delay: {$data['traffic_delay_minutes']}
        Traffic provider: {$data['traffic_provider']}
        Live GPS available: {$hasLiveLocation}
        GPS age: {$locationAge}

        FUEL
        Fuel level: {$fuelPercentage}

        MAINTENANCE
        Status: {$data['maintenance_status']}
        Next schedule: {$maintenanceSchedule}

        SYSTEM REASONS
        {$reasonsText}
        PROMPT;
    }
}