@php
    $sidebarUser = auth()->user();

    /*
    |--------------------------------------------------------------------------
    | Module Visibility
    |--------------------------------------------------------------------------
    */
    $canDashboard =
        $sidebarUser?->canViewModule('dashboard') ?? false;

    $canVehicles =
        $sidebarUser?->canViewModule('vehicles') ?? false;

    $canReservations =
        $sidebarUser?->canViewModule('reservations') ?? false;

    $canDispatch =
        $sidebarUser?->canViewModule('dispatch') ?? false;

    $canDrivers =
        $sidebarUser?->canViewModule('drivers') ?? false;

    $canMaintenance =
        $sidebarUser?->canViewModule('maintenance') ?? false;

    $canFuel =
        $sidebarUser?->canViewModule('fuel') ?? false;

    $canRoutePlanning =
        $sidebarUser?->canViewModule('route_planning') ?? false;

    $canCostAnalysis =
        $sidebarUser?->canViewModule('cost_analysis') ?? false;

    $canReports =
        $sidebarUser?->canViewModule('reports') ?? false;

    $canProfile =
        $sidebarUser?->canViewModule('profile') ?? false;

    $canSettings =
        $sidebarUser?->canViewModule('settings') ?? false;

    $canAuditLogs =
        $sidebarUser?->hasRole(
            'fleet_manager',
            'it_admin'
        ) ?? false;

    /*
    |--------------------------------------------------------------------------
    | Section Visibility
    |--------------------------------------------------------------------------
    */
    $showFleetManagement =
        $canVehicles ||
        $canReservations ||
        $canDispatch;

    $showOperations =
        $canDrivers ||
        $canMaintenance ||
        $canFuel ||
        $canRoutePlanning;

    $showAnalytics =
        $canCostAnalysis ||
        $canReports;

    $showSystem =
        $canAuditLogs ||
        $canSettings;

    /*
    |--------------------------------------------------------------------------
    | User Display
    |--------------------------------------------------------------------------
    */
    $userName =
        $sidebarUser?->name ?? 'User';

    $userRole =
        $sidebarUser?->role ?? 'user';

    $initialSourceFirst =
        $sidebarUser?->first_name
        ?: $sidebarUser?->name;

    $initialSourceLast =
        $sidebarUser?->last_name
        ?: '';

    $firstInitial =
        strtoupper(
            substr(
                trim($initialSourceFirst ?? ''),
                0,
                1
            )
        );

    $lastInitial =
        strtoupper(
            substr(
                trim($initialSourceLast ?? ''),
                0,
                1
            )
        );

    $userInitials =
        trim(
            $firstInitial .
            $lastInitial
        );

    if ($userInitials === '') {
        $userInitials = 'U';
    }

    $profilePhotoUrl =
        $sidebarUser?->profile_photo
            ? asset(
                'storage/' .
                $sidebarUser->profile_photo
            )
            : null;

    $roleLabel =
        $sidebarUser?->role
            ? ucwords(
                str_replace(
                    ['_', '-'],
                    ' ',
                    $sidebarUser->role
                )
            )
            : 'Staff';
@endphp

<aside
    id="sidebar"
    class="sidebar"
