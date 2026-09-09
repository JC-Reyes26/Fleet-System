@extends('layouts.app')

@section('title', 'Fleet Dashboard | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="dashboard dashboard-page">
            <!-- Executive header -->
            <header class="dashboard-header">
              <div class="dashboard-header-main">
                <p class="dashboard-kicker">Hospital Operations</p>
                <h1>Fleet Dashboard</h1>
                <p class="dashboard-lead">
                  Live overview of vehicle availability, active dispatches, and
                  maintenance status for Tala Hospital fleet operations.
                </p>
              </div>
              <div class="dashboard-header-aside">
                <p class="dashboard-date" id="dashboardDateLabel">
                  Monday, July 13, 2026
                </p>
                <p class="dashboard-identity">Tala Hospital · HIMS Fleet</p>
              </div>
            </header>

            <!-- Overview banner -->
            <section class="dashboard-banner" aria-label="Hospital fleet overview">
              <div class="dashboard-banner-item">
                <span class="dashboard-banner-label">Facility</span>
                <strong>Tala Hospital</strong>
              </div>
              <div class="dashboard-banner-item">
                <span class="dashboard-banner-label">Unit</span>
                <strong>Fleet &amp; Transportation</strong>
              </div>
              <div class="dashboard-banner-item">
                <span class="dashboard-banner-label">Shift focus</span>
                <strong>Operations monitoring</strong>
              </div>
              <div class="dashboard-banner-item">
                <span class="dashboard-banner-label">Status</span>
                <strong class="dashboard-banner-status">Operational</strong>
              </div>
            </section>

            <!-- Primary KPIs -->
            <section class="dashboard-section" aria-labelledby="kpiSectionTitle">
              <div class="dashboard-section-header">
                <div>
                  <h2 id="kpiSectionTitle" class="dashboard-section-title">
                    Primary indicators
                  </h2>
                  <p class="dashboard-section-desc">
                    Current fleet capacity and workload at a glance.
                  </p>
                </div>
              </div>

              <div class="stats-grid dashboard-kpi-grid">
                <article class="stat-card dashboard-kpi">
                  <div class="stat-icon" aria-hidden="true">
                    <i class="ph-fill ph-ambulance"></i>
                  </div>
                  <div class="stat-content">
                    <span class="kpi-label">Available Vehicles</span>
                    <h2 class="kpi-value" id="dashboardAvailableVehicles" >
                        {{ number_format($availableVehicles) }}
                    </h2>
                    <div class="kpi-meta">
                      <span class="kpi-trend kpi-trend--steady">Stable</span>
                      <span class="kpi-support">Ready for assignment</span>
                    </div>
                  </div>
                </article>

                <article class="stat-card dashboard-kpi">
                  <div class="stat-icon" aria-hidden="true">
                    <i class="ph-fill ph-truck"></i>
                  </div>
                  <div class="stat-content">
                    <span class="kpi-label">Active Dispatches</span>
                    <h2 class="kpi-value" id="dashboardActiveDispatches">
                        {{ number_format($activeDispatches) }}
                    </h2>
                    <div class="kpi-meta">
                      <span class="kpi-trend kpi-trend--up">In progress</span>
                      <span class="kpi-support">Trips currently running</span>
                    </div>
                  </div>
                </article>

                <article class="stat-card dashboard-kpi">
                  <div class="stat-icon" aria-hidden="true">
                    <i class="ph-fill ph-user"></i>
                  </div>
                  <div class="stat-content">
                    <span class="kpi-label">Drivers On Duty</span>
                    <h2 class="kpi-value" id="dashboardDriversOnDuty">
                        {{ number_format($driversOnDuty) }}
                    </h2>
                    <div class="kpi-meta">
                      <span class="kpi-trend kpi-trend--steady">On shift</span>
                      <span class="kpi-support">Active driver pool</span>
                    </div>
                  </div>
                </article>

                <article class="stat-card dashboard-kpi">
                  <div class="stat-icon" aria-hidden="true">
                      <i class="ph-fill ph-gas-pump"></i>
                  </div>
                  <div class="stat-content">
                      <span class="kpi-label">
                          Average Fuel Level
                      </span>
                      <h2 class="kpi-value" id="dashboardAverageFuelLevel">
                          {{ $averageFuelLevel }}%
                      </h2>
                      <div class="kpi-meta">
                          <span
                              id="dashboardFuelTrend"
                              class="kpi-trend {{ $averageFuelLevel < 30 ? 'kpi-trend--up' : 'kpi-trend--steady' }}"
                          >
                              {{ $averageFuelLevel < 30 ? 'Low fuel' : 'Within range' }}
                          </span>
                          <span class="kpi-support">
                              Current fleet tank average
                          </span>
                      </div>
                  </div>
                </article>
              </div>
            </section>

            <!-- Operational analytics -->
            <section class="dashboard-section" aria-labelledby="opsSectionTitle">
              <div class="dashboard-section-header">
                <div>
                  <h2 id="opsSectionTitle" class="dashboard-section-title">
                    Operational analytics
                  </h2>
                  <p class="dashboard-section-desc">
                    Weekly activity trend and today’s dispatch queue.
                  </p>
                </div>
              </div>

              <div class="dashboard-grid">
                <div class="card dashboard-chart analytics-card">
                  <div class="card-header">
                    <div>
                      <h3>Fleet Activity</h3>
                      <p class="card-subtitle">Trip volume for the current week</p>
                    </div>
                    <button type="button" class="btn-filter">
                      This Week
                      <i class="ph ph-caret-down" aria-hidden="true"></i>
                    </button>
                  </div>
                  <div
                      class="chart-placeholder"
                      id="dashboardWeeklyChart"
                      role="img"
                      aria-label="Weekly fleet dispatch activity"
                  >
                      @foreach ($weeklyActivity as $activity)

                          @php
                              $height = $activity['total'] > 0
                                  ? max(
                                      8,
                                      round(
                                          (
                                              $activity['total'] /
                                              $weeklyActivityMax
                                          ) * 100
                                      )
                                  )
                                  : 3;
                          @endphp
                          <div
                              class="bar"
                              style="--bar-h: {{ $height }}%"
                              title="{{ $activity['day'] }}: {{ $activity['total'] }} dispatches"
                          ></div>
                      @endforeach
                  </div>

                  <div class="chart-legend" id="dashboardWeeklyLegend" aria-hidden="true">
                      @foreach ($weeklyActivity as $activity)
                          <span>
                              {{ $activity['day'] }}
                          </span>
                      @endforeach
                  </div>
                </div>

                @if($dashboardPermissions['canSeeDispatchQueue'] ?? false)
                <div class="card dispatch-card analytics-card">
                  <div class="card-header">
                    <div>
                      <h3>Today’s Dispatch Queue</h3>
                      <p class="card-subtitle">Priority trips awaiting completion</p>
                    </div>
                    <span class="badge-green" id="dashboardActiveDispatchBadge">
                        {{ $activeDispatches }} Active
                    </span>
                  </div>
                  <div class="dispatch-list" id="dashboardDispatchList">
                      @forelse ($dispatchQueue as $dispatch)
                          @php
                              $reservation = $dispatch->reservation;
                              $vehicle = $reservation?->vehicle;
                              $driver = $reservation?->driver;
                              $statusClass = match ($dispatch->trip_status) {
                                  'Assigned' => 'status-chip--success',
                                  'En Route' => 'status-chip--warning',
                                  'Arrived' => 'status-chip--success',
                                  default => 'status-chip--warning',
                              };
                              $dotClass = match ($dispatch->trip_status) {
                                  'Assigned' => 'green',
                                  'En Route' => 'yellow',
                                  'Arrived' => 'green',
                                  default => 'yellow',
                              };
                              $title =
                                  $reservation?->request_type
                                  ?: $dispatch->dispatch_number;
                              $vehicleName =
                                  $vehicle?->display_label
                                  ?? 'No vehicle';
                              $driverName = trim(
                                  ($driver?->first_name ?? '') .
                                  ' ' .
                                  ($driver?->last_name ?? '')
                              );
                          @endphp
                          <div
                              class="dispatch-item"
                              data-dispatch-id="{{ $dispatch->id }}"
                          >
                              <div
                                  class="dispatch-dot {{ $dotClass }}"
                                  aria-hidden="true"
                              ></div>
                              <div class="dispatch-body">
                                  <div class="dispatch-row">
                                      <strong>
                                          {{ $title }}
                                      </strong>
                                      <span
                                          class="status-chip {{ $statusClass }}"
                                      >
                                          {{ $dispatch->trip_status }}
                                      </span>
                                  </div>
                                  <small>
                                      {{ $vehicleName }}

                                      @if ($driverName !== '')
                                          · {{ $driverName }}
                                      @endif
                                  </small>
                              </div>
                          </div>
                      @empty
                          <div class="dashboard-empty-state">
                              No active dispatches scheduled today.
                          </div>
                      @endforelse
                  </div>
                </div>
                @endif
              </div>
            </section>

            <!-- Fleet status -->
            <section class="dashboard-section" aria-labelledby="statusSectionTitle">
              <div class="dashboard-section-header">
                <div>
                  <h2 id="statusSectionTitle" class="dashboard-section-title">
                    Fleet status
                  </h2>
                  <p class="dashboard-section-desc">
                    Vehicle readiness and maintenance alerts.
                  </p>
                </div>
              </div>
              <div class="dashboard-grid">
                @if($dashboardPermissions['canSeeFleetStatus'] ?? false)
                <div class="card analytics-card">
                  <div class="card-header">
                    <div>
                      <h3>Vehicle Status</h3>
                      <p class="card-subtitle">Selected units currently monitored</p>
                    </div>
                    @if($dashboardPermissions['canOpenVehicles'] ?? false)
                        <a
                            href="{{ route('fleet') }}"
                            class="btn-filter"
                        >
                            View All
                        </a>
                    @endif
                  </div>
                  <div class="table-responsive">
                    <table class="fleet-table">
                      <thead>
                        <tr>
                          <th scope="col">Vehicle</th>
                          <th scope="col">Driver</th>
                          <th scope="col">Status</th>
                          <th scope="col">Fuel</th>
                          <th scope="col"><span class="visually-hidden">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody id="dashboardVehicleTableBody">
                        @forelse ($vehicles as $vehicle)
                            @php
                                $statusClass = match ($vehicle->status) {
                                    'Available' => 'available',
                                    'On Trip' => 'trip',
                                    'Maintenance' => 'maintenance',
                                    default => 'inactive',
                                };
                                $assignedDriver =
                                    $vehicle->drivers->first();
                                $driverName =
                                    $assignedDriver
                                        ? trim(
                                            ($assignedDriver->first_name ?? '')
                                            . ' '
                                            . ($assignedDriver->last_name ?? '')
                                        )
                                        : 'Unassigned';
                                $vehicleLabel = trim(
                                    ($vehicle->brand ?? '')
                                    . ' '
                                    . ($vehicle->model ?? '')
                                );
                                if ($vehicleLabel === '') {
                                    $vehicleLabel =
                                        $vehicle->vehicle_type
                                        ?? 'Vehicle';
                                }
                                $fuelPercent = null;
                                if (
                                    $vehicle->tank_capacity !== null &&
                                    (float) $vehicle->tank_capacity > 0 &&
                                    $vehicle->current_fuel !== null
                                ) {
                                    $fuelPercent = min(
                                        100,
                                        max(
                                            0,
                                            round(
                                                (
                                                    (float) $vehicle->current_fuel
                                                    / (float) $vehicle->tank_capacity
                                                ) * 100
                                            )
                                        )
                                    );
                                }
                            @endphp
                            <tr>
                                <td>
                                    <strong>
                                        {{ $vehicleLabel }}
                                    </strong>
                                    @if ($vehicle->vehicle_type)
                                        <small class="d-block">
                                            {{ $vehicle->vehicle_type }}
                                        </small>
                                    @endif
                                </td>
                                <td>
                                    {{ $driverName }}
                                </td>
                                <td>
                                    <span class="status {{ $statusClass }}">
                                        {{ $vehicle->status }}
                                    </span>
                                </td>
                                <td>
                                    {{ $fuelPercent !== null
                                        ? $fuelPercent . '%'
                                        : '—' }}
                                </td>
                                <td>
                                    @if($dashboardPermissions['canOpenVehicles'] ?? false)
                                        <a
                                            href="{{ route('fleet') }}"
                                            class="table-btn"
                                        >
                                            View
                                        </a>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="5">
                                    No vehicle records found.
                                </td>
                            </tr>
                        @endforelse
                      </tbody>
                    </table>
                  </div>
                </div>
                @endif

                @if($dashboardPermissions['canSeeMaintenance'] ?? false)
                <div class="card analytics-card">
                  <div class="card-header">
                    <div>
                      <h3>Maintenance Alerts</h3>
                      <p class="card-subtitle">Service items requiring attention</p>
                    </div>
                  </div>
                 <div class="maintenance-list" id="dashboardMaintenanceList">
                      @forelse ($maintenanceAlerts as $maintenance)
                          @php
                              $maintenanceDate = $maintenance->maintenance_date;
                              $daysUntilMaintenance = $maintenanceDate
                                  ? today()->diffInDays(
                                      $maintenanceDate,
                                      false
                                  )
                                  : null;
                              $isCriticalPriority = in_array(
                                  $maintenance->priority,
                                  ['Emergency', 'High'],
                                  true
                              );
                              $isPastOrToday =
                                  $maintenanceDate &&
                                  $maintenanceDate->lte(today());
                              $isDueSoon =
                                  $maintenanceDate &&
                                  $daysUntilMaintenance > 0 &&
                                  $daysUntilMaintenance <= 3;
                              if (
                                  $maintenance->status === 'In Progress' &&
                                  $isCriticalPriority
                              ) {
                                  $severity = 'critical';
                                  $severityLabel = 'Critical';
                                  $chipClass = 'status-chip--danger';
                                  $icon = 'ph-warning-circle';
                              } elseif (
                                  $maintenance->status === 'Scheduled' &&
                                  $isPastOrToday
                              ) {
                                  $severity = 'critical';
                                  $severityLabel = 'Critical';
                                  $chipClass = 'status-chip--danger';
                                  $icon = 'ph-warning-circle';
                              } elseif (
                                  $maintenance->status === 'Scheduled' &&
                                  $isDueSoon
                              ) {
                                  $severity = 'warning';
                                  $severityLabel = 'Due soon';
                                  $chipClass = 'status-chip--warning';
                                  $icon = 'ph-wrench';
                              } elseif (
                                  $maintenance->status === 'In Progress'
                              ) {
                                  $severity = 'warning';
                                  $severityLabel = 'In Progress';
                                  $chipClass = 'status-chip--warning';
                                  $icon = 'ph-wrench';
                              } else {
                                  $severity = 'success';
                                  $severityLabel = 'Scheduled';
                                  $chipClass = 'status-chip--success';
                                  $icon = 'ph-calendar-check';
                              }

                              $vehicle = $maintenance->vehicle;

                              $vehicleName =
                                  $maintenance->vehicle?->display_label
                                  ?? 'Vehicle';
                          @endphp
                          <div
                              class="maintenance-item {{ $severity }}"
                              data-maintenance-id="{{ $maintenance->id }}"
                          >
                              <div
                                  class="maintenance-icon"
                                  aria-hidden="true"
                              >
                                  <i class="ph-fill {{ $icon }}"></i>
                              </div>
                              <div class="maintenance-body">
                                  <div class="dispatch-row">
                                      <strong>
                                          {{ $maintenance->maintenance_type }}
                                      </strong>
                                      <span
                                          class="status-chip {{ $chipClass }}"
                                      >
                                          {{ $severityLabel }}
                                      </span>
                                  </div>
                                  <small>
                                      {{ $vehicleName }}
                                      @if ($maintenanceDate)
                                          · {{ $maintenanceDate->format('M d, Y') }}
                                      @endif
                                  </small>
                              </div>
                          </div>
                      @empty
                          <div class="dashboard-empty-state">
                              No active maintenance alerts.
                          </div>
                      @endforelse
                  </div>
                </div>
                @endif
              </div>
            </section>
            

            <!-- Activity -->
            <section class="dashboard-section" aria-labelledby="activitySectionTitle">
              <div class="dashboard-section-header">
                <div>
                  <h2 id="activitySectionTitle" class="dashboard-section-title">
                    Coverage &amp; activity
                  </h2>
                  <p class="dashboard-section-desc">
                    Operations map placeholder and recent system activity.
                  </p>
                </div>
              </div>

              <div class="dashboard-grid">
                <div class="card analytics-card">
                  <div class="card-header">
                    <div>
                      <h3>Fleet Operations Map</h3>
                      <p class="card-subtitle">
                          Hospital fleet operations coverage
                      </p>
                    </div>
                    <button type="button" class="btn-filter">Dispatches</button>
                  </div>
                  <div
                      id="fleetOperationsMap"
                      class="dashboard-leaflet-map"
                      role="region"
                      aria-label="Fleet Operations Map"
                  ></div>

                  <p class="settings-note dashboard-map-note">
                      Map markers represent active dispatch pickup and destination
                      locations based on reservation data. Live GPS vehicle tracking
                      is not enabled.
                  </p>
                </div>

                <div class="card analytics-card">
                  <div class="card-header">
                    <div>
                      <h3>Recent Activity</h3>
                      <p class="card-subtitle">Latest operational events</p>
                    </div>
                  </div>
                  <div class="activity-list" id="dashboardActivityList">
                  @forelse ($recentActivity as $activity)
                      @php
                          $icon = match (true) {
                              str_contains(
                                  strtolower($activity->title),
                                  'maintenance'
                              ) => 'ph-warning-circle',
                              str_contains(
                                  strtolower($activity->title),
                                  'dispatch'
                              ) => 'ph-truck',
                              str_contains(
                                  strtolower($activity->title),
                                  'fuel'
                              ) => 'ph-gas-pump',
                              str_contains(
                                  strtolower($activity->title),
                                  'driver'
                              ) => 'ph-user',
                              default => 'ph-check-circle',
                          };
                      @endphp
                      <div
                          class="activity-item"
                          @if ($activity->link)
                              data-href="{{ $activity->link }}"
                          @endif
                      >
                          <div
                              class="activity-icon primary"
                              aria-hidden="true"
                          >
                              <i class="ph-fill {{ $icon }}"></i>
                          </div>
                          <div class="activity-body">
                              <strong>
                                  {{ $activity->title }}
                              </strong>
                              <small>
                                  {{ $activity->created_at?->diffForHumans() ?? 'Recently' }}
                              </small>
                          </div>
                      </div>
                  @empty
                      <div class="dashboard-empty-state">
                          No recent activity.
                      </div>
                  @endforelse
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

    <script>
        window.FLEET_RBAC = window.FLEET_RBAC || {};
        window.FLEET_RBAC.role =
            @json(auth()->user()?->role);
        window.FLEET_RBAC.dashboard =
            @json($dashboardPermissions ?? []);
        window.DASHBOARD_MAP_DISPATCHES =
            @json($dashboardMapDispatches ?? []);
    </script>

    <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>   

    @push('scripts')
    
    <script src="{{ asset('assets/js/core/pending-action.js') }}"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="{{ asset('assets/js/dashboard/dashboard.js') }}"></script>

    @endpush
    
@endsection