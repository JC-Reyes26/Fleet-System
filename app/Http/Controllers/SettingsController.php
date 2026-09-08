<?php

namespace App\Http\Controllers;

use App\Models\FleetSetting;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SettingsController extends Controller
{
    public function index(): View
    {
        return view('settings.index');
    }

    public function show(): JsonResponse
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();

        return response()->json([
            'settings' => $record?->settings,
            'updated_at' => $record?->updated_at,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => [
                'required',
                'array',
            ],
        ]);

        $record = FleetSetting::query()
            ->latest('id')
            ->first();

        $oldSettings =
            $record?->settings ?? [];

        $newSettings =
            $validated['settings'];

        $record = DB::transaction(
            function () use (
                $record,
                $newSettings,
                $request,
                $oldSettings
            ) {
                if (!$record) {
                    $record =
                        new FleetSetting();
                }

                $record->settings =
                    $newSettings;

                $record->updated_by =
                    $request->user()?->id;

                $record->save();

                if ($oldSettings !== $newSettings) {
                    AuditLogService::log(
                        module: 'Settings',
                        action: 'Updated',
                        description:
                            'Updated fleet system settings.',
                        record: $record,
                        oldValues: [
                            'settings' =>
                                $oldSettings,
                        ],
                        newValues: [
                            'settings' =>
                                $newSettings,
                        ]
                    );
                }

                return $record;
            }
        );

        return response()->json([
            'message' =>
                'Fleet settings saved successfully.',

            'settings' =>
                $record->settings,

            'updated_at' =>
                $record->updated_at,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();

        if ($record) {
            DB::transaction(
                function () use ($record) {
                    $oldSettings =
                        $record->settings ?? [];

                    AuditLogService::log(
                        module: 'Settings',
                        action: 'Reset',
                        description:
                            'Reset fleet system settings to defaults.',
                        record: $record,
                        oldValues: [
                            'settings' =>
                                $oldSettings,
                        ],
                        newValues: [
                            'settings' => [],
                        ]
                    );

                    $record->delete();
                }
            );
        }

        return response()->json([
            'message' =>
                'Fleet settings reset successfully.',
        ]);
    }
}