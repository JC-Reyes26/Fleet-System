@extends('layouts.app')

@section('title', 'My Profile | HIMS Fleet')

@section('content')

@php
    $displayName = old('name', $user->name);

    $firstName = old('first_name', $user->first_name);
    $middleName = old('middle_name', $user->middle_name);
    $lastName = old('last_name', $user->last_name);

    $initialSourceFirst = $user->first_name ?: $user->name;
    $initialSourceLast = $user->last_name ?: '';

    $firstInitial = strtoupper(substr(trim($initialSourceFirst ?? ''), 0, 1));
    $lastInitial = strtoupper(substr(trim($initialSourceLast ?? ''), 0, 1));

    $profileInitials = trim($firstInitial . $lastInitial);

    if ($profileInitials === '') {
        $profileInitials = 'U';
    }

    $profilePhotoUrl = $user->profile_photo
        ? asset('storage/' . $user->profile_photo)
        : null;

    $roleLabel = $user->role
        ? ucwords(str_replace(['_', '-'], ' ', $user->role))
        : 'Staff';

    $statusLabel = $user->status
        ? ucfirst($user->status)
        : 'Inactive';

    $lastLoginLabel = $user->last_login_at
        ? $user->last_login_at
            ->timezone('Asia/Manila')
            ->format('M d, Y h:i A')
        : '—';
@endphp

