<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('trip_logs', function (Blueprint $table) {
            /*
            |--------------------------------------------------------------------------
            | Proof Photos
            |--------------------------------------------------------------------------
            */
            $table->string('logbook_photo')->nullable()->after('fuel_used');

            $table->string('arrival_proof_photo')
                ->nullable()
                ->after('logbook_photo');

            $table->string('delivery_proof_photo')
                ->nullable()
                ->after('arrival_proof_photo');

            /*
            |--------------------------------------------------------------------------
            | Submission Information
            |--------------------------------------------------------------------------
            */
            $table->timestamp('submitted_at')
                ->nullable()
                ->after('delivery_proof_photo');

            $table->foreignId('submitted_by')
                ->nullable()
                ->after('submitted_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trip_logs', function (Blueprint $table) {
            $table->dropForeign([
                'submitted_by',
            ]);

            $table->dropColumn([
                'logbook_photo',
                'arrival_proof_photo',
                'delivery_proof_photo',
                'submitted_at',
                'submitted_by',
            ]);
        });
    }
};