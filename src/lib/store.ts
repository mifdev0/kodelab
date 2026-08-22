'use client';

import { Profile, ClassRoom, Meeting, Submission, SubmissionStatus, UserProject, ProjectFile, EditorTab } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase/client';

// Initial default instructor profile (for fresh environments)
const INITIAL_PROFILES: Profile[] = [
  {
    id: 'teacher-1',
    role: 'teacher',
    full_name: 'Mr. Miftah (Instructor)',
    username: 'guru',
    password: 'admin123',
    gender: 'male',
    class_name: 'All Classes',
    email: 'guru@kodelab.edu',
    avatar_url: '/assets/avatar.png',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_CLASSES: ClassRoom[] = [];
const INITIAL_MEETINGS: Meeting[] = [];
const INITIAL_SUBMISSIONS: Submission[] = [];
const INITIAL_PROJECTS: UserProject[] = [];

// Helper functions for local state management with persistence
const getStored = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(`codecamp_${key}`);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.error('Storage get error:', e);
    return fallback;
  }
};

const setStored = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`codecamp_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Storage set error:', e);
  }
};

export const store = {
  // Profiles
  getProfiles(): Profile[] {
    return getStored<Profile[]>('profiles', INITIAL_PROFILES);
  },

  getProfile(id: string): Profile | undefined {
    return this.getProfiles().find(p => p.id === id);
  },

  getStudents(): Profile[] {
    return this.getProfiles().filter(p => p.role === 'student');
  },

  async updateStudentProfile(studentId: string, updates: Partial<Profile>): Promise<Profile | undefined> {
    const profiles = this.getProfiles();
    let updatedProfile: Profile | undefined;
    const updated = profiles.map(p => {
      if (p.id === studentId) {
        updatedProfile = { ...p, ...updates, updated_at: new Date().toISOString() };
        return updatedProfile;
      }
      return p;
    });
    setStored('profiles', updated);

    // Sync projects if name/class changed
    if (updates.full_name || updates.class_name || updates.username) {
      const projects = this.getUserProjects();
      const updatedProjects = projects.map(proj => {
        if (proj.student_id === studentId && updatedProfile) {
          return { ...proj, student: updatedProfile };
        }
        return proj;
      });
      setStored('user_projects', updatedProjects);
    }

    if (supabase && updatedProfile) {
      try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', studentId);
        if (error) console.warn('Supabase student update error:', error.message);
      } catch (e) {
        console.warn('Supabase student update network error:', e);
      }
    }

    return updatedProfile;
  },

  async resetStudentPassword(studentId: string, newPassword: string): Promise<Profile | undefined> {
    return await this.updateStudentProfile(studentId, { password: newPassword });
  },

  async deleteStudent(studentId: string): Promise<void> {
    const profiles = this.getProfiles();
    const filtered = profiles.filter(p => p.id !== studentId);
    setStored('profiles', filtered);

    // Remove user's projects
    const projects = this.getUserProjects();
    const filteredProjects = projects.filter(p => p.student_id !== studentId);
    setStored('user_projects', filteredProjects);

    // Remove user's submissions
    const subs = getStored<Submission[]>('submissions', INITIAL_SUBMISSIONS);
    const filteredSubs = subs.filter(s => s.student_id !== studentId);
    setStored('submissions', filteredSubs);

    if (supabase) {
      try {
        await supabase.from('project_files').delete().in('project_id', projects.filter(p => p.student_id === studentId).map(p => p.id));
        await supabase.from('user_projects').delete().eq('student_id', studentId);
        await supabase.from('submissions').delete().eq('student_id', studentId);
        await supabase.from('profiles').delete().eq('id', studentId);
      } catch (e) {
        console.warn('Supabase student deletion network error:', e);
      }
    }
  },

  // Classes
  getClasses(): ClassRoom[] {
    return getStored<ClassRoom[]>('classes', INITIAL_CLASSES);
  },

  createClass(name: string, description: string = ''): ClassRoom {
    const classes = this.getClasses();
    const newClass: ClassRoom = {
      id: `class-${Date.now()}`,
      name,
      teacher_id: 'teacher-1',
      teacher_name: 'Mr. Miftah',
      description,
      created_at: new Date().toISOString(),
    };
    const updated = [...classes, newClass];
    setStored('classes', updated);
    return newClass;
  },

  // Meetings / Class Sessions
  getMeetings(classId?: string): Meeting[] {
    const meetings = getStored<Meeting[]>('meetings', INITIAL_MEETINGS);
    if (!classId) return meetings;
    return meetings.filter(m => m.class_id === classId);
  },

  getMeeting(meetingId: string): Meeting | undefined {
    return this.getMeetings().find(m => m.id === meetingId);
  },

  async createMeeting(
    title: string,
    description: string = '',
    meeting_date: string = new Date().toISOString().split('T')[0],
    classId: string = 'class-1',
    banner_url?: string
  ): Promise<Meeting> {
    const meetings = this.getMeetings();
    const nextSessionNum = meetings.length > 0
      ? Math.max(...meetings.map(m => m.session_number || 0)) + 1
      : 1;

    const defaultBanner = banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop';

    const newMeeting: Meeting = {
      id: `meeting-${Date.now()}`,
      class_id: classId,
      session_number: nextSessionNum,
      title,
      description,
      banner_url: defaultBanner,
      meeting_date,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Deactivate previous active sessions
    const updated = meetings.map(m => ({ ...m, is_active: false }));
    updated.push(newMeeting);
    setStored('meetings', updated);

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('meetings').update({ is_active: false }).neq('id', newMeeting.id);
        const { error } = await supabase.from('meetings').upsert([newMeeting], { onConflict: 'id' });
        if (error) console.warn('Supabase meeting insert error:', error.message);
      } catch (e) {
        console.warn('Supabase meeting sync error:', e);
      }
    }

    return newMeeting;
  },

  async updateMeetingBanner(meetingId: string, bannerUrl: string): Promise<Meeting | undefined> {
    const meetings = this.getMeetings();
    let updatedMeeting: Meeting | undefined;
    const updated = meetings.map(m => {
      if (m.id === meetingId) {
        updatedMeeting = { ...m, banner_url: bannerUrl };
        return updatedMeeting;
      }
      return m;
    });
    setStored('meetings', updated);

    if (supabase) {
      try {
        await supabase.from('meetings').update({ banner_url: bannerUrl }).eq('id', meetingId);
      } catch (e) {
        console.warn('Supabase banner update error:', e);
      }
    }

    return updatedMeeting;
  },

  async deleteMeeting(meetingId: string): Promise<void> {
    const meetings = this.getMeetings();
    const filtered = meetings.filter(m => m.id !== meetingId);
    setStored('meetings', filtered);

    // Also remove projects associated with this meeting
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const filteredProjects = projects.filter(p => p.meeting_id !== meetingId);
    setStored('user_projects', filteredProjects);

    // Sync deletion to Supabase
    if (supabase) {
      try {
        await supabase.from('meetings').delete().eq('id', meetingId);
      } catch (e) {
        console.warn('Supabase meeting delete error:', e);
      }
    }
  },

  async setActiveMeeting(meetingId: string): Promise<void> {
    const meetings = this.getMeetings();
    const updated = meetings.map(m => ({
      ...m,
      is_active: m.id === meetingId,
    }));
    setStored('meetings', updated);

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('meetings').update({ is_active: false }).neq('id', meetingId);
        await supabase.from('meetings').update({ is_active: true }).eq('id', meetingId);
      } catch (e) {
        console.warn('Supabase meeting set active error:', e);
      }
    }
  },

  async toggleMeetingStatus(meetingId: string): Promise<boolean> {
    const meetings = this.getMeetings();
    let newStatus = false;
    const updated = meetings.map(m => {
      if (m.id === meetingId) {
        newStatus = !m.is_active;
        return { ...m, is_active: newStatus };
      }
      return m;
    });
    setStored('meetings', updated);

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('meetings').update({ is_active: newStatus }).eq('id', meetingId);
      } catch (e) {
        console.warn('Supabase meeting toggle status error:', e);
      }
    }

    return newStatus;
  },

  isMeetingActive(meetingId?: string): boolean {
    if (!meetingId) return true;
    const meeting = this.getMeeting(meetingId);
    return meeting ? meeting.is_active : true;
  },

  // Submissions
  getSubmissions(meetingId?: string, studentId?: string): Submission[] {
    let subs = getStored<Submission[]>('submissions', INITIAL_SUBMISSIONS);
    if (meetingId) {
      subs = subs.filter(s => s.meeting_id === meetingId);
    }
    if (studentId) {
      subs = subs.filter(s => s.student_id === studentId);
    }
    const profiles = this.getProfiles();
    const meetings = this.getMeetings();

    return subs.map(s => ({
      ...s,
      student: profiles.find(p => p.id === s.student_id),
      meeting: meetings.find(m => m.id === s.meeting_id),
    }));
  },

  getSubmissionById(submissionId: string): Submission | undefined {
    return this.getSubmissions().find(s => s.id === submissionId);
  },

  getStudentSubmission(meetingId: string, studentId: string): Submission | undefined {
    return this.getSubmissions(meetingId, studentId)[0];
  },

  saveDraft(
    meetingId: string,
    studentId: string,
    html_code: string,
    css_code: string,
    js_code: string
  ): Submission {
    const subs = getStored<Submission[]>('submissions', INITIAL_SUBMISSIONS);
    const existingIndex = subs.findIndex(
      s => s.meeting_id === meetingId && s.student_id === studentId
    );

    const now = new Date().toISOString();
    const existing = existingIndex >= 0 ? subs[existingIndex] : null;

    const updatedSub: Submission = {
      id: existing ? existing.id : `sub-${Date.now()}`,
      meeting_id: meetingId,
      student_id: studentId,
      html_code,
      css_code,
      js_code,
      status: existing && existing.status === 'submitted' ? 'submitted' : 'in_progress',
      teacher_feedback: existing ? existing.teacher_feedback : null,
      updated_at: now,
      submitted_at: existing ? existing.submitted_at : null,
    };

    const newSubs = [...subs];
    if (existingIndex >= 0) {
      newSubs[existingIndex] = updatedSub;
    } else {
      newSubs.push(updatedSub);
    }
    setStored('submissions', newSubs);
    return updatedSub;
  },

  submitAssignment(
    meetingId: string,
    studentId: string,
    html_code: string,
    css_code: string,
    js_code: string
  ): Submission {
    const subs = getStored<Submission[]>('submissions', INITIAL_SUBMISSIONS);
    const existingIndex = subs.findIndex(
      s => s.meeting_id === meetingId && s.student_id === studentId
    );

    const now = new Date().toISOString();
    const existing = existingIndex >= 0 ? subs[existingIndex] : null;

    const updatedSub: Submission = {
      id: existing ? existing.id : `sub-${Date.now()}`,
      meeting_id: meetingId,
      student_id: studentId,
      html_code,
      css_code,
      js_code,
      status: 'submitted',
      teacher_feedback: existing ? existing.teacher_feedback : null,
      updated_at: now,
      submitted_at: now,
    };

    const newSubs = [...subs];
    if (existingIndex >= 0) {
      newSubs[existingIndex] = updatedSub;
    } else {
      newSubs.push(updatedSub);
    }
    setStored('submissions', newSubs);
    return updatedSub;
  },

  saveTeacherFeedback(
    submissionId: string,
    feedback: string,
    statusOverride?: SubmissionStatus
  ): Submission | undefined {
    const subs = getStored<Submission[]>('submissions', INITIAL_SUBMISSIONS);
    const index = subs.findIndex(s => s.id === submissionId);
    if (index === -1) return undefined;

    subs[index] = {
      ...subs[index],
      teacher_feedback: feedback,
      status: statusOverride || subs[index].status,
      updated_at: new Date().toISOString(),
    };

    setStored('submissions', subs);
    return this.getSubmissionById(submissionId);
  },

  async createStudent(
    name: string,
    email?: string,
    gender: 'male' | 'female' | 'Laki-laki' | 'Perempuan' = 'male',
    className: string = '7A',
    customUsername?: string,
    password?: string
  ): Promise<Profile> {
    const profiles = this.getProfiles();
    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    const username = customUsername?.trim() || `${slug}.${className.toLowerCase().replace(/[^a-z0-9]/g, '') || '7a'}`;

    const newStudent: Profile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: 'student',
      full_name: cleanName,
      username,
      password: password || '123456',
      gender,
      class_name: className,
      email: email || `${slug}@student.kodelab.edu`,
      avatar_url: '/assets/avatar.png',
      created_at: new Date().toISOString(),
    };

    // 1. Always save to localStorage immediately (offline-first)
    const updated = [...profiles, newStudent];
    setStored('profiles', updated);

    // 2. If Supabase is configured, AWAIT the insert to guarantee cloud persistence
    if (supabase) {
      try {
        const { error } = await supabase.from('profiles').upsert([newStudent], { onConflict: 'id' });
        if (error) console.warn('Supabase profile insert error:', error.message);
      } catch (e) {
        console.warn('Supabase profile insert network error:', e);
      }
    }

    return newStudent;
  },

  async registerStudent(data: {
    full_name: string;
    gender: 'male' | 'female' | 'Laki-laki' | 'Perempuan';
    class_name: string;
    username: string;
    password: string;
  }): Promise<Profile> {
    return await this.createStudent(
      data.full_name,
      undefined,
      data.gender,
      data.class_name,
      data.username,
      data.password
    );
  },

  async bulkCreateStudents(
    classId: string = 'class-1',
    names: string[],
    className: string = '7A',
    defaultPassword: string = '123456'
  ): Promise<Profile[]> {
    const newProfiles: Profile[] = [];
    for (const name of names) {
      if (name.trim()) {
        const student = await this.createStudent(name.trim(), undefined, 'male', className, undefined, defaultPassword);
        newProfiles.push(student);
      }
    }
    return newProfiles;
  },

  // Force-fetch profiles from Supabase and merge with local (always gets latest cloud data)
  async forceSyncProfiles(): Promise<Profile[]> {
    if (!supabase) return this.getProfiles();
    try {
      const { data: dbProfiles, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.warn('Supabase forceSyncProfiles error:', error.message);
        return this.getProfiles();
      }

      const local = this.getProfiles();
      const mergedMap = new Map<string, Profile>();

      // Start with local data
      local.forEach(p => mergedMap.set(p.id, p));

      // Cloud data overwrites (it's the source of truth for cross-device)
      if (dbProfiles && dbProfiles.length > 0) {
        dbProfiles.forEach((p: any) => mergedMap.set(p.id, p));
      }

      // Also push any local-only profiles to Supabase (e.g. default teacher profile)
      const cloudIds = new Set((dbProfiles || []).map((p: any) => p.id));
      const localOnly = local.filter(p => !cloudIds.has(p.id));
      if (localOnly.length > 0) {
        await supabase.from('profiles').upsert(localOnly, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.warn('Supabase push local profiles error:', error.message);
        });
      }

      const merged = Array.from(mergedMap.values());
      setStored('profiles', merged);
      return merged;
    } catch (e) {
      console.warn('forceSyncProfiles network error:', e);
      return this.getProfiles();
    }
  },

  async syncWithSupabase(): Promise<void> {
    if (!supabase) return;
    try {
      // 1. Bidirectional sync profiles
      await this.forceSyncProfiles();

      // 2. Sync meetings (bidirectional)
      const { data: dbMeetings } = await supabase.from('meetings').select('*').order('session_number', { ascending: true });
      const localMeetings = this.getMeetings();
      if (dbMeetings && dbMeetings.length > 0) {
        const meetingMap = new Map<string, Meeting>();
        localMeetings.forEach(m => meetingMap.set(m.id, m));
        dbMeetings.forEach((m: any) => meetingMap.set(m.id, m));
        // Push local-only meetings to cloud
        const cloudMeetingIds = new Set(dbMeetings.map((m: any) => m.id));
        const localOnlyMeetings = localMeetings.filter(m => !cloudMeetingIds.has(m.id));
        if (localOnlyMeetings.length > 0) {
          await supabase.from('meetings').upsert(localOnlyMeetings.map(m => ({
            id: m.id, class_id: m.class_id, session_number: m.session_number,
            title: m.title, description: m.description, banner_url: m.banner_url,
            meeting_date: m.meeting_date, is_active: m.is_active, created_at: m.created_at,
          })), { onConflict: 'id' });
        }
        setStored('meetings', Array.from(meetingMap.values()));
      } else if (localMeetings.length > 0) {
        // No cloud meetings, push all local ones
        await supabase.from('meetings').upsert(localMeetings.map(m => ({
          id: m.id, class_id: m.class_id, session_number: m.session_number,
          title: m.title, description: m.description, banner_url: m.banner_url,
          meeting_date: m.meeting_date, is_active: m.is_active, created_at: m.created_at,
        })), { onConflict: 'id' });
      }

      // 3. Sync user projects (bidirectional)
      const { data: dbProjects } = await supabase.from('user_projects').select('*, project_files(*)');
      const localProjects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
      
      if (dbProjects && dbProjects.length > 0) {
        const projMap = new Map<string, UserProject>();
        localProjects.forEach(p => projMap.set(p.id, p));
        dbProjects.forEach((p: any) => {
          projMap.set(p.id, {
            id: p.id,
            student_id: p.student_id,
            meeting_id: p.meeting_id,
            name: p.name,
            description: p.description,
            created_at: p.created_at,
            updated_at: p.updated_at,
            files: (p.project_files || []).map((f: any) => ({
              id: f.id, name: f.name, content: f.content,
              language: f.language, mime_type: f.mime_type, updated_at: f.updated_at,
            }))
          });
        });

        // Push local-only projects
        const cloudProjIds = new Set(dbProjects.map((p: any) => p.id));
        const localOnlyProjects = localProjects.filter(p => !cloudProjIds.has(p.id));
        for (const proj of localOnlyProjects) {
          await supabase.from('user_projects').upsert([{
            id: proj.id, student_id: proj.student_id,
            meeting_id: proj.meeting_id || null, name: proj.name,
            description: proj.description, created_at: proj.created_at,
          }], { onConflict: 'id' });
          // Push files for local-only projects
          if (proj.files && proj.files.length > 0) {
            await supabase.from('project_files').upsert(
              proj.files.map(f => ({
                id: f.id, project_id: proj.id, name: f.name,
                content: f.content, language: f.language,
              })),
              { onConflict: 'id' }
            );
          }
        }

        setStored('user_projects', Array.from(projMap.values()));
      } else if (localProjects.length > 0) {
        // Push all local projects to cloud
        for (const proj of localProjects) {
          await supabase.from('user_projects').upsert([{
            id: proj.id, student_id: proj.student_id,
            meeting_id: proj.meeting_id || null, name: proj.name,
            description: proj.description, created_at: proj.created_at,
          }], { onConflict: 'id' });
          if (proj.files && proj.files.length > 0) {
            await supabase.from('project_files').upsert(
              proj.files.map(f => ({
                id: f.id, project_id: proj.id, name: f.name,
                content: f.content, language: f.language,
              })),
              { onConflict: 'id' }
            );
          }
        }
      }
    } catch (e) {
      console.warn('Supabase sync notice:', e);
    }
  },

  // ==========================================
  // CUSTOM USER PROJECTS & SESSION FOLDERS
  // ==========================================
  getUserProjects(studentId?: string, meetingId?: string): UserProject[] {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const profiles = this.getProfiles();

    let list = projects;
    if (studentId) {
      list = list.filter(p => p.student_id === studentId);
    }
    if (meetingId) {
      list = list.filter(p => p.meeting_id === meetingId);
    }

    return list.map(p => ({
      ...p,
      student: profiles.find(prof => prof.id === p.student_id),
    }));
  },

  getProjectsByMeeting(meetingId: string): UserProject[] {
    return this.getUserProjects(undefined, meetingId);
  },

  getPersonalProjects(studentId?: string): UserProject[] {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const profiles = this.getProfiles();

    let list = projects.filter(p => !p.meeting_id);
    if (studentId) {
      list = list.filter(p => p.student_id === studentId);
    }

    return list.map(p => ({
      ...p,
      student: profiles.find(prof => prof.id === p.student_id),
    }));
  },

  getUserProject(projectId: string): UserProject | undefined {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return undefined;

    const profiles = this.getProfiles();
    return {
      ...proj,
      student: profiles.find(prof => prof.id === proj.student_id),
    };
  },

  createUserProject(
    studentId: string,
    name: string,
    description: string = '',
    withStarterFiles: boolean = false,
    meetingId?: string
  ): UserProject {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const now = new Date().toISOString();

    const initialFiles: ProjectFile[] = withStarterFiles
      ? [
          {
            id: `f-${Date.now()}-html`,
            name: 'index.html',
            language: 'html',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>${name}</h1>
  <p>Start writing your code here!</p>
  <script src="script.js"></script>
</body>
</html>`,
            updated_at: now,
          },
          {
            id: `f-${Date.now()}-css`,
            name: 'style.css',
            language: 'css',
            content: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background-color: #f9f9f9;
  color: #1a1c1c;
}`,
            updated_at: now,
          },
          {
            id: `f-${Date.now()}-js`,
            name: 'script.js',
            language: 'js',
            content: `console.log("${name} loaded successfully!");`,
            updated_at: now,
          },
        ]
      : [];

    const newProject: UserProject = {
      id: `proj-${Date.now()}`,
      student_id: studentId,
      meeting_id: meetingId,
      name,
      description,
      created_at: now,
      updated_at: now,
      files: initialFiles,
    };

    const updated = [newProject, ...projects];
    setStored('user_projects', updated);

    // Sync project to Supabase
    if (supabase) {
      supabase.from('user_projects').insert([{
        id: newProject.id,
        student_id: newProject.student_id,
        meeting_id: newProject.meeting_id || null,
        name: newProject.name,
        description: newProject.description,
      }]).then(() => {});
    }

    return newProject;
  },

  deleteUserProject(projectId: string): void {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const filtered = projects.filter(p => p.id !== projectId);
    setStored('user_projects', filtered);

    if (supabase) {
      supabase.from('user_projects').delete().eq('id', projectId).then(() => {});
    }
  },

  updateProjectInfo(projectId: string, name: string, description: string = ''): UserProject | undefined {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) return undefined;

    projects[index] = {
      ...projects[index],
      name,
      description,
      updated_at: new Date().toISOString(),
    };
    setStored('user_projects', projects);

    if (supabase) {
      supabase.from('user_projects').update({ name, description }).eq('id', projectId).then(() => {});
    }

    return projects[index];
  },

  addProjectFile(projectId: string, fileName: string, initialContent: string = ''): ProjectFile | undefined {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return undefined;

    const ext = fileName.split('.').pop()?.toLowerCase();
    let language: EditorTab = 'html';
    if (ext === 'css') language = 'css';
    else if (ext === 'js' || ext === 'javascript') language = 'js';
    else if (ext && ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) language = 'image' as any;

    const existingFileIndex = projects[projectIndex].files.findIndex(f => f.name === fileName);
    if (existingFileIndex >= 0) {
      projects[projectIndex].files[existingFileIndex].content = initialContent;
      projects[projectIndex].files[existingFileIndex].updated_at = new Date().toISOString();
      projects[projectIndex].updated_at = new Date().toISOString();
      setStored('user_projects', projects);
      if (supabase) {
        supabase.from('project_files').update({ content: initialContent, updated_at: new Date().toISOString() }).eq('id', projects[projectIndex].files[existingFileIndex].id).then(() => {});
      }
      return projects[projectIndex].files[existingFileIndex];
    }

    const newFile: ProjectFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: fileName,
      language,
      content: initialContent,
      updated_at: new Date().toISOString(),
    };

    projects[projectIndex].files.push(newFile);
    projects[projectIndex].updated_at = new Date().toISOString();
    setStored('user_projects', projects);

    if (supabase) {
      supabase.from('project_files').insert([{
        id: newFile.id,
        project_id: projectId,
        name: newFile.name,
        content: newFile.content,
        language: newFile.language,
      }]).then(() => {});
    }

    return newFile;
  },

  updateProjectFileContent(projectId: string, fileId: string, content: string): void {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    const fileIndex = projects[projectIndex].files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;

    projects[projectIndex].files[fileIndex].content = content;
    projects[projectIndex].files[fileIndex].updated_at = new Date().toISOString();
    projects[projectIndex].updated_at = new Date().toISOString();
    setStored('user_projects', projects);

    if (supabase) {
      supabase.from('project_files').update({ content, updated_at: new Date().toISOString() }).eq('id', fileId).then(() => {});
    }
  },

  deleteProjectFile(projectId: string, fileId: string): void {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    projects[projectIndex].files = projects[projectIndex].files.filter(f => f.id !== fileId);
    projects[projectIndex].updated_at = new Date().toISOString();
    setStored('user_projects', projects);

    if (supabase) {
      supabase.from('project_files').delete().eq('id', fileId).then(() => {});
    }
  },

  renameProjectFile(projectId: string, fileId: string, newName: string): void {
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    const fileIndex = projects[projectIndex].files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;

    const ext = newName.split('.').pop()?.toLowerCase();
    let language: EditorTab = 'html';
    if (ext === 'css') language = 'css';
    if (ext === 'js') language = 'js';

    projects[projectIndex].files[fileIndex].name = newName;
    projects[projectIndex].files[fileIndex].language = language;
    projects[projectIndex].files[fileIndex].updated_at = new Date().toISOString();
    setStored('user_projects', projects);

    if (supabase) {
      supabase.from('project_files').update({ name: newName, language }).eq('id', fileId).then(() => {});
    }
  },

  // Get Students Directory with stats
  getStudentsWithStats(): (Profile & { totalProjects: number; sessionsJoined: number; recentProjects: UserProject[] })[] {
    const students = this.getStudents();
    const projects = getStored<UserProject[]>('user_projects', INITIAL_PROJECTS);

    return students.map(student => {
      const studentProjects = projects.filter(p => p.student_id === student.id);
      const distinctSessions = new Set(
        studentProjects.filter(p => p.meeting_id).map(p => p.meeting_id)
      );

      return {
        ...student,
        totalProjects: studentProjects.length,
        sessionsJoined: distinctSessions.size,
        recentProjects: studentProjects,
      };
    });
  },

  resetToDefault(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('codecamp_profiles');
    localStorage.removeItem('codecamp_classes');
    localStorage.removeItem('codecamp_meetings');
    localStorage.removeItem('codecamp_submissions');
    localStorage.removeItem('codecamp_user_projects');
  },
};
