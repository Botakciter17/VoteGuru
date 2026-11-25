<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCategoryController extends Controller
{
    /**
     * GET /api/admin/categories (A-05, A-06)
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->with(['teachers' => function ($q) {
                $q->select('teachers.id', 'teachers.name', 'teachers.subject', 'teachers.photo', 'teachers.is_active');
            }])
            ->withCount('votes')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    /**
     * POST /api/admin/categories (A-05, A-06)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:600'],
            'icon' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'teacher_ids' => ['nullable', 'array'],
            'teacher_ids.*' => ['integer', 'exists:teachers,id'],
        ], [
            'name.required' => 'Nama kategori wajib diisi.',
            'ends_at.after_or_equal' => 'Waktu selesai harus setelah atau sama dengan waktu mulai.',
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'icon' => $validated['icon'] ?? 'award',
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
        ]);

        if (isset($validated['teacher_ids'])) {
            $category->teachers()->sync($validated['teacher_ids']);
        }

        return response()->json([
            'message' => 'Kategori baru beserta nominasi berhasil dibuat.',
            'data' => $category->load('teachers:id,name,subject,photo,is_active')->loadCount('votes'),
        ], 201);
    }

    /**
     * PUT /api/admin/categories/{id} (A-05, A-06)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:600'],
            'icon' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'teacher_ids' => ['nullable', 'array'],
            'teacher_ids.*' => ['integer', 'exists:teachers,id'],
        ], [
            'name.required' => 'Nama kategori wajib diisi.',
            'ends_at.after_or_equal' => 'Waktu selesai harus setelah atau sama dengan waktu mulai.',
        ]);

        $category->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'icon' => $validated['icon'] ?? $category->icon,
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $category->is_active,
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
        ]);

        if (array_key_exists('teacher_ids', $validated)) {
            $category->teachers()->sync($validated['teacher_ids'] ?? []);
        }

        return response()->json([
            'message' => 'Kategori dan daftar nominasi berhasil diperbarui.',
            'data' => $category->load('teachers:id,name,subject,photo,is_active')->loadCount('votes'),
        ]);
    }

    /**
     * PATCH /api/admin/categories/{id}/toggle-status (A-11: Membuka atau menutup voting manual)
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->is_active = !$category->is_active;
        $category->save();

        return response()->json([
            'message' => $category->is_active
                ? 'Voting untuk kategori "' . $category->name . '" berhasil dibuka.'
                : 'Voting untuk kategori "' . $category->name . '" berhasil ditutup.',
            'data' => $category->load('teachers:id,name,subject,photo,is_active')->loadCount('votes'),
        ]);
    }

    /**
     * DELETE /api/admin/categories/{id} (Soft delete sesuai Aturan Bisnis #6)
     */
    public function destroy(int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->delete();

        return response()->json([
            'message' => 'Kategori berhasil dihapus (soft delete). Data suara historis tetap terjaga.',
        ]);
    }
}
