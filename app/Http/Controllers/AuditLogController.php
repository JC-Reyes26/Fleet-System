<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class AuditLogController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize(
            'viewAny',
            AuditLog::class
        );

        $query =
            AuditLog::query()
                ->latest('created_at');

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */
        if ($request->filled('search')) {
            $search =
                trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where(
                    'user_name',
                    'like',
                    "%{$search}%"
                )
                    ->orWhere(
                        'user_email',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'module',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'action',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'description',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'ip_address',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Module Filter
        |--------------------------------------------------------------------------
        */
        if (
            $request->filled('module') &&
            $request->module !== 'all'
        ) {
            $query->where(
                'module',
                $request->module
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Action Filter
        |--------------------------------------------------------------------------
        */
        if (
            $request->filled('action') &&
            $request->action !== 'all'
        ) {
            $query->where(
                'action',
                $request->action
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Date Filter
        |--------------------------------------------------------------------------
        */
        if ($request->filled('date')) {
            $query->whereDate(
                'created_at',
                $request->date
            );
        }

        $auditLogs =
            $query->paginate(25);

        if ($request->expectsJson()) {
            return response()->json(
                $auditLogs
            );
        }

        return view(
            'audit-logs.index',
            compact('auditLogs')
        );
    }

    public function show(
        AuditLog $auditLog
    ) {
        $this->authorize(
            'view',
            $auditLog
        );

        return response()->json([
            'audit_log' => $auditLog,
        ]);
    }
}