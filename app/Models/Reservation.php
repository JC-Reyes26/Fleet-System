<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\Dispatch;
use App\Models\RoutePlan;
use App\Models\User;
use App\Models\Shipment;
use App\Models\HospitalFacility;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'shipment_id',
        'vehicle_id',
        'driver_id',
        'pickup_location',
        'pickup_hospital_id',
        'destination',
        'destination_hospital_id',
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

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function pickupHospital(): BelongsTo
    {
        return $this->belongsTo(
            HospitalFacility::class,
            'pickup_hospital_id'
        );
    }

    public function destinationHospital(): BelongsTo
    {
        return $this->belongsTo(
            HospitalFacility::class,
            'destination_hospital_id'
        );
    }
}
