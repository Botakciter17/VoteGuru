<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    /**
     * POST /api/admin/login (A-01)
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Email atau username admin wajib diisi.',
            'password.required' => 'Kata sandi wajib diisi.',
        ]);

        // Pastikan akun admin default selalu tersedia jika database belum di-seed
        if (User::count() === 0) {
            User::create([
                'name' => 'Panitia Pemilihan Guru',
                'email' => 'admin@sekolah.sch.id',
                'password' => Hash::make('admin123'),
            ]);
        }

        $loginInput = strtolower(trim($validated['email']));
        $passwordInput = trim($validated['password']);

        $user = User::whereRaw('LOWER(email) = ?', [$loginInput])
            ->orWhereRaw('LOWER(name) = ?', [$loginInput])
            ->first();

        // Izinkan shorthand "admin" untuk kemudahan login panitia
        if (!$user && in_array($loginInput, ['admin', 'admin@admin.com', 'admin@sekolah.id'], true)) {
            $user = User::where('email', 'admin@sekolah.sch.id')->first() ?? User::first();
        }

        if (!$user || (!Hash::check($passwordInput, $user->password) && !Hash::check($validated['password'], $user->password))) {
            return response()->json([
                'message' => 'Email atau kata sandi tidak sesuai. Gunakan admin@sekolah.sch.id / admin123.',
            ], 401);
        }

        $token = $user->createToken('admin-dashboard-token')->plainTextToken;

        return response()->json([
            'message' => 'Login admin berhasil.',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ],
        ]);
    }

    /**
     * GET /api/admin/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * POST /api/admin/logout (A-01)
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Berhasil keluar dari sesi admin.',
        ]);
    }
}
