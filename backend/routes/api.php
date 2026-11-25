<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AdminTeacherController;
use App\Http\Controllers\Api\PublicVotingController;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

RateLimiter::for('vote-submission', function (Request $request) {
    $perMinute = (int) config('voting.vote_rate_limit_per_minute', 20);
    return Limit::perMinute($perMinute)->by($request->ip() ?: '127.0.0.1')->response(function () {
        return response()->json([
            'message' => 'Terlalu banyak permintaan pengiriman suara dalam waktu singkat. Silakan tunggu beberapa saat lalu coba lagi.',
            'error_code' => 'RATE_LIMITED',
        ], 429);
    });
});

// Endpoint Publik (Bab 11.1)
Route::get('/categories', [PublicVotingController::class, 'categories']);
Route::get('/my-votes', [PublicVotingController::class, 'myVotes']);
Route::post('/votes', [PublicVotingController::class, 'storeVote'])->middleware('throttle:vote-submission');
Route::delete('/votes/{categoryId}', [PublicVotingController::class, 'cancelVote'])->middleware('throttle:vote-submission');

// Endpoint Admin Auth (Bab 11.2)
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:15,1');

// Endpoint Admin Terproteksi Laravel Sanctum
Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::post('/logout', [AdminAuthController::class, 'logout']);

    // CRUD Guru (A-02, A-03, A-04)
    Route::get('/teachers', [AdminTeacherController::class, 'index']);
    Route::post('/teachers', [AdminTeacherController::class, 'store']);
    Route::put('/teachers/{id}', [AdminTeacherController::class, 'update']);
    Route::post('/teachers/{id}', [AdminTeacherController::class, 'update']); // Support multipart/form-data update
    Route::delete('/teachers/{id}', [AdminTeacherController::class, 'destroy']);
    Route::post('/teachers/{id}/restore', [AdminTeacherController::class, 'restore']);

    // CRUD Kategori & Nominasi (A-05, A-06, A-11)
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::patch('/categories/{id}/toggle-status', [AdminCategoryController::class, 'toggleStatus']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

    // Statistik, Ekspor CSV, dan Reset/Arsip Periode (A-07, A-08, A-09, A-12)
    Route::get('/stats', [AdminStatsController::class, 'index']);
    Route::get('/stats/export', [AdminStatsController::class, 'export']);
    Route::post('/votes/reset', [AdminStatsController::class, 'resetOrArchive']);
});
