<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $table = 'shipments';

    protected $casts = [
        'dispatch_date' => 'date:Y-m-d',
        'estimated_delivery_date' => 'date:Y-m-d',
        'actual_delivery_date' => 'date:Y-m-d',
        'is_cold_chain' => 'boolean',
        'temp_min' => 'decimal:2',
        'temp_max' => 'decimal:2',
    ];
}