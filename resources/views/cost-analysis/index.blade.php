@extends('layouts.app')

@section('title', 'Cost Analysis | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page cost-analysis-page" id="costAnalysisPage">
            <div class="page-header">
              <div>
                <h1>Cost Analysis</h1>
                <p>
                  Operating cost summary by vehicle, department, category, and
                  budget period.
                </p>
                <p class="cost-last-updated" id="costLastUpdated">Last updated: —</p>
              </div>
            </div>

            <div class="toolbar cost-filter-bar">
              <div class="toolbar-left cost-filter-grid">
                <select class="filter-select" id="costDateRange" aria-label="Cost date range">
                  <option value="today">Today</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30" selected>Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisQuarter">This Quarter</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                <div class="cost-custom-dates" id="costCustomDateWrap" hidden>
                  <input type="date" class="filter-select" id="costStartDate" aria-label="Custom start date" disabled />
                  <input type="date" class="filter-select" id="costEndDate" aria-label="Custom end date" disabled />
                </div>
                <select class="filter-select" id="costVehicleFilter" aria-label="Filter by vehicle">
                  <option value="all">All Vehicles</option>
                </select>
                <select class="filter-select" id="costDepartmentFilter" aria-label="Filter by department">
                  <option value="all">All Departments</option>
                </select>
                <select class="filter-select" id="costCategoryFilter" aria-label="Filter by cost category">
                  <option value="all">All Categories</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Trip Operations">Trip Operations</option>
                  <option value="Reservation Operations">Reservation Operations</option>
                  <option value="Other">Other</option>
                </select>
                <select class="filter-select" id="costAnalysisView" aria-label="Analysis view">
                  <option value="overview">Overview</option>
                  <option value="vehicles">Vehicle Costs</option>
                  <option value="departments">Department Costs</option>
                  <option value="trips">Trip Costs</option>
                  <option value="budget">Budget Analysis</option>
                  <option value="trends">Cost Trends</option>
                </select>
              </div>
              <div class="toolbar-right">
                <button type="button" class="btn-outline" id="refreshCostAnalysis">
                  <i class="ph ph-arrows-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>

            <div class="cost-presets-bar" aria-label="Cost analysis presets">
              <input
                type="text"
                class="filter-select cost-preset-name"
                id="costPresetName"
                placeholder="Preset name"
                maxlength="60"
                aria-label="New preset name"
              />
              <button type="button" class="btn-outline" id="saveCostPreset">
                <i class="ph ph-floppy-disk" aria-hidden="true"></i>
                Save
              </button>
              <select
                class="filter-select"
                id="costPresetSelect"
                aria-label="Saved cost analysis presets"
              >
                <option value="">Saved presets…</option>
              </select>
              <button type="button" class="btn-outline" id="applyCostPreset" disabled>
                Apply
              </button>
              <button type="button" class="btn-outline" id="renameCostPreset" disabled>
                Rename
              </button>
              <button type="button" class="btn-outline" id="deleteCostPreset" disabled>
                Delete
              </button>
            </div>

            <div class="stats-grid" id="costOverviewKpis">
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-currency-circle-dollar"></i></div>
                <div class="stat-content">
                  <h3 id="costKpiTotal">₱0.00</h3>
                  <p>Total Operating Cost</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-gas-pump"></i></div>
                <div class="stat-content">
                  <h3 id="costKpiFuel">₱0.00</h3>
                  <p>Fuel Cost</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon warning"><i class="ph-fill ph-wrench"></i></div>
                <div class="stat-content">
                  <h3 id="costKpiMaintenance">₱0.00</h3>
                  <p>Maintenance Cost</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon success"><i class="ph-fill ph-car"></i></div>
                <div class="stat-content">
                  <h3 id="costKpiAvgVehicle">₱0.00</h3>
                  <p>Average Cost per Vehicle</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-truck"></i></div>
                <div class="stat-content">
                  <h3 id="costKpiAvgTrip">N/A</h3>
                  <p>Average Cost per Trip</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i class="ph-fill ph-chart-pie-slice"></i></div>
                <div class="stat-content">
                  <h3 id="costKpiBudgetUtil">Not Configured</h3>
                  <p>Budget Utilization</p>
                </div>
              </div>
            </div>

            <div class="card cost-section-card">
              <div class="card-header">
                <div>
                  <h3 id="costActiveViewTitle">Overview</h3>
                  <p class="card-subtitle">
                    Cost analytics for the selected filters and analysis view.
                  </p>
                </div>
                <div class="card-actions" id="costCardActions">
                  <div class="export-dropdown">
                    <button
                      type="button"
                      class="btn-outline export-menu-toggle"
                      id="costExportMenuToggle"
                      aria-haspopup="menu"
                      aria-expanded="false"
                      aria-controls="costExportMenu"
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
                      id="costExportMenu"
                      role="menu"
                      hidden
                      aria-label="Export cost analysis"
                    >
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="printCostAnalysis"
                      >
                        <i class="ph ph-printer" aria-hidden="true"></i>
                        Print
                      </button>
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportCostAnalysisPDF"
                      >
                        <i class="ph ph-file-pdf" aria-hidden="true"></i>
                        Export PDF
                      </button>
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportCostAnalysisExcel"
                      >
                        <i class="ph ph-file-xls" aria-hidden="true"></i>
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Overview charts -->
              <div class="cost-charts-grid" data-cost-view="overview">
                <div class="cost-chart-card" data-cost-chart="overview" id="costChartCategory" aria-label="Cost breakdown by category">
                  <h4>Cost Breakdown by Category</h4>
                  <p class="cost-chart-empty" hidden>No cost records found for the selected filters.</p>
                  <div class="cost-chart-body cost-donut-wrap">
                    <div class="cost-donut" aria-hidden="true"></div>
                    <ul class="cost-legend"></ul>
                  </div>
                </div>
                <div class="cost-chart-card" data-cost-chart="overview" id="costChartMonthly" aria-label="Monthly cost trend">
                  <h4>Monthly Cost Trend</h4>
                  <p class="cost-chart-empty" hidden>No trend data is available for this period.</p>
                  <div class="cost-chart-body"><div class="cost-bars"></div></div>
                </div>
                <div class="cost-chart-card" data-cost-chart="overview" id="costChartFuelMnt" aria-label="Fuel versus maintenance cost">
                  <h4>Fuel versus Maintenance Cost</h4>
                  <p class="cost-chart-empty" hidden>No fuel or maintenance cost data.</p>
                  <div class="cost-chart-body">
                    <div class="cost-bars"></div>
                    <div class="cost-chart-key">
                      <span><i style="background:#00a86b"></i> Fuel</span>
                      <span><i style="background:#3b82f6"></i> Maintenance</span>
                    </div>
                  </div>
                </div>
                <div class="cost-chart-card" data-cost-chart="overview" id="costChartTopVehicles" aria-label="Top vehicles by operating cost">
                  <h4>Top Vehicles by Operating Cost</h4>
                  <p class="cost-chart-empty" hidden>No vehicle cost data is available.</p>
                  <div class="cost-chart-body"><div class="cost-bars"></div></div>
                </div>
                <div class="cost-chart-card" data-cost-chart="overview" id="costChartDepartments" aria-label="Department spending">
                  <h4>Department Spending</h4>
                  <p class="cost-chart-empty" hidden>No department cost data is available.</p>
                  <div class="cost-chart-body"><div class="cost-bars"></div></div>
                </div>
              </div>

              <!-- Vehicle view -->
              <div data-cost-view="vehicles" hidden aria-hidden="true">
                <div class="stats-grid cost-sub-kpis">
                  <div class="stat-card"><div class="stat-content"><h3 id="vehicleKpiCount">0</h3><p>Vehicles with Cost Activity</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="vehicleKpiHighest">—</h3><p>Highest-Cost Vehicle</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="vehicleKpiAvg">₱0.00</h3><p>Average Vehicle Cost</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="vehicleKpiRatio">—</h3><p>Fuel-to-Maintenance Ratio</p></div></div>
                </div>
                <div class="cost-charts-grid">
                  <div class="cost-chart-card" data-cost-chart="vehicles" id="costChartVehicleRank">
                    <h4>Vehicle Cost Ranking</h4>
                    <p class="cost-chart-empty" hidden>No vehicle cost data is available.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                  <div class="cost-chart-card" data-cost-chart="vehicles" id="costChartVehicleFuelMnt">
                    <h4>Fuel + Maintenance by Vehicle</h4>
                    <p class="cost-chart-empty" hidden>No vehicle cost data is available.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                </div>
              </div>

              <!-- Department view -->
              <div data-cost-view="departments" hidden aria-hidden="true">
                <p class="cost-availability-note" id="deptAvailabilityNote" hidden>
                  Some cost records have no department and are grouped as Unassigned.
                </p>
                <div class="stats-grid cost-sub-kpis">
                  <div class="stat-card"><div class="stat-content"><h3 id="deptKpiCount">0</h3><p>Departments with Spending</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="deptKpiHighest">—</h3><p>Highest-Spending Department</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="deptKpiAvg">₱0.00</h3><p>Average Department Cost</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="deptKpiShare">—</h3><p>Top Department Share</p></div></div>
                </div>
                <div class="cost-charts-grid">
                  <div class="cost-chart-card" data-cost-chart="departments" id="costChartDeptRank">
                    <h4>Department Spending Ranking</h4>
                    <p class="cost-chart-empty" hidden>No department cost data is available.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                </div>
              </div>

              <!-- Trip view -->
              <div data-cost-view="trips" hidden aria-hidden="true">
                <p class="cost-availability-note" id="tripCostAvailabilityNote">
                  Trip Operations monetary costs are not stored in the current Dispatch module.
                  Average trip cost and cost per kilometer remain N/A until valid trip cost fields exist.
                  Distance-only dispatch data is not converted into currency.
                </p>
                <div class="stats-grid cost-sub-kpis">
                  <div class="stat-card"><div class="stat-content"><h3 id="tripKpiCount">0</h3><p>Trips with Cost Data</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="tripKpiTotal">N/A</h3><p>Total Trip Cost</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="tripKpiAvg">N/A</h3><p>Average Cost per Trip</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="tripKpiPerKm">N/A</h3><p>Average Cost per Kilometer</p></div></div>
                </div>
                <div class="cost-charts-grid">
                  <div class="cost-chart-card" data-cost-chart="trips" id="costChartTripTime">
                    <h4>Trip Cost Over Time</h4>
                    <p class="cost-chart-empty" hidden>No trip cost data is available.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                </div>
              </div>

              <!-- Budget view -->
              <div data-cost-view="budget" hidden aria-hidden="true">
                <div class="cost-budget-panel">
                  <div class="cost-budget-actions">
                      @if($costAnalysisPermissions['canManageBudget'] ?? false)
                          <button
                              type="button"
                              class="btn-primary"
                              id="openCostBudgetModal"
                          >
                              <i class="ph ph-gear" aria-hidden="true"></i>
                              Configure Budget
                          </button>
                          <button
                              type="button"
                              class="btn-outline"
                              id="editCostBudget"
                          >
                              <i class="ph ph-pencil-simple" aria-hidden="true"></i>
                              Edit Budget
                          </button>
                          <button
                              type="button"
                              class="btn-outline"
                              id="clearCostBudget"
                          >
                              <i class="ph ph-trash" aria-hidden="true"></i>
                              Clear Budget
                          </button>
                      @endif
                  </div>
                  <p
                    class="cost-budget-mismatch"
                    id="costBudgetMismatchNote"
                    hidden
                  >
                    The configured budget does not match the current analysis period.
                  </p>
                  <p
                    class="cost-budget-hint"
                    id="costCategoryBudgetWarn"
                    hidden
                  >
                    Category budget totals exceed the overall budget.
                  </p>
                </div>
                <div class="stats-grid cost-sub-kpis">
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiBudget">Not Configured</h3><p>Overall Budget</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiActual">₱0.00</h3><p>Actual Operating Cost</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiRemaining">—</h3><p>Remaining Budget</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiUtil">Not Configured</h3><p>Budget Utilization</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiVariance">—</h3><p>Variance</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiStatus">Not Configured</h3><p>Budget Status</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiPeriod">—</h3><p>Budget Period</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="budgetKpiLastUpdated">—</h3><p>Last Updated</p></div></div>
                </div>
                <div class="cost-charts-grid">
                  <div class="cost-chart-card" data-cost-chart="budget" id="costChartBudgetVsActual">
                    <h4>Budget versus Actual</h4>
                    <p class="cost-chart-empty" hidden>Budget has not been configured.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                  <div class="cost-chart-card" data-cost-chart="budget" id="costChartBudgetMonthly">
                    <h4>Monthly Actual Cost</h4>
                    <p class="cost-chart-empty" hidden>No trend data is available for this period.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                </div>
                <div class="cost-budget-table-section">
                  <h4>Category Budget Performance</h4>
                  <div class="table-responsive">
                    <table class="fleet-table" id="costCategoryBudgetTable">
                      <thead>
                        <tr>
                          <th scope="col">Category</th>
                          <th scope="col">Budget</th>
                          <th scope="col">Actual</th>
                          <th scope="col">Remaining</th>
                          <th scope="col">Utilization</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody id="costCategoryBudgetBody">
                        <tr class="helper-row">
                          <td colspan="6">No category budgets configured.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="cost-budget-table-section">
                  <div class="cost-budget-history-header">
                      <h4>Budget History</h4>
                      @if($costAnalysisPermissions['canManageBudget'] ?? false)
                          <button
                              type="button"
                              class="btn-outline"
                              id="clearCostBudgetHistory"
                          >
                              Clear History
                          </button>
                      @endif
                  </div>
                  <div class="table-responsive">
                    <table class="fleet-table" id="costBudgetHistoryTable">
                      <thead>
                        <tr>
                          <th scope="col">Action</th>
                          <th scope="col">Previous Budget</th>
                          <th scope="col">New Budget</th>
                          <th scope="col">Period</th>
                          <th scope="col">Changed</th>
                        </tr>
                      </thead>
                      <tbody id="costBudgetHistoryBody">
                        <tr class="helper-row">
                          <td colspan="5">No budget history yet.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Trends view -->
              <div data-cost-view="trends" hidden aria-hidden="true">
                <div class="stats-grid cost-sub-kpis">
                  <div class="stat-card"><div class="stat-content"><h3 id="trendKpiCurrent">₱0.00</h3><p>Current Period Cost</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="trendKpiPrevious">₱0.00</h3><p>Previous Comparable Period</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="trendKpiChange">₱0.00</h3><p>Cost Change</p></div></div>
                  <div class="stat-card"><div class="stat-content"><h3 id="trendKpiDaily">₱0.00</h3><p>Average Daily Cost</p></div></div>
                </div>
                <div class="cost-charts-grid">
                  <div class="cost-chart-card" data-cost-chart="trends" id="costChartTrend">
                    <h4>Cost Over Time</h4>
                    <p class="cost-chart-empty" hidden>No trend data is available for this period.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                  <div class="cost-chart-card" data-cost-chart="trends" id="costChartCumulative">
                    <h4>Cumulative Cost Trend</h4>
                    <p class="cost-chart-empty" hidden>No trend data is available for this period.</p>
                    <div class="cost-chart-body"><div class="cost-bars"></div></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div>
                  <h3>Cost Records</h3>
                  <p class="card-subtitle">
                    Detailed cost records for the active analysis view (read-only).
                  </p>
                </div>
              </div>
              <div class="toolbar cost-table-toolbar">
                <div class="toolbar-left">
                  <div class="search-box">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="text" id="costTableSearch" placeholder="Search cost records" aria-label="Search cost records" />
                  </div>
                  <select class="filter-select" id="costTableSourceFilter" aria-label="Filter by source module">
                    <option value="all">All Sources</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Dispatch">Dispatch</option>
                  </select>
                  <select class="filter-select" id="costTableCategoryFilter" aria-label="Filter table by category">
                    <option value="all">All Categories</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Trip Operations">Trip Operations</option>
                  </select>
                  <select class="filter-select" id="costTableStatusFilter" aria-label="Filter table by status">
                    <option value="all">All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
                <div class="toolbar-right">
                  <label for="costTablePageSize" class="cost-page-size-label">Rows</label>
                  <select class="filter-select" id="costTablePageSize" aria-label="Rows per page">
                    <option value="5" selected>5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                </div>
              </div>
              <div class="table-responsive">
                <table class="fleet-table" id="costRecordsTable">
                  <thead id="costTableHead"></thead>
                  <tbody id="costTableBody"></tbody>
                </table>
              </div>
            </div>

            <div class="table-footer">
              <div id="costTablePaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> records
              </div>
              <div class="pagination" id="costTablePagination">
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

    @if($costAnalysisPermissions['canManageBudget'] ?? false) 
      <!-- Budget configuration modal -->
      <div
        id="costBudgetModal"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costBudgetModalTitle"
      >
        <div class="custom-modal cost-budget-modal">
          <div class="modal-header">
            <div>
              <h2 id="costBudgetModalTitle">Configure Budget</h2>
              <p>Set overall and category budgets for Cost Analysis.</p>
            </div>
            <button
              type="button"
              class="modal-close"
              id="closeCostBudgetModal"
              aria-label="Close budget configuration"
            >
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="saveCostBudgetForm">
              <div class="form-grid">
                <div class="form-group">
                  <label for="budgetPeriodType">Budget Period Type</label>
                  <select id="budgetPeriodType">
                    <option value="filter">Current Filter Period</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="budgetOverallInput">Overall Budget (₱) *</label>
                  <input
                    type="number"
                    id="budgetOverallInput"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div class="form-group full-width" id="budgetCustomPeriodWrap" hidden>
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="budgetCustomStart">Start Date *</label>
                      <input type="date" id="budgetCustomStart" />
                    </div>
                    <div class="form-group">
                      <label for="budgetCustomEnd">End Date *</label>
                      <input type="date" id="budgetCustomEnd" />
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label for="budgetCatFuel">Fuel Budget (₱)</label>
                  <input type="number" id="budgetCatFuel" min="0" step="0.01" placeholder="Optional" />
                </div>
                <div class="form-group">
                  <label for="budgetCatMaintenance">Maintenance Budget (₱)</label>
                  <input type="number" id="budgetCatMaintenance" min="0" step="0.01" placeholder="Optional" />
                </div>
                <div class="form-group">
                  <label for="budgetCatTrip">Trip Operations Budget (₱)</label>
                  <input type="number" id="budgetCatTrip" min="0" step="0.01" placeholder="Optional" />
                </div>
                <div class="form-group">
                  <label for="budgetCatReservation">Reservation Operations Budget (₱)</label>
                  <input type="number" id="budgetCatReservation" min="0" step="0.01" placeholder="Optional" />
                </div>
                <div class="form-group">
                  <label for="budgetCatOther">Other Budget (₱)</label>
                  <input type="number" id="budgetCatOther" min="0" step="0.01" placeholder="Optional" />
                </div>
                <div class="form-group full-width">
                  <label for="budgetNotes">Notes</label>
                  <textarea id="budgetNotes" maxlength="500" placeholder="Optional notes"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-outline" id="cancelCostBudgetModal">
                  Cancel
                </button>
                <button type="submit" class="btn-primary">
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    @endif

    <script>
        window.FLEET_RBAC = window.FLEET_RBAC || {};
        window.FLEET_RBAC.role =
            @json(auth()->user()?->role);
        window.FLEET_RBAC.cost_analysis =
            @json($costAnalysisPermissions ?? []);
    </script>

    <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    @push('scripts')

    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-data.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-pipeline.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-charts.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-table.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-budget.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-presets.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-export.js') }}"></script>
    <script src="{{ asset('assets/js/cost-analysis/cost-init.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush
    
@endsection