<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HospitalFacility extends Model
{
    protected $fillable = [
        'name',
        'address',
        'city',
        'province',
        'latitude',
        'longitude',
        'type',
        'status',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'status' => 'boolean',
    ];
}