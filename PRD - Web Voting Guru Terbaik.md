# PRD - Web Voting Guru Terbaik

Versi 1.0 | Stack: Laravel (backend) + React (frontend) | Bahasa antarmuka: Indonesia

## 1. Ringkasan

Web voting guru terbaik adalah aplikasi web untuk menjalankan pemilihan guru berdasarkan beberapa kategori (misalnya *Guru Paling Baik*, *Guru Paling Gaul*). Pengunjung dapat vote tanpa login. Admin mengelola data guru, kategori, memantau statistik, dan membuat poster hasil voting. Hasil voting tidak ditampilkan ke publik.

## 2. Tujuan dan Non-Tujuan

### Tujuan

- Memudahkan siswa memberikan suara tanpa proses registrasi atau login.
- Menjaga hasil tetap adil lewat pembatasan vote ganda.
- Memberi admin alat untuk mengelola guru, kategori, dan melihat statistik secara real-time.
- Menghasilkan poster pemenang per kategori yang siap dibagikan.

### Non-Tujuan (di luar cakupan versi 1)

- Login atau akun untuk pengunjung.
- Tampilan hasil voting untuk publik.
- Sistem kode voting atau voucher sekali pakai.
- Notifikasi email atau WhatsApp.
- Multi-bahasa.

## 3. Pengguna

| Peran | Deskripsi | Akses |
| --- | --- | --- |
| Pengunjung | Siswa atau pemilih umum | Melihat kategori dan guru, memberi vote. Tanpa login |
| Admin | Panitia atau pengelola | Login, CRUD guru, CRUD kategori, statistik, ekspor, poster |

## 4. Kebutuhan Fungsional

### 4.1 Pengunjung

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| P-01 | Melihat daftar kategori aktif beserta guru yang dinominasikan (foto, nama, mata pelajaran) | Wajib |
| P-02 | Memilih 1 guru per kategori | Wajib |
| P-03 | Melihat halaman konfirmasi sebelum vote dikirim | Wajib |
| P-04 | Menerima pesan sukses setelah vote berhasil | Wajib |
| P-05 | Melihat kategori mana yang sudah pernah di-vote (ditandai, tombol vote dinonaktifkan) | Wajib |
| P-06 | Menerima pesan jelas jika voting belum dibuka, sudah ditutup, atau vote ditolak | Wajib |
| P-07 | Menyelesaikan verifikasi CAPTCHA sebelum mengirim vote | Wajib |
| P-08 | Tampilan responsif, dioptimalkan untuk HP | Wajib |

### 4.2 Admin

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| A-01 | Login dan logout admin (Laravel Sanctum) | Wajib |
| A-02 | CRUD guru: nama, foto, mata pelajaran, bio singkat, status aktif | Wajib |
| A-03 | Upload foto dengan validasi tipe (jpg, png, webp) dan ukuran maksimal, serta resize otomatis | Wajib |
| A-04 | Hapus guru memakai soft delete agar data vote lama tetap utuh | Wajib |
| A-05 | CRUD kategori: nama, deskripsi, status aktif, periode mulai dan selesai | Wajib |
| A-06 | Menentukan guru yang dinominasikan di setiap kategori | Wajib |
| A-07 | Dashboard statistik: total vote, vote per guru per kategori, persentase, vote per hari | Wajib |
| A-08 | Grafik statistik (batang atau garis) | Wajib |
| A-09 | Ekspor statistik ke CSV atau Excel | Sebaiknya ada |
| A-10 | Membuat poster pemenang per kategori dan mengunduhnya sebagai gambar PNG | Wajib |
| A-11 | Membuka atau menutup voting per kategori secara manual | Sebaiknya ada |
| A-12 | Reset atau arsip vote untuk periode baru | Sebaiknya ada |

## 5. Aturan Bisnis

1. Satu pemilih hanya dapat memberi **1 vote untuk 1 guru per kategori**. Pemilih boleh vote di banyak kategori, tetapi tiap kategori hanya sekali.
2. Vote hanya sah jika kategori aktif dan berada dalam periode voting.
3. Vote hanya sah untuk guru yang dinominasikan di kategori tersebut dan berstatus aktif.
4. Vote yang sudah dikirim tidak dapat diubah atau dibatalkan oleh pemilih.
5. Hasil voting hanya dapat dilihat oleh admin.
6. Menghapus guru atau kategori tidak boleh menghilangkan data vote yang sudah masuk (soft delete).

## 6. Anti-Kecurangan

Karena pengunjung tidak login, pencegahan vote ganda memakai beberapa lapisan:

| Lapisan | Cara kerja |
| --- | --- |
| Token pemilih | React membuat UUID (`voter_token`) saat pertama dibuka, disimpan di localStorage dan cookie. Token adalah penjaga utama |
| Unique constraint | Index unik `(category_id, voter_token)` di database, sehingga vote ganda ditolak walau ada bug di kode |
| Batas per IP | Batas vote per IP per kategori dibuat longgar (usulan awal 30-50) karena wifi sekolah sering dipakai bersama. Angka final dapat diatur lewat konfigurasi |
| Rate limiting | Middleware `throttle` Laravel pada endpoint vote |
| CAPTCHA | Cloudflare Turnstile atau reCAPTCHA untuk mencegah bot |
| Log | Menyimpan IP dan user agent di setiap vote untuk audit |

**Keterbatasan yang diterima:** pemilih yang menghapus data browser atau memakai perangkat lain masih berpotensi vote ulang. Risiko ini ditekan oleh batas IP, CAPTCHA, dan rate limiting, tetapi tidak dapat dihilangkan sepenuhnya tanpa login atau kode voting.

## 7. Alur Pengguna

### Alur vote

1. Pengunjung membuka web dan token pemilih dibuat otomatis.
2. Web menampilkan kategori aktif dan guru nominasinya.
3. Pengunjung memilih satu guru di sebuah kategori.
4. Pengunjung menyelesaikan CAPTCHA dan menekan konfirmasi.
5. Server memvalidasi: kategori aktif, periode berlaku, guru terdaftar di kategori, token belum vote, batas IP belum terlampaui.
6. Jika lolos, vote disimpan dan kategori ditandai sudah di-vote. Jika gagal, tampil pesan alasan yang jelas.

### Alur admin

1. Admin login.
2. Admin menambah guru dan kategori, lalu menetapkan nominasi.
3. Admin membuka voting (otomatis lewat periode atau manual).
4. Admin memantau statistik di dashboard.
5. Setelah voting selesai, admin membuat poster pemenang per kategori dan mengunduhnya.

## 8. Poster Hasil

- Dibuat di sisi React dari data statistik, lalu diekspor menjadi PNG (misalnya dengan `html-to-image`).
- Isi poster: judul kategori, foto, nama, dan mata pelajaran pemenang, serta jumlah atau persentase vote (opsional, dapat diaktifkan admin).
- Admin dapat memilih tampilan: hanya juara 1, atau top 3.
- Satu template dasar di versi 1. Template tambahan dapat dikembangkan kemudian.

## 9. Arsitektur dan Teknologi

| Komponen | Pilihan |
| --- | --- |
| Backend | Laravel (REST API) |
| Auth admin | Laravel Sanctum |
| Frontend | React (SPA), Tailwind CSS disarankan |
| Database | MySQL atau PostgreSQL |
| Penyimpanan gambar | Laravel Storage (disk lokal atau S3) |
| Grafik | Recharts atau Chart.js |
| Poster | html-to-image di React |
| CAPTCHA | Cloudflare Turnstile atau reCAPTCHA |

Frontend dan backend dipisah, sehingga CORS dan CSRF (Sanctum) harus dikonfigurasi dengan benar.

## 10. Model Data

| Tabel | Kolom utama |
| --- | --- |
| `users` | id, name, email, password (khusus admin) |
| `teachers` | id, name, photo, subject, bio, is\_active, deleted\_at |
| `categories` | id, name, description, is\_active, starts\_at, ends\_at |
| `category_teacher` | category\_id, teacher\_id |
| `votes` | id, category\_id, teacher\_id, voter\_token, ip\_address, user\_agent, created\_at |

Indeks penting: unique `(category_id, voter_token)` pada `votes`, serta indeks pada `teacher_id` dan `category_id` untuk kecepatan statistik.

Tabel `category_teacher` dipakai jika tidak semua guru ikut di semua kategori.

## 11. Endpoint API

### Publik

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/categories` | Kategori aktif beserta guru nominasi |
| POST | `/api/votes` | Kirim vote (throttle dan CAPTCHA) |
| GET | `/api/my-votes` | Daftar kategori yang sudah di-vote oleh token ini |

### Admin (Sanctum)

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/api/admin/login` | Login admin |
| POST | `/api/admin/logout` | Logout admin |
| CRUD | `/api/admin/teachers` | Kelola guru (termasuk upload foto) |
| CRUD | `/api/admin/categories` | Kelola kategori dan nominasi |
| GET | `/api/admin/stats` | Statistik vote |
| GET | `/api/admin/stats/export` | Ekspor CSV atau Excel |

## 12. Kebutuhan Non-Fungsional

- **Keamanan:** route admin dilindungi middleware, validasi input di sisi server, hashing password, HTTPS, pembatasan upload file.
- **Performa:** halaman vote termuat cepat di jaringan HP biasa; gambar dikompres; endpoint statistik memakai query teragregasi.
- **Keandalan:** mampu menangani lonjakan vote dalam waktu singkat (misalnya saat pengumuman di sekolah). Perlu uji beban sebelum rilis.
- **Kegunaan:** antarmuka sederhana, bahasa Indonesia, mudah dipakai di layar kecil.
- **Privasi:** data pemilih terbatas pada token, IP, dan user agent; tidak ada data pribadi yang dikumpulkan.

## 13. Metrik Keberhasilan

- Tidak ada vote ganda yang lolos dari token yang sama dalam satu kategori (0 pelanggaran constraint).
- Waktu dari membuka web sampai vote terkirim kurang dari 1 menit.
- Halaman vote termuat kurang dari 3 detik di jaringan seluler normal.
- Admin dapat membuat poster pemenang dalam kurang dari 2 menit setelah voting selesai.

## 14. Milestone

| Tahap | Cakupan |
| --- | --- |
| 1 | Setup Laravel, migration, model, seeder |
| 2 | Auth admin |
| 3 | CRUD guru dan kategori beserta nominasi |
| 4 | Endpoint vote dan seluruh proteksi anti-kecurangan |
| 5 | Halaman vote di React |
| 6 | Dashboard statistik dan ekspor |
| 7 | Generator poster |
| 8 | Pengujian (fungsional, keamanan, beban) dan rilis |

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Vote ganda lewat hapus data browser atau ganti perangkat | Hasil tidak adil | Batas IP, CAPTCHA, rate limit, log audit; evaluasi kode voting jika diperlukan |
| Banyak siswa satu IP (wifi sekolah) | Vote sah ikut terblokir | Batas IP longgar dan dapat dikonfigurasi |
| Bot atau skrip spam | Hasil dimanipulasi | CAPTCHA dan throttle |
| Lonjakan traffic | Server lambat atau down | Uji beban, caching, indeks database |
| Foto guru terlalu besar | Halaman lambat | Resize dan kompres otomatis saat upload |

## 16. Pertanyaan Terbuka

1. Apakah pengunjung vote semua kategori sekaligus dalam satu halaman, atau satu per satu per kategori? (Asumsi sementara: semua kategori tampil dalam satu halaman, tiap kategori di-vote secara independen, dan pemilih boleh kembali untuk melengkapi kategori yang belum di-vote.)
2. Berapa batas vote per IP yang tepat untuk lingkungan sekolah?
3. Apakah semua guru ikut di semua kategori, atau nominasi diatur per kategori?
4. Berapa jumlah guru, kategori, dan pemilih yang diperkirakan? (Untuk menentukan kebutuhan server dan uji beban.)
5. Apakah perlu lebih dari satu akun admin dan pembagian hak akses?
