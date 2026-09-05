<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Display the user's profile page.
     */
    public function edit(Request $request): View
    {
        $user = $request->user();

        abort_unless(
            $user->canViewModule('profile'),
            403
        );

        $profilePermissions = [
            'role' => $user->role,

            'canEditPersonal' => true,

            'canEditAdministrative' =>
                $user->hasRole('it_admin'),

            'canAccessSettings' =>
                $user->hasRole(
                    'fleet_manager',
                    'it_admin'
                ),
        ];

        return view('profile.index', [
            'user' => $user,
            'profilePermissions' =>
                $profilePermissions,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(
        ProfileUpdateRequest $request
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user->canViewModule('profile'),
            403
        );

        $validated = $request->validated();

        /*
        |--------------------------------------------------------------------------
        | Never Self-Edit Account Authorization Fields
        |--------------------------------------------------------------------------
        */
        unset(
            $validated['role'],
            $validated['status'],
            $validated['last_login_at'],
            $validated['email_verified_at'],
            $validated['email']
        );
        /*
        |--------------------------------------------------------------------------
        | Driver Name Protection
        |--------------------------------------------------------------------------
        */
        if ($user->hasRole('driver')) {
            unset(
                $validated['first_name'],
                $validated['last_name'],
                $validated['name'],
                $validated['mobile_number']
            );
        }
        /*
        |--------------------------------------------------------------------------
        | Administrative Profile Fields
        |--------------------------------------------------------------------------
        */
        if (!$user->hasRole('it_admin')) {
            unset(
                $validated['employee_id'],
                $validated['department'],
                $validated['job_title']
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Remove profile photo if requested
        |--------------------------------------------------------------------------
        */
        if (
            $request->boolean(
                'remove_profile_photo'
            )
        ) {
            if (
                $user->profile_photo &&
                Storage::disk('public')
                    ->exists(
                        $user->profile_photo
                    )
            ) {
                Storage::disk('public')
                    ->delete(
                        $user->profile_photo
                    );
            }

            $user->profile_photo = null;
        }

        /*
        |--------------------------------------------------------------------------
        | Upload new profile photo
        |--------------------------------------------------------------------------
        */

        if (
            $request->hasFile(
                'profile_photo'
            )
        ) {
            if (
                $user->profile_photo &&
                Storage::disk('public')
                    ->exists(
                        $user->profile_photo
                    )
            ) {
                Storage::disk('public')
                    ->delete(
                        $user->profile_photo
                    );
            }

            $validated[
                'profile_photo'
            ] =
                $request
                    ->file(
                        'profile_photo'
                    )
                    ->store(
                        'profile-photos',
                        'public'
                    );
        } else {
            unset(
                $validated[
                    'profile_photo'
                ]
            );
        }

        unset(
            $validated[
                'remove_profile_photo'
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Email verification reset
        |--------------------------------------------------------------------------
        */
        /*
        if (
            isset(
                $validated['email']
            ) &&
            $validated['email'] !==
                $user->email
        ) {
            $user->email_verified_at =
                null;
        }
        */
        /*
        |--------------------------------------------------------------------------
        | Update allowed profile information
        |--------------------------------------------------------------------------
        */

        $user->fill(
            $validated
        );

        $user->save();

        return Redirect::route(
            'profile.edit'
        )->with(
            'status',
            'profile-updated'
        );
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(
        Request $request
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user->canViewModule('profile'),
            403
        );

        $validated =
            $request->validateWithBag(
                'updatePassword',
                [
                    'current_password' => [
                        'required',
                        'current_password',
                    ],

                    'password' => [
                        'required',
                        'string',
                        'min:8',
                        'confirmed',
                        'different:current_password',
                    ],
                ]
            );

        $user->update([
            'password' =>
                Hash::make(
                    $validated['password']
                ),
        ]);

        return Redirect::route(
            'profile.edit'
        )->with(
            'status',
            'password-updated'
        );
    }

    /**
     * Delete the user's account.
     */
    public function destroy(
        Request $request
    ): RedirectResponse {
        $request->validateWithBag(
            'userDeletion',
            [
                'password' => [
                    'required',
                    'current_password',
                ],
            ]
        );

        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Delete stored profile photo
        |--------------------------------------------------------------------------
        */

        if (
            $user->profile_photo &&
            Storage::disk('public')
                ->exists(
                    $user->profile_photo
                )
        ) {
            Storage::disk('public')
                ->delete(
                    $user->profile_photo
                );
        }

        Auth::logout();

        $user->delete();

        $request
            ->session()
            ->invalidate();

        $request
            ->session()
            ->regenerateToken();

        return Redirect::to('/');
    }
}