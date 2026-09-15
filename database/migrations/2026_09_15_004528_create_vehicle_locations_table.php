<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_locations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('vehicle_id')
                ->constrained('vehicles')
                ->cascadeOnDelete();

            $table->foreignId('driver_id')
                ->nullable()
                ->constrained('drivers')
                ->nullOnDelete();

            $table->foreignId('dispatch_id')
                ->nullable()
                ->constrained('dispatch')
                ->nullOnDelete();

            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);

            $table->decimal('speed', 8, 2)
                ->nullable();

            $table->decimal('heading', 6, 2)
                ->nullable();

            $table->decimal('accuracy', 8, 2)
                ->nullable();

            $table->timestamp('recorded_at');

            $table->timestamps();

            $table->index([
                'vehicle_id',
                'recorded_at',
            ]);

            $table->index([
                'driver_id',
                'recorded_at',
            ]);

            $table->index([
                'dispatch_id',
                'recorded_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_locations');
    }
};