<section class="page-wrapper">
    <div
        class="vehicle-page profile-page"
        id="userProfilePage"
    >
        <div class="page-header">
            <div>
                <h1>My Profile</h1>

                <p>
                    View and manage your Fleet account information.
                </p>

                <p
                    class="profile-last-updated"
                    id="profileLastUpdated"
                >
                    Last updated:
                    {{ $user->updated_at?->format('M d, Y h:i A') ?? '—' }}
                </p>
            </div>
        </div>

        {{-- Validation summary --}}
        @if ($errors->any())
            <div
                class="alert alert-danger"
                role="alert"
            >
                <strong>
                    Please check the information you entered.
                </strong>

                <ul class="mb-0 mt-2">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form
            class="profile-layout"
            id="userProfileForm"
            action="{{ route('profile.update') }}"
            method="POST"
            enctype="multipart/form-data"
        >
            @csrf
            @method('patch')

            {{-- Used by JS when Remove Photo is selected --}}
            <input
                type="hidden"
                name="remove_profile_photo"
                id="removeProfilePhoto"
                value="0"
            >

            {{-- ==========================================
                 PROFILE OVERVIEW
            ========================================== --}}
            <aside
                class="card profile-overview-card"
                aria-labelledby="profileOverviewName"
            >
                <div class="profile-overview-body">

                    <div
                        class="profile-avatar-preview"
                        id="profileAvatarPreview"
                    >
                        <span
                            id="profileAvatarInitials"
                            @if ($profilePhotoUrl) hidden @endif
                        >
                            {{ $profileInitials }}
                        </span>

                        <img
                            id="profileAvatarImage"
                            alt="{{ $displayName }} profile photo"
                            @if ($profilePhotoUrl)
                                src="{{ $profilePhotoUrl }}"
                            @else
                                hidden
                            @endif
                        >
                    </div>

                    <h2
                        class="profile-overview-name"
                        id="profileOverviewName"
                    >
                        {{ $displayName }}
                    </h2>

                    <p
                        class="profile-overview-meta"
                        id="profileOverviewRole"
                    >
                        {{ $roleLabel }}
                    </p>

                    <p
                        class="profile-overview-meta"
                        id="profileOverviewDepartment"
                    >
                        {{ $user->department ?: 'No department assigned' }}
                    </p>

                    <p
                        class="profile-overview-meta"
                        id="profileOverviewEmail"
                    >
                        {{ $user->email ?: 'No email on file' }}
                    </p>

                    <span
                        class="status-badge {{ $user->status === 'active' ? 'available' : 'inactive' }}"
                        id="profileOverviewStatus"
                    >
                        {{ $statusLabel }}
                    </span>

                    <div class="profile-photo-actions">

                        <button
                            type="button"
                            class="btn-outline btn-sm"
                            id="profileChangePhotoBtn"
                        >
                            <i
                                class="ph ph-camera"
                                aria-hidden="true"
                            ></i>

                            Change Photo
                        </button>

                        <button
                            type="button"
                            class="btn-outline btn-sm"
                            id="profileRemovePhotoBtn"
                            @if (!$profilePhotoUrl) hidden @endif
                        >
                            Remove Photo
                        </button>

                        <input
                            type="file"
                            name="profile_photo"
                            id="profilePhotoInput"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            aria-label="Choose profile photo"
                        >

                    </div>

                    @error('profile_photo')
                        <p class="profile-field-error">
                            {{ $message }}
                        </p>
                    @enderror

                </div>
            </aside>

            {{-- ==========================================
                 MAIN PROFILE CONTENT
            ========================================== --}}
            <div class="profile-main">
                
                {{-- ======================================
                     PERSONAL INFORMATION
                ======================================= --}}
                <section
                    class="card profile-card"
                    aria-labelledby="personalHeading"
                >
                    <div class="card-header">
                        <div>
                            <h3 id="personalHeading">
                                Personal Information
                            </h3>

                            <p class="card-subtitle">
                                Name and operational assignment details.
                            </p>
                        </div>
                    </div>

                    <div class="form-grid">

                        <div class="form-group">
                            <label for="profileFirstName">
                                First Name *
                            </label>

                            <input
                                type="text"
                                @if($user->role !== 'driver')
                                    name="first_name"
                                @endif
                                id="profileFirstName"
                                maxlength="60"
                                autocomplete="given-name"
                                value="{{ old('first_name', $user->first_name) }}"
                                @if($user->role === 'driver')
                                    readonly
                                @else
                                    required
                                @endif
                            >

                            @error('first_name')
                                <p
                                    class="profile-field-error"
                                    id="profileFirstNameError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileMiddleName">
                                Middle Name
                            </label>

                            <input
                                type="text"
                                name="middle_name"
                                id="profileMiddleName"
                                maxlength="60"
                                autocomplete="additional-name"
                                value="{{ old('middle_name', $user->middle_name) }}"
                            >
                        </div>

                        <div class="form-group">
                            <label for="profileLastName">
                                Last Name *
                            </label>

                            <input
                                type="text"
                                @if($user->role !== 'driver')
                                    name="last_name"
                                @endif
                                id="profileLastName"
                                maxlength="60"
                                autocomplete="family-name"
                                value="{{ old('last_name', $user->last_name) }}"
                                @if($user->role === 'driver')
                                    readonly
                                @else
                                    required
                                @endif
                            >

                            @error('last_name')
                                <p
                                    class="profile-field-error"
                                    id="profileLastNameError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileDisplayName">
                                Display Name *
                            </label>

                            <input
                                type="text"
                                @if($user->role !== 'driver')
                                    name="name"
                                @endif
                                id="profileDisplayName"
                                maxlength="120"
                                autocomplete="name"
                                value="{{ old('name', $user->name) }}"
                                @if($user->role === 'driver')
                                    readonly
                                @else
                                    required
                                @endif
                            >

                            @error('name')
                                <p
                                    class="profile-field-error"
                                    id="profileDisplayNameError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileEmployeeId">
                                Employee ID
                            </label>

                            <input
                                type="text"
                                @if($profilePermissions['canEditAdministrative'] ?? false)
                                    name="employee_id"
                                @endif
                                id="profileEmployeeId"
                                maxlength="40"
                                value="{{ old('employee_id', $user->employee_id) }}"
                                @unless($profilePermissions['canEditAdministrative'] ?? false)
                                    readonly
                                @endunless
                            >

                            @error('employee_id')
                                <p class="profile-field-error">
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileDepartment">
                                Department *
                            </label>

                            <input
                                type="text"
                                @if($profilePermissions['canEditAdministrative'] ?? false)
                                    name="department"
                                @endif
                                id="profileDepartment"
                                maxlength="120"
                                value="{{ old('department', $user->department) }}"
                                @if($profilePermissions['canEditAdministrative'] ?? false)
                                    required
                                @else
                                    readonly
                                @endif
                            >

                            @error('department')
                                <p
                                    class="profile-field-error"
                                    id="profileDepartmentError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group full-width">
                            <label for="profileJobTitle">
                                Job Title *
                            </label>

                            <input
                                type="text"
                                @if($profilePermissions['canEditAdministrative'] ?? false)
                                    name="job_title"
                                @endif
                                id="profileJobTitle"
                                maxlength="120"
                                value="{{ old('job_title', $user->job_title) }}"
                                @if($profilePermissions['canEditAdministrative'] ?? false)
                                    required
                                @else
                                    readonly
                                @endif
                            >

                            @error('job_title')
                                <p
                                    class="profile-field-error"
                                    id="profileJobTitleError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                    </div>
                </section>

                {{-- ======================================
                     CONTACT INFORMATION
                ======================================= --}}
                <section
                    class="card profile-card"
                    aria-labelledby="contactHeading"
                >
                    <div class="card-header">
                        <div>
                            <h3 id="contactHeading">
                                Contact Information
                            </h3>

                            <p class="card-subtitle">
                                How the operations team can reach you.
                            </p>
                        </div>
                    </div>

                    <div class="form-grid">

                        <div class="form-group">
                            <label for="profileEmail">
                                Email Address *
                            </label>

                            <input
                                type="email"
                                id="profileEmail"
                                maxlength="120"
                                autocomplete="email"
                                value="{{ $user->email }}"
                                readonly
                            >

                            @error('email')
                                <p
                                    class="profile-field-error"
                                    id="profileEmailError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileMobile">
                                Mobile Number
                            </label>

                            <input
                                type="tel"
                                @unless($user->hasRole('driver'))
                                    name="mobile_number"
                                @endunless
                                id="profileMobile"
                                maxlength="40"
                                autocomplete="tel"
                                value="{{ old('mobile_number', $user->mobile_number) }}"
                                @if($user->hasRole('driver'))
                                    readonly
                                @endif
                            >

                            @error('mobile_number')
                                <p
                                    class="profile-field-error"
                                    id="profileMobileError"
                                >
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileExtension">
                                Office Extension
                            </label>

                            <input
                                type="text"
                                name="office_extension"
                                id="profileExtension"
                                maxlength="20"
                                value="{{ old('office_extension', $user->office_extension) }}"
                            >

                            @error('office_extension')
                                <p class="profile-field-error">
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                        <div class="form-group">
                            <label for="profileLocation">
                                Office Location
                            </label>

                            <input
                                type="text"
                                name="office_location"
                                id="profileLocation"
                                maxlength="200"
                                value="{{ old('office_location', $user->office_location) }}"
                            >

                            @error('office_location')
                                <p class="profile-field-error">
                                    {{ $message }}
                                </p>
                            @enderror
                        </div>

                    </div>
                </section>

                {{-- ======================================
                     ACCOUNT INFORMATION
                ======================================= --}}
                <section
                    class="card profile-card"
                    aria-labelledby="accountHeading"
                >
                    <div class="card-header">
                        <div>
                            <h3 id="accountHeading">
                                Account Information
                            </h3>

                            <p class="card-subtitle">
                                Read-only information for your authenticated account.
                            </p>
                        </div>

                        @if($profilePermissions['canAccessSettings'] ?? false)
                            <a
                                href="{{ route('settings') }}"
                                class="btn-outline"
                            >
                                <i
                                    class="ph ph-gear"
                                    aria-hidden="true"
                                ></i>

                                Account Settings
                            </a>
                        @else
                            <button
                                type="button"
                                class="btn-outline"
                                id="openChangePasswordModal"
                            >
                                <i
                                    class="ph ph-key"
                                    aria-hidden="true"
                                ></i>

                                Change Password
                            </button>
                        @endif
                    </div>

                    <div class="profile-readonly-grid">

                        <div class="profile-readonly-item">
                            <label>
                                Display Name
                            </label>

                            <p id="profileAccountUsername">
                                {{ $user->name ?: '—' }}
                            </p>
                        </div>

                        <div class="profile-readonly-item">
                            <label>
                                Role
                            </label>

                            <p id="profileAccountRole">
                                {{ $roleLabel }}
                            </p>
                        </div>

                        <div class="profile-readonly-item">
                            <label>
                                Account Status
                            </label>

                            <p id="profileAccountStatus">
                                {{ $statusLabel }}
                            </p>
                        </div>

                        <div class="profile-readonly-item">
                            <label>
                                Last Sign-in
                            </label>

                            <p id="profileAccountLastSignIn">
                                {{ $lastLoginLabel }}
                            </p>
                        </div>

                        <div class="profile-readonly-item">
                            <label>
                                Email Verification
                            </label>

                            <p>
                                {{ $user->email_verified_at ? 'Verified' : 'Not Verified' }}
                            </p>
                        </div>

                    </div>
                </section>

                {{-- ======================================
                     ACTION BAR
                ======================================= --}}
                <div
                    class="profile-action-bar"
                    id="profileActionBar"
                >
                    <div class="profile-action-meta">

                        <span id="profileDirtyHint">
                            All changes saved
                        </span>

                        <span
                            class="profile-unsaved-badge"
                            id="profileDirtyBadge"
                            hidden
                        >
                            Unsaved changes
                        </span>

                    </div>

                    <div class="profile-action-buttons">

                        <button
                            type="button"
                            class="btn-outline"
                            id="profileResetBtn"
                            disabled
                        >
                            Reset Changes
                        </button>

                        <button
                            type="submit"
                            class="btn-primary"
                            id="profileSaveBtn"
                            disabled
                        >
                            <i
                                class="ph ph-floppy-disk"
                                aria-hidden="true"
                            ></i>

                            Save Changes
                        </button>

                    </div>
                </div>

            </div>
        </form>

        @if(!($profilePermissions['canAccessSettings'] ?? false))
            @include('profile.partials.update-password-form')
        @endif
    </div>
</section>

@push('scripts')
    <script src="{{ asset('assets/js/core/user-profile.js') }}"></script>
    <script src="{{ asset('assets/js/profile/profile-page.js') }}"></script>

    @if (session('status') === 'profile-updated')
        <script>
            document.addEventListener("DOMContentLoaded", function () {
                if (typeof showToast === "function") {
                    showToast(
                        "Profile updated successfully.",
                        "success"
                    );
                }
            });
        </script>
    @endif

    @if ($errors->any())
        <script>
            document.addEventListener("DOMContentLoaded", function () {
                if (typeof showToast === "function") {
                    showToast(
                        "Please check the highlighted profile fields.",
                        "error"
                    );
                }
            });
        </script>
    @endif

    @if (session('status') === 'password-updated')
        <script>
            document.addEventListener("DOMContentLoaded", function () {
                if (typeof showToast === "function") {
                    showToast(
                        "Password updated successfully.",
                        "success"
                    );
                }
            });
        </script>
    @endif

@endpush

@endsection