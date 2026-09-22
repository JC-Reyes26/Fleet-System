<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('authentication_codes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('type', 40);

            $table->string('code_hash');

            $table->timestamp('expires_at');

            $table->timestamp('used_at')
                ->nullable();

            $table->timestamps();

            $table->index([
                'user_id',
                'type',
            ]);

            $table->index([
                'expires_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('authentication_codes');
    }
};