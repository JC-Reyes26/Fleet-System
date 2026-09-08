<?php

namespace App\Http\Controllers;

use App\Models\CostBudget;
use App\Models\CostBudgetHistory;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CostBudgetController extends Controller
{
    use AuthorizesRequests;

    public function show()
    {
        $this->authorize('viewAny', CostBudget::class);

        $budget = CostBudget::first();

        return response()->json([
            'budget' => $budget
                ? $this->formatBudget($budget)
                : null,
        ]);
    }

    public function history()
    {
        $this->authorize('viewAny', CostBudget::class);

        $history = CostBudgetHistory::query()
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,

                    'action' =>
                        $item->action,

                    'previousValue' =>
                        $item->previous_value !== null
                            ? (float) $item->previous_value
                            : null,

                    'newValue' =>
                        $item->new_value !== null
                            ? (float) $item->new_value
                            : null,

                    'periodType' =>
                        $item->period_type,

                    'changedAt' =>
                        optional(
                            $item->created_at
                        )->toISOString(),
                ];
            });

        return response()->json([
            'history' => $history,
        ]);
    }

    public function save(Request $request)
    {
        $this->authorize('manage', CostBudget::class);

        $validator = Validator::make(
            $request->all(),
            [
                'overall_budget' => [
                    'required',
                    'numeric',
                    'min:0',
                ],
                'period_type' => [
                    'required',
                    'in:filter,monthly,quarterly,yearly,custom',
                ],
                'start_date' => [
                    'nullable',
                    'date',
                ],
                'end_date' => [
                    'nullable',
                    'date',
                    'after_or_equal:start_date',
                ],
                'notes' => [
                    'nullable',
                    'string',
                    'max:500',
                ],
                'category_budgets' => [
                    'nullable',
                    'array',
                ],
                'category_budgets.Fuel' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'category_budgets.Maintenance' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'category_budgets.TripOperations' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'category_budgets.ReservationOperations' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
                'category_budgets.Other' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Please check the budget information.',
                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        $validated =
            $validator->validated();

        if (
            $validated['period_type'] ===
            'custom'
        ) {
            if (
                empty(
                    $validated['start_date']
                ) ||
                empty(
                    $validated['end_date']
                )
            ) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'Custom budget period requires start and end dates.',
                ], 422);
            }
        } else {
            $validated['start_date'] =
                null;

            $validated['end_date'] =
                null;
        }

        try {
            $budget =
                DB::transaction(
                    function () use (
                        $validated
                    ) {
                        $budget =
                            CostBudget::query()
                                ->lockForUpdate()
                                ->first();

                        $isNewBudget =
                            !$budget;

                        $oldAuditValues =
                            $budget
                                ? $this->getBudgetAuditValues(
                                    $budget
                                )
                                : null;

                        $previousValue =
                            $budget
                                ? (float) $budget->overall_budget
                                : null;

                        $action =
                            $isNewBudget
                                ? 'Created'
                                : 'Updated';

                        if (!$budget) {
                            $budget =
                                new CostBudget();
                        }
                        if (!$budget) {
                            $budget =
                                new CostBudget();
                        }

                        $budget->fill(
                            $validated
                        );

                        $budget->save();

                        $newAuditValues =
                            $this->getBudgetAuditValues(
                                $budget
                            );

                        if (
                            $isNewBudget ||
                            $oldAuditValues !== $newAuditValues
                        ) {
                            AuditLogService::log(
                                module: 'Cost & Budget',
                                action: $action,
                                description:
                                    $isNewBudget
                                        ? 'Created the fleet budget configuration.'
                                        : 'Updated the fleet budget configuration.',
                                record: $budget,
                                oldValues:
                                    $oldAuditValues,
                                newValues:
                                    $newAuditValues
                            );
                        }

                        CostBudgetHistory::create([
                            'action' =>
                                $action,

                            'previous_value' =>
                                $previousValue,

                            'new_value' =>
                                $budget
                                    ->overall_budget,

                            'period_type' =>
                                $budget
                                    ->period_type,
                        ]);

                        return $budget;
                    }
                );

            return response()->json([
                'success' => true,

                'message' =>
                    'Budget configuration saved.',

                'budget' =>
                    $this->formatBudget(
                        $budget
                    ),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    public function clear()
    {
        $this->authorize('manage', CostBudget::class);

        try {
            DB::transaction(
                function () {
                    $budget =
                        CostBudget::query()
                            ->lockForUpdate()
                            ->first();

                    if (!$budget) {
                        return;
                    }

                    CostBudgetHistory::create([
                        'action' =>
                            'Cleared',

                        'previous_value' =>
                            $budget
                                ->overall_budget,

                        'new_value' =>
                            null,

                        'period_type' =>
                            $budget
                                ->period_type,
                    ]);

                    $deletedBudgetValues =
                        $this->getBudgetAuditValues(
                            $budget
                        );

                    AuditLogService::log(
                        module: 'Cost & Budget',
                        action: 'Cleared',
                        description:
                            'Cleared the fleet budget configuration.',
                        record: $budget,
                        oldValues:
                            $deletedBudgetValues,
                        newValues: null
                    );

                    $budget->delete();
                }
            );

            return response()->json([
                'success' => true,
                'message' =>
                    'Budget cleared.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    public function clearHistory()
    {
        $this->authorize(
            'manage',
            CostBudget::class
        );

        $deletedCount = 0;

        DB::transaction(
            function () use (
                &$deletedCount
            ) {
                $deletedCount =
                    CostBudgetHistory::query()
                        ->count();

                if ($deletedCount === 0) {
                    return;
                }

                CostBudgetHistory::query()
                    ->delete();

                AuditLogService::log(
                    module:
                        'Cost & Budget',

                    action:
                        'History Cleared',

                    description:
                        "Cleared {$deletedCount} budget history record" .
                        ($deletedCount === 1
                            ? '.'
                            : 's.'),

                    oldValues: [
                        'deleted_records' =>
                            $deletedCount,
                    ]
                );
            }
        );

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Budget history cleared.',
        ]);
    }

    private function getBudgetAuditValues(
        CostBudget $budget
    ): array {
        return [
            'overall_budget' =>
                (float) $budget->overall_budget,

            'category_budgets' =>
                $budget->category_budgets ?? [],

            'period_type' =>
                $budget->period_type,

            'start_date' =>
                $budget->start_date
                    ?->format('Y-m-d'),

            'end_date' =>
                $budget->end_date
                    ?->format('Y-m-d'),
        ];
    }

    private function formatBudget(
        CostBudget $budget
    ): array {
        return [
            'id' =>
                $budget->id,

            'overallBudget' =>
                (float)
                    $budget
                        ->overall_budget,

            'categoryBudgets' =>
                $budget
                    ->category_budgets ??
                [
                    'Fuel' => null,
                    'Maintenance' => null,
                    'TripOperations' => null,
                    'ReservationOperations' => null,
                    'Other' => null,
                ],

            'periodType' =>
                $budget
                    ->period_type,

            'startDate' =>
                optional(
                    $budget->start_date
                )->format('Y-m-d') ??
                '',

            'endDate' =>
                optional(
                    $budget->end_date
                )->format('Y-m-d') ??
                '',

            'notes' =>
                $budget->notes ??
                '',

            'createdAt' =>
                optional(
                    $budget->created_at
                )->toISOString(),

            'updatedAt' =>
                optional(
                    $budget->updated_at
                )->toISOString(),
        ];
    }
}