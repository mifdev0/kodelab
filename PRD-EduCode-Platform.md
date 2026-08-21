# PRD — Platform Belajar Coding untuk Ekskul (HTML/CSS/JS)

**Versi:** 1.0
**Author:** Miftahul Amri
**Target pengguna:** Siswa SMP (ekskul coding Al Azhar) via iPad, dan Guru (pengajar)
**Tujuan dokumen:** Spesifikasi teknis untuk AI coding agent (Claude Code/OpenCode) membangun aplikasi ini.

---

## 1. Latar Belakang & Masalah

Ekskul coding SMP mengajarkan HTML/CSS/JS dasar. Kendala saat ini:
- Semua siswa pakai **iPad**, VSCode desktop tidak feasible.
- Online IDE existing (OneCompiler, CodePen) punya limitasi (rate limit, error, tidak cocok untuk kelas).
- Tidak ada cara bagi guru untuk memantau progres & hasil kerja siswa per pertemuan secara terpusat.

**Solusi:** Web app custom — code editor ringan berbasis browser (touch-friendly), live preview, autosave ke database, dan dashboard guru untuk memantau progres kelas.

---

## 2. Tujuan Produk

1. Siswa bisa menulis HTML/CSS/JS langsung dari iPad browser tanpa install apapun.
2. Siswa melihat hasil kerja secara live (split-screen atau fullscreen).
3. Progres kerja tersimpan otomatis per akun siswa, per pertemuan.
4. Guru bisa memantau siapa yang sudah mengerjakan, sedang mengerjakan, atau belum mulai — dan membuka hasil kerja tiap siswa secara read-only + kasih feedback.
5. Editor membantu proses belajar (auto-close tag, HTML boilerplate shortcut) **tanpa** memberi starter template project (siswa tetap build mandiri dari kosong).

### Non-goals (di luar scope v1)
- Tidak mendukung framework/library (React, dsb) — murni vanilla HTML/CSS/JS.
- Tidak ada real-time collaboration antar siswa.
- Tidak ada backend code execution (server-side JS run) — semua render di client via iframe.
- Tidak ada mobile native app — web app responsive saja.

---

## 3. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Editor | CodeMirror 6 (`@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-javascript`) |
| Shortcut/Emmet | `@emmetio/codemirror6-plugin` (atau alternatif emmet CM6 terbaru yang aktif maintained — cek npm saat implementasi) |
| Live Preview | `<iframe sandbox="allow-scripts" srcdoc={...}>` — gabungan HTML+CSS+JS string, di-update dengan debounce |
| Auth & DB | Supabase (Postgres + Supabase Auth) |
| ORM | Prisma (opsional — bisa juga langsung pakai Supabase client, evaluasi saat implementasi mana yang lebih simpel untuk schema ini) |
| Hosting | Vercel |
| State management | React state/hooks bawaan, tidak perlu Redux/Zustand untuk scope ini |

---

## 4. Roles & Auth

Dua role: `teacher` dan `student`.

- Auth pakai Supabase Auth. Karena target siswa SMP, gunakan **username + password sederhana** (bukan email verification) — guru yang buat akun siswa di awal semester (bulk create), bukan self-register.
- Guru login dengan email+password biasa.
- Role disimpan di tabel `profiles`, dicek di middleware Next.js untuk proteksi route (`/dashboard/*` khusus teacher, `/editor/*` khusus student).

---

## 5. Database Schema (Supabase/Postgres)

```sql
-- Profil user (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  full_name text not null,
  username text unique, -- dipakai siswa untuk login
  created_at timestamptz default now()
);

-- Kelas ekskul
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- e.g. "Ekskul Coding - Batch 2026"
  teacher_id uuid references profiles(id) not null,
  created_at timestamptz default now()
);

-- Siswa terdaftar di kelas
create table class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(class_id, student_id)
);

-- Pertemuan (sesi belajar)
create table meetings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  session_number int not null,
  title text not null, -- e.g. "Membuat Layout Dasar"
  meeting_date date,
  is_active boolean default false, -- pertemuan yang lagi berlangsung
  created_at timestamptz default now()
);

-- Submission/pekerjaan siswa per pertemuan
create table submissions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  html_code text default '',
  css_code text default '',
  js_code text default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted')),
  teacher_feedback text,
  updated_at timestamptz default now(),
  submitted_at timestamptz,
  unique(meeting_id, student_id)
);
```

**Row Level Security (RLS):** wajib diaktifkan.
- Siswa hanya bisa `select`/`update` baris `submissions` miliknya sendiri.
- Guru bisa `select` semua submission di kelas yang dia ampu, dan `update` kolom `teacher_feedback` + `status`.

---

## 6. Fitur & User Flow

### 6.1 Siswa — Editor

