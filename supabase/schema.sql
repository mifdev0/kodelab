-- ==========================================================
-- CodeCamp (EduCode Platform) — Supabase Database Schema
-- Al Azhar Coding Extracurricular
-- ==========================================================

-- Enable pgcrypto for UUIDs if not already enabled
create extension if not exists "pgcrypto";

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  full_name text not null,
  username text unique, -- dipakai siswa untuk login (e.g. "budi.7a")
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. CLASSES (Kelas Ekskul)
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- e.g. "Ekskul Coding - SMP Al Azhar 2026"
  teacher_id uuid references profiles(id) on delete set null,
  description text default '',
  created_at timestamptz default now()
);

-- 3. CLASS_STUDENTS (Siswa terdaftar di kelas)
create table if not exists class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(class_id, student_id)
);

-- 4. MEETINGS (Pertemuan/Sesi Belajar)
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  session_number int not null,
  title text not null, -- e.g. "Pertemuan 3: Membuat Layout Dasar"
  description text default '',
  meeting_date date default current_date,
  is_active boolean default false, -- pertemuan yang sedang berlangsung
  created_at timestamptz default now()
);

-- 5. SUBMISSIONS (Pekerjaan siswa per pertemuan)
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  html_code text default '',
  css_code text default '',
  js_code text default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted')),
  teacher_feedback text default null,
  updated_at timestamptz default now(),
  submitted_at timestamptz default null,
  unique(meeting_id, student_id)
);

-- Indexes for rapid lookup
create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_class_students_class on class_students(class_id);
create index if not exists idx_class_students_student on class_students(student_id);
create index if not exists idx_meetings_class on meetings(class_id);
create index if not exists idx_meetings_active on meetings(class_id, is_active);
create index if not exists idx_submissions_meeting_student on submissions(meeting_id, student_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
alter table profiles enable row level security;
alter table classes enable row level security;
alter table class_students enable row level security;
alter table meetings enable row level security;
alter table submissions enable row level security;

-- Profiles: Authenticated users can view profiles; users can update their own profile
create policy "Authenticated users can read profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Classes: Authenticated can view classes; teachers can create/update their classes
create policy "Authenticated users can read classes"
  on classes for select
  to authenticated
  using (true);

create policy "Teachers can insert classes"
  on classes for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

create policy "Teachers can update their own classes"
  on classes for update
  to authenticated
  using (teacher_id = auth.uid() or exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'teacher'
  ));

-- Class Students: Authenticated can view
create policy "Read class_students"
  on class_students for select
  to authenticated
  using (true);

create policy "Teachers can manage class_students"
  on class_students for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

-- Meetings: Authenticated can view; teachers can manage
create policy "Read meetings"
  on meetings for select
  to authenticated
  using (true);

create policy "Teachers can manage meetings"
  on meetings for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

-- Submissions RLS:
-- 1. Siswa hanya bisa SELECT/UPDATE baris submissions miliknya sendiri.
-- 2. Guru bisa SELECT semua submission di kelas yang dia ampu & UPDATE feedback + status.
create policy "Students can view own submissions"
  on submissions for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

create policy "Students can insert own submissions"
  on submissions for insert
  to authenticated
  with check (
    student_id = auth.uid()
  );

create policy "Students can update own submissions"
  on submissions for update
  to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

-- Auto update timestamp trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_submissions_updated_at
before update on submissions
for each row
execute function update_updated_at_column();
