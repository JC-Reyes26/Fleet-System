<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenances', function (Blueprint $table) {
            $table->string('request_type')
                ->default('Normal')
                ->after('vehicle_id');
        });
    }

    public function down(): void
    {
        Schema::table('maintenances', function (Blueprint $table) {
            $table->dropColumn('request_type');
        });
    }
};