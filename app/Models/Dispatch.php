<?php

namespace App\Models;

use App\Models\Reservation;
use App\Models\User;
use App\Models\DispatchReassignment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dispatch extends Model
{
    protected $table = 'dispatch';

    protected $fillable = [
        'dispatch_number',
        'reservation_id',
        'dispatch_date',
        'departure_time',
        'arrival_time',
        'trip_status',
        'remarks',
        'archived_at',
        'archived_by',
        'accepted_at',
        'accepted_by',
    ];

    protected $casts = [
        'archived_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'archived_by'
        );
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    public function reassignments(): HasMany
    {
        return $this->hasMany(DispatchReassignment::class);
    }

}