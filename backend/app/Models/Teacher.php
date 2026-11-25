<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'photo',
        'subject',
        'bio',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): string
    {
        if (!$this->photo) {
            $encoded = urlencode($this->name ?? 'Guru');
            return "https://ui-avatars.com/api/?name={$encoded}&background=4A0E17&color=FFD6DC&size=512&bold=true";
        }
        if (str_starts_with($this->photo, 'http://') || str_starts_with($this->photo, 'https://') || str_starts_with($this->photo, 'data:') || str_starts_with($this->photo, '/')) {
            return $this->photo;
        }
        return '/storage/' . ltrim($this->photo, '/');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_teacher')->withTimestamps();
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
