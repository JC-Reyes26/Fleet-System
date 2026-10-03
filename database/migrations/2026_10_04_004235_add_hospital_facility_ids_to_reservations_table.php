<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->foreignId('pickup_hospital_id')
                ->nullable()
                ->after('pickup_location')
                ->constrained('hospital_facilities')
                ->nullOnDelete();

            $table->foreignId('destination_hospital_id')
                ->nullable()
                ->after('destination')
                ->constrained('hospital_facilities')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropForeign(['pickup_hospital_id']);
            $table->dropForeign(['destination_hospital_id']);

            $table->dropColumn([
                'pickup_hospital_id',
                'destination_hospital_id',
            ]);
        });
    }
};