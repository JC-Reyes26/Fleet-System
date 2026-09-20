<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\Dispatch;
use App\Models\RoutePlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'reservation_number',
        'requested_by',
        'department',
        'patient_name',
        'request_type',
        'vehicle_id',
        'driver_id',
        'pickup_location',
        'destination',
        'schedule_date',
        'schedule_time',
        'priority',
        'status',
        'contact_number',
        'notes',
        'archived_at',
        'archived_by',
    ];

    protected $casts = [
        'schedule_date' => 'date:Y-m-d',
        'archived_at' => 'datetime',
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function dispatch()
    {
        return $this->hasOne(Dispatch::class);
    }

    public function routePlan(): HasOne
    {
        return $this->hasOne(RoutePlan::class);
    }

    public function requester()
    {
        return $this->belongsTo(
            User::class,
            'requested_by'
        );
    }

    public function archivedBy()
    {
        return $this->belongsTo(
            User::class,
            'archived_by'
        );
    }
}
