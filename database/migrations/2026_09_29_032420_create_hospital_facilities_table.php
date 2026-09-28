<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospital_facilities', function (Blueprint $table) {
            $table->id();

            $table->string('name', 255);
            $table->string('address', 500);

            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();

            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            $table->string('type', 50)
                ->default('Hospital');

            $table->boolean('status')
                ->default(true);

            $table->timestamps();

            $table->index(['status', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_facilities');
    }
};