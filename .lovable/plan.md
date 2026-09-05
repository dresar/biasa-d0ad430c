# Rencana: AI Prompt Studio

Aplikasi SaaS full-stack untuk membuat prompt gambar AI berkualitas tinggi (bukan generator gambar). Semua UI dalam **Bahasa Indonesia**. Stack: TanStack Start + Lovable Cloud (Supabase) + Lovable AI Gateway (Gemini 2.5 Flash).

## Cakupan yang akan dibangun (v1 lengkap & jalan)

**Fondasi**
- Aktifkan Lovable Cloud
- Design system: putih, abu-abu lembut, teks hitam, aksen biru; tipografi modern; sudut membulat; bayangan halus
- Auth Lovable (email/password) + tabel `user_roles` + `has_role()` (RBAC aman)
- Seed akun demo: `demo@user.com` / `password123` (USER), `admin@demo.com` / `admin123` (ADMIN)
- Middleware route: `_authenticated/` untuk user, `_authenticated/_admin/` untuk admin
- Halaman `/auth` dengan tombol "Login sebagai User" & "Login sebagai Admin" (auto-fill)

**Database (Supabase, semua RLS + GRANT)**
`profiles`, `user_roles`, `gemini_api_keys`, `dropdown_categories`, `dropdown_items`, `prompt_templates`, `hook_templates`, `content_idea_categories`, `generated_prompts`, `favorites`, `reference_images` (storage bucket), `settings`, `logs`

**Landing page** (`/`)
Hero, fitur, model AI didukung, cara kerja, FAQ, footer — semua Bahasa Indonesia

**Dashboard User** (`/dashboard`)
Layout mobile-first: bottom nav di mobile, sidebar di desktop. Halaman:
- Beranda (statistik ringkas)
- Buat Prompt (generator utama)
- Ide Konten AI
- Riwayat
- Favorit
- Profil

**Generator Prompt**
- Input: Topik, Deskripsi, Catatan Tambahan, Upload Gambar Referensi
- ~20 dropdown (Content Type, Style, Layout, Mood, dst.) — **semua dari DB**
- Tombol Generate → panggil server function → Gemini 2.5 Flash via Lovable AI Gateway
- Analisa gambar referensi (multimodal) mempengaruhi output
- Baca history user agar tidak duplikat
- Output 2 tab: **Prompt** (teks panjang) & **Payload JSON** (semua field)
- Tombol: Salin Prompt, Salin JSON, Unduh TXT
- Skor viral (Overall, Hook, Curiosity, Educational, Share, Visual) + saran perbaikan
- Auto-simpan ke `generated_prompts`

**Ide Konten AI**
- Gemini sebagai AI Content Strategist
- Baca history user, hindari duplikat
- Kategori dari `content_idea_categories`
- Termasuk **Hook Generator** (99% orang tidak tahu…, dsb.) — pola dari `hook_templates`

**Riwayat & Favorit**
Cari, filter, favoritkan, salin, hapus, duplikat, unduh

**Profil**
Edit nama, ganti password, logout

**Dashboard Admin** (`/admin/dashboard`)
- Kartu metrik: Total User, Prompt Hari Ini, API Key Aktif, Request Gagal, Waktu Respons Rata-rata, Kategori Terpopuler, User Terbaru
- Manajer API Key Gemini (CRUD, enable/disable, prioritas, catatan, jumlah pemakaian, terakhir dipakai, status)
- **Auto-rotation**: server fn coba key prioritas tertinggi; jika 429/timeout/error → key berikutnya
- Manajer Dropdown (14+ kategori, CRUD, urutkan, enable/disable)
- Manajer Template Prompt (Poster, Infografis, Karusel, Thumbnail, Logo, Banner, System Prompt, Negative Prompt, dst.)
- Manajer Template Hook (CRUD, urutkan)
- Manajer Kategori Ide Konten
- Manajemen User (lihat, cari, suspend, aktifkan, hapus, lihat history)
- Pengaturan Sistem (nama situs, warna primer/sekunder, batas prompt, maintenance mode, copyright)

**Tombol Info "!"**
Komponen `<InfoButton title description />` kecil bulat pada setiap section, buka Popover/Dialog responsif dengan penjelasan Bahasa Indonesia.

**Umum**
- Toast (sonner), skeleton loader, error boundary, validasi Zod di server
- RLS ketat: user hanya lihat data sendiri; admin via `has_role()`
- Kunci Gemini di `gemini_api_keys` (dikelola admin di DB, bukan env)

## Teknis singkat
- Server functions untuk semua panggilan Gemini (bearer user via `requireSupabaseAuth`)
- Upload gambar referensi ke Supabase Storage bucket `reference-images` (private, signed URL untuk analisa)
- Model chat: `google/gemini-2.5-flash` via Lovable AI Gateway (base `https://ai.gateway.lovable.dev/v1`) — tetapi karena user memilih **Gemini via API key sendiri di DB**, panggilan langsung ke Google Generative Language API `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` dengan rotasi key dari `gemini_api_keys`. Fallback: bila belum ada key admin, gunakan Lovable AI Gateway dengan `LOVABLE_API_KEY`.
- Semua teks UI Bahasa Indonesia; kode/identifier tetap Inggris

## Yang di luar cakupan v1
- Pembayaran/paket berbayar
- Email transaksional kustom
- Analitik lanjutan / grafik time-series admin (hanya angka ringkas)
- Rate limiting per-IP tingkat lanjut (hanya per-user via cek DB)

Konfirmasi rencana ini dan saya lanjut membangun ujung-ke-ujung.
