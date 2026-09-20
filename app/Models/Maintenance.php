<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Maintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'maintenance_number',
        'vehicle_id',
        'maintenance_type',
        'description',
        'maintenance_date',
        'completion_date',
        'next_schedule',
        'technician',
        'priority',
        'odometer',
        'parts_used',
        'cost',
        'status',
        'notes',
        'archived_at',
        'archived_by',
    ];

    protected $casts = [
        'maintenance_date' => 'date:Y-m-d',
        'completion_date' => 'date:Y-m-d',
        'next_schedule' => 'date:Y-m-d',
        'cost' => 'decimal:2',
        'odometer' => 'integer',
        'archived_at' => 'datetime',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
    
    public function archivedBy()
    {
        return $this->belongsTo(
            User::class,
            'archived_by'
        );
    }
}