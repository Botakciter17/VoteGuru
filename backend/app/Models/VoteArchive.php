<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoteArchive extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'period_label',
        'category_id',
        'category_name',
        'teacher_id',
        'teacher_name',
        'voter_token',
        'ip_address',
        'user_agent',
        'voted_at',
        'archived_at',
    ];

    protected $casts = [
        'voted_at' => 'datetime',
        'archived_at' => 'datetime',
    ];
}
