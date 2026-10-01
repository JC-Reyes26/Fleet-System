<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dispatch', function (Blueprint $table) {
            $table->timestamp('accepted_at')
                ->nullable()
                ->after('trip_status');

            $table->foreignId('accepted_by')
                ->nullable()
                ->after('accepted_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('dispatch', function (Blueprint $table) {
            $table->dropForeign(['accepted_by']);
            $table->dropColumn([
                'accepted_at',
                'accepted_by',
            ]);
        });
    }
};
