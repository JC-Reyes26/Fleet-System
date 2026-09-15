<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Reservation;
use App\Models\Maintenance;
use App\Models\VehicleLocation;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Vehicle extends Model
{
    protected $fillable = [
        'plate_number',
        'vehicle_type',
        'department',
        'brand',
        'model',
        'purchase_date',
        'insurance_expiry',
        'capacity',
        'fuel_type',
        'tank_capacity',
        'current_fuel',
        'current_odometer',
        'status',
        'notes',
        //'last_service',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'insurance_expiry' => 'date',
        'tank_capacity' => 'decimal:2',
        'current_fuel' => 'decimal:2',
        'current_odometer' => 'decimal:2',
    ];

    public function getDisplayLabelAttribute(): string
    {
        $brandModel = trim(
            ($this->brand ?? '') .
            ' ' .
            ($this->model ?? '')
        );
        $vehicleType = trim(
            (string) ($this->vehicle_type ?? '')
        );
        if (
            $brandModel !== '' &&
            $vehicleType !== ''
        ) {
            return $brandModel .
                ' - ' .
                $vehicleType;
        }
        if ($brandModel !== '') {
            return $brandModel;
        }
        if ($vehicleType !== '') {
            return $vehicleType;
        }
        return $this->plate_number
            ?: 'Vehicle';
    }
    
     public function drivers()
    {
        return $this->hasMany(Driver::class, 'assigned_vehicle_id');
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(Maintenance::class);
    }

    public function fuelLogs(): HasMany
    {
        return $this->hasMany(FuelLog::class);
    }

    public function lastCompletedMaintenance(): HasOne
    {
        return $this->hasOne(Maintenance::class)
            ->ofMany(
                [
                    'completion_date' => 'max',
                    'id' => 'max',
                ],
                function ($query) {
                    $query->where('status', 'Completed');
                }
            );
    }

    public function locations(): HasMany
    {
        return $this->hasMany(VehicleLocation::class);
    }

    public function latestLocation(): HasOne
    {
        return $this->hasOne(VehicleLocation::class)
            ->ofMany('recorded_at', 'max');
    }
}
