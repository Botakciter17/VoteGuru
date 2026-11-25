<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Teacher;
use App\Models\Vote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PublicVotingController extends Controller
{
    /**
     * GET /api/categories
     */
    public function categories(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->with(['activeTeachers' => function ($query) {
                $query->select('teachers.id', 'teachers.name', 'teachers.photo', 'teachers.subject', 'teachers.bio', 'teachers.is_active');
            }])
            ->orderBy('is_active', 'desc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (Category $category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'description' => $category->description,
                    'icon' => $category->icon ?? 'award',
                    'is_active' => $category->is_active,
                    'starts_at' => $category->starts_at?->toIso8601String(),
                    'ends_at' => $category->ends_at?->toIso8601String(),
                    'voting_status' => $category->voting_status,
                    'voting_status_message' => $category->voting_status_message,
                    'teachers' => $category->activeTeachers->map(fn (Teacher $t) => [
                        'id' => $t->id,
                        'name' => $t->name,
                        'subject' => $t->subject,
                        'bio' => $t->bio,
                        'photo_url' => $t->photo_url,
                    ])->values(),
                ];
            });

        return response()->json([
            'data' => $categories,
            'meta' => [
                'server_time' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/my-votes
     */
    public function myVotes(Request $request): JsonResponse
    {
        $voterToken = $request->query('voter_token') ?? $request->header('X-Voter-Token');

        if (!$voterToken || strlen((string) $voterToken) < 8) {
            return response()->json([
                'data' => [],
            ]);
        }

        $votes = Vote::query()
            ->where('voter_token', (string) $voterToken)
            ->with(['teacher:id,name,subject,photo'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Vote $v) => [
                'category_id' => $v->category_id,
                'teacher_id' => $v->teacher_id,
                'teacher_name' => $v->teacher?->name,
                'teacher_subject' => $v->teacher?->subject,
                'teacher_photo_url' => $v->teacher?->photo_url,
                'voted_at' => $v->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $votes,
        ]);
    }

    /**
     * POST /api/votes
     * Menyimpan atau mengubah pilihan pemilih selama periode voting masih terbuka
     */
    public function storeVote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'integer'],
            'teacher_id' => ['required', 'integer'],
            'voter_token' => ['required', 'string', 'min:12', 'max:100'],
            'captcha_verified' => ['required', 'accepted'],
            'captcha_token' => ['required', 'string', 'min:6'],
        ], [
            'category_id.required' => 'Kategori wajib dipilih.',
            'teacher_id.required' => 'Guru pilihan wajib dipilih.',
            'voter_token.required' => 'Token pemilih tidak ditemukan.',
            'captcha_verified.accepted' => 'Silakan selesaikan verifikasi keamanan terlebih dahulu.',
            'captcha_token.required' => 'Token verifikasi keamanan tidak valid.',
        ]);

        $category = Category::find($validated['category_id']);
        if (!$category) {
            return response()->json([
                'message' => 'Kategori pemilihan tidak ditemukan.',
                'error_code' => 'CATEGORY_NOT_FOUND',
            ], 404);
        }

        if (!$category->isVotingOpen()) {
            return response()->json([
                'message' => $category->voting_status_message,
                'error_code' => 'VOTING_NOT_OPEN',
                'voting_status' => $category->voting_status,
            ], 422);
        }

        $isNominated = $category->activeTeachers()
            ->where('teachers.id', $validated['teacher_id'])
            ->exists();

        if (!$isNominated) {
            return response()->json([
                'message' => 'Guru yang dipilih tidak terdaftar sebagai nominasi aktif pada kategori ini.',
                'error_code' => 'TEACHER_NOT_NOMINATED',
            ], 422);
        }

        $existingVote = Vote::query()
            ->where('category_id', $category->id)
            ->where('voter_token', $validated['voter_token'])
            ->first();

        $ipAddress = $request->ip() ?? '127.0.0.1';

        // Cek batas IP hanya jika ini adalah vote baru (bukan mengubah vote milik token yang sama)
        if (!$existingVote) {
            $maxIpVotes = (int) config('voting.max_votes_per_ip_per_category', 45);
            $ipVoteCount = Vote::query()
                ->where('category_id', $category->id)
                ->where('ip_address', $ipAddress)
                ->count();

            if ($ipVoteCount >= $maxIpVotes) {
                return response()->json([
                    'message' => 'Batas jumlah suara dari jaringan/IP ini untuk kategori "' . $category->name . '" telah tercapai (' . $maxIpVotes . ' suara).',
                    'error_code' => 'IP_LIMIT_EXCEEDED',
                ], 429);
            }
        }

        $isUpdated = (bool) $existingVote;

        $vote = Vote::updateOrCreate(
            [
                'category_id' => $category->id,
                'voter_token' => $validated['voter_token'],
            ],
            [
                'teacher_id' => $validated['teacher_id'],
                'ip_address' => $ipAddress,
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]
        );

        $teacher = Teacher::find($validated['teacher_id']);

        return response()->json([
            'message' => $isUpdated
                ? 'Pilihanmu di kategori "' . $category->name . '" berhasil diubah menjadi ' . ($teacher?->name ?? 'Guru Pilihan') . '.'
                : 'Terima kasih! Suaramu untuk ' . ($teacher?->name ?? 'Guru Pilihan') . ' di kategori "' . $category->name . '" berhasil disimpan.',
            'data' => [
                'category_id' => $vote->category_id,
                'teacher_id' => $vote->teacher_id,
                'teacher_name' => $teacher?->name,
                'teacher_subject' => $teacher?->subject,
                'teacher_photo_url' => $teacher?->photo_url,
                'voted_at' => $vote->updated_at->toIso8601String(),
            ],
        ], $isUpdated ? 200 : 201);
    }

    /**
     * DELETE /api/votes/{categoryId}
     * Membatalkan pilihan vote pada kategori tertentu selama voting masih dibuka
     */
    public function cancelVote(Request $request, int $categoryId): JsonResponse
    {
        $voterToken = $request->input('voter_token')
            ?? $request->query('voter_token')
            ?? $request->header('X-Voter-Token');

        if (!$voterToken || strlen((string) $voterToken) < 8) {
            return response()->json([
                'message' => 'Token pemilih tidak valid.',
            ], 422);
        }

        $category = Category::find($categoryId);
        if (!$category) {
            return response()->json([
                'message' => 'Kategori tidak ditemukan.',
            ], 404);
        }

        if (!$category->isVotingOpen()) {
            return response()->json([
                'message' => 'Periode voting untuk kategori ini sudah ditutup, suara tidak dapat dibatalkan.',
            ], 422);
        }

        $deleted = Vote::query()
            ->where('category_id', $category->id)
            ->where('voter_token', (string) $voterToken)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'message' => 'Belum ada suara yang tersimpan pada kategori ini.',
            ], 404);
        }

        return response()->json([
            'message' => 'Pilihanmu pada kategori "' . $category->name . '" berhasil dibatalkan.',
            'data' => [
                'category_id' => $category->id,
            ],
        ]);
    }
}
