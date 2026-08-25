'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { useLayout } from '@/lib/layout-context';
import { useTheme } from '@/lib/theme-context';
import { Meeting, UserProject, Profile } from '@/types';
import ConfirmModal from '@/components/ConfirmModal';
import { 
  Users, 
  Folder, 
  FolderPlus, 
  Plus, 
  Calendar, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  FileCode, 
  Clock, 
  Trash2, 
  Sparkles, 
  PanelLeft, 
  Sun, 
  Moon,
  BookOpen,
  Code2,
  Check,
  Globe,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

export default function TeacherSessionsDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [sessionProjects, setSessionProjects] = useState<UserProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDesc, setNewSessionDesc] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionBanner, setNewSessionBanner] = useState('');

  // Banner / Documentation Image Modal for Teachers
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerMeeting, setEditingBannerMeeting] = useState<Meeting | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Initial Load & Realtime Sync
  useEffect(() => {
    loadData();
    // Force sync fresh meetings and projects from Supabase
    store.syncWithSupabase().then(() => {
      loadData();
    }).catch(() => {});

    // Instant Realtime Subscription (<100ms sync across teacher & student devices)
    const unsubscribe = store.subscribeRealtime(() => {
      const list = store.getMeetings();
      setMeetings(list);
      setSelectedMeetingId(currentSelectedId => {
        const targetId = currentSelectedId && list.some(m => m.id === currentSelectedId)
          ? currentSelectedId
          : (list.find(m => m.is_active)?.id || list[0]?.id || '');
        if (targetId) {
          setSessionProjects(store.getProjectsByMeeting(targetId));
        } else {
          setSessionProjects([]);
        }
        return targetId;
      });
    });

    return () => unsubscribe();
  }, []);

  const loadData = () => {
    const list = store.getMeetings();
    setMeetings(list);

    const active = list.find(m => m.is_active) || list[0];
    if (active) {
      setSelectedMeetingId(active.id);
      loadProjectsForMeeting(active.id);
    } else {
      setSelectedMeetingId('');
      setSessionProjects([]);
    }
  };

  const loadProjectsForMeeting = (meetingId: string) => {
    const projs = store.getProjectsByMeeting(meetingId);
    setSessionProjects(projs);
  };

  const handleSelectMeeting = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    loadProjectsForMeeting(meetingId);
  };

  const handleToggleSessionStatus = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await store.toggleMeetingStatus(meetingId);
    const updated = store.getMeetings();
    setMeetings(updated);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;

    const created = await store.createMeeting(
      newSessionTitle.trim(),
      newSessionDesc.trim(),
      newSessionDate,
      'class-1',
      newSessionBanner.trim() || undefined
    );

    setIsNewSessionModalOpen(false);
    setNewSessionTitle('');
    setNewSessionDesc('');
    setNewSessionBanner('');
    
    const updated = store.getMeetings();
    setMeetings(updated);
    setSelectedMeetingId(created.id);
    loadProjectsForMeeting(created.id);
  };

  const handleOpenBannerModal = (meeting: Meeting) => {
    setEditingBannerMeeting(meeting);
    setBannerPreview(meeting.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop');
    setIsBannerModalOpen(true);
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBannerPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async () => {
    if (!editingBannerMeeting || !bannerPreview) return;
    await store.updateMeetingBanner(editingBannerMeeting.id, bannerPreview);
    const updated = store.getMeetings();
    setMeetings(updated);
    setIsBannerModalOpen(false);
  };

  const handleDeleteSession = (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = meetings.find(m => m.id === meetingId);
    const title = session?.title || 'this session';

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Class Session',
      message: `Are you sure you want to delete "${title}" and all its student folders? This action cannot be undone.`,
      confirmText: 'Delete Session',
      confirmVariant: 'danger',
      showCancel: true,
      onConfirm: async () => {
        await store.deleteMeeting(meetingId);
        const updated = store.getMeetings();
        setMeetings(updated);
        if (selectedMeetingId === meetingId) {
          const next = updated[0];
          if (next) {
            setSelectedMeetingId(next.id);
            loadProjectsForMeeting(next.id);
          } else {
            setSelectedMeetingId('');
            setSessionProjects([]);
          }
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleCreateFolderInSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedMeetingId) return;

    const authorId = user?.id || 'teacher-1';
    const newProj = await store.createUserProject(
      authorId,
      newFolderName.trim(),
      newFolderDesc.trim(),
      false,
      selectedMeetingId
    );

    setIsNewFolderModalOpen(false);
    setNewFolderName('');
    setNewFolderDesc('');

    loadProjectsForMeeting(selectedMeetingId);
    router.push(`/projects/${newProj.id}`);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const proj = sessionProjects.find(p => p.id === projectId);
    const name = proj?.name || 'this folder';

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Student Folder',
      message: `Are you sure you want to delete folder "${name}"? This action cannot be undone.`,
      confirmText: 'Delete Folder',
      confirmVariant: 'danger',
      showCancel: true,
      onConfirm: () => {
        store.deleteUserProject(projectId);
        loadProjectsForMeeting(selectedMeetingId);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const selectedMeeting = useMemo(() => {
    return meetings.find(m => m.id === selectedMeetingId);
  }, [meetings, selectedMeetingId]);

  const selectedMeetingIndex = useMemo(() => {
    if (!selectedMeetingId) return -1;
    return meetings.findIndex(m => m.id === selectedMeetingId);
  }, [meetings, selectedMeetingId]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return sessionProjects;
    const q = searchQuery.toLowerCase();
    return sessionProjects.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.student?.full_name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [sessionProjects, searchQuery]);

  // Compute distinct students participated in this session
  const distinctStudentsCount = useMemo(() => {
    const studentIds = new Set(sessionProjects.filter(p => p.student?.role === 'student').map(p => p.student_id));
    return studentIds.size;
  }, [sessionProjects]);

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#07080c] text-slate-900 dark:text-slate-100 transition-colors pb-12 font-sans relative selection:bg-primary selection:text-white">
      {/* Background Blueprint Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50 dark:opacity-30 -z-10" />

      {/* Top Fixed Header */}
      <header
        className={`fixed top-0 right-0 h-16 bg-white/80 dark:bg-[#07080c]/80 backdrop-blur-md shadow-xs z-40 flex items-center justify-between px-container-padding border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 ease-in-out ${
          isSidebarOpen ? 'left-0 md:left-64 lg:left-72' : 'left-0'
        }`}
      >
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center shrink-0"
              title="Show Navigation Menu"
            >
              <PanelLeft className="w-5 h-5 text-primary" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {isTeacher ? 'Class Sessions & Forums' : 'Class Sessions & Assignments'}
              </h1>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {isTeacher
                  ? 'Instructor Hub • Live Student Code Inspection'
                  : `Student Hub • ${user?.full_name || 'Student'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-200" />
            )}
          </button>

          {isTeacher && (
            <button
              onClick={() => setIsNewSessionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-xl text-xs md:text-sm font-bold hover:bg-primary-hover shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 px-container-padding max-w-7xl mx-auto space-y-6">
        
        {/* Top Summary Banner */}
        <section className="bg-white dark:bg-[#12141c] p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isTeacher ? 'Class Sessions & Student Workspaces' : 'Your Class Sessions & Exercises'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 font-mono">
                ● Live Sync Active
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              {isTeacher
                ? 'Select any session below to inspect student coding folders in real-time or create shared boilerplate templates.'
                : 'Choose a class session to create your assignment project folder or view teacher starter materials.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-surface-container-low dark:bg-gray-900 px-4 py-2 rounded-xl border border-surface-container dark:border-gray-800 text-center">
              <span className="text-[11px] font-bold text-on-surface-variant/70 dark:text-gray-400 uppercase tracking-wider block">
                Total Sessions
              </span>
              <span className="text-lg font-black text-primary">
                {meetings.length}
              </span>
            </div>

            <div className="bg-surface-container-low dark:bg-gray-900 px-4 py-2 rounded-xl border border-surface-container dark:border-gray-800 text-center">
              <span className="text-[11px] font-bold text-on-surface-variant/70 dark:text-gray-400 uppercase tracking-wider block">
                Total Folders
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {store.getUserProjects().length}
              </span>
            </div>
          </div>
        </section>

        {/* 2-Column Master Detail: Sessions List (Left) & Student Folders Grid (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
          
          {/* Left Column: Session Meetings List */}
          <aside className="md:col-span-5 lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                Session Timeline
              </span>
              <span className="text-xs font-semibold text-primary">
                {meetings.length} Sessions
              </span>
            </div>

            <div className="space-y-2.5 h-[calc(100vh-200px)] overflow-y-auto pr-1 pb-4">
              {meetings.map((meeting, index) => {
                const isSelected = meeting.id === selectedMeetingId;
                const projs = store.getProjectsByMeeting(meeting.id);
                const studentsJoined = new Set(projs.filter(p => p.student?.role === 'student').map(p => p.student_id)).size;

                return (
                  <div
                    key={meeting.id}
                    onClick={() => handleSelectMeeting(meeting.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative group min-h-[44px] ${
                      isSelected
                        ? 'bg-primary-container/20 dark:bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                        : 'bg-surface-container-lowest dark:bg-[#181a1f] border-surface-container dark:border-gray-800 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-surface-container dark:bg-gray-800 text-on-surface-variant dark:text-gray-300'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <h3 className="font-bold text-sm text-on-surface dark:text-gray-100 line-clamp-1">
                          {meeting.title}
                        </h3>
                      </div>

                      {meeting.is_active ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                          🟢 Open
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0">
                          🔒 Closed
                        </span>
                      )}
                    </div>

                    {meeting.description && (
                      <p className="text-xs text-on-surface-variant dark:text-gray-400 line-clamp-2 mb-3">
                        {meeting.description}
                      </p>
                    )}

                    {/* Stats & Session Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-surface-container/60 dark:border-gray-800/80 text-[11px] text-on-surface-variant/80 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {studentsJoined} {studentsJoined === 1 ? 'student' : 'students'}
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <Folder className="w-3.5 h-3.5 text-amber-500" />
                          {projs.length} {projs.length === 1 ? 'folder' : 'folders'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {isTeacher && (
                          <button
                            onClick={(e) => handleToggleSessionStatus(meeting.id, e)}
                            className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs hover:underline font-bold ${
                              meeting.is_active
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                            title={meeting.is_active ? 'Close / Lock session for students' : 'Open / Unlock session for students'}
                          >
                            {meeting.is_active ? 'Close' : 'Open'}
                          </button>
                        )}
                        {isTeacher && (
                          <button
                            onClick={(e) => handleDeleteSession(meeting.id, e)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-variant hover:text-error dark:hover:text-red-400 transition-colors"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Session Folder Inspector & Student Grid */}
          <main className="md:col-span-7 lg:col-span-8 space-y-4 h-[calc(100vh-200px)] overflow-y-auto pb-4 pr-1">
            
            {/* Active Session Detail Card */}
            {selectedMeeting ? (
              <div className="bg-surface-container-lowest dark:bg-[#181a1f] p-5 rounded-2xl border border-surface-container dark:border-gray-800 shadow-xs space-y-4">
                
                {/* Classroom Documentation Banner Photo */}
                <div className="relative h-44 md:h-52 w-full rounded-2xl overflow-hidden bg-slate-900 shadow-xs border border-surface-container dark:border-gray-800 group">
                  <img
                    src={selectedMeeting.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop'}
                    alt={selectedMeeting.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end justify-between p-4 md:p-6">
                    <div className="text-white space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                        Class Documentation
                      </span>
                      <h2 className="text-lg md:text-2xl font-black truncate max-w-xl">
                        {selectedMeeting.title}
                      </h2>
                    </div>

                    {isTeacher && (
                      <button
                        onClick={() => handleOpenBannerModal(selectedMeeting)}
                        className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-slate-900 text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all backdrop-blur-xs shrink-0"
                        title="Update Class Documentation / Banner"
                      >
                        <Camera className="w-3.5 h-3.5 text-primary" />
                        <span>Update Banner</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container dark:border-gray-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary text-white">
                        Session #{selectedMeetingIndex >= 0 ? selectedMeetingIndex + 1 : (selectedMeeting.session_number || 1)}
                      </span>
                      {selectedMeeting.is_active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          🟢 Active / Open
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          🔒 Closed (Read-Only)
                        </span>
                      )}
                    </div>
                    {selectedMeeting.description && (
                      <p className="text-xs text-on-surface-variant dark:text-gray-400">
                        {selectedMeeting.description}
                      </p>
                    )}
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isTeacher && (
                      <button
                        onClick={(e) => handleToggleSessionStatus(selectedMeeting.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                          selectedMeeting.is_active
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        <span>{selectedMeeting.is_active ? '🔒 Lock Session' : '🔓 Unlock Session'}</span>
                      </button>
                    )}

                    {/* Create Folder in this Session button */}
                    {!selectedMeeting.is_active && !isTeacher ? (
                      <button
                        disabled
                        className="flex items-center gap-1.5 px-4 py-2 bg-surface-container dark:bg-gray-800 text-on-surface-variant/50 dark:text-gray-500 rounded-xl text-xs md:text-sm font-bold cursor-not-allowed"
                        title="This session has been closed by the instructor."
                      >
                        <span>🔒 Session Closed</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsNewFolderModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>{isTeacher ? '+ New Starter / Folder' : '+ Create My Folder'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Read-Only Notice Banner if Session is Closed */}
                {!selectedMeeting.is_active && (
                  <div className="bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
                    <span className="text-base">🔒</span>
                    <span>
                      <strong>Session is Closed:</strong> This class session has been locked by the instructor. Students can review and preview code in <strong>Read-Only Mode</strong>, but no new changes can be saved.
                    </span>
                  </div>
                )}

                {/* Search & Participation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs font-semibold text-on-surface-variant dark:text-gray-400">
                    <span className="flex items-center gap-1.5 bg-surface-container-low dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-surface-container dark:border-gray-800">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <strong>{distinctStudentsCount}</strong> Participating Students
                    </span>
                    <span className="flex items-center gap-1.5 bg-surface-container-low dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-surface-container dark:border-gray-800">
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      <strong>{sessionProjects.length}</strong> Total Folders
                    </span>
                  </div>

                  {/* Search input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 dark:text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search student or folder..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-1.5 bg-surface-container-low dark:bg-gray-900 rounded-xl border border-surface-container dark:border-gray-800 text-xs focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Student Folders Grid */}
                <div className="pt-2">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-surface-container-low dark:bg-[#14161a] rounded-2xl border border-dashed border-surface-container dark:border-gray-800 space-y-2">
                      <Folder className="w-10 h-10 text-on-surface-variant/40 dark:text-gray-600 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-on-surface dark:text-gray-200">
                          No folders in this session yet
                        </h4>
                        <p className="text-xs text-on-surface-variant dark:text-gray-400 max-w-sm mx-auto">
                          {isTeacher
                            ? 'Students will see this session and can create their assignment folders here.'
                            : 'Click "+ Create My Folder" in the top bar to start your assignment project in this session.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredProjects.map((project) => {
                        const isTeacherOwner = project.student_id === 'teacher-1' || project.student?.role === 'teacher';
                        const isMyProject = user?.id === project.student_id;
                        const canViewSourceCode = isTeacher || isMyProject;
                        const studentName = project.student?.full_name || (isTeacherOwner ? 'Mr. Miftah (Instructor)' : 'Student');
                        const fileNames = project.files.map(f => f.name).join(', ');
                        const canDelete = isTeacher || isMyProject;

                        const handleCardClick = () => {
                          if (canViewSourceCode) {
                            router.push(`/projects/${project.id}`);
                          } else {
                            window.open(`/preview?project=${project.id}`, '_blank');
                          }
                        };

                        return (
                          <div
                            key={project.id}
                            onClick={handleCardClick}
                            className={`p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between space-y-3 ${
                              isMyProject
                                ? 'bg-primary-container/10 dark:bg-primary/5 border-primary/40 dark:border-primary/40 ring-1 ring-primary/20'
                                : 'bg-surface-container-low dark:bg-[#14161a] border-surface-container dark:border-gray-800 hover:border-primary/60'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Student Badge & Author Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/25 text-primary dark:text-primary-light flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-xs">
                                    <span>{studentName.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="overflow-hidden">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-on-surface dark:text-gray-200 block truncate">
                                        {studentName}
                                      </span>
                                      {isMyProject && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary text-white">
                                          YOU
                                        </span>
                                      )}
                                      {!canViewSourceCode && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                          🔒 Live Only
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-on-surface-variant/70 dark:text-gray-400 block -mt-0.5">
                                      {isTeacherOwner ? 'Instructor Starter' : `@${project.student?.username || 'student'}`}
                                    </span>
                                  </div>
                                </div>

                                {canDelete && (
                                  <button
                                    onClick={(e) => handleDeleteProject(project.id, e)}
                                    className="p-1.5 text-on-surface-variant/40 hover:text-error dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 rounded-lg hover:bg-surface-container dark:hover:bg-gray-800"
                                    title="Delete Folder"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Folder Name & Description */}
                              <div>
                                <h3 className="text-sm font-bold text-on-surface dark:text-gray-100 group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span className="line-clamp-1">{project.name}</span>
                                </h3>
                                {project.description && (
                                  <p className="text-xs text-on-surface-variant dark:text-gray-400 line-clamp-2 mt-1">
                                    {project.description}
                                  </p>
                                )}
                              </div>

                              {/* Files included pill */}
                              <div className="text-[11px] font-mono text-on-surface-variant/80 dark:text-gray-400 bg-surface-container dark:bg-gray-900/80 px-2.5 py-1 rounded-lg border border-outline-variant/30 dark:border-gray-800 truncate">
                                📄 {project.files.length} {project.files.length === 1 ? 'file' : 'files'}: <span className="text-primary font-semibold">{fileNames}</span>
                              </div>
                            </div>

                            {/* Action Buttons: Live Preview & Source Code */}
                            <div className="pt-2.5 border-t border-surface-container/60 dark:border-gray-800/80 flex items-center justify-between gap-2 text-xs">
                              <span className="text-[10px] text-on-surface-variant/60 dark:text-gray-500 shrink-0">
                                {new Date(project.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/preview?project=${project.id}`, '_blank');
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg text-xs transition-colors border border-emerald-500/20"
                                  title="Preview student website in a new tab"
                                >
                                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>{canViewSourceCode ? 'Live Web' : 'Live Preview'}</span>
                                </button>

                                {canViewSourceCode && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/projects/${project.id}`);
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-bold rounded-lg text-xs transition-colors border border-primary/20"
                                    title={isTeacher ? "Inspect student source code in Read-Only Mode" : "Open in Code Editor"}
                                  >
                                    <Code2 className="w-3.5 h-3.5" />
                                    <span>{isMyProject ? 'Edit Code' : 'Inspect Code'}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-12 text-center bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl border border-surface-container dark:border-gray-800 space-y-3">
                <BookOpen className="w-12 h-12 text-on-surface-variant/30 dark:text-gray-600 mx-auto" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-200">
                  No Session Selected
                </h3>
                <p className="text-xs text-on-surface-variant dark:text-gray-400">
                  Create or select a session to view student folders and code.
                </p>
              </div>
            )}

          </main>
        </div>

      </main>

      {/* Modal: Create New Session */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">
                  Create Class Session / Meeting
                </h3>
              </div>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Session Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 4: JavaScript DOM Manipulation & Events"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Description / Topic Goals (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What will students build or learn in this session?"
                  value={newSessionDesc}
                  onChange={(e) => setNewSessionDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Class Documentation / Banner Photo (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Photo URL or leave blank for default banner"
                  value={newSessionBanner}
                  onChange={(e) => setNewSessionBanner(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-xs focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Banner / Classroom Documentation Photo */}
      {isBannerModalOpen && editingBannerMeeting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">
                  Classroom Documentation Photo
                </h3>
              </div>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-on-surface-variant dark:text-gray-400">
                Upload classroom learning photos. This image will appear in the session header and the public student showcase.
              </p>

              {/* Banner Image Preview */}
              <div className="relative h-44 w-full rounded-xl overflow-hidden bg-slate-900 border border-surface-container dark:border-gray-800 flex items-center justify-center">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400 text-xs">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span>No image selected</span>
                  </div>
                )}
              </div>

              {/* Upload Input & Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase">
                  Upload from Device / Computer:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileUpload}
                  className="w-full text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase">
                  Or Paste Image URL:
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={bannerPreview}
                  onChange={(e) => setBannerPreview(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-xs focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Save Documentation Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Folder in this Session */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">
                  Create Folder in Session #{selectedMeetingIndex >= 0 ? selectedMeetingIndex + 1 : (selectedMeeting?.session_number || 1)}
                </h3>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolderInSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter Template / Calculator App"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief notes about this folder project"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  Create & Open Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        showCancel={confirmDialog.showCancel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
