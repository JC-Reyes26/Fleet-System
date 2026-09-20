<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->timestamp('archived_at')
                ->nullable()
                ->index();

            $table->foreignId('archived_by')
                ->nullable()
                ->after('archived_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign(['archived_by']);
            $table->dropColumn([
                'archived_at',
                'archived_by',
            ]);
        });
    }
};