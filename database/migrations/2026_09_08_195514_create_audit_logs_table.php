<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Actor Snapshot
            |--------------------------------------------------------------------------
            |
            | Nullable ang user_id para usable din later sa failed login,
            | deleted accounts, at system-generated events.
            |
            */
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('user_role')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Audit Event
            |--------------------------------------------------------------------------
            */
            $table->string('module');
            $table->string('action');
            $table->text('description');

            /*
            |--------------------------------------------------------------------------
            | Related Record
            |--------------------------------------------------------------------------
            */
            $table->string('auditable_type')->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Changes
            |--------------------------------------------------------------------------
            */
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Request / Security Context
            |--------------------------------------------------------------------------
            */
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('request_method', 10)->nullable();
            $table->text('request_path')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Append-only Timestamp
            |--------------------------------------------------------------------------
            */
            $table->timestamp('created_at')
                ->useCurrent();

            $table->index('user_id');
            $table->index('module');
            $table->index('action');
            $table->index('created_at');

            $table->index([
                'auditable_type',
                'auditable_id',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};