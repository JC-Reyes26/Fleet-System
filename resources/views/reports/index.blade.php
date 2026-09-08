@extends('layouts.app')

@section('title', 'Reports & Analytics | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page reports-page" id="reportsPage">
            <div class="page-header">
              <div>
                <h1>Reports &amp; Analytics</h1>
                <p>
                  Operational reports for fleet utilization, trip activity,
                  maintenance cost, and fuel consumption.
                </p>
                <p class="reports-last-updated" id="reportsLastUpdated">
                  Last updated: —
                </p>
              </div>
            </div>

            <div class="toolbar reports-filter-bar">
              <div class="toolbar-left reports-filter-grid">
                <select
                  class="filter-select"
                  id="reportDateRange"
                  aria-label="Report date range"
                >
                  <option value="today">Today</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30" selected>Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>

                <div class="reports-custom-dates" id="reportCustomDateWrap" hidden>
                  <input
                    type="date"
                    class="filter-select"
                    id="reportStartDate"
                    aria-label="Custom start date"
                    disabled
                  />
                  <input
                    type="date"
                    class="filter-select"
                    id="reportEndDate"
                    aria-label="Custom end date"
                    disabled
                  />
                </div>

                <select
                  class="filter-select"
                  id="reportVehicleFilter"
                  aria-label="Filter by vehicle"
                >
                  <option value="all">All Vehicles</option>
                </select>

                <select
                  class="filter-select"
                  id="reportDepartmentFilter"
                  aria-label="Filter by department"
                >
                  <option value="all">All Departments</option>
                </select>

                <select
                  class="filter-select"
                  id="reportTypeFilter"
                  aria-label="Report type"
                >
                  <option value="overview">Overview</option>
                  <option value="utilization">Fleet Utilization</option>
                  <option value="trips">Trip &amp; Dispatch</option>
                  <option value="reservations">Reservations</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="fuel">Fuel &amp; Cost</option>
                  <option value="drivers">Driver Performance</option>
                </select>
              </div>

              <div class="toolbar-right">
                <button type="button" class="btn-outline" id="refreshReports">
                  <i class="ph ph-arrows-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>

            <div class="reports-presets-bar" aria-label="Report presets">
              <input
                type="text"
                class="filter-select reports-preset-name"
                id="reportPresetName"
                placeholder="Preset name"
                maxlength="60"
                aria-label="New preset name"
              />
              <button type="button" class="btn-outline" id="saveReportPreset">
                <i class="ph ph-floppy-disk" aria-hidden="true"></i>
                Save Preset
              </button>
              <select
                class="filter-select"
                id="reportPresetSelect"
                aria-label="Saved report presets"
              >
                <option value="">Saved presets…</option>
              </select>
              <button type="button" class="btn-outline" id="applyReportPreset">
                Load
              </button>
              <button
                type="button"
                class="btn-outline"
                id="renameReportPreset"
                disabled
              >
                Rename
              </button>
              <button
                type="button"
                class="btn-outline"
                id="deleteReportPreset"
                disabled
              >
                Delete
              </button>
            </div>

            <!-- Overview KPI cards (always visible) -->
            <div class="stats-grid" id="overviewKpis">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-car"></i>
                </div>
                <div class="stat-content">
                  <h3 id="kpiTotalVehicles">0</h3>
                  <p>Total Vehicles</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon success">
                  <i class="ph-fill ph-check-circle"></i>
                </div>
                <div class="stat-content">
                  <h3 id="kpiAvailableVehicles">0</h3>
                  <p>Available Vehicles</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-truck"></i>
                </div>
                <div class="stat-content">
                  <h3 id="kpiCompletedTrips">0</h3>
                  <p>Completed Trips</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon warning">
                  <i class="ph-fill ph-calendar-check"></i>
                </div>
                <div class="stat-content">
                  <h3 id="kpiActiveReservations">0</h3>
                  <p>Active Reservations</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-wrench"></i>
                </div>
                <div class="stat-content">
                  <h3 id="kpiMaintenanceCost">₱0.00</h3>
                  <p>Maintenance Cost</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-gas-pump"></i>
                </div>
                <div class="stat-content">
                  <h3 id="kpiFuelCost">₱0.00</h3>
                  <p>Fuel Cost</p>
                </div>
              </div>
            </div>

            <!-- Report-type specific KPI row -->
            <div class="stats-grid report-view-kpis" id="reportViewKpis" hidden></div>

            <div class="card reports-section-card">
              <div class="card-header">
                <div>
                  <h3 id="activeReportTitle">Overview</h3>
                  <p class="card-subtitle">
                    Analytics for the selected report type and filters.
                  </p>
                </div>
                <div class="card-actions" id="reportsCardActions">
                  <div class="export-dropdown">
                    <button
                      type="button"
                      class="btn-outline export-menu-toggle"
                      id="reportsExportMenuToggle"
                      aria-haspopup="menu"
                      aria-expanded="false"
                      aria-controls="reportsExportMenu"
                    >
                      <i class="ph ph-export" aria-hidden="true"></i>
                      Export
                      <i
                        class="ph ph-caret-down export-menu-chevron"
                        aria-hidden="true"
                      ></i>
                    </button>
                    <div
                      class="export-menu"
                      id="reportsExportMenu"
                      role="menu"
                      hidden
                      aria-label="Export report"
                    >
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="printReports"
                      >
                        <i class="ph ph-printer" aria-hidden="true"></i>
                        Print
                      </button>
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportReportsPDF"
                      >
                        <i class="ph ph-file-pdf" aria-hidden="true"></i>
                        Export PDF
                      </button>
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportReportsExcel"
                      >
                        <i class="ph ph-file-xls" aria-hidden="true"></i>
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="reports-output-meta"
                id="reportsOutputMeta"
                aria-live="polite"
              ></div>

              <!-- Overview charts -->
              <div class="report-charts-grid" data-report-view="overview">
                <div class="report-chart-card" data-chart-for="overview" id="chartFleetStatus">
                  <h4>Fleet Status Distribution</h4>
                  <p class="report-chart-empty" hidden>No fleet status data.</p>
                  <div class="report-chart-body report-donut-wrap">
                    <div class="report-donut" aria-hidden="true"></div>
                    <ul class="report-legend"></ul>
                  </div>
                </div>
                <div class="report-chart-card" data-chart-for="overview" id="chartTripActivity">
                  <h4>Monthly Trip Activity</h4>
                  <p class="report-chart-empty" hidden>No trip activity in range.</p>
                  <div class="report-chart-body">
                    <div class="report-bars"></div>
                  </div>
                </div>
                <div class="report-chart-card" data-chart-for="overview" id="chartCostComparison">
                  <h4>Fuel vs Maintenance Cost</h4>
                  <p class="report-chart-empty" hidden>No cost data in range.</p>
                  <div class="report-chart-body">
                    <div class="report-bars"></div>
                    <div class="report-chart-key">
                      <span><i style="background:#00a86b"></i> Fuel</span>
                      <span><i style="background:#3b82f6"></i> Maintenance</span>
                    </div>
                  </div>
                </div>
                <div class="report-chart-card" data-chart-for="overview" id="chartVehicleUtilization">
                  <h4>Vehicle Utilization</h4>
                  <p class="report-chart-empty" hidden>No utilization data.</p>
                  <div class="report-chart-body">
                    <div class="report-bars"></div>
                  </div>
                </div>
              </div>

              <!-- Utilization charts -->
              <div class="report-charts-grid" data-report-view="utilization" hidden aria-hidden="true">
                <div class="report-chart-card" data-chart-for="utilization" id="chartUsageRanking">
                  <h4>Vehicle Usage Ranking</h4>
                  <p class="report-chart-empty" hidden>No usage data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="utilization" id="chartUsageByType">
                  <h4>Usage by Vehicle Type</h4>
                  <p class="report-chart-empty" hidden>No type usage data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
              </div>

              <!-- Trips charts -->
              <div class="report-charts-grid" data-report-view="trips" hidden aria-hidden="true">
                <div class="report-chart-card" data-chart-for="trips" id="chartTripStatus">
                  <h4>Trip Status Distribution</h4>
                  <p class="report-chart-empty" hidden>No trip status data.</p>
                  <div class="report-chart-body report-donut-wrap">
                    <div class="report-donut" aria-hidden="true"></div>
                    <ul class="report-legend"></ul>
                  </div>
                </div>
                <div class="report-chart-card" data-chart-for="trips" id="chartTripsOverTime">
                  <h4>Trips Over Time</h4>
                  <p class="report-chart-empty" hidden>No trip timeline data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="trips" id="chartTopDestinations">
                  <h4>Top Destinations</h4>
                  <p class="report-chart-empty" hidden>No destination data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
              </div>

              <!-- Reservations charts -->
              <div class="report-charts-grid" data-report-view="reservations" hidden aria-hidden="true">
                <div class="report-chart-card" data-chart-for="reservations" id="chartReservationStatus">
                  <h4>Reservation Status</h4>
                  <p class="report-chart-empty" hidden>No reservation status data.</p>
                  <div class="report-chart-body report-donut-wrap">
                    <div class="report-donut" aria-hidden="true"></div>
                    <ul class="report-legend"></ul>
                  </div>
                </div>
                <div class="report-chart-card" data-chart-for="reservations" id="chartReservationsOverTime">
                  <h4>Reservations Over Time</h4>
                  <p class="report-chart-empty" hidden>No reservation timeline data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="reservations" id="chartReservationsByDept">
                  <h4>Requests by Department</h4>
                  <p class="report-chart-empty" hidden>No department data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
              </div>

              <!-- Maintenance charts -->
              <div class="report-charts-grid" data-report-view="maintenance" hidden aria-hidden="true">
                <div class="report-chart-card" data-chart-for="maintenance" id="chartMaintenanceByType">
                  <h4>Maintenance by Type</h4>
                  <p class="report-chart-empty" hidden>No type data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="maintenance" id="chartMaintenanceStatus">
                  <h4>Maintenance Status</h4>
                  <p class="report-chart-empty" hidden>No status data.</p>
                  <div class="report-chart-body report-donut-wrap">
                    <div class="report-donut" aria-hidden="true"></div>
                    <ul class="report-legend"></ul>
                  </div>
                </div>
                <div class="report-chart-card" data-chart-for="maintenance" id="chartMaintenanceCostOverTime">
                  <h4>Maintenance Cost Over Time</h4>
                  <p class="report-chart-empty" hidden>No cost timeline data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="maintenance" id="chartTopMaintenanceVehicles">
                  <h4>Top Vehicles by Maintenance Cost</h4>
                  <p class="report-chart-empty" hidden>No vehicle cost data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
              </div>

              <!-- Fuel charts -->
              <div class="report-charts-grid" data-report-view="fuel" hidden aria-hidden="true">
                <div class="report-chart-card" data-chart-for="fuel" id="chartFuelQtyOverTime">
                  <h4>Fuel Consumption Over Time</h4>
                  <p class="report-chart-empty" hidden>No consumption data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="fuel" id="chartFuelCostOverTime">
                  <h4>Fuel Cost Over Time</h4>
                  <p class="report-chart-empty" hidden>No fuel cost timeline.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="fuel" id="chartTopFuelVehicles">
                  <h4>Top Vehicles by Fuel Consumption</h4>
                  <p class="report-chart-empty" hidden>No vehicle fuel data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="fuel" id="chartFuelType">
                  <h4>Fuel Type Distribution</h4>
                  <p class="report-chart-empty" hidden>No fuel type data.</p>
                  <div class="report-chart-body report-donut-wrap">
                    <div class="report-donut" aria-hidden="true"></div>
                    <ul class="report-legend"></ul>
                  </div>
                </div>
              </div>

              <!-- Driver charts -->
              <div class="report-charts-grid" data-report-view="drivers" hidden aria-hidden="true">
                <div class="report-chart-card" data-chart-for="drivers" id="chartTopDrivers">
                  <h4>Top Drivers by Completed Trips</h4>
                  <p class="report-chart-empty" hidden>No driver trip data.</p>
                  <div class="report-chart-body"><div class="report-bars"></div></div>
                </div>
                <div class="report-chart-card" data-chart-for="drivers" id="chartDriverStatus">
                  <h4>Driver Status Distribution</h4>
                  <p class="report-chart-empty" hidden>No driver status data.</p>
                  <div class="report-chart-body report-donut-wrap">
                    <div class="report-donut" aria-hidden="true"></div>
                    <ul class="report-legend"></ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Shared summary table -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3>Summary Report</h3>
                  <p class="card-subtitle">
                    Tabular detail for the active report type (search, sort, and
                    paginate independently of global analytics).
                  </p>
                </div>
              </div>

              <div class="toolbar reports-table-toolbar">
                <div class="toolbar-left">
                  <div class="search-box">
                    <i class="ph ph-magnifying-glass"></i>
                    <input
                      type="text"
                      id="reportsTableSearch"
                      placeholder="Search this report table"
                      aria-label="Search report table"
                    />
                  </div>
                </div>
                <div class="toolbar-right">
                  <label class="reports-page-size-label" for="reportsTablePageSize">
                    Rows
                  </label>
                  <select
                    class="filter-select"
                    id="reportsTablePageSize"
                    aria-label="Rows per page"
                  >
                    <option value="5" selected>5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                </div>
              </div>

              <div class="table-responsive">
                <table class="fleet-table" id="reportsSummaryTable">
                  <thead id="reportsTableHead"></thead>
                  <tbody id="reportsTableBody"></tbody>
                </table>
              </div>
            </div>

            <div class="table-footer">
              <div id="reportsTablePaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> rows
              </div>
              <div class="pagination" id="reportsTablePagination">
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

    <script>
        window.FLEET_RBAC =
            window.FLEET_RBAC || {};
        window.FLEET_RBAC.role =
            @json(auth()->user()?->role);
        window.FLEET_RBAC.reports =
            @json($reportPermissions ?? []);
        window.REPORT_AUDIT_URL =
            @json(route('reports.audit-export'));
    </script>

    <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    @push('scripts')
  
    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports-data.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports-pipeline.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports-charts.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports-table.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports-export.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports-presets.js') }}"></script>
    <script src="{{ asset('assets/js/reports/reports.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection