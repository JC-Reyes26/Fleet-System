<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dispatch_reassignments', function (Blueprint $table) {
            // Original assignment at the time reassignment was requested
            $table->foreignId('original_vehicle_id')
                ->nullable()
                ->after('reason')
                ->constrained('vehicles')
                ->nullOnDelete();

            $table->foreignId('original_driver_id')
                ->nullable()
                ->after('original_vehicle_id')
                ->constrained('drivers')
                ->nullOnDelete();

            // AI recommendation generated during reassignment review
            $table->foreignId('recommended_vehicle_id')
                ->nullable()
                ->after('original_driver_id')
                ->constrained('vehicles')
                ->nullOnDelete();

            $table->foreignId('recommended_driver_id')
                ->nullable()
                ->after('recommended_vehicle_id')
                ->constrained('drivers')
                ->nullOnDelete();

            // Final reassignment selected by the dispatcher
            $table->foreignId('new_vehicle_id')
                ->nullable()
                ->after('recommended_driver_id')
                ->constrained('vehicles')
                ->nullOnDelete();

            $table->foreignId('new_driver_id')
                ->nullable()
                ->after('new_vehicle_id')
                ->constrained('drivers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_reassignments', function (Blueprint $table) {
            $table->dropForeign(['original_vehicle_id']);
            $table->dropForeign(['original_driver_id']);
            $table->dropForeign(['recommended_vehicle_id']);
            $table->dropForeign(['recommended_driver_id']);
            $table->dropForeign(['new_vehicle_id']);
            $table->dropForeign(['new_driver_id']);

            $table->dropColumn([
                'original_vehicle_id',
                'original_driver_id',
                'recommended_vehicle_id',
                'recommended_driver_id',
                'new_vehicle_id',
                'new_driver_id',
            ]);
        });
    }
};