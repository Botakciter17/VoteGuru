<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Teacher;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VotingSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_can_fetch_categories_and_submit_single_vote_per_category(): void
    {
        $teacher1 = Teacher::create([
            'name' => 'Guru Satu',
            'subject' => 'Matematika',
            'is_active' => true,
        ]);
        $teacher2 = Teacher::create([
            'name' => 'Guru Dua',
            'subject' => 'Fisika',
            'is_active' => true,
        ]);

        $cat1 = Category::create([
            'name' => 'Guru Paling Baik',
            'description' => 'Kategori 1',
            'is_active' => true,
            'starts_at' => Carbon::now()->subDay(),
            'ends_at' => Carbon::now()->addDay(),
        ]);
        $cat1->teachers()->sync([$teacher1->id]);

        $cat2 = Category::create([
            'name' => 'Guru Paling Gaul',
            'description' => 'Kategori 2',
            'is_active' => true,
            'starts_at' => Carbon::now()->subDay(),
            'ends_at' => Carbon::now()->addDay(),
        ]);
        $cat2->teachers()->sync([$teacher1->id, $teacher2->id]);

        // 1. Fetch categories
        $catRes = $this->getJson('/api/categories');
        $catRes->assertOk()->assertJsonCount(2, 'data');

        $token = 'voter-uuid-token-1234567890';

        // 2. Vote di Kategori 1 berhasil
        $voteRes = $this->postJson('/api/votes', [
            'category_id' => $cat1->id,
            'teacher_id' => $teacher1->id,
            'voter_token' => $token,
            'captcha_verified' => true,
            'captcha_token' => 'test-token-12345',
        ]);
        $voteRes->assertCreated();

        // 3. Jika berubah pikiran, vote kedua di Kategori 1 dengan token yang sama mengubah pilihan (200 OK) tanpa menduplikasi suara
        $changeRes = $this->postJson('/api/votes', [
            'category_id' => $cat1->id,
            'teacher_id' => $teacher1->id,
            'voter_token' => $token,
            'captcha_verified' => true,
            'captcha_token' => 'test-token-12345',
        ]);
        $changeRes->assertOk();
        $this->assertEquals(1, Vote::where('category_id', $cat1->id)->where('voter_token', $token)->count());

        // 3b. Uji pembatalan vote (DELETE /api/votes/{categoryId}) lalu pilih kembali
        $cancelRes = $this->deleteJson('/api/votes/' . $cat1->id . '?voter_token=' . $token);
        $cancelRes->assertOk();
        $this->assertEquals(0, Vote::where('category_id', $cat1->id)->where('voter_token', $token)->count());

        $reVoteRes = $this->postJson('/api/votes', [
            'category_id' => $cat1->id,
            'teacher_id' => $teacher1->id,
            'voter_token' => $token,
            'captcha_verified' => true,
            'captcha_token' => 'test-token-12345',
        ]);
        $reVoteRes->assertCreated();

        // 4. Vote untuk guru yang tidak dinominasikan di Kategori 1 ditolak (422)
        $unnomRes = $this->postJson('/api/votes', [
            'category_id' => $cat1->id,
            'teacher_id' => $teacher2->id,
            'voter_token' => 'another-voter-token-999999',
            'captcha_verified' => true,
            'captcha_token' => 'test-token-12345',
        ]);
        $unnomRes->assertStatus(422);

        // 5. Token yang sama boleh vote di Kategori 2
        $voteCat2Res = $this->postJson('/api/votes', [
            'category_id' => $cat2->id,
            'teacher_id' => $teacher2->id,
            'voter_token' => $token,
            'captcha_verified' => true,
            'captcha_token' => 'test-token-12345',
        ]);
        $voteCat2Res->assertCreated();

        // 6. Cek daftar my-votes
        $myVotes = $this->getJson('/api/my-votes?voter_token=' . $token);
        $myVotes->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_admin_can_manage_teachers_soft_delete_and_view_stats(): void
    {
        Storage::fake('public');

        $admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin@sekolah.sch.id',
            'password' => Hash::make('admin123'),
        ]);

        // Login admin
        $loginRes = $this->postJson('/api/admin/login', [
            'email' => 'admin@sekolah.sch.id',
            'password' => 'admin123',
        ]);
        $loginRes->assertOk();
        $bearer = $loginRes->json('data.token');

        // Buat guru dengan upload foto
        $createTeacherRes = $this->withHeader('Authorization', 'Bearer ' . $bearer)
            ->postJson('/api/admin/teachers', [
                'name' => 'Ibu Guru Baru',
                'subject' => 'Biologi',
                'bio' => 'Guru biologi teladan',
                'is_active' => true,
                'photo' => UploadedFile::fake()->image('guru.jpg', 800, 800),
            ]);
        $createTeacherRes->assertCreated();
        $teacherId = $createTeacherRes->json('data.id');

        // Buat kategori & nominasikan guru
        $createCatRes = $this->withHeader('Authorization', 'Bearer ' . $bearer)
            ->postJson('/api/admin/categories', [
                'name' => 'Kategori Biologi',
                'description' => 'Tes',
                'is_active' => true,
                'teacher_ids' => [$teacherId],
            ]);
        $createCatRes->assertCreated();
        $categoryId = $createCatRes->json('data.id');

        // Simpan 1 vote
        Vote::create([
            'category_id' => $categoryId,
            'teacher_id' => $teacherId,
            'voter_token' => 'voter-test-soft-delete-12345',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
        ]);

        // Soft delete guru
        $delRes = $this->withHeader('Authorization', 'Bearer ' . $bearer)
            ->deleteJson("/api/admin/teachers/{$teacherId}");
        $delRes->assertOk();

        // Pastikan vote tetap utuh di statistik walaupun guru di-soft-delete (A-04 & Aturan Bisnis #6)
        $statsRes = $this->withHeader('Authorization', 'Bearer ' . $bearer)
            ->getJson('/api/admin/stats');
        $statsRes->assertOk()
            ->assertJsonPath('data.summary.total_votes', 1);
    }
}
