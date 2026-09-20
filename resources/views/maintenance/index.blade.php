@extends('layouts.app')

@section('title', 'Maintenance Management | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page">
            <!-- Header -->
            <div class="page-header">
              <div>
                <h1>Maintenance Management</h1>

                <p>
                  Schedule, monitor, and manage preventive and corrective
                  maintenance for hospital fleet vehicles.
                </p>
              </div>

              @if($maintenancePermissions['canCreate'] ?? false)
                  <button
                      type="button"
                      id="addMaintenanceBtn"
                      class="btn-primary"
                  >
                      <i class="ph ph-plus"></i>
                      Add Maintenance
                  </button>
              @endif
            </div>

            <!-- Maintenance Statistics -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-wrench"></i>
                </div>

                <div class="stat-content">
                  <h3 id="totalMaintenance">0</h3>

                  <p>Total Maintenance</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon warning">
                  <i class="ph-fill ph-clock"></i>
                </div>

                <div class="stat-content">
                  <h3 id="scheduledMaintenance">0</h3>

                  <p>Scheduled</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon success">
                  <i class="ph-fill ph-spinner"></i>
                </div>

                <div class="stat-content">
                  <h3 id="inProgressMaintenance">0</h3>

                  <p>In Progress</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-check-square"></i>
                </div>

                <div class="stat-content">
                  <h3 id="completedMaintenance">0</h3>

                  <p>Completed</p>
                </div>
              </div>
            </div>

            <!-- Toolbar -->
            <div class="toolbar">
              <div class="toolbar-left">
                <div class="search-box">
                  <i class="ph ph-magnifying-glass"></i>

                  <input
                    type="text"
                    id="maintenanceSearch"
                    placeholder="Search by maintenance number, vehicle, service type, technician, or workshop"
                    aria-label="Search maintenance records"
                  />
                </div>

                <select
                  class="filter-select"
                  id="maintenanceStatusFilter"
                  aria-label="Filter maintenance by status"
                >
                  <option value="all">All Status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  class="filter-select"
                  id="maintenanceTypeFilter"
                  aria-label="Filter maintenance by service type"
                >
                  <option value="all">All Service Types</option>
                  <option value="Preventive Maintenance">
                    Preventive Maintenance
                  </option>
                  <option value="Corrective Repair">Corrective Repair</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tire Service">Tire Service</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="Engine Service">Engine Service</option>
                  <option value="Electrical Service">Electrical Service</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  type="date"
                  class="filter-select"
                  id="maintenanceDateFilter"
                  aria-label="Filter maintenance by scheduled date"
                />

                <label class="maintenance-archived-toggle">
                    <input
                        type="checkbox"
                        id="showArchivedMaintenances"
                    >
                    <span>Show Archived</span>
                </label>
              </div>

              <div class="toolbar-right">
                <button
                  type="button"
                  class="btn-outline"
                  id="refreshMaintenance"
                >
                  <i class="ph ph-arrows-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>

            <!-- Bulk Toolbar -->
            @if($maintenancePermissions['canBulkArchive'] ?? false)
                <div
                    class="bulk-toolbar"
                    id="maintenanceBulkToolbar"
                >
                    <span id="maintenanceSelectedCount">
                        0 maintenance selected
                    </span>
                    <div>
                        <button
                            type="button"
                            class="btn-outline"
                            id="clearMaintenanceSelection"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            id="archiveSelectedMaintenance"
                            class="btn-danger"
                            aria-label="Archive selected maintenance records"
                        >
                            <i class="ph ph-archive"></i>
                            Archive Selected
                        </button>
                    </div>
                </div>
            @endif

            <!-- Maintenance Table -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3>Maintenance List</h3>

                  <p class="card-subtitle">
                    View and manage all hospital fleet maintenance records.
                  </p>
                </div>

                <div class="card-actions">
                  <div class="export-dropdown">
                    <button
                      type="button"
                      class="btn-outline export-menu-toggle"
                      id="maintenanceExportMenuToggle"
                      aria-haspopup="menu"
                      aria-expanded="false"
                      aria-controls="maintenanceExportMenu"
                    >
                      <i class="ph ph-export" aria-hidden="true"></i>
                      Export
                      <i class="ph ph-caret-down export-menu-chevron" aria-hidden="true"></i>
                    </button>

                    <div
                      class="export-menu"
                      id="maintenanceExportMenu"
                      role="menu"
                      hidden
                      aria-label="Export maintenance list"
                    >
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="printMaintenance"
                      >
                        <i class="ph ph-printer" aria-hidden="true"></i>
                        Print
                      </button>

                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportMaintenancePDF"
                      >
                        <i class="ph ph-file-pdf" aria-hidden="true"></i>
                        Export PDF
                      </button>

                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportMaintenance"
                      >
                        <i class="ph ph-file-xls" aria-hidden="true"></i>
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="table-responsive">
                <table class="fleet-table">
                  <thead>
                    <tr>
                      <th>
                          @if($maintenancePermissions['canBulkArchive'] ?? false)
                              <input
                                  type="checkbox"
                                  id="selectAllMaintenance"
                                  aria-label="Select all visible maintenance records"
                              />
                          @endif
                      </th>

                      <th class="sortable" data-column="1">
                        Maintenance No.
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="2">
                        Vehicle
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="3">
                        Service Type
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="4">
                        Technician / Workshop
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="5">
                        Scheduled Date
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="6">
                        Completion Date
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="7">
                        Cost
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="8">
                        Priority
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="9">
                        Status
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody id="maintenanceTableBody">
                    
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Pagination -->
            <div class="table-footer">
              <div id="maintenancePaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> maintenance
                records
              </div>

              <div class="pagination" id="maintenancePagination">
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

    @if($maintenancePermissions['canCreate'] ?? false)
        @include('components.maintenance.add-maintenance-modal')
    @endif

    @include('components.maintenance.view-maintenance-modal')

    @if($maintenancePermissions['canUpdate'] ?? false)
        @include('components.maintenance.edit-maintenance-modal')
    @endif

    @if(
        ($maintenancePermissions['canArchive'] ?? false) ||
        ($maintenancePermissions['canRestore'] ?? false)
    )
        @include('components.maintenance.delete-maintenance-modal')
    @endif

    <script>
      window.FLEET_RBAC = window.FLEET_RBAC || {};
      window.FLEET_RBAC.role =
          @json(auth()->user()?->role);
      window.FLEET_RBAC.maintenance =
          @json($maintenancePermissions ?? []);
  </script>

  <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <!-- Export dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    <!-- Components -->

    <!-- Main JS -->
    @push('scripts')
  
    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-modal.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-add.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-view.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-edit.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-delete.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-search.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-table.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-statistics.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-sort.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-pagination.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-bulk.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-export.js') }}"></script>
    <script src="{{ asset('assets/js/maintenance/maintenance-print.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection