-- ==============================================================================
-- KODELAB SUPABASE DATABASE SCHEMA & PERMISSIONS FIX (RUN IN SQL EDITOR)
-- Link: https://supabase.com/dashboard/project/zcelikilvpwuabbklkhq/sql
-- ==============================================================================

-- 1. CREATE TABLES (IF NOT EXIST)
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

CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY DEFAULT ('session_' || substr(md5(random()::text), 1, 10)),
  class_id TEXT NOT NULL DEFAULT 'class-1',
  session_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  meeting_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_projects (
  id TEXT PRIMARY KEY DEFAULT ('proj_' || substr(md5(random()::text), 1, 10)),
  student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- 2. CRITICAL: GRANT PERMISSIONS TO ANON & AUTHENTICATED ROLES
-- (This fixes the 'permission denied for table' error!)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to meetings" ON public.meetings;
CREATE POLICY "Allow all access to meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to user_projects" ON public.user_projects;
CREATE POLICY "Allow all access to user_projects" ON public.user_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to project_files" ON public.project_files;
CREATE POLICY "Allow all access to project_files" ON public.project_files FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. DEFAULT INSTRUCTOR ACCOUNT
-- ==============================================================================
INSERT INTO public.profiles (id, role, full_name, username, password, gender, class_name, email, avatar_url)
VALUES
  ('teacher-1', 'teacher', 'Mr. Miftah (Instructor)', 'guru', 'admin123', 'male', 'All Classes', 'guru@kodelab.edu', '/assets/avatar.png')
ON CONFLICT (id) DO NOTHING;
