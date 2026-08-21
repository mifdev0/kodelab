export type UserRole = 'teacher' | 'student';

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  username?: string;
  password?: string;
  gender?: 'male' | 'female' | 'Laki-laki' | 'Perempuan';
  class_name?: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacher_id: string;
  teacher_name?: string;
  description?: string;
  created_at: string;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  student?: Profile;
}

export interface Meeting {
  id: string;
  class_id: string;
  session_number: number;
  title: string;
  description?: string;
  banner_url?: string;
  meeting_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  meeting_id: string;
  student_id: string;
  html_code: string;
  css_code: string;
  js_code: string;
  status: SubmissionStatus;
  teacher_feedback?: string | null;
  updated_at: string;
  submitted_at?: string | null;
  student?: Profile;
  meeting?: Meeting;
}

export type EditorTab = 'html' | 'css' | 'js' | 'image' | 'other';

export interface ProjectFile {
  id: string;
  name: string; // e.g. "index.html", "style.css", "banner.png", "logo.svg"
  content: string; // Text string or Data URL for images
  language: EditorTab;
  updated_at: string;
  is_binary?: boolean;
  mime_type?: string;
}

export interface UserProject {
  id: string;
  student_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  files: ProjectFile[];
  meeting_id?: string;
  student?: Profile;
}
