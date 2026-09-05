<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\AccountCreatedNotification;
use App\Notifications\AccountUpdatedNotification;
use App\Notifications\PasswordResetByAdminNotification;
use App\Notifications\AccountDeletedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class UserAccountController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();

        abort_unless(
            $currentUser->hasRole(
                'fleet_manager',
                'it_admin'
            ),
            403
        );

        $users = User::query()
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get([
                'id',
                'first_name',
                'middle_name',
                'last_name',
                'name',
                'email',
                'role',
                'department',
                'job_title',
                'mobile_number',
                'status',
            ]);

        return response()->json([
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        abort_unless(
            $user->hasRole(
                'fleet_manager',
                'it_admin'
            ),
            403
        );

        $validated =
            $request->validate([
                'first_name' => [
                    'required',
                    'string',
                    'max:60',
                ],

                'middle_name' => [
                    'nullable',
                    'string',
                    'max:60',
                ],

                'last_name' => [
                    'required',
                    'string',
                    'max:60',
                ],

                'email' => [
                    'required',
                    'email',
                    'max:120',
                    Rule::unique(
                        'users',
                        'email'
                    ),
                ],

                'role' => [
                    'required',
                    Rule::in([
                        'fleet_manager',
                        'dispatcher',
                        'department_head',
                        'finance',
                        'maintenance',
                        'it_admin',
                    ]),
                ],

                'department' => [
                    'nullable',
                    'string',
                    'max:120',
                ],

                'job_title' => [
                    'nullable',
                    'string',
                    'max:120',
                ],

                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                ],
            ]);

        $plainPassword =
            $validated['password'];

        $createdUser =
            User::create([
                'first_name' =>
                    $validated[
                        'first_name'
                    ],

                'middle_name' =>
                    $validated[
                        'middle_name'
                    ] ?? null,

                'last_name' =>
                    $validated[
                        'last_name'
                    ],

                'name' =>
                    trim(
                        $validated[
                            'first_name'
                        ] .
                        ' ' .
                        $validated[
                            'last_name'
                        ]
                    ),

                'email' =>
                    $validated[
                        'email'
                    ],

                'role' =>
                    $validated[
                        'role'
                    ],

                'department' =>
                    $validated[
                        'department'
                    ] ?? null,

                'job_title' =>
                    $validated[
                        'job_title'
                    ] ?? null,

                'password' =>
                    Hash::make(
                        $plainPassword
                    ),
            ]);

            try {
                $createdUser->notify(
                    new AccountCreatedNotification(
                        $plainPassword
                    )
                );
            } catch (\Throwable $e) {
                report($e);
            }

        return response()->json([
            'success' => true,

            'message' =>
                'User account created successfully.',

            'user' => [
                'id' =>
                    $createdUser->id,

                'name' =>
                    $createdUser->name,

                'email' =>
                    $createdUser->email,

                'role' =>
                    $createdUser->role,
            ],
        ], 201);
    }

    public function show(
        Request $request,
        User $user
    ) {
        $currentUser = $request->user();

        abort_unless(
            $currentUser->hasRole(
                'fleet_manager',
                'it_admin'
            ),
            403
        );

        return response()->json([
            'user' => [
                'id' =>
                    $user->id,

                'first_name' =>
                    $user->first_name,

                'middle_name' =>
                    $user->middle_name,

                'last_name' =>
                    $user->last_name,

                'name' =>
                    $user->name,

                'email' =>
                    $user->email,

                'role' =>
                    $user->role,

                'department' =>
                    $user->department,

                'job_title' =>
                    $user->job_title,

                'mobile_number' =>
                    $user->mobile_number,

                'status' =>
                    $user->status,
            ],
        ]);
    }

    public function update(
        Request $request,
        User $user
    ) {
        $currentUser =
            $request->user();

        abort_unless(
            $currentUser->hasRole(
                'fleet_manager',
                'it_admin'
            ),
            403
        );

        $rules = [
            'first_name' => [
                'required',
                'string',
                'max:60',
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:60',
            ],

            'last_name' => [
                'required',
                'string',
                'max:60',
            ],

            'email' => [
                'required',
                'email',
                'max:120',

                Rule::unique(
                    'users',
                    'email'
                )->ignore(
                    $user->id
                ),
            ],

            'role' => [
                'required',

                Rule::in([
                    'fleet_manager',
                    'dispatcher',
                    'department_head',
                    'finance',
                    'maintenance',
                    'it_admin',
                    'driver',
                ]),
            ],

            'department' => [
                'nullable',
                'string',
                'max:120',
            ],

            'job_title' => [
                'nullable',
                'string',
                'max:120',
            ],

            'mobile_number' => [
                'nullable',
                'string',
                'max:40',
            ],

            'status' => [
                'nullable',

                Rule::in([
                    'active',
                    'inactive',
                ]),
            ],
        ];

        /*
        |--------------------------------------------------------------------------
        | Driver-managed fields
        |--------------------------------------------------------------------------
        |
        | Name/mobile come from Driver module,
        | so Account Management does not require or modify them.
        |--------------------------------------------------------------------------
        */
        if ($user->role === 'driver') {
            unset(
                $rules['first_name'],
                $rules['last_name'],
                $rules['mobile_number']
            );
        }

        $validated =
            $request->validate(
                $rules
            );

        /*
        |--------------------------------------------------------------------------
        | Prevent converting a normal account into Driver manually
        |--------------------------------------------------------------------------
        */
        if (
            isset($validated['role']) &&
            $validated['role'] === 'driver' &&
            $user->role !== 'driver'
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Driver accounts must be created from the Driver module.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Preserve Driver role
        |--------------------------------------------------------------------------
        */
        if ($user->role === 'driver') {
            $validated['role'] =
                'driver';
        }

        /*
        |--------------------------------------------------------------------------
        | Rebuild display name for non-Driver accounts
        |--------------------------------------------------------------------------
        */
        if (
            isset(
                $validated['first_name'],
                $validated['last_name']
            )
        ) {
            $validated['name'] =
                trim(
                    $validated['first_name'] .
                    ' ' .
                    $validated['last_name']
                );
        }

        $user->update(
            $validated
        );

        /*
        |--------------------------------------------------------------------------
        | Account Updated Email
        |--------------------------------------------------------------------------
        */
        try {
            $user->notify(
                new AccountUpdatedNotification()
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'success' => true,

            'message' =>
                'User account updated successfully.',

            'user' => [
                'id' =>
                    $user->id,

                'name' =>
                    $user->name,

                'email' =>
                    $user->email,

                'role' =>
                    $user->role,
            ],
        ]);
    }

    public function resetPassword(
        Request $request,
        User $user
    ) {
        $currentUser =
            $request->user();

        abort_unless(
            $currentUser->hasRole(
                'fleet_manager',
                'it_admin'
            ),
            403
        );

        $validated =
            $request->validate([
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                ],
            ]);

        $plainPassword =
            $validated['password'];

        $user->update([
            'password' =>
                Hash::make(
                    $plainPassword
                ),
        ]);

        try {
            $user->notify(
                new PasswordResetByAdminNotification(
                    $plainPassword
                )
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Password reset successfully.',
        ]);
    }

    public function destroy(
        Request $request,
        User $user
    ) {
        $currentUser =
            $request->user();

        abort_unless(
            $currentUser->hasRole(
                'fleet_manager',
                'it_admin'
            ),
            403
        );

        if (
            $currentUser->id ===
            $user->id
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'You cannot delete your own account from Account Management.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Preserve contact details before deletion
        |--------------------------------------------------------------------------
        */
        $deletedUserEmail =
            $user->email;

        $deletedUserName =
            $user->first_name
            ?: $user->name
            ?: 'User';

        DB::transaction(
            function () use ($user) {
                /*
                |--------------------------------------------------------------------------
                | Driver account only
                |--------------------------------------------------------------------------
                */
                if (
                    $user->role ===
                    'driver'
                ) {
                    $driver =
                        $user->driverProfile;

                    if ($driver) {
                        $driver->update([
                            'user_id' =>
                                null,
                        ]);
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | Delete login account only
                |--------------------------------------------------------------------------
                */
                $user->delete();
            }
        );

        /*
        |--------------------------------------------------------------------------
        | Account Deleted Email
        |--------------------------------------------------------------------------
        |
        | Send only after the database transaction succeeded.
        |--------------------------------------------------------------------------
        */
        try {
            Notification::route(
                'mail',
                $deletedUserEmail
            )->notify(
                new AccountDeletedNotification(
                    $deletedUserName
                )
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'success' => true,
            'message' =>
                'User account deleted successfully.',
        ]);
    }
}