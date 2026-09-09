@extends('layouts.app')

@section('title', 'Audit Logs | HIMS Fleet')

@section('content')

<section class="page-wrapper">
    <div class="vehicle-page audit-logs-page">

        <div class="page-header">
            <div>
                <h1>Audit Logs</h1>
                <p>
                    Review security-relevant and administrative activity
                    across the Fleet & Transportation Management System.
                </p>
            </div>
        </div>

        <div class="toolbar">
            <div class="toolbar-left">

                <div class="search-box">
                    <i class="ph ph-magnifying-glass"></i>

                    <form
                        method="GET"
                        action="{{ route('audit-logs.index') }}"
                        id="auditFilterForm"
                    >
                        <input
                            type="text"
                            name="search"
                            id="auditSearch"
                            value="{{ request('search') }}"
                            placeholder="Search audit logs"
                            aria-label="Search audit logs"
                        />
                    </form>
                </div>

                <select
                    class="filter-select"
                    id="auditModuleFilter"
                    name="module"
                    form="auditFilterForm"
                    aria-label="Filter by module"
                >
                    <option value="all">
                        All Modules
                    </option>

                    @foreach([
                        'Authentication',
                        'Account Management',
                        'Profile',
                        'Vehicle Management',
                        'Driver Management',
                        'Reservation Management',
                        'Route Planning',
                        'Dispatch Management',
                        'Maintenance Management',
                        'Fuel Management',
                        'Cost & Budget',
                        'Settings',
                        'Reports',
                    ] as $module)
                        <option
                            value="{{ $module }}"
                            @selected(
                                request('module') === $module
                            )
                        >
                            {{ $module }}
                        </option>
                    @endforeach
                </select>

                <select
                    class="filter-select"
                    id="auditActionFilter"
                    name="action"
                    form="auditFilterForm"
                    aria-label="Filter by action"
                >
                    <option value="all">
                        All Actions
                    </option>

                    @foreach([
                        'Created',
                        'Updated',
                        'Deleted',
                        'Approved',
                        'Rejected',
                        'Cancelled',
                        'Scheduled',
                        'Completed',
                        'Assigned',
                        'En Route',
                        'Arrived',
                        'Started',
                        'Archived',
                        'Restored',
                        'Duplicated',
                        'Returned To Draft',
                        'Ready For Dispatch',
                        'Driver Assigned',
                        'Driver Unassigned',
                        'Driver Reassigned',
                        'Vehicle Assigned',
                        'Vehicle Unassigned',
                        'Vehicle Reassigned',
                        'Status Changed',
                        'Password Reset',
                        'Password Changed',
                        'Account Created',
                        'Login',
                        'Logout',
                        'Failed Login',
                        'Exported',
                        'Printed',
                        'Cleared',
                        'History Cleared',
                    ] as $action)
                        <option
                            value="{{ $action }}"
                            @selected(
                                request('action') === $action
                            )
                        >
                            {{ $action }}
                        </option>
                    @endforeach
                </select>

                <input
                    type="date"
                    class="filter-select"
                    id="auditDateFilter"
                    name="date"
                    form="auditFilterForm"
                    value="{{ request('date') }}"
                    aria-label="Filter by date"
                />

            </div>

            <div class="toolbar-right">
                <a
                    href="{{ route('audit-logs.index') }}"
                    class="btn-outline"
                >
                    <i class="ph ph-x"></i>
                    Clear Filters
                </a>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div>
                    <h3>System Activity</h3>

                    <p class="card-subtitle">
                        Audit records are read-only and cannot be edited or deleted.
                    </p>
                </div>
            </div>

            <div class="table-responsive">
                <table class="fleet-table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Module</th>
                            <th>Action</th>
                            <th>Description</th>
                            <th>IP Address</th>
                            <th>Details</th>
                        </tr>
                    </thead>

                    <tbody>
                        @forelse($auditLogs as $auditLog)
                            <tr>
                                <td>
                                    {{ optional($auditLog->created_at)
                                        ->format('M d, Y h:i A') }}
                                </td>

                                <td>
                                    <strong>
                                        {{ $auditLog->user_name
                                            ?: 'Guest / System' }}
                                    </strong>

                                    @if($auditLog->user_email)
                                        <div class="table-subtext">
                                            {{ $auditLog->user_email }}
                                        </div>
                                    @endif
                                </td>

                                <td>
                                    {{ $auditLog->user_role
                                        ? ucwords(
                                            str_replace(
                                                '_',
                                                ' ',
                                                $auditLog->user_role
                                            )
                                        )
                                        : '—'
                                    }}
                                </td>

                                <td>
                                    {{ $auditLog->module }}
                                </td>

                                <td>
                                    <span class="status-badge">
                                        {{ $auditLog->action }}
                                    </span>
                                </td>

                                <td>
                                    {{ $auditLog->description }}
                                </td>

                                <td>
                                    {{ $auditLog->ip_address ?: '—' }}
                                </td>

                                <td>
                                    <button
                                        type="button"
                                        class="btn-outline audit-view-btn"
                                        data-audit-id="{{ $auditLog->id }}"
                                    >
                                        View
                                    </button>

                                    <script
                                        type="application/json"
                                        id="audit-data-{{ $auditLog->id }}"
                                    >{!! json_encode([
                                        'id' => $auditLog->id,
                                        'user_name' => $auditLog->user_name,
                                        'user_email' => $auditLog->user_email,
                                        'user_role' => $auditLog->user_role,
                                        'module' => $auditLog->module,
                                        'action' => $auditLog->action,
                                        'description' => $auditLog->description,
                                        'ip_address' => $auditLog->ip_address,
                                        'request_method' => $auditLog->request_method,
                                        'request_path' => $auditLog->request_path,
                                        'user_agent' => $auditLog->user_agent,
                                        'old_values' => $auditLog->old_values,
                                        'new_values' => $auditLog->new_values,
                                        'created_at' => optional($auditLog->created_at)
                                            ->toIso8601String(),
                                    ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!}</script>
                                </td>
                            </tr>
                        @empty
                            <tr
                                class="audit-no-results"
                                data-helper-row="true"
                            >
                                <td
                                    colspan="8"
                                    class="text-center"
                                >
                                    No audit logs found.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="table-footer">

            <div id="auditPaginationInfo">
                Showing
                <strong>
                    {{ $auditLogs->firstItem() ?? 0 }}–{{ $auditLogs->lastItem() ?? 0 }}
                </strong>
                of
                <strong>{{ $auditLogs->total() }}</strong>
                audit records
            </div>

            <div
                class="pagination audit-pagination"
                id="auditPagination"
                aria-label="Audit log pagination"
            >

                {{-- Previous --}}
                @if($auditLogs->onFirstPage())
                    <button
                        type="button"
                        class="audit-page-btn"
                        aria-label="Previous page"
                        disabled
                    >
                        <i class="ph ph-caret-left"></i>
                    </button>
                @else
                    <a
                        href="{{ $auditLogs->previousPageUrl() }}"
                        class="audit-page-btn"
                        aria-label="Previous page"
                    >
                        <i class="ph ph-caret-left"></i>
                    </a>
                @endif


                {{-- Page Numbers --}}
                @for(
                    $page = 1;
                    $page <= max(1, $auditLogs->lastPage());
                    $page++
                )

                    @if($auditLogs->currentPage() === $page)

                        <button
                            type="button"
                            class="audit-page-btn active"
                            aria-label="Page {{ $page }}"
                            aria-current="page"
                        >
                            {{ $page }}
                        </button>

                    @else

                        <a
                            href="{{ $auditLogs->url($page) }}"
                            class="audit-page-btn"
                            aria-label="Page {{ $page }}"
                        >
                            {{ $page }}
                        </a>

                    @endif

                @endfor


                {{-- Next --}}
                @if($auditLogs->hasMorePages())
                    <a
                        href="{{ $auditLogs->nextPageUrl() }}"
                        class="audit-page-btn"
                        aria-label="Next page"
                    >
                        <i class="ph ph-caret-right"></i>
                    </a>
                @else
                    <button
                        type="button"
                        class="audit-page-btn"
                        aria-label="Next page"
                        disabled
                    >
                        <i class="ph ph-caret-right"></i>
                    </button>
                @endif

            </div>

        </div>

    </div>
</section>

<!-- Audit Details Modal -->
<div
    id="auditDetailsModal"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="auditDetailsModalTitle"
    hidden
>
    <div class="custom-modal">

        <div class="modal-header">
            <div>
                <h2 id="auditDetailsModalTitle">
                    Audit Log Details
                </h2>

                <p>
                    Complete information for the selected audit event.
                </p>
            </div>

            <button
                type="button"
                class="modal-close"
                id="closeAuditDetailsModal"
                aria-label="Close audit details"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>

        <div class="modal-body">

            <div class="audit-details-grid">

                <div class="audit-detail-item">
                    <label>User</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailUser"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>Email</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailEmail"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>Role</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailRole"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>Module</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailModule"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>Action</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailAction"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>Timestamp</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailTimestamp"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>IP Address</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailIp"
                    >
                        —
                    </p>
                </div>

                <div class="audit-detail-item">
                    <label>Request Method</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailMethod"
                    >
                        —
                    </p>
                </div>

                <div
                    class="audit-detail-item full-width"
                >
                    <label>Request Path</label>
                    <p
                        class="audit-detail-value"
                        id="auditDetailPath"
                    >
                        —
                    </p>
                </div>

            </div>


            <div class="audit-long-section">
                <label>Description</label>

                <p id="auditDetailDescription">
                    —
                </p>
            </div>


            <div class="audit-json-section">
                <label>Old Values</label>

                <pre
                    id="auditDetailOldValues"
                    class="audit-json-box"
                >—</pre>
            </div>


            <div class="audit-json-section">
                <label>New Values</label>

                <pre
                    id="auditDetailNewValues"
                    class="audit-json-box"
                >—</pre>
            </div>


            <div class="audit-long-section">
                <label>User Agent</label>

                <p id="auditDetailUserAgent">
                    —
                </p>
            </div>

        </div>

        <div class="modal-footer">
            <button
                type="button"
                class="btn-outline"
                id="closeAuditDetailsModalFooter"
            >
                Close
            </button>
        </div>

    </div>
</div>

@push('scripts')
    <script
        src="{{ asset('assets/js/audit-logs/audit-logs.js') }}"
    ></script>
@endpush

@endsection