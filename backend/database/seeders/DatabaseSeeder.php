<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Hanya membuat akun Admin default (tanpa data dummy guru, kategori, maupun vote)
        User::updateOrCreate(
            ['email' => 'admin@sekolah.sch.id'],
            [
                'name' => 'Panitia Pemilihan Guru',
                'password' => Hash::make('admin123'),
            ]
        );
    }
}
