<?php

namespace App\Models;

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    ];

    protected $casts = [
        'archived_at' => 'datetime',
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

}