>
    <div class="sidebar-panel">

        {{-- ==========================================
             BRAND
        ========================================== --}}
        <div class="sidebar-header">
            <div
                class="sidebar-logo"
                data-tooltip="HIMS Fleet"
            >
                <div
                    class="logo-icon"
                    aria-hidden="true"
                >
                    <svg
                        class="brand-mark"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 32 32"
                        width="28"
                        height="28"
                        fill="none"
                        focusable="false"
                    >
                        <path
                            fill="currentColor"
                            fill-rule="evenodd"
                            d="M13.25 3.5h5.5c.97 0 1.75.78 1.75 1.75v5.75h5.75c.97 0 1.75.78 1.75 1.75v5.5c0 .97-.78 1.75-1.75 1.75H20.5v5.75c0 .97-.78 1.75-1.75 1.75h-5.5c-.97 0-1.75-.78-1.75-1.75V20h-5.75c-.97 0-1.75-.78-1.75-1.75v-5.5c0-.97.78-1.75 1.75-1.75H11.5V5.25c0-.97.78-1.75 1.75-1.75zm2.75 4.75a1.85 1.85 0 1 0 0 3.7 1.85 1.85 0 0 0 0-3.7zM14.2 12.8h3.6c.72 0 1.3.58 1.3 1.3v2.55c0 .2-.08.4-.22.54l-1.48 1.48c-.14.14-.34.22-.54.22h-1.72c-.2 0-.4-.08-.54-.22l-1.48-1.48a.77.77 0 0 1-.22-.54V14.1c0-.72.58-1.3 1.3-1.3z"
                        />
                        <path
                            fill="currentColor"
                            d="M24.1 7.2c2.9.2 5.1 2.2 5.5 4.9-.4.15-1.05.3-1.85.35-1.95.12-3.55-.95-4.15-2.55-.35-.9-.3-1.85.05-2.7z"
                        />
                        <path
                            stroke="currentColor"
                            stroke-width="1.1"
                            stroke-linecap="round"
                            opacity="0.85"
                            d="M24.35 8.1c.55 1.15 1.55 2.35 3.35 2.85"
                        />
                    </svg>
                </div>

                <div class="logo-text sidebar-brand-text">
                    <h2>HIMS Fleet</h2>

                    <span class="brand-tagline">
                        Fleet &amp; Transportation
                    </span>

                    <span class="brand-suite">
                        Hospital Operations Suite
                    </span>
                </div>
            </div>
        </div>

        {{-- ==========================================
             NAVIGATION
        ========================================== --}}
        <nav class="sidebar-nav">

            {{-- MAIN MENU --}}
            @if($canDashboard)
                <span class="nav-title">
                    MAIN MENU
                </span>

                <ul>
                    <li>
                        <a
                            href="{{ route('dashboard') }}"
                            class="nav-link {{ request()->routeIs('dashboard') ? 'active' : '' }}"
                            data-page="dashboard"
                            data-tooltip="Dashboard"
                        >
                            <i class="ph-fill ph-squares-four"></i>

                            <span class="nav-label">
                                Dashboard
                            </span>
                        </a>
                    </li>
                </ul>
            @endif


            {{-- FLEET MANAGEMENT --}}
            @if($showFleetManagement)
                <span class="nav-title">
                    FLEET MANAGEMENT
                </span>

                <ul>

                    @if($canVehicles)
                        <li>
                            <a
                                href="{{ route('fleet') }}"
                                class="nav-link {{ request()->routeIs('fleet', 'vehicles.*') ? 'active' : '' }}"
                                data-page="vehicles"
                                data-tooltip="Vehicles"
                            >
                                <i class="ph-fill ph-car"></i>

                                <span class="nav-label">
                                    Vehicles
                                </span>
                            </a>
                        </li>
                    @endif


                    @if($canReservations)
                        <li>
                            <a
                                href="{{ route('reservation.index') }}"
                                class="nav-link {{ request()->routeIs('reservation.*') ? 'active' : '' }}"
                                data-page="reservations"
                                data-tooltip="Reservations"
                            >
                                <i class="ph-fill ph-calendar-check"></i>

                                <span class="nav-label">
                                    Reservations
                                </span>
                            </a>
                        </li>
                    @endif


                    @if($canDispatch)
                        <li>
                            <a
                                href="{{ route('dispatch') }}"
                                class="nav-link {{ request()->routeIs('dispatch', 'dispatch.*') ? 'active' : '' }}"
                                data-page="dispatch"
                                data-tooltip="Dispatch"
                            >
                                <i class="ph-fill ph-truck"></i>

                                <span class="nav-label">
                                    Dispatch
                                </span>
                            </a>
                        </li>
                    @endif

                </ul>
            @endif


            {{-- OPERATIONS --}}
            @if($showOperations)
                <span class="nav-title">
                    OPERATIONS
                </span>

                <ul>

                    @if($canDrivers)
                        <li>
                            <a
                                href="{{ route('driver') }}"
                                class="nav-link {{ request()->routeIs('driver', 'drivers.*') ? 'active' : '' }}"
                                data-page="driver"
                                data-tooltip="Drivers"
                            >
                                <i class="ph-fill ph-user"></i>

                                <span class="nav-label">
                                    Drivers
                                </span>
                            </a>
                        </li>
                    @endif


                    @if($canMaintenance)
                        <li>
                            <a
                                href="{{ route('maintenance') }}"
                                class="nav-link {{ request()->routeIs('maintenance', 'maintenance.*') ? 'active' : '' }}"
                                data-page="maintenance"
                                data-tooltip="Maintenance"
                            >
                                <i class="ph-fill ph-wrench"></i>

                                <span class="nav-label">
                                    Maintenance
                                </span>
                            </a>
                        </li>
                    @endif


                    @if($canFuel)
                        <li>
                            <a
                                href="{{ route('fuel') }}"
                                class="nav-link {{ request()->routeIs('fuel', 'fuel.*') ? 'active' : '' }}"
                                data-page="fuel"
                                data-tooltip="Fuel Management"
                            >
                                <i class="ph-fill ph-gas-pump"></i>

                                <span class="nav-label">
                                    Fuel Management
                                </span>
                            </a>
                        </li>
                    @endif


                    @if($canRoutePlanning)
                        <li>
                            <a
                                href="{{ route('route-planning') }}"
                                class="nav-link {{ request()->routeIs('route-planning', 'route-planning.*') ? 'active' : '' }}"
                                data-page="route-planning"
                                data-tooltip="Route Planning"
                            >
                                <i class="ph-fill ph-map-trifold"></i>

                                <span class="nav-label">
                                    Route Planning
                                </span>
                            </a>
                        </li>
                    @endif

                </ul>
            @endif


            {{-- ANALYTICS --}}
            @if($showAnalytics)
                <span class="nav-title">
                    ANALYTICS
                </span>

                <ul>

                    @if($canCostAnalysis)
                        <li>
                            <a
                                href="{{ route('cost-analysis') }}"
                                class="nav-link {{ request()->routeIs('cost-analysis', 'cost-analysis.*') ? 'active' : '' }}"
                                data-page="cost-analysis"
                                data-tooltip="Cost Analysis"
                            >
                                <i class="ph-fill ph-currency-circle-dollar"></i>

                                <span class="nav-label">
                                    Cost Analysis
                                </span>
                            </a>
                        </li>
                    @endif


                    @if($canReports)
                        <li>
                            <a
                                href="{{ route('reports') }}"
                                class="nav-link {{ request()->routeIs('reports', 'reports.*') ? 'active' : '' }}"
                                data-page="reports"
                                data-tooltip="Reports & Analytics"
                            >
                                <i class="ph-fill ph-chart-bar"></i>

                                <span class="nav-label">
                                    Reports &amp; Analytics
                                </span>
                            </a>
                        </li>
                    @endif

                </ul>
            @endif


            {{-- SYSTEM --}}
                @if($showSystem)
                    <span class="nav-title">
                        SYSTEM
                    </span>

                    <ul>

                        @if($canAuditLogs)
                            <li>
                                <a
                                    href="{{ route('audit-logs.index') }}"
                                    class="nav-link {{ request()->routeIs('audit-logs.*') ? 'active' : '' }}"
                                    data-page="audit-logs"
                                    data-tooltip="Audit Logs"
                                >
                                    <i class="ph-fill ph-shield-check"></i>

                                    <span class="nav-label">
                                        Audit Logs
                                    </span>
                                </a>
                            </li>
                        @endif


                        @if($canSettings)
                            <li>
                                <a
                                    href="{{ route('settings') }}"
                                    class="nav-link {{ request()->routeIs('settings', 'settings.*') ? 'active' : '' }}"
                                    data-page="settings"
                                    data-tooltip="Settings"
                                >
                                    <i class="ph-fill ph-sliders-horizontal"></i>

                                    <span class="nav-label">
                                        Settings
                                    </span>
                                </a>
                            </li>
                        @endif

                    </ul>
                @endif

        </nav>

        {{-- ==========================================
             USER PROFILE FOOTER
        ========================================== --}}
        <div class="sidebar-footer">
            <div class="sidebar-profile-wrap">

                <button
                    type="button"
                    class="sidebar-profile"
                    id="sidebarProfileToggle"
                    data-tooltip="Profile"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    aria-controls="sidebarProfileMenu"
                    aria-label="{{ $userName }}, {{ $roleLabel }}"
                >
                    <span
                        class="profile-avatar"
                        aria-hidden="true"
                    >
                        @if($profilePhotoUrl)
                            <img
                                src="{{ $profilePhotoUrl }}"
                                alt=""
                                class="profile-avatar-image"
                            >
                        @else
                            {{ $userInitials }}
                        @endif
                    </span>

                    <span class="profile-info">
                        <span class="profile-name">
                            {{ $userName }}
                        </span>

                        <span class="profile-role">
                            {{ $roleLabel }}
                        </span>
                    </span>

                    <span
                        class="profile-chevron"
                        aria-hidden="true"
                    >
                        <i class="ph ph-caret-up-down"></i>
                    </span>
                </button>


                <div
                    class="sidebar-profile-menu"
                    id="sidebarProfileMenu"
                    role="menu"
                    hidden
                    aria-hidden="true"
                >

                    {{-- PROFILE --}}
                    @if($canProfile)
                        <a
                            href="{{ route('profile.edit') }}"
                            class="profile-menu-item"
                            role="menuitem"
                            data-profile-action="profile"
                        >
                            <i
                                class="ph ph-user-circle"
                                aria-hidden="true"
                            ></i>

                            <span>
                                Profile
                            </span>
                        </a>
                    @endif


                    {{-- SYSTEM SETTINGS --}}
                    @if($canSettings)
                        <a
                            href="{{ route('settings') }}"
                            class="profile-menu-item"
                            role="menuitem"
                            data-profile-action="account-settings"
                        >
                            <i
                                class="ph ph-gear"
                                aria-hidden="true"
                            ></i>

                            <span>
                                System Settings
                            </span>
                        </a>
                    @endif


                    {{-- APPEARANCE --}}
                    <div class="profile-appearance-group">

                        <button
                            type="button"
                            class="profile-menu-item profile-appearance-trigger"
                            id="profileAppearanceTrigger"
                            role="menuitem"
                            aria-haspopup="menu"
                            aria-expanded="false"
                            aria-controls="profileAppearanceSubmenu"
                        >
                            <i
                                class="ph ph-palette"
                                aria-hidden="true"
                            ></i>

                            <span class="profile-menu-item-text">
                                Appearance
                            </span>

                            <span
                                class="profile-appearance-current"
                                id="profileAppearanceCurrent"
                            >
                                Light
                            </span>

                            <i
                                class="ph ph-caret-right profile-submenu-chevron"
                                aria-hidden="true"
                            ></i>
                        </button>


                        <div
                            class="profile-appearance-submenu"
                            id="profileAppearanceSubmenu"
                            role="menu"
                            hidden
                            aria-label="Appearance theme"
                        >

                            <button
                                type="button"
                                class="profile-menu-item profile-theme-option"
                                role="menuitemradio"
                                data-theme-option="light"
                                aria-checked="false"
                            >
                                <i
                                    class="ph ph-sun"
                                    aria-hidden="true"
                                ></i>

                                <span>
                                    Light
                                </span>

                                <i
                                    class="ph ph-check profile-theme-check"
                                    aria-hidden="true"
                                ></i>
                            </button>


                            <button
                                type="button"
                                class="profile-menu-item profile-theme-option"
                                role="menuitemradio"
                                data-theme-option="dark"
                                aria-checked="false"
                            >
                                <i
                                    class="ph ph-moon"
                                    aria-hidden="true"
                                ></i>

                                <span>
                                    Dark
                                </span>

                                <i
                                    class="ph ph-check profile-theme-check"
                                    aria-hidden="true"
                                ></i>
                            </button>


                            <button
                                type="button"
                                class="profile-menu-item profile-theme-option"
                                role="menuitemradio"
                                data-theme-option="system"
                                aria-checked="false"
                            >
                                <i
                                    class="ph ph-desktop"
                                    aria-hidden="true"
                                ></i>

                                <span>
                                    System
                                </span>

                                <i
                                    class="ph ph-check profile-theme-check"
                                    aria-hidden="true"
                                ></i>
                            </button>

                        </div>
                    </div>


                    {{-- HELP --}}
                    <a
                        href="#"
                        class="profile-menu-item"
                        role="menuitem"
                        data-profile-action="help"
                    >
                        <i
                            class="ph ph-question"
                            aria-hidden="true"
                        ></i>

                        <span>
                            Help Center
                        </span>
                    </a>


                    <div
                        class="profile-menu-divider"
                        role="separator"
                    ></div>


                    {{-- LOGOUT --}}
                    <form
                        method="POST"
                        action="{{ route('logout') }}"
                    >
                        @csrf

                        <button
                            type="submit"
                            class="profile-menu-item profile-menu-item--danger"
                        >
                            <i class="ph ph-sign-out"></i>

                            <span>
                                Logout
                            </span>
                        </button>
                    </form>

                </div>
            </div>
        </div>

    </div>


    {{-- ==========================================
         DESKTOP COLLAPSE CONTROL
    ========================================== --}}
    <button
        type="button"
        id="desktopSidebarToggle"
        class="desktop-sidebar-toggle sidebar-edge-toggle"
        aria-label="Collapse sidebar"
        aria-controls="sidebar"
        aria-expanded="true"
    >
        <i class="ph ph-caret-double-left"></i>
    </button>
</aside>