<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\User;
use App\Models\FleetSetting;
use App\Services\FleetNotificationService;
use App\Notifications\AccountCreatedNotification;
use App\Notifications\AccountUpdatedNotification;
use App\Notifications\AccountDeletedNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class DriverController extends Controller
{
    use AuthorizesRequests;
    
    private function getDriverSettings(): array
    {
        $record = FleetSetting::query()
            ->latest('id')
            ->first();
        $settings = $record?->settings ?? [];
        $driverSettings =
            $settings['drivers'] ?? [];
        $allowedDefaultStatuses = [
            'Available',
            'On Leave',
            'Inactive',
        ];
        $defaultStatus =
            $driverSettings['defaultStatus']
            ?? 'Available';
        if (
            !in_array(
                $defaultStatus,
                $allowedDefaultStatuses,
                true
            )
        ) {
            $defaultStatus = 'Available';
        }
        return [
            'requireLicenseExpiry' =>
                $driverSettings['requireLicenseExpiry'] ?? true,
            'warnLicenseDays' =>
                max(
                    1,
                    min(
                        180,
                        (int) (
                            $driverSettings['warnLicenseDays']
                            ?? 30
                        )
                    )
                ),
            'defaultStatus' =>
                $defaultStatus,
        ];
    }

    private function isLicenseExpiringSoon(
        ?string $expiryDate,
        int $warningDays
    ): bool {
        if (!$expiryDate) {
            return false;
        }

        $expiry = Carbon::parse(
            $expiryDate
        )->startOfDay();

        $today = now()->startOfDay();

        $daysUntilExpiry =
            $today->diffInDays(
                $expiry,
                false
            );

        return
            $daysUntilExpiry >= 0 &&
            $daysUntilExpiry <= $warningDays;
    }

    private function createLicenseExpiryNotification(
        Driver $driver,
        int $warningDays
    ): void {
        if (
            !$this->isLicenseExpiringSoon(
                $driver->license_expiry
                    ? Carbon::parse(
                        $driver->license_expiry
                    )->format('Y-m-d')
                    : null,
                $warningDays
            )
        ) {
            return;
        }

        $expiry = Carbon::parse(
            $driver->license_expiry
        )->startOfDay();

        $daysUntilExpiry =
            now()
                ->startOfDay()
                ->diffInDays(
                    $expiry,
                    false
                );

        $driverName = trim(
            ($driver->first_name ?? '') .
            ' ' .
            ($driver->last_name ?? '')
        );

        if ($driverName === '') {
            $driverName = 'Driver';
        }

        $dayLabel =
            $daysUntilExpiry === 0
                ? 'today'
                : "in {$daysUntilExpiry} day" .
                    ($daysUntilExpiry === 1 ? '' : 's');

        $eventKey =
            'driver_license_expiring:' .
            $driver->id .
            ':' .
            $expiry->format('Y-m-d');

        FleetNotificationService::createUniqueWhenEnabled(
            'licenseExpiring',
            "{$driver->driver_number} · Driver License Expiring",
            "{$driverName}'s license ({$driver->license_number}) expires {$dayLabel}.",
            $eventKey,
            true,
            route('driver')
        );
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Driver::class);

        $user = $request->user();

        $driverPermissions = [
            'role' =>
                $user->role,
            'canCreate' =>
                $user->can(
                    'create',
                    Driver::class
                ),
            'canUpdate' =>
                $user->hasRole(
                    'fleet_manager',
                    'dispatcher'
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
        ];

        return view(
            'driver.index',
            compact('driverPermissions')
        );
    }

    public function store(Request $request)
    {
        $this->authorize('create', Driver::class);
        $driverSettings =
            $this->getDriverSettings();
        $requireLicenseExpiry =
            (bool)
            $driverSettings[
                'requireLicenseExpiry'
            ];

        if (
            !$request->filled(
                'status'
            )
        ) {
            $request->merge([
                'status' =>
                    $driverSettings[
                        'defaultStatus'
                    ],
            ]);
        }

        $request->merge([
            'license_number' =>
                trim(
                    (string)
                    $request->input(
                        'license_number',
                        ''
                    )
                ),

            'email' =>
                trim(
                    (string)
                    $request->input(
                        'email',
                        ''
                    )
                ),
        ]);

        $validator =
            Validator::make(
                $request->all(),
                [
                    'first_name' => [
                        'required',
                        'string',
                        'max:255',
                    ],

                    'last_name' => [
                        'required',
                        'string',
                        'max:255',
                    ],

                    'license_number' => [
                        'bail',
                        'required',
                        'string',
                        'min:3',
                        'max:100',
                        Rule::unique(
                            'drivers',
                            'license_number'
                        ),
                    ],

                    'license_class' => [
                        'required',
                        'string',
                    ],

                    'license_expiry' => [
                        $requireLicenseExpiry
                            ? 'required'
                            : 'nullable',
                        'date',
                    ],

                    'contact_number' => [
                        'required',
                        'string',
                        'max:20',
                    ],

                    'email' => [
                        'bail',
                        'required',
                        'email',
                        'max:255',
                        Rule::unique(
                            'users',
                            'email'
                        ),
                        Rule::unique(
                            'drivers',
                            'email'
                        ),
                    ],

                    'experience' => [
                        'nullable',
                        'integer',
                        'min:0',
                    ],

                    'address' => [
                        'nullable',
                        'string',
                    ],

                    'emergency_contact' => [
                        'nullable',
                        'string',
                        'max:20',
                    ],

                    'notes' => [
                        'nullable',
                        'string',
                    ],

                    'assigned_vehicle_id' => [
                        'nullable',
                        'exists:vehicles,id',
                    ],

                    'status' => [
                        'required',

                        Rule::in([
                            'Available',
                            'On Leave',
                            'Inactive',
                        ]),
                    ],

                    'photo' => [
                        'nullable',
                        'image',
                        'mimes:jpg,jpeg,png',
                        'max:2048',
                    ],
                ]
            );

        if (
            $validator->fails()
        ) {
            return response()->json([
                'success' => false,
                'errors' =>
                    $validator->errors(),
            ], 422);
        }

        $validated =
            $validator->validated();

        /*
        |--------------------------------------------------------------------------
        | Store Photo First
        |--------------------------------------------------------------------------
        */
        $photoPath = null;

        if (
            $request->hasFile(
                'photo'
            )
        ) {
            $photoPath =
                $request
                    ->file('photo')
                    ->store(
                        'drivers',
                        'public'
                    );

            $validated['photo'] =
                $photoPath;
        }

        try {
            $result =
                DB::transaction(
                    function () use (
                        $validated
                    ) {
                        /*
                        |--------------------------------------------------------------------------
                        | Create Driver first
                        |--------------------------------------------------------------------------
                        |
                        | We need the DB ID to generate DRV-001.
                        |--------------------------------------------------------------------------
                        */
                        $driver =
                            Driver::create(
                                collect(
                                    $validated
                                )
                                    ->except(
                                        'user_id'
                                    )
                                    ->toArray()
                            );

                        /*
                        |--------------------------------------------------------------------------
                        | Generate Permanent Driver Number
                        |--------------------------------------------------------------------------
                        */
                        $driverNumber =
                            'DRV-' .
                            str_pad(
                                (string)
                                $driver->id,
                                3,
                                '0',
                                STR_PAD_LEFT
                            );

                        $driver->forceFill([
                            'driver_number' =>
                                $driverNumber,
                        ])->save();

                        /*
                        |--------------------------------------------------------------------------
                        | Generate Temporary Password
                        |--------------------------------------------------------------------------
                        |
                        | DRV-001 → #drv001
                        |--------------------------------------------------------------------------
                        */
                        $temporaryPassword =
                            '#' .
                            strtolower(
                                str_replace(
                                    '-',
                                    '',
                                    $driverNumber
                                )
                            );

                        /*
                        |--------------------------------------------------------------------------
                        | Create Driver User Account
                        |--------------------------------------------------------------------------
                        */
                        $user = User::create([
                            'first_name' =>
                                $validated['first_name'],

                            'last_name' =>
                                $validated['last_name'],

                            'name' =>
                                trim(
                                    $validated['first_name'] .
                                    ' ' .
                                    $validated['last_name']
                                ),

                            'email' =>
                                $validated['email'],
                            
                            'mobile_number' =>
                                $validated['contact_number'],

                            'password' =>
                                Hash::make(
                                    $temporaryPassword
                                ),

                            'role' =>
                                'driver',

                            'job_title' =>
                                'Driver',
                        ]);

                        /*
                        |--------------------------------------------------------------------------
                        | Link Driver ↔ User
                        |--------------------------------------------------------------------------
                        */
                        $driver->forceFill([
                            'user_id' =>
                                $user->id,
                        ])->save();

                        $driver->refresh();

                        $driver->load([
                            'user',
                            'vehicle',
                        ]);

                        return [
                            'driver' =>
                                $driver,

                            'user' =>
                                $user,

                            'plainPassword' =>
                                $temporaryPassword,
                        ];
                    }
                );

            $driver =
                $result['driver'];

            $driverUser =
                $result['user'];

            $plainPassword =
                $result['plainPassword'];
            /*
            |--------------------------------------------------------------------------
            | Driver Account Created Email
            |--------------------------------------------------------------------------
            |
            | Driver + User transaction has already succeeded.
            | Mail failure must not roll back Driver creation.
            |--------------------------------------------------------------------------
            */
            try {
                $driverUser->notify(
                    new AccountCreatedNotification(
                        $plainPassword
                    )
                );
            } catch (\Throwable $e) {
                report($e);
            }
            /*
            |--------------------------------------------------------------------------
            | License Expiry Notification
            |--------------------------------------------------------------------------
            | Driver/account creation has already succeeded.
            | A notification failure must not make the request appear failed.
            |--------------------------------------------------------------------------
            */
            try {
                $this->createLicenseExpiryNotification(
                    $driver,
                    $driverSettings['warnLicenseDays']
                );
            } catch (\Throwable $e) {
                report($e);
            }

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Driver and driver account created successfully!',

                'driver' =>
                    $driver,
            ], 201);

        } catch (\Throwable $e) {
            /*
            |--------------------------------------------------------------------------
            | Delete uploaded photo if transaction failed
            |--------------------------------------------------------------------------
            */
            if (
                $photoPath &&
                Storage::disk(
                    'public'
                )->exists(
                    $photoPath
                )
            ) {
                Storage::disk(
                    'public'
                )->delete(
                    $photoPath
                );
            }

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    public function show(Driver $driver)
    {
        $this->authorize('view', $driver);
        $driver->load('vehicle');
        return response()->json(
            $driver
        );
    }

    public function update(Request $request, Driver $driver)
    {
        $this->authorize( 'update',$driver);

        $driverSettings =
            $this->getDriverSettings();
        $requireLicenseExpiry =
            (bool) $driverSettings['requireLicenseExpiry'];

        $previousLicenseExpiry =
            $driver->license_expiry
                ? Carbon::parse(
                    $driver->license_expiry
                )->format('Y-m-d')
                : null;
        $wasExpiringSoon =
            $this->isLicenseExpiringSoon(
                $previousLicenseExpiry,
                $driverSettings['warnLicenseDays']
            );

        $previousAccountDetails = [
            'first_name' =>
                $driver->first_name,

            'last_name' =>
                $driver->last_name,

            'email' =>
                $driver->email,

            'contact_number' =>
                $driver->contact_number,
        ];

        $validated = $request->validate([
            'first_name'         => 'required|string|max:255',
            'last_name'          => 'required|string|max:255',
            'license_number'     => ['required', 'string',
                                        Rule::unique('drivers')->ignore($driver->id),
                                    ],
            'license_class'      => 'required|string',
            'license_expiry' => [
                $requireLicenseExpiry
                    ? 'required'
                    : 'nullable',
                'date',
            ],
            'contact_number'     => 'required|string|max:20',
            'email' => [
                'required',
                'email',
                'max:255',

                Rule::unique('drivers', 'email')
                    ->ignore($driver->id),

                Rule::unique('users', 'email')
                    ->ignore($driver->user_id),
            ],
            'experience'         => 'nullable|integer|min:0',
            'address'            => 'nullable|string',
            'emergency_contact'  => 'nullable|string|max:20',
            'notes'              => 'nullable|string',
            'photo'              => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'assigned_vehicle_id'=> 'nullable|exists:vehicles,id',
            'status' => [
                'required',
                Rule::in(
                    $driver->status === 'On Duty'
                        ? [
                            'On Duty',
                        ]
                        : [
                            'Available',
                            'On Leave',
                            'Inactive',
                        ]
                ),
            ],
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request
                ->file('photo')
                ->store('drivers', 'public');
        }

        DB::transaction(function () use (
            $driver,
            $validated
        ) {
            /*
            |--------------------------------------------------------------------------
            | Update Driver Profile
            |--------------------------------------------------------------------------
            */
            $driver->update(
                $validated
            );

            /*
            |--------------------------------------------------------------------------
            | Sync Linked Driver Account
            |--------------------------------------------------------------------------
            */
            $user =
                $driver->user;

            if (
                $user &&
                $user->role === 'driver'
            ) {
                $userUpdates = [
                    'first_name' =>
                        $driver->first_name,

                    'last_name' =>
                        $driver->last_name,

                    'name' =>
                        trim(
                            $driver->first_name .
                            ' ' .
                            $driver->last_name
                        ),
                    
                    'mobile_number' =>
                        $driver->contact_number,
                ];

                if (
                    $driver->wasChanged(
                        'email'
                    )
                ) {
                    $userUpdates['email'] =
                        $driver->email;
                }

                $user->update(
                    $userUpdates
                );
            }
        });

        $driver->refresh();

        $accountDetailsChanged =
        $previousAccountDetails['first_name'] !== $driver->first_name ||
        $previousAccountDetails['last_name'] !== $driver->last_name ||
        $previousAccountDetails['email'] !== $driver->email ||
        $previousAccountDetails['contact_number'] !== $driver->contact_number;

        /*
        |--------------------------------------------------------------------------
        | Driver Account Updated Email
        |--------------------------------------------------------------------------
        */
        $driver->loadMissing('user');

        if (
            $accountDetailsChanged &&
            $driver->user &&
            $driver->user->role === 'driver'
        ) {
            try {
                $driver->user->notify(
                    new AccountUpdatedNotification()
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $currentLicenseExpiry =
            $driver->license_expiry
                ? Carbon::parse(
                    $driver->license_expiry
                )->format('Y-m-d')
                : null;

        $isExpiringSoon =
            $this->isLicenseExpiringSoon(
                $currentLicenseExpiry,
                $driverSettings['warnLicenseDays']
            );

        /*
        |--------------------------------------------------------------------------
        | License Expiry Notification
        |--------------------------------------------------------------------------
        |
        | Notify only when:
        | - license has entered the warning window, OR
        | - expiry date was changed to another date inside the warning window.
        |
        */
        $expiryChanged =
            $previousLicenseExpiry !==
            $currentLicenseExpiry;

        if (
            $isExpiringSoon &&
            (
                !$wasExpiringSoon ||
                $expiryChanged
            )
        ) {
            $this->createLicenseExpiryNotification(
                $driver,
                $driverSettings['warnLicenseDays']
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Driver updated successfully!',
        ]);
    }

    public function destroy(
        Driver $driver
    ) {
        $this->authorize(
            'delete',
            $driver
        );

        $driver->loadMissing(
            'user'
        );

        $user =
            $driver->user;

        $deletedEmail =
            $user?->email;

        $deletedName =
            $user?->first_name
            ?: $user?->name
            ?: $driver->first_name
            ?: 'Driver';

        DB::transaction(
            function () use (
                $driver,
                $user
            ) {
                $driver->delete();

                if (
                    $user &&
                    $user->role === 'driver'
                ) {
                    $user->delete();
                }
            }
        );

        /*
        |--------------------------------------------------------------------------
        | Account Deleted Email
        |--------------------------------------------------------------------------
        */
        if ($deletedEmail) {
            try {
                Notification::route(
                    'mail',
                    $deletedEmail
                )->notify(
                    new AccountDeletedNotification(
                        $deletedName
                    )
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json([
            'success' => true,

            'message' =>
                'Driver and linked account deleted successfully.',
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $this->authorize('deleteAny', Driver::class);

        $request->validate([
            'ids' => [
                'required',
                'array',
            ],
            'ids.*' => [
                'exists:drivers,id',
            ],
        ]);

        $deletedAccounts = [];

        $drivers =
            Driver::with('user')
                ->whereIn(
                    'id',
                    $request->ids
                )
                ->get();

        $deletedAccounts =
            $drivers
                ->map(function ($driver) {
                    $user =
                        $driver->user;

                    if (
                        !$user ||
                        $user->role !== 'driver'
                    ) {
                        return null;
                    }

                    return [
                        'email' =>
                            $user->email,

                        'name' =>
                            $user->first_name
                            ?: $user->name
                            ?: 'Driver',
                    ];
                })
                ->filter()
                ->values();

        DB::transaction(
            function () use ($drivers) {
                foreach (
                    $drivers as $driver
                ) {
                    $user =
                        $driver->user;

                    $driver->delete();

                    if (
                        $user &&
                        $user->role === 'driver'
                    ) {
                        $user->delete();
                    }
                }
            }
        );

        foreach (
            $deletedAccounts
            as $account
        ) {
            try {
                Notification::route(
                    'mail',
                    $account['email']
                )->notify(
                    new AccountDeletedNotification(
                        $account['name']
                    )
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Driver(s) and linked account(s) deleted successfully.',
        ]);
    }

    public function getDrivers(
        Request $request
    )
    {
        $this->authorize('viewAny', Driver::class);

        $user = $request->user();

        $driverSettings =
            $this->getDriverSettings();
        $warningDays =
            $driverSettings['warnLicenseDays'];
        $query = Driver::with([
            'vehicle',
            'user',
        ])
            ->latest();
        /*
        |--------------------------------------------------------------------------
        | Driver self-scope
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            $query->where(
                'user_id',
                $user->id
            );
        }
        $drivers = $query
            ->get()
            ->map(function ($driver) use ($warningDays) {
                $daysUntilExpiry = null;
                $licenseExpired = false;
                $licenseExpiringSoon = false;

                if ($driver->license_expiry) {
                    $expiry =
                        Carbon::parse(
                            $driver->license_expiry
                        )->startOfDay();
                    $today =
                        now()->startOfDay();
                    $daysUntilExpiry =
                        $today->diffInDays(
                            $expiry,
                            false
                        );
                    $licenseExpired =
                        $daysUntilExpiry < 0;
                    $licenseExpiringSoon =
                        !$licenseExpired &&
                        $daysUntilExpiry <=
                            $warningDays;
                }
                $driver->setAttribute(
                    'days_until_license_expiry',
                    $daysUntilExpiry
                );
                $driver->setAttribute(
                    'license_expired',
                    $licenseExpired
                );
                $driver->setAttribute(
                    'license_expiring_soon',
                    $licenseExpiringSoon
                );
                return $driver;
            });

        return response()->json($drivers);
    }

    public function available()
    {
        $this->authorize('create', Driver::class);
        
        $drivers = Driver::whereNull('assigned_vehicle_id')
            ->orderBy('first_name')
            ->get([
                'id',
                'driver_number',
                'first_name',
                'last_name',
                'license_number'
            ]);

        return response()->json($drivers);
    }

    public function createAccount(Driver $driver)
    {
        $this->authorize('update', $driver);

        if ($driver->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'This driver already has a linked account.',
            ], 422);
        }

        if (!$driver->email) {
            return response()->json([
                'success' => false,
                'message' => 'Driver email is required before creating an account.',
            ], 422);
        }

        if (
            User::where(
                'email',
                $driver->email
            )->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'An account with this email already exists.',
            ], 422);
        }

        $driverNumber =
            $driver->driver_number;

        if (!$driverNumber) {
            return response()->json([
                'success' => false,
                'message' => 'Driver number is missing.',
            ], 422);
        }

        $temporaryPassword =
            '#' .
            strtolower(
                str_replace(
                    '-',
                    '',
                    $driverNumber
                )
            );

        $createdUser =
            DB::transaction(
                function () use (
                    $driver,
                    $temporaryPassword
                ) {
                    $user =
                        User::create([
                            'first_name' =>
                                $driver->first_name,

                            'last_name' =>
                                $driver->last_name,

                            'name' =>
                                trim(
                                    $driver->first_name .
                                    ' ' .
                                    $driver->last_name
                                ),

                            'email' =>
                                $driver->email,

                            'mobile_number' =>
                                $driver->contact_number,

                            'password' =>
                                Hash::make(
                                    $temporaryPassword
                                ),

                            'role' =>
                                'driver',

                            'job_title' =>
                                'Driver',
                        ]);

                    $driver->forceFill([
                        'user_id' =>
                            $user->id,
                    ])->save();

                    return $user;
                }
            );

            try {
                $createdUser->notify(
                    new AccountCreatedNotification(
                        $temporaryPassword
                    )
                );
            } catch (\Throwable $e) {
                report($e);
            }

        return response()->json([
            'success' => true,
            'message' =>
                'Driver account created and linked successfully.',
        ]);
    }
}
