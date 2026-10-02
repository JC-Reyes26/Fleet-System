<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchReassignment extends Model
{
    protected $fillable = [
        'dispatch_id',
        'requested_by',
        'reason',
        'status',

        'original_vehicle_id',
        'original_driver_id',

        'recommended_vehicle_id',
        'recommended_driver_id',

        'new_vehicle_id',
        'new_driver_id',

        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function dispatch(): BelongsTo
    {
        return $this->belongsTo(Dispatch::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function originalVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'original_vehicle_id');
    }

    public function originalDriver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'original_driver_id');
    }

    public function recommendedVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'recommended_vehicle_id');
    }

    public function recommendedDriver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'recommended_driver_id');
    }

    public function newVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'new_vehicle_id');
    }

    public function newDriver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'new_driver_id');
    }
}