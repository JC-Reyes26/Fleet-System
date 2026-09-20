@extends('layouts.app')

@section('title', 'Reservation Management | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page">
            <!-- Header -->
            <div class="page-header">
              <div>
                <h1>Reservation Management</h1>

                <p>
                  Manage hospital transport reservations, schedules, approvals,
                  and assignments.
                </p>
              </div>

              @if($reservationPermissions['canCreate'] ?? false)
                  <button
                      type="button"
                      id="addReservationBtn"
                      class="btn-primary"
                  >
                      <i class="ph ph-plus"></i>
                      Add Reservation
                  </button>
              @endif
            </div>

            <!-- Reservation Statistics -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-calendar-check"></i>
                </div>

                <div class="stat-content">
                  <h3 id="totalReservations">0</h3>

                  <p>Total Reservations</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon warning">
                  <i class="ph-fill ph-clock"></i>
                </div>

                <div class="stat-content">
                  <h3 id="pendingReservations">0</h3>

                  <p>Pending</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon success">
                  <i class="ph-fill ph-check-circle"></i>
                </div>

                <div class="stat-content">
                  <h3 id="approvedReservations">0</h3>

                  <p>Approved</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-check-square"></i>
                </div>

                <div class="stat-content">
                  <h3 id="completedReservations">0</h3>

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
                    id="reservationSearch"
                    placeholder="Search by reservation number, patient, vehicle, driver, pickup, or destination"
                    aria-label="Search reservations"
                  />
                </div>

                <select
                  class="filter-select"
                  id="reservationStatusFilter"
                  aria-label="Filter reservations by status"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <input
                  type="date"
                  class="filter-select"
                  id="reservationDateFilter"
                  aria-label="Filter reservations by date"
                />

                <label class="reservation-archived-toggle">
                    <input
                        type="checkbox"
                        id="showArchivedReservations"
                    >
                    <span>Show Archived</span>
                </label>
              </div>

              <div class="toolbar-right">
                <button
                  type="button"
                  class="btn-outline"
                  id="refreshReservations"
                >
                  <i class="ph ph-arrows-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>

            <!-- Bulk Toolbar -->
            @if($reservationPermissions['canBulkArchive'] ?? false)
                <div
                    class="bulk-toolbar"
                    id="reservationBulkToolbar"
                >
                    <span id="reservationSelectedCount">
                        0 reservations selected
                    </span>

                    <div>
                        <button
                            type="button"
                            class="btn-outline"
                            id="clearReservationSelection"
                        >
                            Clear
                        </button>

                        <button
                            type="button"
                            id="archiveSelectedReservations"
                            class="btn-danger"
                        >
                            <i class="ph ph-archive"></i>
                            Archive Selected
                        </button>
                    </div>
                </div>
            @endif

            <!-- Reservation Table -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3>Reservation List</h3>

                  <p class="card-subtitle">
                    View and manage all hospital transport reservations.
                  </p>
                </div>

                <div class="card-actions">
                  <div class="export-dropdown">
                    <button
                      type="button"
                      class="btn-outline export-menu-toggle"
                      id="reservationExportMenuToggle"
                      aria-haspopup="menu"
                      aria-expanded="false"
                      aria-controls="reservationExportMenu"
                    >
                      <i class="ph ph-export" aria-hidden="true"></i>
                      Export
                      <i class="ph ph-caret-down export-menu-chevron" aria-hidden="true"></i>
                    </button>

                    <div
                      class="export-menu"
                      id="reservationExportMenu"
                      role="menu"
                      hidden
                      aria-label="Export reservation list"
                    >
                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="printReservations"
                      >
                        <i class="ph ph-printer" aria-hidden="true"></i>
                        Print
                      </button>

                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportReservationPDF"
                      >
                        <i class="ph ph-file-pdf" aria-hidden="true"></i>
                        Export PDF
                      </button>

                      <button
                        type="button"
                        class="export-menu-item"
                        role="menuitem"
                        id="exportReservations"
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
                          @if($reservationPermissions['canBulkArchive'] ?? false)
                              <input
                                  type="checkbox"
                                  id="selectAllReservations"
                                  aria-label="Select all visible reservations"
                              />
                          @endif
                      </th>

                      <th class="sortable" data-column="1">
                        Reservation No.
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="2">
                        Patient
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="3">
                        Vehicle
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="4">
                        Driver
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="5">
                        Pickup
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="6">
                        Destination
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="7">
                        Schedule
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="8">
                        Status
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody id="reservationTableBody">
                    
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Pagination -->
            <div class="table-footer">
              <div id="reservationPaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> reservations
              </div>

              <div class="pagination" id="reservationPagination">
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

    @if($reservationPermissions['canCreate'] ?? false)
        @include('components.reservation.add-reservation-modal')
    @endif

    @include('components.reservation.view-reservation-modal')

    @if($reservationPermissions['canUpdate'] ?? false)
        @include('components.reservation.edit-reservation-modal')
    @endif

    @if(
        ($reservationPermissions['canArchive'] ?? false) ||
        ($reservationPermissions['canRestore'] ?? false)
    )
        @include('components.reservation.delete-reservation-modal')
    @endif

    <script>
      window.FLEET_RBAC = window.FLEET_RBAC || {};
      window.FLEET_RBAC.role =
          @json(auth()->user()?->role);
      window.FLEET_RBAC.reservations =
          @json($reservationPermissions ?? []);
  </script>

  <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <!-- Export dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    <!-- Main JS -->
    @push('scripts')
  
    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-modal.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-add.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-view.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-edit.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-delete.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-filter.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-table.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-stats.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-pagination.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-sort.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-bulk.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-export.js') }}"></script>
    <script src="{{ asset('assets/js/reservation/reservation-print.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection
