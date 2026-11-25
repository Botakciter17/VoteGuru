<?php

return [
    // Batas maksimal vote dari 1 alamat IP pada kategori yang sama (PRD Bab 6: usulan 30-50 untuk WiFi sekolah)
    'max_votes_per_ip_per_category' => (int) env('VOTING_MAX_IP_PER_CATEGORY', 45),

    // Rate limit request ke endpoint POST /api/votes per menit per IP
    'vote_rate_limit_per_minute' => (int) env('VOTING_RATE_LIMIT_PER_MINUTE', 20),

    // Ukuran maksimal upload foto guru dalam KB (2048 KB = 2 MB)
    'max_photo_size_kb' => 4096,

    // Dimensi maksimal resize otomatis foto guru (px)
    'photo_max_dimension' => 600,
];
