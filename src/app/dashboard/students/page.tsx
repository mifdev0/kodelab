'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { useLayout } from '@/lib/layout-context';
import { useTheme } from '@/lib/theme-context';
import { Profile, UserProject } from '@/types';
import ConfirmModal from '@/components/ConfirmModal';
import { 
  Users, 
  UserPlus, 
  Copy, 
  Check, 
  ArrowLeft, 
  Sparkles, 
  Folder, 
  Search, 
  PanelLeft, 
  Sun, 
  Moon, 
  BookOpen,
  ArrowRight,
  Plus,
  X,
  KeyRound,
  Globe,
  Code2,
  Pencil,
  Trash2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function StudentsManagement() {
  const router = useRouter();
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();

  const [students, setStudents] = useState<(Profile & { totalProjects: number; sessionsJoined: number; recentProjects: UserProject[] })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Selected student for Folders Modal
  const [selectedStudentForFolders, setSelectedStudentForFolders] = useState<(Profile & { totalProjects: number; sessionsJoined: number; recentProjects: UserProject[] }) | null>(null);

  // Add single student modal
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female' | 'Laki-laki' | 'Perempuan'>('male');
  const [newStudentClass, setNewStudentClass] = useState('7A');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('123456');

  // Edit student modal
  const [editingStudent, setEditingStudent] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'Laki-laki' | 'Perempuan'>('male');
  const [editClassName, setEditClassName] = useState('7A');
  const [editUsername, setEditUsername] = useState('');

  // Reset password modal
  const [resettingPasswordStudent, setResettingPasswordStudent] = useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Confirmation Modal for Deletion
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

  // Bulk Generator modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkClassName, setBulkClassName] = useState('7A');
  const [nameListInput, setNameListInput] = useState('');
  const [createdToast, setCreatedToast] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStudents(); // show local data immediately
    // Then force-sync from Supabase to get cross-device data
    setIsSyncing(true);
    store.forceSyncProfiles().then(() => {
      loadStudents();
      setIsSyncing(false);
    }).catch(() => setIsSyncing(false));
  }, []);

  const loadStudents = () => {
    const list = store.getStudentsWithStats();
    setStudents(list);
  };

  // Periodic background sync every 15 seconds to catch new registrations
  useEffect(() => {
    const interval = setInterval(() => {
      store.forceSyncProfiles().then(() => loadStudents());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleNameChange = (val: string) => {
    setNewStudentName(val);
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    const classSlug = newStudentClass.toLowerCase().replace(/[^a-z0-9]/g, '') || '7a';
    if (slug) {
      setNewStudentUsername(`${slug}.${classSlug}`);
    }
  };

  const handleClassChange = (val: string) => {
    setNewStudentClass(val);
    if (newStudentName) {
      const slug = newStudentName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      const classSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '') || '7a';
      if (slug) {
        setNewStudentUsername(`${slug}.${classSlug}`);
      }
    }
  };

  const handleCreateSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    await store.createStudent(
      newStudentName.trim(),
      undefined,
      newStudentGender,
      newStudentClass.trim(),
      newStudentUsername.trim(),
      newStudentPassword.trim()
    );

    setIsAddStudentModalOpen(false);
    setNewStudentName('');
    setNewStudentUsername('');
    setNewStudentPassword('123456');
    loadStudents();
    setCreatedToast(`Student "${newStudentName.trim()}" created successfully!`);
    setTimeout(() => setCreatedToast(null), 3500);
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNames = nameListInput
      .split('\n')
      .map(n => n.trim())
      .filter(Boolean);

    if (rawNames.length === 0) return;

    const newCreated = await store.bulkCreateStudents('class-1', rawNames, bulkClassName);
    setNameListInput('');
    setIsBulkModalOpen(false);
    loadStudents();
    setCreatedToast(`Successfully generated ${newCreated.length} new student accounts!`);
    setTimeout(() => setCreatedToast(null), 4000);
  };

  const handleCopyCredentials = () => {
    const list = students.map((s, idx) => 
      `${idx + 1}. Name: ${s.full_name} | Class: ${s.class_name || '7A'} | Username: ${s.username} | Password: ${s.password || '123456'}`
    ).join('\n');

    navigator.clipboard.writeText(list);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open Edit Modal
  const handleOpenEdit = (student: Profile) => {
    setEditingStudent(student);
    setEditFullName(student.full_name || '');
    setEditGender((student.gender as any) || 'male');
    setEditClassName(student.class_name || '7A');
    setEditUsername(student.username || '');
  };

  // Save Edit Student
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editFullName.trim() || !editUsername.trim()) return;

    await store.updateStudentProfile(editingStudent.id, {
      full_name: editFullName.trim(),
      gender: editGender,
      class_name: editClassName.trim(),
      username: editUsername.trim().toLowerCase(),
    });

    setEditingStudent(null);
    loadStudents();
    setCreatedToast(`Student details for "${editFullName.trim()}" updated!`);
    setTimeout(() => setCreatedToast(null), 3000);
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (student: Profile) => {
    setResettingPasswordStudent(student);
    setNewPasswordInput('');
    setShowPassword(false);
  };

  // Save Reset Password
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordStudent || !newPasswordInput.trim()) return;

    await store.resetStudentPassword(resettingPasswordStudent.id, newPasswordInput.trim());
    setResettingPasswordStudent(null);
    loadStudents();
    setCreatedToast(`Password for ${resettingPasswordStudent.full_name} updated successfully!`);
    setTimeout(() => setCreatedToast(null), 3000);
  };

  // Delete Student with safety modal
  const handleDeleteStudent = (student: Profile) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Student Account',
      message: `Are you sure you want to permanently delete student account "${student.full_name}" (@${student.username})? All associated projects and submissions will also be removed.`,
      confirmText: 'Delete Account',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await store.deleteStudent(student.id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        loadStudents();
        setCreatedToast(`Student account "${student.full_name}" deleted.`);
        setTimeout(() => setCreatedToast(null), 3000);
      }
    });
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s => 
      s.full_name.toLowerCase().includes(q) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.class_name && s.class_name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#07080c] text-slate-900 dark:text-slate-100 transition-colors pb-12 font-sans relative selection:bg-primary selection:text-white">
      {/* Background Blueprint Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50 dark:opacity-30 -z-10" />

      {/* Top Navbar */}
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

          <Link
            href="/dashboard"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Back to Sessions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Registered Students Directory
              </h1>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {students.length} Total Registered Student Accounts
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
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

          <button
            onClick={handleCopyCredentials}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
            title="Copy student usernames, classes, and passwords"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Accounts'}</span>
          </button>

          <button
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-xl text-xs md:text-sm font-bold hover:bg-primary-hover shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-container-padding max-w-7xl mx-auto space-y-6">
        
        {createdToast !== null && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-5 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold">
              {createdToast}
            </span>
          </div>
        )}

        {/* Filter Bar & Quick Stats */}
        <section className="bg-white dark:bg-[#12141c] p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, class, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs md:text-sm focus:outline-none focus:border-primary text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Bulk Create</span>
            </button>
          </div>
        </section>

        {/* Mobile View: Responsive Touch Cards (Visible on Phones/Small Tablets) */}
        <div className="block md:hidden space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-white dark:bg-[#12141c] rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-mono">
              // No students found matching "{searchQuery}"
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3.5"
              >
                {/* Header: Student Info & Class */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary dark:text-primary-light flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 shadow-xs">
                      <span>{student.full_name?.charAt(0)?.toUpperCase() || 'S'}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block truncate">
                        {student.full_name}
                      </span>
                      <span className="text-xs text-slate-400 block font-mono">
                        @{student.username}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs font-mono shrink-0">
                    Class {student.class_name || '7A'}
                  </span>
                </div>

                {/* Stats & Credentials Pill */}
                <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400">pass:</span> <strong className="text-slate-800 dark:text-slate-200">{student.password || '123456'}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
                      <BookOpen className="w-3 h-3 text-primary" />
                      {student.sessionsJoined} sess
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      <Folder className="w-3 h-3 text-amber-500" />
                      {student.totalProjects} folders
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons (Generous Touch Targets) */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedStudentForFolders(student)}
                    className="flex items-center justify-center gap-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light text-xs font-bold rounded-xl transition-colors min-h-[40px]"
                    title="View Student Folders"
                  >
                    <Folder className="w-4 h-4" />
                    <span className="text-[11px]">Folders</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(student)}
                    className="flex items-center justify-center gap-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors min-h-[40px]"
                    title="Edit Student Info"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px]">Edit</span>
                  </button>

                  <button
                    onClick={() => handleOpenResetPassword(student)}
                    className="flex items-center justify-center gap-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl transition-colors min-h-[40px]"
                    title="Reset Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px]">Pass</span>
                  </button>

                  <button
                    onClick={() => handleDeleteStudent(student)}
                    className="flex items-center justify-center gap-1 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors min-h-[40px]"
                    title="Delete Student"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[11px]">Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table (Visible on MD screens and above) */}
        <div className="hidden md:block bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] font-mono font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-3">Class</th>
                  <th className="py-3.5 px-3">Gender</th>
                  <th className="py-3.5 px-4">Login Username</th>
                  <th className="py-3.5 px-4 text-center">Sessions Joined</th>
                  <th className="py-3.5 px-4 text-center">Folders Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-mono">
                      // No students found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary dark:text-primary-light flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 shadow-xs">
                            <span>{student.full_name?.charAt(0)?.toUpperCase() || 'S'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {student.full_name}
                            </span>
                            <span className="text-xs text-slate-400 block -mt-0.5 font-mono">
                              @{student.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-4 px-3">
                        <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs font-mono">
                          {student.class_name || '7A'}
                        </span>
                      </td>

                      {/* Gender */}
                      <td className="py-4 px-3 text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {student.gender === 'female' || student.gender === 'Perempuan' ? 'Female' : 'Male'}
                      </td>

                      {/* Username & Password */}
                      <td className="py-4 px-4 font-mono text-xs">
                        <span className="text-primary font-bold">{student.username}</span>
                        <span className="block text-[10px] text-slate-400 font-sans">
                          pass: {student.password || '123456'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                          <BookOpen className="w-3 h-3 text-primary" />
                          {student.sessionsJoined}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20 font-mono">
                          <Folder className="w-3 h-3 text-amber-500" />
                          {student.totalProjects}
                        </span>
                      </td>

                      {/* Complete Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View Folders */}
                          <button
                            onClick={() => setSelectedStudentForFolders(student)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary rounded-lg transition-colors"
                            title="View Student Folders"
                          >
                            <Folder className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg transition-colors"
                            title="Edit Student Info"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenResetPassword(student)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 rounded-lg transition-colors"
                            title="Change / Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete Student */}
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete Student Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Modal: Edit Student Information */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Student Details
                </h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Class
                  </label>
                  <input
                    type="text"
                    required
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Login Username
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change / Reset Password */}
      {resettingPasswordStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Student Password
                </h3>
              </div>
              <button
                onClick={() => setResettingPasswordStudent(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Setting new password for student:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                  {resettingPasswordStudent.full_name} (@{resettingPasswordStudent.username})
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (e.g. 123456)"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-3.5 pr-9 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingPasswordStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Student Folders */}
      {selectedStudentForFolders && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary dark:text-primary-light flex items-center justify-center font-bold text-sm border border-primary/20 shadow-xs">
                  {selectedStudentForFolders.full_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedStudentForFolders.full_name}'s Coding Folders
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Class {selectedStudentForFolders.class_name || '7A'} • @{selectedStudentForFolders.username} • {selectedStudentForFolders.recentProjects.length} Folders
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForFolders(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {selectedStudentForFolders.recentProjects.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 font-mono">
                  // This student hasn't created any assignment folders yet.
                </div>
              ) : (
                selectedStudentForFolders.recentProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {proj.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 block truncate">
                        📄 {proj.files.map(f => f.name).join(', ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          window.open(`/preview?project=${proj.id}`, '_blank');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg text-xs transition-colors border border-emerald-500/20"
                        title="Preview student website in a new tab"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Live Web</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedStudentForFolders(null);
                          router.push(`/projects/${proj.id}`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-bold rounded-lg text-xs transition-colors border border-primary/20"
                        title="Inspect source code in Code Editor"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Source Code</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedStudentForFolders(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Single Student */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Single Student Account
                </h3>
              </div>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSingleStudent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raditya Pratama"
                  value={newStudentName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Gender
                  </label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Class
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7A"
                    value={newStudentClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Login Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. raditya.7a"
                  value={newStudentUsername}
                  onChange={(e) => setNewStudentUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Create Students */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Generate Student Accounts
                </h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Class Target
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7A"
                  value={bulkClassName}
                  onChange={(e) => setBulkClassName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Paste Student Names (One per line)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder={`Raditya Pratama\nSiti Rahma\nBudi Santoso\nAmanda Putri`}
                  value={nameListInput}
                  onChange={(e) => setNameListInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 block">
                  Usernames and passwords will be automatically generated.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Generate All Accounts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
