<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    protected $fillable = [
        //'driver_number',
        'user_id',
        'first_name',
        'last_name',
        'license_number',
        'license_class',
        'license_expiry',
        'contact_number',
        'email',
        'experience',
        'address',
        'emergency_contact',
        'notes',
        'photo',
        'assigned_vehicle_id',
        'status',
    ];

    protected $casts = [
        'license_expiry' => 'date:Y-m-d',
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'assigned_vehicle_id');
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function fuelLogs(): HasMany
    {
        return $this->hasMany(FuelLog::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(VehicleLocation::class);
    }
}
