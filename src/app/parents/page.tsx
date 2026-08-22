'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { store } from '@/lib/store';
import { UserProject, Meeting, Profile } from '@/types';
import { 
  Search, 
  X, 
  Sun, 
  Moon, 
  ArrowLeft, 
  ArrowUpRight,
  ChevronRight,
  Code2,
  Globe,
  Terminal,
  Laptop
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

function ParentShowcaseContent() {
  const searchParams = useSearchParams();
  const initialSessionParam = searchParams.get('session') || null;
  const initialStudentFilter = searchParams.get('student') || '';

  const { theme, toggleTheme } = useTheme();

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  
  // Selected Session (null = List of Sessions; string = Specific Session Student List)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionParam);

  // Filters inside Session
  const [searchQuery, setSearchQuery] = useState(initialStudentFilter);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Code inspection modal state
  const [inspectingProject, setInspectingProject] = useState<UserProject | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    store.syncWithSupabase().then(() => {
      loadData();
    }).catch(() => {});

    // Instant Realtime Subscription
    const unsubscribe = store.subscribeRealtime(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  const loadData = () => {
    const allProjects = store.getUserProjects();
    const sessionStudentProjects = allProjects.filter(
      p => Boolean(p.meeting_id) && (p.student?.role === 'student' || p.student_id !== 'teacher-1')
    );
    setProjects(sessionStudentProjects);

    const rawMeetings = store.getMeetings();
    const sortedMeetings = [...rawMeetings].sort((a, b) => {
      const numA = a.session_number || 0;
      const numB = b.session_number || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
    setMeetings(sortedMeetings);
    setStudents(store.getStudents());
  };

  const sessionStats = useMemo(() => {
    const map = new Map<string, { count: number; studentNames: string[]; studentClasses: Set<string> }>();
    meetings.forEach(m => {
      map.set(m.id, { count: 0, studentNames: [], studentClasses: new Set() });
    });

    projects.forEach(p => {
      if (p.meeting_id && map.has(p.meeting_id)) {
        const entry = map.get(p.meeting_id)!;
        entry.count += 1;
        if (p.student?.full_name) {
          entry.studentNames.push(p.student.full_name);
        }
        if (p.student?.class_name) {
          entry.studentClasses.add(p.student.class_name);
        }
      }
    });

    return map;
  }, [meetings, projects]);

  const activeSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return meetings.find(m => m.id === selectedSessionId) || null;
  }, [meetings, selectedSessionId]);

  const distinctClassesInSession = useMemo(() => {
    if (!selectedSessionId) return [];
    const classes = new Set<string>();
    projects
      .filter(p => p.meeting_id === selectedSessionId)
      .forEach(p => {
        if (p.student?.class_name) classes.add(p.student.class_name);
      });
    return Array.from(classes).sort();
  }, [projects, selectedSessionId]);

  const projectsInSelectedSession = useMemo(() => {
    if (!selectedSessionId) return [];
    return projects.filter(p => {
      if (p.meeting_id !== selectedSessionId) return false;
      const studentName = p.student?.full_name?.toLowerCase() || '';
      const projectName = p.name.toLowerCase();
      const studentClass = p.student?.class_name || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || studentName.includes(query) || projectName.includes(query) || studentClass.toLowerCase().includes(query);
      const matchesClass = selectedClassFilter === 'all' || studentClass === selectedClassFilter;

      return matchesSearch && matchesClass;
    });
  }, [projects, selectedSessionId, searchQuery, selectedClassFilter]);

  const handleOpenInspectCode = (project: UserProject) => {
    setInspectingProject(project);
    const firstFile = project.files && project.files.length > 0 ? project.files[0] : null;
    setSelectedFileId(firstFile ? firstFile.id : null);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 font-sans selection:bg-primary selection:text-white relative">
      
      {/* Background blueprint grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40 dark:opacity-25 -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/75 dark:bg-[#090a0f]/75 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 md:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main Gateway</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              Classroom Showcase
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* LEVEL 1: CLASS SESSIONS LIST                              */}
      {/* ========================================================= */}
      {!selectedSessionId ? (
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 animate-in fade-in duration-150">
          
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-primary font-bold">
              <span>●</span>
              <span>PORTFOLIO_INDEX</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Classroom Timeline
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Browse through published class meetings to view student code, projects, and learning photos.
            </p>
          </div>

          {meetings.length === 0 ? (
            <div className="bg-white dark:bg-[#12141c] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-mono">
              // No class sessions recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
              {meetings.map((session) => {
                const stats = sessionStats.get(session.id) || { count: 0, studentNames: [], studentClasses: new Set() };
                const classList = Array.from(stats.studentClasses).join(', ');

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setSearchQuery('');
                      setSelectedClassFilter('all');
                    }}
                    className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 hover:border-primary/50 transition-all cursor-pointer flex flex-col gap-4 group shadow-xs hover:shadow-md"
                  >
                    <div className="w-full h-32 md:h-40 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <img
                        src={session.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop'}
                        alt={session.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
                        {new Date(session.created_at || Date.now()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>

                      <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
                        {session.title}
                      </h2>

                      {session.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {session.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                      <span className="text-[10px] md:text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {stats.count} works {classList ? `• Class ${classList}` : ''}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        /* ========================================================= */
        /* LEVEL 2: SPECIFIC SESSION STUDENT PROJECTS                */
        /* ========================================================= */
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 animate-in fade-in duration-150 pb-24">
          
          <div>
            <button
              onClick={() => setSelectedSessionId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Sessions</span>
            </button>
          </div>

          {/* Documentation Hero Banner */}
          {activeSession && (
            <div className="relative h-48 md:h-56 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md">
              <img
                src={activeSession.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop'}
                alt={activeSession.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 text-white space-y-1.5">
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  ● {new Date(activeSession.created_at || Date.now()).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <h1 className="text-xl md:text-3xl font-black tracking-tight">
                  {activeSession.title}
                </h1>
                {activeSession.description && (
                  <p className="text-xs md:text-sm text-slate-300 line-clamp-2">
                    {activeSession.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="relative sm:col-span-8">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12141c] rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#12141c] rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              >
                <option value="all">All Classes</option>
                {distinctClassesInSession.map((cls) => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Projects List */}
          {projectsInSelectedSession.length === 0 ? (
            <div className="bg-white dark:bg-[#12141c] rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-mono">
              // No student projects match the search filter.
            </div>
          ) : (
            <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs overflow-hidden">
              {projectsInSelectedSession.map((project) => {
                const studentName = project.student?.full_name || 'Student';
                const studentClass = project.student?.class_name || '7A';
                const fileNames = project.files?.map(f => f.name).join(', ') || 'index.html';

                return (
                  <div
                    key={project.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {studentName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                          Class {studentClass}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        📁 {project.name} <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">({fileNames})</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => window.open(`/preview?project=${project.id}`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs min-h-[44px]"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Open Web</span>
                        <ArrowUpRight className="w-3 h-3 opacity-70" />
                      </button>

                      <button
                        onClick={() => handleOpenInspectCode(project)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700 min-h-[44px]"
                      >
                        <Code2 className="w-3.5 h-3.5 text-primary" />
                        <span>Code</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Code Modal with Terminal Decor */}
      {inspectingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Mac top bar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
                  {inspectingProject.name}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  — by {inspectingProject.student?.full_name} ({inspectingProject.student?.class_name})
                </span>
              </div>

              <button
                onClick={() => setInspectingProject(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectingProject.files && inspectingProject.files.length > 0 && (
              <div className="px-5 py-2 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
                {inspectingProject.files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all font-bold ${
                      file.id === selectedFileId
                        ? 'bg-primary text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 p-4 overflow-auto bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap select-all">
                {(() => {
                  const currentFile = inspectingProject.files?.find(f => f.id === selectedFileId) || inspectingProject.files?.[0];
                  if (!currentFile) return '// This folder has no code files.';
                  return currentFile.content || `/* ${currentFile.name} is empty */`;
                })()}
              </pre>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => window.open(`/preview?project=${inspectingProject.id}`, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Open Live Website</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => setInspectingProject(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ParentShowcasePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-500 font-mono">loading showcase...</div>}>
      <ParentShowcaseContent />
    </Suspense>
  );
}
