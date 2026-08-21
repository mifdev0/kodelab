-- ==============================================================================
-- KODELAB SUPABASE DATABASE SCHEMA (CLEAN / PRODUCTION-READY)
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zcelikilvpwuabbklkhq/sql
-- ==============================================================================

-- 1. PROFILES TABLE (Students & Instructors)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT ('user_' || substr(md5(random()::text), 1, 10)),
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE,
  password TEXT NOT NULL DEFAULT '123456',
  gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female', 'Laki-laki', 'Perempuan')),
  class_name TEXT DEFAULT '7A',
  email TEXT,
  avatar_url TEXT DEFAULT '/assets/avatar.png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CLASS SESSIONS / MEETINGS TABLE
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY DEFAULT ('session_' || substr(md5(random()::text), 1, 10)),
  class_id TEXT NOT NULL DEFAULT 'class-1',
  session_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USER PROJECTS / FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.user_projects (
  id TEXT PRIMARY KEY DEFAULT ('proj_' || substr(md5(random()::text), 1, 10)),
  student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PROJECT FILES TABLE
CREATE TABLE IF NOT EXISTS public.project_files (
  id TEXT PRIMARY KEY DEFAULT ('file_' || substr(md5(random()::text), 1, 10)),
  project_id TEXT NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'html',
  mime_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable full access for anon/authenticated clients for classroom usage
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_projects" ON public.user_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to project_files" ON public.project_files FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- INITIAL INSTRUCTOR ACCOUNT (Clean - No Dummy Students)
-- ==============================================================================

INSERT INTO public.profiles (id, role, full_name, username, password, gender, class_name, email, avatar_url)
VALUES
  ('teacher-1', 'teacher', 'Mr. Miftah (Instructor)', 'guru', 'admin123', 'male', 'All Classes', 'guru@kodelab.edu', '/assets/avatar.png')
ON CONFLICT (id) DO NOTHING;
