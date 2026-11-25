<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'icon',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    protected $appends = ['voting_status', 'voting_status_message'];

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(Teacher::class, 'category_teacher')->withTimestamps();
    }

    public function activeTeachers(): BelongsToMany
    {
        return $this->belongsToMany(Teacher::class, 'category_teacher')
            ->where('teachers.is_active', true)
            ->whereNull('teachers.deleted_at')
            ->withTimestamps();
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    /**
     * Mengecek status periode voting kategori (open, not_started, closed, inactive)
     */
    public function getVotingStatusAttribute(): string
    {
        if (!$this->is_active) {
            return 'inactive';
        }

        $now = Carbon::now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return 'not_started';
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return 'closed';
        }

        return 'open';
    }

    public function getVotingStatusMessageAttribute(): string
    {
        return match ($this->voting_status) {
            'inactive' => 'Voting untuk kategori ini sedang ditutup oleh panitia.',
            'not_started' => 'Voting belum dibuka. Mulai dibuka pada ' . ($this->starts_at ? $this->starts_at->translatedFormat('d M Y H:i') : '-'),
            'closed' => 'Periode voting untuk kategori ini telah berakhir pada ' . ($this->ends_at ? $this->ends_at->translatedFormat('d M Y H:i') : '-'),
            default => 'Voting sedang berlangsung',
        };
    }

    public function isVotingOpen(): bool
    {
        return $this->voting_status === 'open';
    }
}
