@extends('layouts.app')

@section('title', 'Route Planning | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page route-planning-page" id="routePlanningPage">
            <div class="page-header">
              <div>
                <h1>Route Planning</h1>
                <p>
                  Plan optimized transportation routes before dispatching
                  vehicles.
                </p>
              </div>
              @if($routePermissions['canCreate'] ?? false)
                  <button
                      type="button"
                      class="btn-primary"
                      id="newRouteBtn"
                  >
                      <i class="ph ph-plus"></i>
                      New Route
                  </button>
              @endif
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-map-trifold"></i></div>
                <div class="stat-content">
                  <h3 id="routeStatTotal">0</h3>
                  <p>Total Planned Routes</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon success"><i class="ph-fill ph-check-circle"></i></div>
                <div class="stat-content">
                  <h3 id="routeStatReady">0</h3>
                  <p>Ready For Dispatch</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon warning"><i class="ph-fill ph-warning"></i></div>
                <div class="stat-content">
                  <h3 id="routeStatHighPriority">0</h3>
                  <p>High Priority Routes</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-path"></i></div>
                <div class="stat-content">
                  <h3 id="routeStatAvgDistance">0.0 km</h3>
                  <p>Average Estimated Distance</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-clock"></i></div>
                <div class="stat-content">
                  <h3 id="routeStatAvgTime">0 min</h3>
                  <p>Average Estimated Time</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-car"></i></div>
                <div class="stat-content">
                  <h3 id="routeStatVehicles">0</h3>
                  <p>Assigned Vehicles</p>
                </div>
              </div>
            </div>

            <div class="toolbar">
              <div class="toolbar-left">
                <div class="search-box">
                  <i class="ph ph-magnifying-glass"></i>
                  <input
                    type="text"
                    id="routeSearch"
                    placeholder="Search route no., origin, destination, vehicle, driver…"
                    aria-label="Search routes"
                  />
                </div>
                <select class="filter-select" id="routePriorityFilter" aria-label="Filter by priority">
                  <option value="all">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
                <select class="filter-select" id="routeStatusFilter" aria-label="Filter by status">
                  <option value="all">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Planned">Planned</option>
                  <option value="Ready For Dispatch">Ready For Dispatch</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
                <select class="filter-select" id="routeVehicleFilter" aria-label="Filter by vehicle">
                  <option value="all">All Vehicles</option>
                  <option value="Ambulance 01">Ambulance 01</option>
                  <option value="Ambulance 03">Ambulance 03</option>
                  <option value="Patient Van 02">Patient Van 02</option>
                  <option value="Service Vehicle 04">Service Vehicle 04</option>
                  <option value="Van 02">Van 02</option>
                  <option value="Van 05">Van 05</option>
                  <option value="SUV 03">SUV 03</option>
                </select>
                <select class="filter-select" id="routeDriverFilter" aria-label="Filter by driver">
                  <option value="all">All Drivers</option>
                  <option value="Juan Dela Cruz">Juan Dela Cruz</option>
                  <option value="Maria Santos">Maria Santos</option>
                  <option value="Pedro Reyes">Pedro Reyes</option>
                  <option value="Ana Lopez">Ana Lopez</option>
                  <option value="Carlos Rivera">Carlos Rivera</option>
                </select>
                <select class="filter-select" id="routeDepartmentFilter" aria-label="Filter by department">
                  <option value="all">All Departments</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Outpatient">Outpatient</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Admin">Admin</option>
                  <option value="Logistics">Logistics</option>
                </select>
                <input type="date" class="filter-select" id="routeDateFilter" aria-label="Filter by departure date" />
                <label class="route-archived-toggle">
                  <input type="checkbox" id="routeShowArchived" />
                  Show Archived
                </label>
              </div>
              <div class="toolbar-right">
                <button type="button" class="btn-outline" id="refreshRoutes">
                  <i class="ph ph-arrows-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>

            @if($routePermissions['canCreate'] ?? false)
                <div
                    class="route-templates-bar"
                    aria-label="Route templates"
                >
                    <select
                        class="filter-select"
                        id="routeTemplateSelect"
                        aria-label="Route templates"
                    >
                        <option value="">
                            Route templates…
                        </option>
                    </select>
                    <button
                        type="button"
                        class="btn-outline"
                        id="applyRouteTemplate"
                        disabled
                    >
                        Apply Template
                    </button>
                    <button
                        type="button"
                        class="btn-outline"
                        id="saveRouteTemplate"
                    >
                        Save as Template
                    </button>
                    <button
                        type="button"
                        class="btn-outline"
                        id="renameRouteTemplate"
                        disabled
                    >
                        Rename
                    </button>
                    <button
                        type="button"
                        class="btn-outline"
                        id="deleteRouteTemplate"
                        disabled
                    >
                        Delete
                    </button>
                </div>
            @endif

            <div class="route-planning-layout">
              <div class="card route-map-card">
                  <div class="card-header">
                      <div>
                          <h3>Route Map Preview</h3>
                          <p class="card-subtitle">
                              Interactive route preview using OpenStreetMap
                          </p>
                      </div>
                  </div>
                  <div
                      id="routeLeafletMap"
                      class="route-leaflet-map"
                      role="region"
                      aria-label="Route planning map preview"
                  ></div>
                  <div class="route-map-meta">
                      <div>
                          Distance
                          <strong id="mapDistanceLabel">—</strong>
                      </div>
                      <div>
                          ETA
                          <strong id="mapEtaLabel">—</strong>
                      </div>
                      <div>
                          Status
                          <strong id="mapStatusLabel">—</strong>
                      </div>
                      <div>
                          Strategy
                          <strong id="mapStrategyLabel">—</strong>
                      </div>
                  </div>
                  <p class="route-map-note">
                      Route distance and estimated travel time are calculated
                      using OpenStreetMap routing data.
                  </p>
              </div>

              <div class="card route-opt-card">
                <div class="card-header">
                  <div>
                    <h3>Optimization Summary</h3>
                    <p class="card-subtitle">
                        Route optimization and travel estimates
                    </p>
                  </div>
                </div>
                <ul class="route-opt-list">
                  <li><span>Estimated Distance</span><strong id="optSummaryDistance">—</strong></li>
                  <li><span>Estimated Travel Time</span><strong id="optSummaryTime">—</strong></li>
                  <li><span>Optimization Strategy</span><strong id="optSummaryStrategy">—</strong></li>
                  <li><span>Recommended Vehicle</span><strong id="optSummaryVehicle">—</strong></li>
                  <li><span>Recommended Driver</span><strong id="optSummaryDriver">—</strong></li>
                  <li><span>Optimization Score</span><strong id="optSummaryScore">—</strong></li>
                </ul>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div>
                  <h3>Route History</h3>
                  <p class="card-subtitle">
                    Planned transportation routes ready for dispatch handoff.
                  </p>
                </div>
                <div class="card-actions">
                  <div class="export-dropdown">
                    <button
                      type="button"
                      class="btn-outline export-menu-toggle"
                      id="routeExportMenuToggle"
                      aria-haspopup="menu"
                      aria-expanded="false"
                      aria-controls="routeExportMenu"
                    >
                      <i class="ph ph-export" aria-hidden="true"></i>
                      Export
                      <i class="ph ph-caret-down export-menu-chevron" aria-hidden="true"></i>
                    </button>
                    <div
                      class="export-menu"
                      id="routeExportMenu"
                      role="menu"
                      hidden
                      aria-label="Export routes"
                    >
                      <button type="button" class="export-menu-item" role="menuitem" id="printRoutes">
                        <i class="ph ph-printer" aria-hidden="true"></i>
                        Print
                      </button>
                      <button type="button" class="export-menu-item" role="menuitem" id="exportRoutesPDF">
                        <i class="ph ph-file-pdf" aria-hidden="true"></i>
                        Export PDF
                      </button>
                      <button type="button" class="export-menu-item" role="menuitem" id="exportRoutesExcel">
                        <i class="ph ph-file-xls" aria-hidden="true"></i>
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div id="routeEmptyState" class="route-empty-state" hidden>
                <i class="ph ph-map-trifold" style="font-size: 40px"></i>
                <h3>No routes planned yet.</h3>
                <p>Create your first transportation route.</p>
              </div>

              <div class="table-responsive" id="routeTableWrap">
                <table class="fleet-table" id="routeTable">
                  <thead>
                    <tr>
                      <th class="sortable" data-sort="routeNumber">Route No.</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th class="sortable" data-sort="vehicle">Vehicle</th>
                      <th class="sortable" data-sort="driver">Driver</th>
                      <th class="sortable" data-sort="priority">Priority</th>
                      <th class="sortable" data-sort="estimatedDistance">Distance</th>
                      <th>Estimated Time</th>
                      <th class="sortable" data-sort="status">Status</th>
                      <th class="sortable" data-sort="departureDate">Departure</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="routeTableBody"></tbody>
                </table>
              </div>
            </div>

            <div class="table-footer">
              <div id="routePaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> routes
              </div>
              <div class="pagination" id="routePagination">
                <button type="button" aria-label="Previous page">
                  <i class="ph ph-caret-left"></i>
                </button>

                <button type="button" aria-label="Next page">
                  <i class="ph ph-caret-right"></i>
                </button>
              </div>
            </div>
          </div>
        </section>


    @if(
        ($routePermissions['canCreate'] ?? false) ||
        ($routePermissions['canUpdate'] ?? false)
    )
        <!-- New / Edit Route Modal -->
      <div id="routeFormModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="routeFormModalTitle">
        <div class="custom-modal">
          <div class="modal-header">
            <div>
              <h2 id="routeFormModalTitle">New Route</h2>
              <p>Plan a transportation route before dispatch.</p>
            </div>
            <button type="button" class="modal-close" id="closeRouteFormModal" aria-label="Close route form">
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="routeForm">
              <div class="form-grid">
                <div class="form-group">
                  <label for="routeNumber">Route Number</label>
                  <input type="text" id="routeNumber" readonly />
                </div>
                <div class="form-group">
                    <label for="routeReservation">Reservation Number *</label>
                    <select id="routeReservation" required>
                        <option value="">Select approved reservation</option>
                    </select>
                </div>
                <div class="form-group">
                  <label for="routePriority">Priority *</label>
                  <select id="routePriority" required>
                    <option value="Low">Low</option>
                    <option value="Normal" selected>Normal</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="routeOrigin">Origin *</label>
                  <input type="text" id="routeOrigin" placeholder="Pickup location" required />
                </div>
                <div class="form-group">
                  <label for="routeDestination">Destination *</label>
                  <input type="text" id="routeDestination" placeholder="Drop-off location" required />
                </div>
                <div class="form-group full-width">
                  <label>Stops</label>
                  <div id="routeStopsList"></div>
                  <button type="button" class="btn-outline" id="addRouteStopBtn">
                    <i class="ph ph-plus"></i>
                    Add Stop
                  </button>
                </div>
                <div class="form-group">
                  <label for="routeVehicle">Vehicle *</label>
                  <select id="routeVehicle" disabled>
                      <option value="">Select reservation first</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="routeDriver">Driver *</label>
                  <select id="routeDriver" disabled>
                      <option value="">Select reservation first</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="routeDepartment">Department *</label>
                  <select id="routeDepartment" required></select>
                </div>
                <div class="form-group">
                  <label for="routeStatus">Status *</label>
                  <select id="routeStatus" required>
                    <option value="Draft">Draft</option>
                    <option value="Planned">Planned</option>
                    <option value="Ready For Dispatch">Ready For Dispatch</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="routeDepartureDate">Departure Date *</label>
                  <input type="date" id="routeDepartureDate" required readonly />
                </div>
                <div class="form-group">
                  <label for="routeDepartureTime">Departure Time *</label>
                  <input type="time" id="routeDepartureTime" required readonly />
                </div>
                <div class="form-group">
                  <label for="routeEstimatedDistance">Estimated Distance</label>
                  <input type="text" id="routeEstimatedDistance" readonly placeholder="Run optimization" />
                </div>
                <div class="form-group">
                  <label for="routeEstimatedTime">Estimated Travel Time</label>
                  <input type="text" id="routeEstimatedTime" readonly placeholder="Run optimization" />
                </div>
                <div class="form-group">
                  <label for="routeOptStrategy">Optimization Strategy</label>
                  <input type="text" id="routeOptStrategy" readonly />
                </div>
                <div class="form-group">
                  <label for="routeOptScore">Optimization Score</label>
                  <input type="text" id="routeOptScore" readonly />
                </div>
                <div class="form-group full-width">
                  <label for="routePurpose">Purpose</label>
                  <input type="text" id="routePurpose" placeholder="Trip purpose" />
                </div>
                <div class="form-group full-width">
                  <label for="routeNotes">Notes</label>
                  <textarea id="routeNotes" rows="3" placeholder="Optional notes"></textarea>
                </div>
              </div>
              <div id="routeOptimizeSummary" class="route-optimize-summary" hidden></div>
              <div class="modal-footer">
                <button type="button" class="btn-outline" id="cancelRouteForm">Cancel</button>
                <button type="button" class="btn-outline" id="saveRouteTemplateFromForm">
                  Save as Template
                </button>
                <button type="button" class="btn-outline" id="optimizeRouteBtn">
                  <i class="ph ph-path"></i>
                  Optimize Route
                </button>
                <button type="submit" class="btn-primary" id="saveRouteBtn">Save Route</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    @endif

      <!-- View Route Modal -->
      <div id="viewRouteModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="viewRouteModalTitle">
        <div class="custom-modal">
          <div class="modal-header">
            <div>
              <h2 id="viewRouteModalTitle">Route Details</h2>
              <p>Read-only planned route information.</p>
            </div>
            <button type="button" class="modal-close" id="closeViewRouteModal" aria-label="Close route details">
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="view-route-grid">
              <div><label>Route Number</label><p id="viewRouteNumber"></p></div>
              <div><label>Status</label><p id="viewRouteStatus"></p></div>
              <div><label>Priority</label><p id="viewRoutePriority"></p></div>
              <div><label>Departure</label><p id="viewRouteDeparture"></p></div>
              <div><label>Origin</label><p id="viewRouteOrigin"></p></div>
              <div><label>Destination</label><p id="viewRouteDestination"></p></div>
              <div><label>Stops</label><p id="viewRouteStops"></p></div>
              <div><label>Department</label><p id="viewRouteDepartment"></p></div>
              <div><label>Vehicle</label><p id="viewRouteVehicle"></p></div>
              <div><label>Driver</label><p id="viewRouteDriver"></p></div>
              <div><label>Distance</label><p id="viewRouteDistance"></p></div>
              <div><label>Travel Time</label><p id="viewRouteTime"></p></div>
              <div><label>Strategy</label><p id="viewRouteStrategy"></p></div>
              <div><label>Score</label><p id="viewRouteScore"></p></div>
              <div><label>Purpose</label><p id="viewRoutePurpose"></p></div>
              <div><label>Created</label><p id="viewRouteCreated"></p></div>
              <div><label>Updated</label><p id="viewRouteUpdated"></p></div>
              <div style="grid-column: 1 / -1"><label>Notes</label><p id="viewRouteNotes"></p></div>
              <div style="grid-column: 1 / -1">
                <label>Status History / Timeline</label>
                <ul class="route-timeline" id="viewRouteTimeline"></ul>
              </div>
            </div>
          </div>
          <div class="modal-footer">
              <button
                  type="button"
                  class="btn-outline"
                  id="closeViewRouteBtn"
              >
                  Close
              </button>
              @if($routePermissions['canDuplicate'] ?? false)
                  <button
                      type="button"
                      class="btn-outline"
                      id="duplicateRouteFromViewBtn"
                  >
                      <i class="ph ph-copy"></i>
                      Duplicate
                  </button>
              @endif
              @if($routePermissions['canArchive'] ?? false)
                  <button
                      type="button"
                      class="btn-outline"
                      id="archiveRouteFromViewBtn"
                  >
                      <i class="ph ph-archive"></i>
                      Archive
                  </button>
              @endif
              @if($routePermissions['canRestore'] ?? false)
                  <button
                      type="button"
                      class="btn-outline"
                      id="restoreRouteFromViewBtn"
                      hidden
                  >
                      <i class="ph ph-arrow-counter-clockwise"></i>
                      Restore
                  </button>
              @endif
              @if($routePermissions['canUpdate'] ?? false)
                  <button
                      type="button"
                      class="btn-primary"
                      id="editRouteFromViewBtn"
                  >
                      <i class="ph ph-pencil-simple"></i>
                      Edit Route
                  </button>
              @endif
          </div>
        </div>
      </div>

      @if($routePermissions['canDelete'] ?? false)
          <!-- Delete Route Modal -->
          <div id="deleteRouteModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="deleteRouteModalTitle">
            <div class="custom-modal delete-modal">
              <button type="button" class="modal-close" id="closeDeleteRouteModal" aria-label="Close delete route modal">
                <i class="ph ph-x"></i>
              </button>
              <div class="delete-icon"><i class="ph-fill ph-warning-circle"></i></div>
              <h2 id="deleteRouteModalTitle">Delete Route</h2>
              <p id="deleteRouteModalDescription">Are you sure you want to delete this route?</p>
              <p class="delete-note">This action cannot be undone.</p>
              <div class="modal-footer">
                <button type="button" class="btn-outline" id="cancelDeleteRoute">Cancel</button>
                <button type="button" class="btn-danger" id="confirmDeleteRoute">
                  <i class="ph ph-trash"></i>
                  Delete Route
                </button>
              </div>
            </div>
          </div>
      @endif

    <script>
        window.FLEET_RBAC = window.FLEET_RBAC || {};
        window.FLEET_RBAC.role =
            @json(auth()->user()?->role);
        window.FLEET_RBAC.route_planning =
            @json($routePermissions ?? []);
    </script>

    <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    @push('scripts')

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/route-planning/route-store.js') }}"></script>
    <script src="{{ asset('assets/js/route-planning/route-pipeline.js') }}"></script>
    <script src="{{ asset('assets/js/route-planning/route-modal.js') }}"></script>
    <script src="{{ asset('assets/js/route-planning/route-templates.js') }}"></script>
    <script src="{{ asset('assets/js/route-planning/route-export.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection
