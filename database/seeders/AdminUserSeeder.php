<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'System Administrator',
            'email' => 'himsfleet@gmail.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'status' => true,
        ]);
    }
}
