<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\TripLog;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TripLog extends Model
{
    protected $fillable = [
        'dispatch_id',
        'start_odometer',
        'end_odometer',
        'distance',
        'fuel_used',
        'logbook_photo',
        'arrival_proof_photo',
        'delivery_proof_photo',
        'submitted_at',
        'submitted_by',
        'notes',
    ];

    protected $casts = [
        'start_odometer' => 'decimal:2',
        'end_odometer' => 'decimal:2',
        'distance' => 'decimal:2',
        'fuel_used' => 'decimal:2',
        'submitted_at' => 'datetime',
    ];

    public function dispatch(): BelongsTo
    {
        return $this->belongsTo(
            Dispatch::class,
            'dispatch_id'
        );
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'submitted_by'
        );
    }
}