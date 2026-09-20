@extends('layouts.app')

@section('title', 'Vehicle Management | HIMS Fleet')

@section('content')

        <section class="page-wrapper">
          <div class="vehicle-page">
            <!-- Header -->
            <div class="page-header">
              <div>
                <h1>Vehicle Management</h1>

                <p>Manage all hospital fleet vehicles.</p>
              </div>
              @if($vehiclePermissions['canCreate'] ?? false)
                  <button
                      type="button"
                      id="addVehicleBtn"
                      class="btn-primary"
                  >
                      <i class="ph ph-plus"></i>
                      Add Vehicle
                  </button>
              @endif
            </div>

            <!-- Fleet Statistics -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="ph-fill ph-car"></i>
                </div>

                <div class="stat-content">
                  <h3 id="totalVehicles">0</h3>

                  <p>Total Fleet</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon success">
                  <i class="ph-fill ph-check-circle"></i>
                </div>

                <div class="stat-content">
                  <h3 id="availableVehicles">0</h3>

                  <p>Available</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon warning">
                  <i class="ph-fill ph-truck"></i>
                </div>

                <div class="stat-content">
                  <h3 id="onTripVehicles">0</h3>

                  <p>On Trip</p>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon danger">
                  <i class="ph-fill ph-wrench"></i>
                </div>

                <div class="stat-content">
                  <h3 id="maintenanceVehicles">0</h3>

                  <p>Maintenance</p>
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
                      id="vehicleSearch"
                      placeholder="Search by vehicle name, plate number or driver"
                      aria-label="Search vehicles"
                    />
                  </div>

                  <select class="filter-select" id="vehicleTypeFilter">
                    <option value="all">All Vehicle Types</option>
                    <option value="Ambulance">Ambulance</option>
                    <option value="Van">Van</option>
                    <option value="Patient Van">Patient Van</option>
                    <option value="SUV">SUV</option>
                    <option value="Car">Car</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Service Vehicle">Service Vehicle</option>
                  </select>

                  <select class="filter-select" id="vehicleStatusFilter">
                    <option value="all">All Status</option>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>

                  <label class="vehicle-archived-toggle">
                      <input
                          type="checkbox"
                          id="showArchivedVehicles"
                      >
                      <span>Show Archived</span>
                  </label>
                </div>

                <div class="toolbar-right">
                  <button type="button" class="btn-outline" id="refreshVehicles">
                    <i class="ph ph-arrows-clockwise"></i>
                    Refresh
                  </button>
                </div>
              </div>
              @if($vehiclePermissions['canBulkArchive'] ?? false)
                  <div class="bulk-toolbar" id="bulkToolbar">
                      <span id="selectedCount">
                          0 vehicles selected
                      </span>
                      <div>
                          <button
                              type="button"
                              class="btn-outline"
                              id="clearSelection"
                          >
                              Clear
                          </button>
                          <button
                              type="button"
                              id="archiveSelected"
                              class="btn-danger"
                          >
                              <i class="ph ph-archive"></i>
                              Archive Selected
                          </button>
                      </div>
                  </div>
              @endif

              <!-- Vehicle Table (Next Sprint) -->
              <!-- Vehicle Table -->
              <div class="card">
                <div class="card-header">
                  <div>
                    <h3>Vehicle List</h3>

                    <p class="card-subtitle">
                      View and manage all registered fleet vehicles.
                    </p>
                  </div>

                  <div class="card-actions">
                    <div class="export-dropdown">
                      <button
                        type="button"
                        class="btn-outline export-menu-toggle"
                        id="vehicleExportMenuToggle"
                        aria-haspopup="menu"
                        aria-expanded="false"
                        aria-controls="vehicleExportMenu"
                      >
                        <i class="ph ph-export" aria-hidden="true"></i>
                        Export
                        <i class="ph ph-caret-down export-menu-chevron" aria-hidden="true"></i>
                      </button>

                      <div
                        class="export-menu"
                        id="vehicleExportMenu"
                        role="menu"
                        hidden
                        aria-label="Export vehicle list"
                      >
                        <button
                          type="button"
                          class="export-menu-item"
                          role="menuitem"
                          id="printVehicles"
                        >
                          <i class="ph ph-printer" aria-hidden="true"></i>
                          Print
                        </button>

                        <button
                          type="button"
                          class="export-menu-item"
                          role="menuitem"
                          id="exportPDF"
                        >
                          <i class="ph ph-file-pdf" aria-hidden="true"></i>
                          Export PDF
                        </button>

                        <button
                          type="button"
                          class="export-menu-item"
                          role="menuitem"
                          id="exportVehicles"
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
                        @if($vehiclePermissions['canBulkArchive'] ?? false)
                            <input
                                type="checkbox"
                                id="selectAllVehicles"
                                aria-label="Select all visible vehicles"
                            />
                        @endif
                      </th>

                      <th class="sortable" data-column="1">
                        Vehicle
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="2">
                        Plate No.
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="3">
                        Type
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="4">
                        Driver
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th class="sortable" data-column="5">
                        Status
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th>Fuel</th>

                      <th class="sortable" data-column="7">
                        Last Service
                        <i class="ph ph-caret-up-down sort-icon"></i>
                      </th>

                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody id="vehicleTableBody">
                    
                  </tbody>
                </table>
              </div>
            </div>

            <div class="table-footer">
              <div id="vehiclePaginationInfo">
                Showing <strong>0–0</strong> of <strong>0</strong> vehicles
              </div>

              <div class="pagination" id="vehiclePagination">
                <button>
                  <i class="ph ph-caret-left"></i>
                </button>

                <button>
                  <i class="ph ph-caret-right"></i>
                </button>
              </div>
            </div>
          </div>
        </section>
        
    @if($vehiclePermissions['canCreate'] ?? false)
        @include('components.vehicle.add-vehicle-modal')
    @endif

    @include('components.vehicle.view-vehicle-modal')

    @if($vehiclePermissions['canUpdate'] ?? false)
        @include('components.vehicle.edit-vehicle-modal')
    @endif

    @if(
        ($vehiclePermissions['canArchive'] ?? false) ||
        ($vehiclePermissions['canRestore'] ?? false)
    )
        @include('components.vehicle.delete-vehicle-modal')
    @endif

    <script>
        window.FLEET_RBAC = window.FLEET_RBAC || {};
        window.FLEET_RBAC.role =
            @json(auth()->user()?->role);
        window.FLEET_RBAC.vehicles =
            @json($vehiclePermissions ?? []);
    </script>

    <script src="{{ asset('assets/js/helpers/rbac.js') }}"></script>

    <!-- Components -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>

    @if(session('success'))
      <script>
          document.addEventListener("DOMContentLoaded", () => {
              window.showToast("{{ session('success') }}", "success");
          });
      </script>
    @endif
    @if(session('error'))
      <script>
          document.addEventListener("DOMContentLoaded", () => {
              window.showToast("{{ session('error') }}", "error");
          });
      </script>
    @endif
    <!-- Main JS -->
     @push('scripts')

    <script src="{{ asset('assets/js/components/dropdown.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-modal.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-form.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-image.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-add.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-bulk.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-filters.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-table.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-stats.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-pagination.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-sort.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-export.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-print.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-view.js') }}"></script>
    <script src="{{ asset('/assets/js/vehicle/vehicle-edit.js') }}"></script>
    <script src="{{ asset('assets/js/vehicle/vehicle-delete.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>

    @endpush

@endsection
