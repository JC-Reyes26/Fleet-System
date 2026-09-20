@extends('layouts.app')

@section('title', 'Dispatch Management | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page">
            <!-- Header -->
            <div class="page-header">
              <div>
                <h1>Dispatch Management</h1>

                <p>
                  Assign vehicles and drivers, monitor active trips, and manage
                  hospital transport operations.
                </p>
              </div>

              @if($dispatchPermissions['canCreate'] ?? false)
                  <button
                      type="button"
                      id="createDispatchBtn"
                      class="btn-primary"
                  >
                      <i class="ph ph-plus"></i>
                      Create Dispatch
                  </button>
              @endif
            </div>

            <!-- Dispatch Statistics -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-stack"></i>
                </div>

                <div class="stat-content">
                  <h3 id="totalDispatches">0</h3>

                  <p>Total Dispatches</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon warning">
                  <i class="ph-fill ph-clock"></i>
                </div>

                <div class="stat-content">
                  <h3 id="pendingDispatches">0</h3>

                  <p>Pending Dispatch</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon success">
                  <i class="ph-fill ph-car"></i>
                </div>

                <div class="stat-content">
                  <h3 id="activeDispatches">0</h3>

                  <p>Active Trips</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-check-square"></i>
                </div>

                <div class="stat-content">
                  <h3 id="completedDispatches">0</h3>

                  <p>Completed Trips</p>
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
                    id="dispatchSearch"
                    placeholder="Search by dispatch number, reservation, patient, vehicle, driver, pickup, or destination"
                    aria-label="Search dispatches"
                  />
                </div>

                <select
                  class="filter-select"
                  id="dispatchStatusFilter"
                  aria-label="Filter dispatches by status"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="En Route">En Route</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  class="filter-select"
                  id="dispatchPriorityFilter"
                  aria-label="Filter dispatches by priority"
                >
                  <option value="all">All Priorities</option>
                  <option value="Emergency">Emergency</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>

                <input
                  type="date"
                  class="filter-select"
                  id="dispatchDateFilter"
                  aria-label="Filter dispatches by schedule date"
                />

                <label class="dispatch-archived-toggle">
                    <input
                        type="checkbox"
                        id="showArchivedDispatches"
                    >
                    <span>Show Archived</span>
                </label>
              </div>

              <div class="toolbar-right">
                <button
                  type="button"
                  class="btn-outline"
                  id="refreshDispatches"
                >
                  <i class="ph ph-arrows-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>

            <!-- Bulk Toolbar -->
            @if($dispatchPermissions['canBulkArchive'] ?? false)
                <div
                    class="bulk-toolbar"
                    id="dispatchBulkToolbar"
                >
                    <span id="dispatchSelectedCount">
                        0 dispatches selected
                    </span>

                    <div>
                        <button
                            type="button"
                            class="btn-outline"
                            id="clearDispatchSelection"
                        >
                            Clear
                        </button>

                        <button
                            type="button"
                            id="archiveSelectedDispatches"
                            class="btn-danger"
                        >
                            <i class="ph ph-archive"></i>
                            Archive Selected
                        </button>
                    </div>
                </div>
            @endif

            <!-- Dispatch Table -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3>Dispatch List</h3>

                  <p class="card-subtitle">
                    View and manage all hospital transport dispatches.
                  </p>
                </div>

                <div class="card-actions">
                  <div class="export-dropdown">
                    <button
                      type="button"
                      class="btn-outline export-menu-toggle"
                      id="dispatchExportMenuToggle"
                      aria-haspopup="menu"
                      aria-expanded="false"
                      aria-controls="dispatchExportMenu"
                    >
                      <i class="ph ph-export" aria-hidden="true"></i>
                      Export
                      <i class="ph ph-caret-down export-menu-chevron" aria-hidden="true"></i>
                    </button>

                    <div
                      class="export-menu"
                      id="dispatchExportMenu"
                      role="menu"
                      hidden
                      aria-label="Export dispatch list"
                    >
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="printDispatches"
                      >
                        <i class="ph ph-printer" aria-hidden="true"></i>
                        Print
                      </button>

                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportDispatchPDF"
                      >
                        <i class="ph ph-file-pdf" aria-hidden="true"></i>
                        Export PDF
                      </button>

                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportDispatches"
                      >
                        <i class="ph ph-file-xls" aria-hidden="true"></i>
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="table-responsive">
                <table id="dispatchTable" class="fleet-table">
                  <thead>
                    <tr>
                      <th>
                          @if($dispatchPermissions['canBulkArchive'] ?? false)
                              <input
                                  type="checkbox"
                                  id="selectAllDispatches"
                                  aria-label="Select all visible dispatches"
                              />
                          @endif
                      </th>

                      <th class="sortable" data-column="1">
                        Dispatch No.
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="2">
                        Reservation No.
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="3">
                        Patient / Request
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="4">
                        Vehicle
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="5">
                        Driver
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th>Route</th>

                      <th class="sortable" data-column="6">
                        Schedule
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="7">
                        Priority
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="8">
                        Status
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody id="dispatchTableBody">
                    
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Pagination -->
            <div class="table-footer">
              <div id="dispatchPaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> dispatches
              </div>

              <div class="pagination" id="dispatchPagination">
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
      
    @if($dispatchPermissions['canCreate'] ?? false)
        @include('components.dispatch.add-dispatch-modal')
    @endif

    @include('components.dispatch.view-dispatch-modal')

    @if($dispatchPermissions['canUpdate'] ?? false)
        @include('components.dispatch.edit-dispatch-modal')
    @endif

    @if(
        ($dispatchPermissions['canArchive'] ?? false) ||
        ($dispatchPermissions['canRestore'] ?? false)
    )
        @include('components.dispatch.delete-dispatch-modal')
    @endif

    <script>
        window.FLEET_RBAC = window.FLEET_RBAC || {};
        window.FLEET_RBAC.role =
            @json(auth()->user()?->role);
        window.FLEET_RBAC.dispatch =
            @json($dispatchPermissions ?? []);
    </script>

    <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <!-- Export dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    <!-- Main JS -->
    @push('scripts')

    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-modal.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-add.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-view.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-edit.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-delete.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-filter.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-table.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-stats.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-sort.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-pagination.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-export.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-print.js') }}"></script>
    <script src="{{ asset('assets/js/dispatch/dispatch-bulk.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection
