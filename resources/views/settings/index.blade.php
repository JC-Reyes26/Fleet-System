@extends('layouts.app')

@section('title', 'Fleet Settings | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page settings-page" id="settingsPage">
            <div class="page-header">
              <div>
                <h1>Settings</h1>
                <p>
                  Configure fleet system preferences, module defaults, regional
                  formatting, notifications, and appearance.
                </p>
                <p class="settings-last-updated" id="settingsLastSaved">
                  Last saved: —
                </p>
              </div>
            </div>

            <div class="settings-layout">
              <nav
                class="settings-section-nav"
                id="settingsSectionNav"
                aria-label="Settings sections"
              >
                <button type="button" class="is-active" data-settings-section="settingsGeneral">
                  <i class="ph ph-buildings" aria-hidden="true"></i>
                  General
                </button>
                <button type="button" data-settings-section="settingsRegional">
                  <i class="ph ph-globe" aria-hidden="true"></i>
                  Regional
                </button>
                <button type="button" data-settings-section="settingsVehicles">
                  <i class="ph ph-car" aria-hidden="true"></i>
                  Vehicles
                </button>
                <button type="button" data-settings-section="settingsReservations">
                  <i class="ph ph-calendar-check" aria-hidden="true"></i>
                  Reservations
                </button>
                <button type="button" data-settings-section="settingsDispatch">
                  <i class="ph ph-truck" aria-hidden="true"></i>
                  Dispatch
                </button>
                <button type="button" data-settings-section="settingsDrivers">
                  <i class="ph ph-user" aria-hidden="true"></i>
                  Drivers
                </button>
                <button type="button" data-settings-section="settingsMaintenance">
                  <i class="ph ph-wrench" aria-hidden="true"></i>
                  Maintenance
                </button>
                <button type="button" data-settings-section="settingsFuel">
                  <i class="ph ph-gas-pump" aria-hidden="true"></i>
                  Fuel
                </button>
                <button type="button" data-settings-section="settingsRoutes">
                  <i class="ph ph-map-trifold" aria-hidden="true"></i>
                  Routes
                </button>
                <button type="button" data-settings-section="settingsCost">
                  <i class="ph ph-currency-circle-dollar" aria-hidden="true"></i>
                  Cost Analysis
                </button>
                <button type="button" data-settings-section="settingsNotifications">
                  <i class="ph ph-bell" aria-hidden="true"></i>
                  Notifications
                </button>
                <button type="button" data-settings-section="settingsAppearance">
                  <i class="ph ph-palette" aria-hidden="true"></i>
                  Appearance
                </button>
                <button
                    type="button"
                    data-settings-section="settingsAccounts"
                >
                    <i
                        class="ph ph-users-three"
                        aria-hidden="true"
                    ></i>

                    Accounts
                </button>
                <button type="button" data-settings-section="settingsData">
                  <i class="ph ph-database" aria-hidden="true"></i>
                  Data
                </button>
              </nav>

              <form class="settings-main" id="fleetSettingsForm">
                <!-- General -->
                <section class="card settings-card" id="settingsGeneral">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-buildings" aria-hidden="true"></i> General Fleet</h3>
                      <p class="card-subtitle">Organization identity and default navigation.</p>
                    </div>
                  </div>
                  <div class="settings-form-grid">
                    <div class="form-group">
                      <label for="settingsOrgName">Organization name *</label>
                      <input type="text" id="settingsOrgName" maxlength="120" required />
                    </div>
                    <div class="form-group">
                      <label for="settingsFleetUnit">Fleet unit name</label>
                      <input type="text" id="settingsFleetUnit" maxlength="80" />
                    </div>
                    <div class="form-group">
                      <label for="settingsContactEmail">Contact email</label>
                      <input type="email" id="settingsContactEmail" maxlength="120" />
                    </div>
                    <div class="form-group">
                      <label for="settingsContactPhone">Contact phone</label>
                      <input type="text" id="settingsContactPhone" maxlength="40" />
                    </div>
                    <div class="form-group">
                      <label for="settingsLandingPage">Default landing page</label>
                      <select id="settingsLandingPage">
                        <option value="dashboard">Dashboard</option>
                        <option value="vehicles">Vehicles</option>
                        <option value="reservations">Reservations</option>
                        <option value="dispatch">Dispatch</option>
                        <option value="reports">Reports &amp; Analytics</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="settingsRowsPerPage">Default rows per page</label>
                      <select id="settingsRowsPerPage">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                  </div>
                  <p class="settings-note">
                    Most General values are stored preferences for backend integration.
                    Default rows per page is stored only and will be applied by modules
                    during backend integration. Modules currently keep their own page-size controls.
                  </p>
                </section>

                <!-- Regional -->
                <section class="card settings-card" id="settingsRegional">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-globe" aria-hidden="true"></i> Regional formatting</h3>
                      <p class="card-subtitle">Currency, dates, and measurement units.</p>
                    </div>
                  </div>
                  <div class="settings-form-grid">
                    <div class="form-group">
                      <label for="settingsCurrencyCode">Currency code</label>
                      <input type="text" id="settingsCurrencyCode" maxlength="8" />
                    </div>
                    <div class="form-group">
                      <label for="settingsCurrencySymbol">Currency symbol</label>
                      <input type="text" id="settingsCurrencySymbol" maxlength="4" />
                    </div>
                    <div class="form-group">
                      <label for="settingsDateFormat">Date format</label>
                      <select id="settingsDateFormat">
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="settingsTimeFormat">Time format</label>
                      <select id="settingsTimeFormat">
                        <option value="24h">24-hour</option>
                        <option value="12h">12-hour</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="settingsDistanceUnit">Distance unit</label>
                      <select id="settingsDistanceUnit">
                        <option value="km">Kilometers (km)</option>
                        <option value="mi">Miles (mi)</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="settingsVolumeUnit">Fuel volume unit</label>
                      <select id="settingsVolumeUnit">
                        <option value="L">Liters (L)</option>
                        <option value="gal">Gallons (gal)</option>
                      </select>
                    </div>
                  </div>
                </section>

                <!-- Vehicles -->
                <section class="card settings-card" id="settingsVehicles">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-car" aria-hidden="true"></i> Vehicles</h3>
                      <p class="card-subtitle">Default vehicle rules and thresholds.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsVehicleRequirePlate" />
                      <span>Require plate number</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsVehicleRequireDept" />
                      <span>Require department</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group">
                      <label for="settingsVehicleDefaultStatus">Default status</label>
                      <select id="settingsVehicleDefaultStatus">
                        <option value="Available">Available</option>
                        <option value="On Trip">On Trip</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Out of Service">Out of Service</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="settingsVehicleUtilThreshold">Low utilization threshold (%)</label>
                      <input type="number" id="settingsVehicleUtilThreshold" min="0" max="100" step="1" />
                    </div>
                  </div>
                </section>

                <!-- Reservations -->
                <section class="card settings-card" id="settingsReservations">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-calendar-check" aria-hidden="true"></i> Reservations</h3>
                      <p class="card-subtitle">Booking defaults and approval rules.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsResRequireApproval" />
                      <span>Require approval</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsResAllowSameDay" />
                      <span>Allow same-day reservations</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group">
                      <label for="settingsResDefaultHours">Default duration (hours)</label>
                      <input type="number" id="settingsResDefaultHours" min="1" max="72" step="1" />
                    </div>
                    <div class="form-group">
                      <label for="settingsResMaxAdvance">Max advance booking (days)</label>
                      <input type="number" id="settingsResMaxAdvance" min="1" max="365" step="1" />
                    </div>
                  </div>
                </section>

                <!-- Dispatch -->
                <!--<section class="card settings-card" id="settingsDispatch">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-truck" aria-hidden="true"></i> Dispatch</h3>
                      <p class="card-subtitle">Trip assignment and queue defaults.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsDispAutoAssign" />
                      <span>Suggest automatic driver assignment</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsDispRequireCheck" />
                      <span>Require vehicle readiness check</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group">
                      <label for="settingsDispPriority">Default priority</label>
                      <select id="settingsDispPriority">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Emergency">Emergency</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="settingsDispCompletedDays">Show completed trips (days)</label>
                      <input type="number" id="settingsDispCompletedDays" min="1" max="90" step="1" />
                    </div>
                  </div>
                </section>-->
                <section
                    class="card settings-card"
                    id="settingsDispatch"
                >
                    <div class="card-header">
                        <div>
                            <h3>
                                <i
                                    class="ph ph-truck"
                                    aria-hidden="true"
                                ></i>
                                Dispatch
                            </h3>

                            <p class="card-subtitle">
                                Dispatch queue and completed-trip visibility.
                            </p>
                        </div>
                    </div>

                    <div class="settings-form-grid">
                        <div class="form-group">
                            <label for="settingsDispCompletedDays">
                                Show completed trips (days)
                            </label>

                            <input
                                type="number"
                                id="settingsDispCompletedDays"
                                min="1"
                                max="90"
                                step="1"
                            />
                        </div>
                    </div>

                    <p class="settings-note">
                        Vehicle and driver assignments are inherited from the
                        approved reservation. Dispatch priority is also inherited
                        from the reservation and route-planning workflow.
                        Vehicle and driver availability checks remain enforced
                        for trip safety.
                    </p>
                </section>

                <!-- Drivers -->
                <section class="card settings-card" id="settingsDrivers">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-user" aria-hidden="true"></i> Drivers</h3>
                      <p class="card-subtitle">License and status defaults.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsDriverRequireLicense" />
                      <span>Require license expiry date</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group">
                      <label for="settingsDriverWarnDays">License expiry warning (days)</label>
                      <input type="number" id="settingsDriverWarnDays" min="1" max="180" step="1" />
                    </div>
                    <div class="form-group">
                      <label for="settingsDriverStatus">Default status</label>
                      <select id="settingsDriverStatus">
                        <option value="Available">Available</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </section>

                <!-- Maintenance -->
                <section
                    class="card settings-card"
                    id="settingsMaintenance"
                >
                    <div class="card-header">
                        <div>
                            <h3>
                                <i
                                    class="ph ph-wrench"
                                    aria-hidden="true"
                                ></i>
                                Maintenance
                            </h3>
                            <p class="card-subtitle">
                                Configure maintenance defaults, service types,
                                and available technicians or workshops.
                            </p>
                        </div>
                    </div>
                    <!-- Maintenance Preferences -->
                    <div class="settings-check-list">
                        <label class="settings-check">
                            <input
                                type="checkbox"
                                id="settingsMntRequireCost"
                            />
                            <span>
                                Require cost on completed work
                            </span>
                        </label>
                    </div>
                    <div class="settings-form-grid settings-form-grid--follow">
                        <div class="form-group">
                            <label for="settingsMntOverdueDays">
                                Overdue warning (days)
                            </label>
                            <input
                                type="number"
                                id="settingsMntOverdueDays"
                                min="0"
                                max="30"
                                step="1"
                            />
                        </div>
                        <div class="form-group">
                            <label for="settingsMntDefaultType">
                                Default type
                            </label>
                            <select
                                id="settingsMntDefaultType"
                            >
                                <option value="Preventive Maintenance">
                                    Preventive Maintenance
                                </option>
                                <option value="Corrective Repair">
                                    Corrective Repair
                                </option>
                                <option value="Inspection">
                                    Inspection
                                </option>
                                <option value="Oil Change">
                                    Oil Change
                                </option>
                                <option value="Tire Service">
                                    Tire Service
                                </option>
                                <option value="Brake Service">
                                    Brake Service
                                </option>
                                <option value="Engine Service">
                                    Engine Service
                                </option>
                                <option value="Other">
                                    Other
                                </option>
                            </select>
                        </div>
                    </div>
                    <!-- Maintenance Service Types -->
                    <div class="settings-subsection">
                        <div class="card-header">
                            <div>
                                <h4>
                                    <i
                                        class="ph ph-list-checks"
                                        aria-hidden="true"
                                    ></i>
                                    Maintenance Service Types
                                </h4>
                                <p class="card-subtitle">
                                    Manage available maintenance services and their default costs.
                                </p>
                            </div>
                        </div>
                        <div class="settings-data-actions">
                            <button
                                type="button"
                                class="btn-primary"
                                id="addMaintenanceServiceType"
                            >
                                <i
                                    class="ph ph-plus"
                                    aria-hidden="true"
                                ></i>
                                Add Service Type
                            </button>
                        </div>

                        <div class="table-responsive">
                            <table class="fleet-table">
                                <thead>
                                    <tr>
                                        <th>Service Type</th>
                                        <th>Default Cost</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="maintenanceServiceTypesTableBody">
                                    <!-- Service types will be rendered by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                        <p class="settings-note">
                            The default cost is automatically used when the corresponding
                            service type is selected in a maintenance request.
                            The final actual cost may still be updated according to the
                            completed maintenance record.
                        </p>
                    </div>
                    <!-- Technicians / Workshops -->
                    <div class="settings-subsection">

                        <div class="card-header">
                            <div>
                                <h4>
                                    <i
                                        class="ph ph-users-three"
                                        aria-hidden="true"
                                    ></i>
                                    Technicians / Workshops
                                </h4>
                                <p class="card-subtitle">
                                    Manage technicians and workshops available for maintenance assignments.
                                </p>
                            </div>
                        </div>
                        <div class="settings-data-actions">
                            <button
                                type="button"
                                class="btn-primary"
                                id="addMaintenanceProvider"
                            >
                                <i
                                    class="ph ph-plus"
                                    aria-hidden="true"
                                ></i>
                                Add Technician / Workshop
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="fleet-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Contract Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="maintenanceProvidersTableBody">
                                    <!-- Technicians / workshops will be rendered by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                        <p class="settings-note">
                            Only active technicians and workshops will be available for
                            selection in the Maintenance request form.
                        </p>
                    </div>
                </section>

                <!-- Fuel -->
                <section class="card settings-card" id="settingsFuel">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-gas-pump" aria-hidden="true"></i> Fuel Management</h3>
                      <p class="card-subtitle">Fuel entry rules and cost alerts.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsFuelRequireOdo" />
                      <span>Require odometer reading</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsFuelRequireStation" />
                      <span>Require fuel station</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group">
                      <label for="settingsFuelHighCost">High cost alert (₱)</label>
                      <input type="number" id="settingsFuelHighCost" min="0" step="0.01" />
                    </div>
                  </div>
                  <div class="settings-subsection">
                      <div class="card-header">
                          <div>
                              <h4>
                                  <i
                                      class="ph ph-gas-pump"
                                      aria-hidden="true"
                                  ></i>
                                  Fuel Stations
                              </h4>

                              <p class="card-subtitle">
                                  Manage contractual fuel stations available
                                  for fleet fuel transactions.
                              </p>
                          </div>
                      </div>
                      <div class="settings-data-actions">
                          <button
                              type="button"
                              class="btn-primary"
                              id="addFuelStation"
                          >
                              <i
                                  class="ph ph-plus"
                                  aria-hidden="true"
                              ></i>
                              Add Fuel Station
                          </button>
                      </div>
                      <div class="table-responsive">
                          <table class="fleet-table">
                              <thead>
                                  <tr>
                                      <th>Fuel Station</th>
                                      <th>Contract Type</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                  </tr>
                              </thead>
                              <tbody id="fuelStationsTableBody"></tbody>
                          </table>
                      </div>
                      <p class="settings-note">
                          Only active contractual fuel stations will be
                          available for selection in Fuel transactions.
                      </p>
                  </div>
                </section>

                <!-- Routes -->
                <section
                    class="card settings-card"
                    id="settingsRoutes"
                >
                    <div class="card-header">
                        <div>
                            <h3>
                                <i
                                    class="ph ph-map-trifold"
                                    aria-hidden="true"
                                ></i>
                                Route Planning
                            </h3>
                            <p class="card-subtitle">
                                Configure route planning preferences.
                            </p>
                        </div>
                    </div>
                    <div class="settings-check-list">
                        <label class="settings-check">
                            <input
                                type="checkbox"
                                id="settingsRoutePreferOpt"
                            />
                            <span>
                                Prefer optimized routes
                            </span>
                        </label>
                    </div>
                </section>

                <!-- Cost Analysis -->
                <section class="card settings-card" id="settingsCost">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-currency-circle-dollar" aria-hidden="true"></i> Cost Analysis</h3>
                      <p class="card-subtitle">Analysis defaults (does not invent cost data).</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsCostShowMismatch" />
                      <span>Show budget period mismatch notes</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsCostIncludeUnassigned" />
                      <span>Include unassigned department grouping</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group">
                      <label for="settingsCostDefaultRange">Default date range</label>
                      <select id="settingsCostDefaultRange">
                        <option value="today">Today</option>
                        <option value="last7">Last 7 Days</option>
                        <option value="last30">Last 30 Days</option>
                        <option value="thisMonth">This Month</option>
                        <option value="thisQuarter">This Quarter</option>
                        <option value="thisYear">This Year</option>
                      </select>
                    </div>
                  </div>
                </section>

                <!-- Notifications -->
                <section class="card settings-card" id="settingsNotifications">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-bell" aria-hidden="true"></i> Notifications</h3>
                      <p class="card-subtitle">Preference flags only — no push, email, SMS, or background polling.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsNotifMaintenance" />
                      <span>Maintenance due</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsNotifLicense" />
                      <span>License expiring</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsNotifReservation" />
                      <span>Reservation pending approval</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsNotifFuel" />
                      <span>High fuel cost alerts</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsNotifDispatch" />
                      <span>Dispatch updates</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsNotifBrowser" />
                      <span>Allow browser notification permission (opt-in)</span>
                    </label>
                  </div>
                  <div class="settings-form-grid settings-form-grid--follow">
                    <div class="form-group full-width">
                      <button type="button" class="btn-outline" id="requestBrowserNotificationPermission">
                        Request browser notification permission
                      </button>
                      <p class="settings-inline-hint" id="settingsNotifBrowserStatus" role="status">
                        Permission is requested only after you click the button.
                      </p>
                    </div>
                  </div>
                  <p class="settings-note">
                    Notification toggles are stored preferences. They do not enable
                    service workers, push delivery, email, or SMS in this frontend.
                  </p>
                </section>

                <!-- Appearance -->
                <section class="card settings-card" id="settingsAppearance">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-palette" aria-hidden="true"></i> Appearance</h3>
                      <p class="card-subtitle">
                        Uses the shared theme preference (same as the profile menu).
                      </p>
                    </div>
                  </div>
                  <div class="settings-theme-options" role="radiogroup" aria-label="Theme">
                    <div class="settings-theme-option">
                      <input type="radio" name="settingsTheme" id="settingsThemeLight" value="light" />
                      <label for="settingsThemeLight">
                        <i class="ph ph-sun" aria-hidden="true"></i>
                        <strong>Light Mode</strong>
                        <small>Bright surfaces for daytime use</small>
                      </label>
                    </div>
                    <div class="settings-theme-option">
                      <input type="radio" name="settingsTheme" id="settingsThemeDark" value="dark" />
                      <label for="settingsThemeDark">
                        <i class="ph ph-moon" aria-hidden="true"></i>
                        <strong>Dark Mode</strong>
                        <small>Reduced glare for low light</small>
                      </label>
                    </div>
                  </div>
                  <p class="settings-note">
                    Theme is stored in <strong>himsFleetTheme</strong> only.
                    Changing the theme here previews immediately; click
                    <strong>Save Settings</strong> to persist, or
                    <strong>Cancel</strong> to restore the previous theme.
                    System theme is not available yet.
                  </p>
                </section>

                <!--Accounts-->
                <section
                    class="card settings-card"
                    id="settingsAccounts"
                >
                    <div class="card-header">
                        <div>
                            <h3>
                                <i
                                    class="ph ph-users-three"
                                    aria-hidden="true"
                                ></i>

                                Account Management
                            </h3>

                            <p class="card-subtitle">
                                Create, update, reset, and remove user accounts.
                            </p>
                        </div>
                    </div>

                    <div class="settings-data-actions">
                        <button
                            type="button"
                            class="btn-primary"
                            id="openAccountManagementModal"
                        >
                            <i
                                class="ph ph-user-gear"
                                aria-hidden="true"
                            ></i>

                            Manage User Accounts
                        </button>
                    </div>

                    <p class="settings-note">
                        Account actions are managed separately from Fleet Settings
                        and do not change vehicle, reservation, dispatch, or other
                        operational records.
                    </p>
                </section>

                <!-- Data -->
                <section class="card settings-card" id="settingsData">
                  <div class="card-header">
                    <div>
                      <h3><i class="ph ph-database" aria-hidden="true"></i> Data Management</h3>
                      <p class="card-subtitle">Export, import, and reset Fleet Settings only.</p>
                    </div>
                  </div>
                  <div class="settings-check-list">
                    <label class="settings-check">
                      <input type="checkbox" id="settingsDataConfirmDestructive" />
                      <span>Confirm before destructive actions</span>
                    </label>
                    <label class="settings-check">
                      <input type="checkbox" id="settingsDataRetainExports" />
                      <span>Retain export history metadata (local)</span>
                    </label>
                  </div>
                  <div class="settings-data-actions">
                    <button type="button" class="btn-outline" id="exportFleetSettings">
                      <i class="ph ph-export" aria-hidden="true"></i>
                      Export Settings
                    </button>
                    <button type="button" class="btn-outline" id="importFleetSettings">
                      <i class="ph ph-download-simple" aria-hidden="true"></i>
                      Import Settings
                    </button>
                    <input
                      type="file"
                      id="importFleetSettingsFile"
                      accept="application/json,.json"
                      hidden
                    />
                    <button type="button" class="btn-outline" id="resetFleetSettings">
                      Reset Settings
                    </button>
                    <button
                      type="button"
                      class="btn-outline"
                      id="clearDemoData"
                      disabled
                      title="No demo-data wipe architecture is registered in this frontend"
                    >
                      Clear Demo Data
                    </button>
                  </div>
                  <p class="settings-note" id="settingsDataActionsNote">
                    Export and import include Fleet Settings JSON only — never vehicles,
                    drivers, fuel, maintenance, reservations, dispatch, routes, reports,
                    budgets, presets, or templates. Reset clears <strong>himsFleetSettings</strong>
                    only and never calls localStorage.clear(). Theme stays in
                    <strong>himsFleetTheme</strong>. Clear Demo Data is disabled because
                    no shared demo-data wipe API exists.
                  </p>
                  <p class="settings-note settings-note--muted" id="settingsCapabilityNote">
                    Module rule preferences (vehicle plate required, fuel odometer, etc.)
                    are stored for configuration continuity. Completed Fleet modules are
                    not force-updated from Settings in this release; values apply when
                    modules adopt shared preferences or during backend integration.
                  </p>
                </section>

                <div class="settings-action-bar" id="settingsActionBar">
                  <div class="settings-action-meta">
                    <span id="settingsDirtyHint">All changes saved</span>
                    <span class="settings-unsaved-badge" id="settingsUnsavedBadge" hidden>
                      Unsaved changes
                    </span>
                  </div>
                  <div class="settings-action-buttons">
                    <button type="button" class="btn-outline" id="cancelFleetSettings" disabled>
                      Cancel
                    </button>
                    <button type="submit" class="btn-primary" id="saveFleetSettings" disabled>
                      <i class="ph ph-floppy-disk" aria-hidden="true"></i>
                      Save Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

    @include(
      'settings.partials.account-management-modal'
    )

    @push('scripts')

    <script src="{{ asset('assets/js/settings/settings-store.js') }}"></script>
    <script src="{{ asset('assets/js/settings/settings.js') }}"></script>
    <script src=" {{ asset('assets/js/settings/account-management.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection
