<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Teacher;
use App\Models\Vote;
use App\Models\VoteArchive;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminStatsController extends Controller
{
    /**
     * GET /api/admin/stats (A-07, A-08, A-10)
     * Menyediakan statistik real-time teragregasi:
     * - Ringkasan total vote, pemilih unik, kategori aktif, guru aktif
     * - Perolehan suara & persentase per guru di setiap kategori (beserta pemenang/top 3 untuk poster)
     * - Tren vote per hari untuk grafik batang / garis
     * - Log audit vote terbaru & daftar arsip periode
     */
    public function index(): JsonResponse
    {
        $totalVotes = Vote::count();
        $uniqueVoters = Vote::distinct('voter_token')->count('voter_token');
        $uniqueIps = Vote::distinct('ip_address')->count('ip_address');
        $totalCategories = Category::count();
        $activeCategories = Category::where('is_active', true)->count();
        $totalTeachers = Teacher::count();

        // Hitung vote per (category_id, teacher_id) dalam 1 query teragregasi
        $voteCounts = Vote::query()
            ->select('category_id', 'teacher_id', DB::raw('COUNT(*) as total'))
            ->groupBy('category_id', 'teacher_id')
            ->get()
            ->groupBy('category_id');

        $categories = Category::with(['teachers' => fn ($q) => $q->withTrashed()])
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (Category $category) use ($voteCounts) {
                $catVoteRows = $voteCounts->get($category->id, collect())->keyBy('teacher_id');
                $catTotalVotes = $catVoteRows->sum('total');

                // Gabungkan semua guru nominasi + guru yang pernah mendapat suara di kategori ini
                $nominatedTeachers = $category->teachers->keyBy('id');
                foreach ($catVoteRows as $tId => $row) {
                    if (!$nominatedTeachers->has($tId)) {
                        $extraTeacher = Teacher::withTrashed()->find($tId);
                        if ($extraTeacher) {
                            $nominatedTeachers->put($tId, $extraTeacher);
                        }
                    }
                }

                $standings = $nominatedTeachers->map(function (Teacher $teacher) use ($catVoteRows, $catTotalVotes) {
                    $votes = (int) ($catVoteRows->get($teacher->id)?->total ?? 0);
                    $percentage = $catTotalVotes > 0 ? round(($votes / $catTotalVotes) * 100, 1) : 0.0;

                    return [
                        'teacher_id' => $teacher->id,
                        'name' => $teacher->name,
                        'subject' => $teacher->subject,
                        'bio' => $teacher->bio,
                        'photo_url' => $teacher->photo_url,
                        'is_active' => $teacher->is_active && !$teacher->trashed(),
                        'votes' => $votes,
                        'percentage' => $percentage,
                    ];
                })
                ->sortByDesc('votes')
                ->values()
                ->map(function (array $item, int $idx) {
                    $item['rank'] = $idx + 1;
                    return $item;
                });

                return [
                    'category_id' => $category->id,
                    'category_name' => $category->name,
                    'description' => $category->description,
                    'icon' => $category->icon ?? 'award',
                    'is_active' => $category->is_active,
                    'voting_status' => $category->voting_status,
                    'starts_at' => $category->starts_at?->toIso8601String(),
                    'ends_at' => $category->ends_at?->toIso8601String(),
                    'total_votes' => $catTotalVotes,
                    'winner' => $standings->first(),
                    'top_three' => $standings->take(3)->values(),
                    'standings' => $standings,
                ];
            });

        // Statistik vote per hari (7 hari terakhir)
        $startDate = Carbon::now()->subDays(6)->startOfDay();
        $rawDaily = Vote::query()
            ->where('created_at', '>=', $startDate)
            ->select(DB::raw('DATE(created_at) as vote_date'), DB::raw('COUNT(*) as total'))
            ->groupBy('vote_date')
            ->pluck('total', 'vote_date');

        $dailyVotes = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $dateKey = $day->format('Y-m-d');
            $dailyVotes[] = [
                'date' => $dateKey,
                'label' => $day->translatedFormat('d M'),
                'votes' => (int) ($rawDaily[$dateKey] ?? 0),
            ];
        }

        // Top guru secara keseluruhan lintas kategori
        $topTeachersOverall = Teacher::withTrashed()
            ->withCount('votes')
            ->orderByDesc('votes_count')
            ->take(8)
            ->get()
            ->map(fn (Teacher $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'subject' => $t->subject,
                'photo_url' => $t->photo_url,
                'total_votes' => $t->votes_count,
            ]);

        // Log audit terbaru (Bab 6: menyimpan IP dan user agent untuk audit)
        $recentAuditLogs = Vote::with(['category:id,name', 'teacher:id,name'])
            ->latest('created_at')
            ->take(12)
            ->get()
            ->map(fn (Vote $v) => [
                'id' => $v->id,
                'category_name' => $v->category?->name ?? '-',
                'teacher_name' => $v->teacher?->name ?? '-',
                'voter_token_short' => substr($v->voter_token, 0, 8) . '...',
                'ip_address' => $v->ip_address,
                'user_agent' => $v->user_agent,
                'created_at' => $v->created_at?->toIso8601String(),
            ]);

        // Ringkasan arsip periode sebelumnya (A-12)
        $archives = VoteArchive::query()
            ->select('period_label', 'archived_at', DB::raw('COUNT(*) as total_votes'))
            ->groupBy('period_label', 'archived_at')
            ->orderByDesc('archived_at')
            ->get();

        return response()->json([
            'data' => [
                'summary' => [
                    'total_votes' => $totalVotes,
                    'unique_voters' => $uniqueVoters,
                    'unique_ips' => $uniqueIps,
                    'total_categories' => $totalCategories,
                    'active_categories' => $activeCategories,
                    'total_teachers' => $totalTeachers,
                    'max_ip_limit' => config('voting.max_votes_per_ip_per_category', 45),
                ],
                'categories' => $categories,
                'daily_votes' => $dailyVotes,
                'top_teachers_overall' => $topTeachersOverall,
                'recent_audit_logs' => $recentAuditLogs,
                'archives' => $archives,
            ],
        ]);
    }

    /**
     * GET /api/admin/stats/export (A-09: Ekspor statistik ke CSV / Excel)
     */
    public function export(): StreamedResponse
    {
        $filename = 'statistik-voting-guru-' . Carbon::now()->format('Y-m-d-His') . '.csv';

        $voteCounts = Vote::query()
            ->select('category_id', 'teacher_id', DB::raw('COUNT(*) as total'))
            ->groupBy('category_id', 'teacher_id')
            ->get()
            ->groupBy('category_id');

        $categories = Category::with(['teachers' => fn ($q) => $q->withTrashed()])->get();

        return response()->streamDownload(function () use ($categories, $voteCounts) {
            $handle = fopen('php://output', 'w');
            // Tambahkan UTF-8 BOM agar Excel langsung membaca kolom dengan benar
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Kategori',
                'Status Kategori',
                'Peringkat',
                'Nama Guru',
                'Mata Pelajaran',
                'Jumlah Suara',
                'Persentase (%)',
                'Total Suara Kategori',
            ]);

            foreach ($categories as $category) {
                $catVoteRows = $voteCounts->get($category->id, collect())->keyBy('teacher_id');
                $catTotal = $catVoteRows->sum('total');

                $rows = $category->teachers->map(function (Teacher $teacher) use ($catVoteRows, $catTotal) {
                    $votes = (int) ($catVoteRows->get($teacher->id)?->total ?? 0);
                    $pct = $catTotal > 0 ? round(($votes / $catTotal) * 100, 2) : 0;
                    return [
                        'teacher' => $teacher,
                        'votes' => $votes,
                        'pct' => $pct,
                    ];
                })->sortByDesc('votes')->values();

                foreach ($rows as $idx => $r) {
                    fputcsv($handle, [
                        $category->name,
                        $category->is_active ? 'Aktif' : 'Nonaktif',
                        $idx + 1,
                        $r['teacher']->name,
                        $r['teacher']->subject,
                        $r['votes'],
                        $r['pct'],
                        $catTotal,
                    ]);
                }
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * POST /api/admin/votes/reset (A-12: Reset atau arsip vote untuk periode baru)
     */
    public function resetOrArchive(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_label' => ['required', 'string', 'max:120'],
            'archive_before_reset' => ['nullable', 'boolean'],
        ], [
            'period_label.required' => 'Nama/label periode arsip wajib diisi (contoh: Semester Ganjil 2026).',
        ]);

        $shouldArchive = $request->boolean('archive_before_reset', true);
        $now = Carbon::now();
        $totalMoved = 0;

        DB::transaction(function () use ($validated, $shouldArchive, $now, &$totalMoved) {
            $votes = Vote::with(['category', 'teacher'])->get();
            $totalMoved = $votes->count();

            if ($shouldArchive && $totalMoved > 0) {
                $chunks = $votes->map(fn (Vote $v) => [
                    'period_label' => $validated['period_label'],
                    'category_id' => $v->category_id,
                    'category_name' => $v->category?->name ?? 'Kategori #' . $v->category_id,
                    'teacher_id' => $v->teacher_id,
                    'teacher_name' => $v->teacher?->name ?? 'Guru #' . $v->teacher_id,
                    'voter_token' => $v->voter_token,
                    'ip_address' => $v->ip_address,
                    'user_agent' => $v->user_agent,
                    'voted_at' => $v->created_at,
                    'archived_at' => $now,
                ])->chunk(200);

                foreach ($chunks as $chunk) {
                    VoteArchive::insert($chunk->all());
                }
            }

            Vote::query()->delete();
        });

        return response()->json([
            'message' => $shouldArchive
                ? "Sebanyak {$totalMoved} data suara berhasil diarsipkan ke periode \"{$validated['period_label']}\" dan bilik suara siap untuk periode baru."
                : "Sebanyak {$totalMoved} data suara berhasil di-reset untuk periode baru.",
        ]);
    }
}
