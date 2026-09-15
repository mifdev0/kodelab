'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { useLayout } from '@/lib/layout-context';
import { useTheme } from '@/lib/theme-context';
import { UserProject, Meeting, Profile } from '@/types';
import { 
  Award, 
  Search, 
  Folder, 
  Globe, 
  Code2, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Star, 
  PanelLeft, 
  Sun, 
  Moon, 
  ArrowLeft,
  Sparkles,
  ChevronDown,
  Trash2,
  ExternalLink,
  MessageSquare,
  Filter
} from 'lucide-react';

export default function StudentGradesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ungraded' | 'graded'>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Grading Modal State
  const [gradingProject, setGradingProject] = useState<UserProject | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('100');
  const [noteInput, setNoteInput] = useState<string>('');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  const loadData = useCallback(() => {
    // Only student projects that belong to a class session
    const all = store.getUserProjects();
    const sessionWorks = all.filter(p => Boolean(p.meeting_id) && (p.student?.role === 'student' || p.student_id !== 'teacher-1'));
    setProjects(sessionWorks);

    const mList = store.getMeetings();
    const sortedMeetings = [...mList].sort((a, b) => (b.session_number || 0) - (a.session_number || 0));
    setMeetings(sortedMeetings);

    setStudents(store.getStudents());
  }, []);

  const handleSyncCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      await store.syncWithSupabase();
      loadData();
    } catch (e) {
      console.warn('Sync notice:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
    handleSyncCloud();

    const unsubscribe = store.subscribeRealtime(() => {
      loadData();
    });

    return () => unsubscribe();
  }, [loadData, handleSyncCloud]);

  // Distinct classes list
  const distinctClasses = useMemo(() => {
    const classes = new Set<string>();
    projects.forEach(p => {
      if (p.student?.class_name) classes.add(p.student.class_name);
    });
    return Array.from(classes).sort();
  }, [projects]);

  // Statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const graded = projects.filter(p => p.score !== undefined && p.score !== null).length;
    const ungraded = total - graded;
    const scores = projects
      .filter(p => p.score !== undefined && p.score !== null)
      .map(p => Number(p.score));
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

    return { total, graded, ungraded, avg };
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // 1. Session filter
      if (selectedMeetingId !== 'all' && p.meeting_id !== selectedMeetingId) {
        return false;
      }

      // 2. Status filter
      const isGraded = p.score !== undefined && p.score !== null;
      if (statusFilter === 'ungraded' && isGraded) return false;
      if (statusFilter === 'graded' && !isGraded) return false;

      // 3. Class filter
      if (selectedClassFilter !== 'all' && p.student?.class_name !== selectedClassFilter) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = (p.student?.full_name || p.name || '').toLowerCase();
        const username = (p.student?.username || '').toLowerCase();
        const projectName = p.name.toLowerCase();
        const className = (p.student?.class_name || '').toLowerCase();
        const match = studentName.includes(q) || username.includes(q) || projectName.includes(q) || className.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [projects, selectedMeetingId, statusFilter, selectedClassFilter, searchQuery]);

  // Open modal
  const handleOpenGradeModal = (proj: UserProject) => {
    setGradingProject(proj);
    setScoreInput(proj.score !== undefined && proj.score !== null ? String(proj.score) : '100');
    setNoteInput(proj.teacher_feedback || '');
  };

  // Close modal
  const handleCloseModal = () => {
    setGradingProject(null);
  };

  // Submit Grade
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingProject) return;

    const numScore = Math.max(0, Math.min(100, Number(scoreInput) || 0));
    const updated = store.gradeProject(gradingProject.id, numScore, noteInput);

    loadData();
    setSaveSuccessToast(`Nilai untuk ${gradingProject.student?.full_name || gradingProject.name} berhasil disimpan! (${numScore}/100)`);
    setTimeout(() => setSaveSuccessToast(null), 3000);
    handleCloseModal();
  };

  // Reset / Remove Grade
  const handleRemoveGrade = () => {
    if (!gradingProject) return;
    store.removeProjectGrade(gradingProject.id);
    loadData();
    setSaveSuccessToast(`Nilai untuk ${gradingProject.student?.full_name || gradingProject.name} telah direset.`);
    setTimeout(() => setSaveSuccessToast(null), 3000);
    handleCloseModal();
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors relative">
      
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/30 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs md:text-sm font-bold">{saveSuccessToast}</span>
        </div>
      )}

      {/* Top Floating App Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-white/80 dark:bg-[#090a0f]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs md:text-sm truncate">
            <Link
              href="/dashboard"
              className="font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <Award className="w-4 h-4 text-primary shrink-0" />
              <span>Penilaian Siswa</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
            title="Sync latest data from Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sync Cloud'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-6 pb-20">
        
        {/* Top Summary Banner */}
        <section className="bg-white dark:bg-[#12141c] p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold font-mono text-primary uppercase tracking-wider">
              <span>●</span>
              <span>EVALUATION_PORTAL</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Penilaian Tugas & Folder Coding
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Pantau kelengkapan penilaian siswa di setiap sesi pertemuan. Berikan nilai (0 - 100) dan catatan masukan agar siswa termotivasi belajar pemrograman web.
            </p>
          </div>

          {/* Quick KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Total Karya
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.total}
              </span>
            </div>

            <div 
              onClick={() => setStatusFilter('ungraded')}
              className="bg-amber-500/10 hover:bg-amber-500/20 p-3.5 rounded-2xl border border-amber-500/20 text-center space-y-0.5 cursor-pointer transition-all group"
              title="Klik untuk filter yang belum dinilai"
            >
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider block">
                Belum Dinilai
              </span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-300 group-hover:scale-105 transition-transform inline-block">
                {stats.ungraded}
              </span>
            </div>

            <div 
              onClick={() => setStatusFilter('graded')}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 p-3.5 rounded-2xl border border-emerald-500/20 text-center space-y-0.5 cursor-pointer transition-all group"
              title="Klik untuk filter yang sudah dinilai"
            >
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider block">
                Sudah Dinilai
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform inline-block">
                {stats.graded}
              </span>
            </div>

            <div className="bg-blue-500/10 p-3.5 rounded-2xl border border-blue-500/20 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 tracking-wider block">
                Rata-rata
              </span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                {stats.avg}
              </span>
            </div>
          </div>
        </section>

        {/* Filter Controls Bar */}
        <section className="bg-white dark:bg-[#12141c] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-[#1a1d27] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Semua ({stats.total})
              </button>

              <button
                onClick={() => setStatusFilter('ungraded')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'ungraded'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Belum Dinilai ({stats.ungraded})</span>
              </button>

              <button
                onClick={() => setStatusFilter('graded')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'graded'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sudah Dinilai ({stats.graded})</span>
              </button>
            </div>

            {/* Total matching badge */}
            <span className="text-xs text-slate-400 font-mono font-semibold">
              Menampilkan {filteredProjects.length} dari {stats.total} folder
            </span>
          </div>

          {/* Secondary Filters: Session, Class, and Search Input */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            
            {/* Session Selector */}
            <div className="sm:col-span-4">
              <div className="relative">
                <select
                  value={selectedMeetingId}
                  onChange={(e) => setSelectedMeetingId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors appearance-none pr-8 cursor-pointer min-h-[42px]"
                >
                  <option value="all">📚 Semua Sesi Pertemuan ({meetings.length})</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      Sesi {m.session_number}: {m.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Class Selector */}
            <div className="sm:col-span-3">
              <div className="relative">
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors appearance-none pr-8 cursor-pointer min-h-[42px]"
                >
                  <option value="all">🏫 Semua Kelas</option>
                  {distinctClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama siswa, username, atau folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors min-h-[42px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

        </section>

        {/* Projects List Table / Cards */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-[#12141c] rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                Tidak ada folder yang sesuai dengan filter
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coba ubah status filter penilaian atau kata kunci pencarian Anda untuk melihat folder siswa lainnya.
              </p>
            </div>
            {(statusFilter !== 'all' || selectedMeetingId !== 'all' || selectedClassFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedMeetingId('all');
                  setSelectedClassFilter('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((project) => {
              const studentName = project.student?.full_name || project.name;
              const studentUsername = project.student?.username || 'student';
              const studentClass = project.student?.class_name || '7A';
              const meeting = meetings.find(m => m.id === project.meeting_id);
              const isGraded = project.score !== undefined && project.score !== null;
              const fileCount = project.files?.length || 0;
              const fileNames = project.files?.map(f => f.name).join(', ') || 'index.html';

              return (
                <div
                  key={project.id}
                  className={`bg-white dark:bg-[#12141c] rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 hover:shadow-md ${
                    isGraded
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-amber-500/40 dark:border-amber-500/30 bg-amber-500/[0.02]'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: Student Profile & Session Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary-light flex items-center justify-center font-black text-sm shrink-0 border border-primary/20">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {studentName}
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 shrink-0">
                              Kelas {studentClass}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">
                            @{studentUsername}
                          </span>
                        </div>
                      </div>

                      {/* Grade Status Badge */}
                      {isGraded ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs shrink-0">
                          <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                          <span>{project.score} / 100</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs shrink-0 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Belum Dinilai</span>
                        </div>
                      )}
                    </div>

                    {/* Meeting & Folder Details */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 truncate">
                          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{meeting ? `Sesi ${meeting.session_number}: ${meeting.title}` : 'Sesi Pertemuan'}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {fileCount} {fileCount === 1 ? 'file' : 'files'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{project.name}</span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                        {fileNames}
                      </div>
                    </div>

                    {/* Teacher Feedback Quote if graded */}
                    {isGraded && project.teacher_feedback && (
                      <div className="p-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                          <MessageSquare className="w-3 h-3" />
                          <span>Catatan Guru:</span>
                        </div>
                        <p className="italic text-slate-600 dark:text-slate-300 leading-relaxed">
                          &quot;{project.teacher_feedback}&quot;
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    
                    {/* Live Preview & Code Inspection Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => window.open(`/preview?project=${project.id}`, '_blank')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors min-h-[36px]"
                        title="Buka Live Web siswa di tab baru"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Live Web</span>
                      </button>

                      <button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors min-h-[36px]"
                        title="Lihat source code siswa di editor"
                      >
                        <Code2 className="w-3.5 h-3.5 text-primary" />
                        <span>Kode</span>
                      </button>
                    </div>

                    {/* Grade Button */}
                    <button
                      onClick={() => handleOpenGradeModal(project)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs min-h-[36px] ${
                        isGraded
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-primary hover:bg-primary-hover text-white ring-2 ring-primary/20'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{isGraded ? 'Edit Nilai' : 'Beri Nilai'}</span>
                    </button>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Grading Modal */}
      {gradingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Penilaian Karya Siswa
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {gradingProject.student?.full_name || gradingProject.name} (Kelas {gradingProject.student?.class_name || '7A'})
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveGrade} className="p-6 space-y-5">
              
              {/* Folder Context Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {gradingProject.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.open(`/preview?project=${gradingProject.id}`, '_blank')}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <span>Cek Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Score Input (0 - 100) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                    Nilai Siswa (Maks. 100)
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    {scoreInput || '0'} / 100
                  </span>
                </div>

                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={scoreInput}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setScoreInput(e.target.value === '' ? '' : String(val));
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xl font-black font-mono border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center"
                  placeholder="100"
                />

                {/* Quick Score Presets */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {['100', '95', '90', '85', '80', '75'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setScoreInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                        scoreInput === preset
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher Feedback / Note Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Catatan / Masukan Guru (Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Contoh: Bagus sekali! Struktur HTML dan penamaan tag sudah tepat. Pertahankan semangat belajarnya..."
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                {gradingProject.score !== undefined && gradingProject.score !== null ? (
                  <button
                    type="button"
                    onClick={handleRemoveGrade}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Nilai</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors"
                  >
                    Simpan Penilaian
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