**Flow:**
1. Login → landing di halaman "Pertemuan Aktif" (ambil `meetings` where `is_active = true` untuk kelasnya).
2. Buka editor → load `submissions` existing (jika sudah pernah ngerjain) atau mulai kosong (`status = not_started`).
3. Menulis kode di 3 tab: HTML / CSS / JS.
4. Autosave: debounce ~2 detik setelah berhenti mengetik → `update submissions set html_code=..., status='in_progress', updated_at=now()`.
5. Tombol **Submit** eksplisit → `status = 'submitted'`, `submitted_at = now()`.
6. Siswa masih bisa edit setelah submit (status balik ke `in_progress` otomatis kalau ada perubahan lagi setelah submitted — biar guru tau ada update).

**Editor requirements:**
- 3 tab terpisah (HTML/CSS/JS), masing-masing instance CodeMirror 6 dengan bahasa sesuai.
- Auto-close tag & auto-indent (bawaan `@codemirror/lang-html`).
- Emmet shortcut aktif minimal untuk tab HTML (ketik `!` + Tab → boilerplate HTML5).
- **Tidak ada starter template pre-filled** — tab kosong saat `not_started`.
- Indikator status autosave kecil di navbar ("Tersimpan" / "Menyimpan...").

**Preview requirements:**
- Mode split-screen (default): editor kiri, preview kanan.
- Toggle fullscreen preview: preview jadi full viewport, ada floating bar kecil buat balik ke split (tombol close/back + ESC key).
- Preview update live dengan debounce ~300-500ms, gabungkan html_code + `<style>{css_code}</style>` + `<script>{js_code}</script>` jadi satu, inject ke `srcdoc`.
- Preference mode (split/fullscreen) disimpan di localStorage.
- Responsive/touch-friendly: tab switcher & tombol besar untuk tap di iPad.

### 6.2 Guru — Dashboard

**Flow:**
1. Login → landing di halaman pilih kelas (kalau guru pegang >1 kelas) atau langsung ke dashboard kalau cuma 1 kelas.
2. Dashboard menampilkan dropdown pilih pertemuan (default: pertemuan aktif).
3. Summary cards: total siswa, jumlah submitted, jumlah in_progress, jumlah not_started (untuk pertemuan terpilih).
4. List/grid siswa: nama, badge status (warna beda: abu-abu=not_started, kuning=in_progress, hijau=submitted), waktu update terakhir, tombol "Lihat Hasil".
5. Klik "Lihat Hasil" → buka halaman read-only: kode siswa (3 tab) + preview, plus text area feedback guru + tombol "Simpan Feedback" + dropdown ubah status manual (misal guru mau override jadi submitted).

**Fitur tambahan guru (v1 scope):**
- CRUD kelas & pertemuan (buat pertemuan baru, set `is_active`).
- Bulk create akun siswa (input list nama → generate username otomatis, misal `nama.kelas` — password default yang bisa direset).

---

## 7. Struktur Halaman (Routes)

```
/login                          → login (siswa & guru, redirect sesuai role)
/editor                         → editor siswa (pertemuan aktif)
/editor/fullscreen              → mode preview fullscreen (atau state, bukan route terpisah — evaluasi saat implementasi)

/dashboard                      → overview kelas guru
/dashboard/meetings/[id]        → list siswa + status untuk 1 pertemuan
/dashboard/submissions/[id]     → view read-only hasil kerja siswa + feedback
/dashboard/classes              → manage kelas
/dashboard/students             → manage/bulk-create akun siswa
```

---

## 8. Non-Functional Requirements

- **Performance:** preview update tidak boleh nge-lag di iPad — debounce wajib, jangan render tiap keystroke.
- **Autosave reliability:** jangan sampai kerjaan siswa hilang kalau tab ditutup tiba-tiba — trigger save juga on `beforeunload`/visibility change, bukan cuma debounce timer.
- **Security:** iframe preview wajib `sandbox="allow-scripts"` (tanpa `allow-same-origin` supaya script siswa tidak bisa akses parent page/cookie).
- **RLS ketat:** siswa tidak boleh bisa baca/edit submission siswa lain lewat API manapun.
- **Mobile-first:** semua UI didesain untuk touch target besar (min 44x44px), testing utama di iPad Safari.

---

## 9. Milestone Implementasi (saran urutan build)

1. Setup project Next.js + Tailwind + Supabase client + schema & RLS.
2. Auth flow (login siswa/guru + role-based redirect).
3. Editor CodeMirror 6 (3 tab) + emmet + auto-close tag — tanpa autosave dulu, tanpa preview dulu.
4. Live preview iframe + toggle split/fullscreen.
5. Autosave ke Supabase + submit flow.
6. Dashboard guru: list pertemuan + status siswa.
7. Halaman read-only submission + feedback guru.
8. Manage kelas & bulk create akun siswa.
9. Polish UI sesuai desain Stitch, testing di iPad asli.

---

## 10. Referensi Desain

Desain UI mengacu pada mockup yang dibuat di Google Stitch (4 screen: Student Editor Split View, Fullscreen Preview, Teacher Dashboard, Teacher Submission Review). Color system & style guide menyusul setelah mockup final disetujui.
