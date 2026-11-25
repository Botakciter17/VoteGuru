<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminTeacherController extends Controller
{
    /**
     * GET /api/admin/teachers (A-02)
     */
    public function index(Request $request): JsonResponse
    {
        $includeTrashed = $request->boolean('include_trashed', true);

        $query = Teacher::query()
            ->withCount('votes')
            ->with('categories:id,name')
            ->orderBy('deleted_at', 'asc')
            ->orderBy('name', 'asc');

        if ($includeTrashed) {
            $query->withTrashed();
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    /**
     * POST /api/admin/teachers (A-02, A-03)
     */
    public function store(Request $request): JsonResponse
    {
        $maxKb = (int) config('voting.max_photo_size_kb', 4096);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'subject' => ['required', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:600'],
            'is_active' => ['nullable', 'boolean'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:' . $maxKb],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ], [
            'name.required' => 'Nama guru wajib diisi.',
            'subject.required' => 'Mata pelajaran wajib diisi.',
            'photo.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'photo.max' => 'Ukuran foto maksimal ' . ($maxKb / 1024) . ' MB.',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $this->processAndResizePhoto($request->file('photo'));
        }

        $teacher = Teacher::create([
            'name' => $validated['name'],
            'subject' => $validated['subject'],
            'bio' => $validated['bio'] ?? null,
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
            'photo' => $photoPath,
        ]);

        if (isset($validated['category_ids'])) {
            $teacher->categories()->sync($validated['category_ids']);
        }

        return response()->json([
            'message' => 'Data guru berhasil ditambahkan.',
            'data' => $teacher->load('categories:id,name')->loadCount('votes'),
        ], 201);
    }

    /**
     * PUT/POST /api/admin/teachers/{id} (A-02, A-03)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $teacher = Teacher::withTrashed()->findOrFail($id);
        $maxKb = (int) config('voting.max_photo_size_kb', 4096);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'subject' => ['required', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:600'],
            'is_active' => ['nullable', 'boolean'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:' . $maxKb],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ], [
            'name.required' => 'Nama guru wajib diisi.',
            'subject.required' => 'Mata pelajaran wajib diisi.',
            'photo.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'photo.max' => 'Ukuran foto maksimal ' . ($maxKb / 1024) . ' MB.',
        ]);

        if ($request->hasFile('photo')) {
            $teacher->photo = $this->processAndResizePhoto($request->file('photo'));
        }

        $teacher->name = $validated['name'];
        $teacher->subject = $validated['subject'];
        $teacher->bio = $validated['bio'] ?? null;
        if ($request->has('is_active')) {
            $teacher->is_active = $request->boolean('is_active');
        }
        $teacher->save();

        if (array_key_exists('category_ids', $validated)) {
            $teacher->categories()->sync($validated['category_ids'] ?? []);
        }

        return response()->json([
            'message' => 'Data guru berhasil diperbarui.',
            'data' => $teacher->load('categories:id,name')->loadCount('votes'),
        ]);
    }

    /**
     * DELETE /api/admin/teachers/{id} (A-04: Soft Delete agar data vote lama tetap utuh)
     */
    public function destroy(int $id): JsonResponse
    {
        $teacher = Teacher::findOrFail($id);
        $teacher->delete();

        return response()->json([
            'message' => 'Guru berhasil diarsipkan (soft delete). Data suara yang sudah masuk tetap tersimpan utuh.',
        ]);
    }

    /**
     * POST /api/admin/teachers/{id}/restore
     */
    public function restore(int $id): JsonResponse
    {
        $teacher = Teacher::withTrashed()->findOrFail($id);
        $teacher->restore();

        return response()->json([
            'message' => 'Data guru berhasil dipulihkan.',
            'data' => $teacher->load('categories:id,name')->loadCount('votes'),
        ]);
    }

    /**
     * Resize dan kompres otomatis foto guru menggunakan GD (A-03 & Mitigasi Risiko Bab 15)
     */
    private function processAndResizePhoto(UploadedFile $file): string
    {
        Storage::disk('public')->makeDirectory('teachers');
        $maxDim = (int) config('voting.photo_max_dimension', 600);
        $filename = 'teachers/' . Str::uuid() . '.jpg';
        $fullPath = Storage::disk('public')->path($filename);

        $raw = @file_get_contents($file->getRealPath());
        $srcImg = $raw ? @imagecreatefromstring($raw) : false;

        if (!$srcImg) {
            // Fallback simpan langsung jika GD gagal membaca stream
            return $file->store('teachers', 'public');
        }

        $srcW = imagesx($srcImg);
        $srcH = imagesy($srcImg);

        // Center crop / resize proporsional ke maksimal 600x600
        $scale = min($maxDim / max(1, $srcW), $maxDim / max(1, $srcH), 1.0);
        $dstW = max(1, (int) round($srcW * $scale));
        $dstH = max(1, (int) round($srcH * $scale));

        $dstImg = imagecreatetruecolor($dstW, $dstH);
        $white = imagecolorallocate($dstImg, 234, 239, 229);
        imagefilledrectangle($dstImg, 0, 0, $dstW, $dstH, $white);

        imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
        imagejpeg($dstImg, $fullPath, 85);

        imagedestroy($srcImg);
        imagedestroy($dstImg);

        return $filename;
    }
}
