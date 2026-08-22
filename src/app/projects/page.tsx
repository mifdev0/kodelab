'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Folder, 
  FolderPlus, 
  Plus, 
  Trash2, 
  Edit3, 
  FileCode, 
  ArrowRight, 
  Clock, 
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Globe,
  Code2
} from 'lucide-react';
import { UserProject, ProjectFile } from '@/types';
import { store } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { useLayout } from '@/lib/layout-context';
import { useTheme } from '@/lib/theme-context';
import ConfirmModal from '@/components/ConfirmModal';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // File addition modal
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);
  const [newFileNameInput, setNewFileNameInput] = useState('');

  useEffect(() => {
    loadProjects();
    store.syncWithSupabase().then(() => {
      loadProjects();
    }).catch(() => {});

    // Instant Realtime Subscription
    const unsubscribe = store.subscribeRealtime(() => {
      loadProjects();
    });

    return () => unsubscribe();
  }, [user]);

  const loadProjects = () => {
    if (!user) return;
    const userProjects = store.getPersonalProjects(user.id);
    setProjects(userProjects);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user) return;

    const newProj = await store.createUserProject(
      user.id,
      newProjectName.trim(),
      newProjectDesc.trim(),
      false,
      undefined
    );

    setIsCreateModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
    loadProjects();

    router.push(`/projects/${newProj.id}`);
  };

  // Custom confirmation dialog
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

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const proj = projects.find(p => p.id === projectId);
    const projName = proj?.name || 'this folder';

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Folder',
      message: `Are you sure you want to delete "${projName}" and all its files? This action cannot be undone.`,
      confirmText: 'Delete Folder',
      confirmVariant: 'danger',
      showCancel: true,
      onConfirm: async () => {
        await store.deleteUserProject(projectId);
        loadProjects();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleOpenAddFile = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetProjectId(projectId);
    setIsAddFileModalOpen(true);
  };

  const handleAddFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId || !newFileNameInput.trim()) return;

    let cleanName = newFileNameInput.trim();
    if (!cleanName.includes('.')) {
      cleanName = `${cleanName}.html`;
    }

    await store.addProjectFile(targetProjectId, cleanName, '');
    setIsAddFileModalOpen(false);
    setNewFileNameInput('');
    loadProjects();
    router.push(`/projects/${targetProjectId}`);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#07080c] text-slate-900 dark:text-slate-100 transition-colors relative selection:bg-primary selection:text-white font-sans">
      {/* Background Blueprint Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50 dark:opacity-30 -z-10" />

      {/* Header */}
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Personal Projects</h1>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Private sandbox • Independent practice outside class sessions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
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
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs md:text-sm hover:bg-primary-hover shadow-sm transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Personal Folder</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-container-padding pb-12 max-w-6xl mx-auto space-y-6">
        
        {/* Banner */}
        <div className="bg-surface-container-lowest dark:bg-[#181a1f] p-6 rounded-2xl border border-outline-variant/30 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface dark:text-gray-100">Personal Projects & Workspace</h2>
            <p className="text-xs md:text-sm text-on-surface-variant dark:text-gray-400">
              Your private coding workspace for self-study and experimentation outside class sessions. Create folders and manage your custom web apps freely.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-secondary-container dark:bg-gray-800 text-on-secondary-container dark:text-gray-200 rounded-xl font-bold text-xs md:text-sm hover:bg-secondary-container/80 dark:hover:bg-gray-700 transition-colors shrink-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Folder</span>
          </button>
        </div>

        {/* Project Folders Grid */}
        {projects.length === 0 ? (
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] p-12 rounded-2xl border border-outline-variant/30 dark:border-gray-800 text-center space-y-4">
            <div className="w-16 h-16 bg-surface-container dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-on-surface-variant dark:text-gray-400">
              <Folder className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-on-surface dark:text-gray-100">No project folders yet</h3>
              <p className="text-xs text-on-surface-variant dark:text-gray-400 max-w-sm mx-auto">
                You haven&apos;t created any folders yet. Click the button below to create your first folder (e.g. Lesson 1).
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-sm"
            >
              Create First Folder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-surface-container-lowest dark:bg-[#181a1f] p-5 rounded-2xl border border-outline-variant/30 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-primary/50 dark:hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Folder Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center font-bold shrink-0">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-on-surface dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        <span className="text-[11px] text-on-surface-variant dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(project.updated_at).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-on-surface-variant dark:text-gray-400 hover:text-error dark:hover:text-red-400 hover:bg-error-container/20 rounded-lg transition-all"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {project.description && (
                    <p className="text-xs text-on-surface-variant dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Files inside this folder */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider">
                      <span>Files ({project.files.length})</span>
                      <button
                        onClick={(e) => handleOpenAddFile(project.id, e)}
                        className="text-primary hover:underline flex items-center gap-0.5 normal-case font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add File
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {project.files.length === 0 ? (
                        <span className="text-xs text-on-surface-variant/60 dark:text-gray-500 italic">
                          Empty folder (no files)
                        </span>
                      ) : (
                        project.files.map((file) => (
                          <span
                            key={file.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container dark:bg-gray-900 text-on-surface dark:text-gray-200 rounded-lg text-xs font-mono font-medium"
                          >
                            <span className={
                              file.language === 'html' ? 'text-primary font-bold' :
                              file.language === 'css' ? 'text-[#264de4] dark:text-[#60a5fa] font-bold' :
                              file.language === 'js' ? 'text-[#d97706] dark:text-[#fbbf24] font-bold' :
                              'text-emerald-600 dark:text-emerald-400 font-bold'
                            }>
                              {file.language === 'html' ? '</>' : file.language === 'css' ? '#' : file.language === 'js' ? 'JS' : '🖼️'}
                            </span>
                            <span>{file.name}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions: Live Web & Open Editor */}
                <div className="pt-3.5 mt-3 border-t border-surface-container dark:border-gray-800 flex items-center justify-between gap-2">
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
                      title="Preview live website in a new tab"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Live Web</span>
                    </button>

                    <button
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-bold rounded-lg text-xs transition-colors border border-primary/20"
                      title="Open in Code Editor"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Open Editor</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Modal: Create New Folder */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">Create New Folder</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lesson 1, Lesson 2, Portfolio"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary font-medium text-on-surface dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Short Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes or topics covered in this project..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Create & Open Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add File to Folder */}
      {isAddFileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">Add New File</h3>
              </div>
              <button
                onClick={() => setIsAddFileModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  File Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="index.html / style.css / script.js / about.html"
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm font-mono focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
                <span className="text-[11px] text-on-surface-variant/70 dark:text-gray-400 mt-1 block">
                  Supported formats: <code>.html</code>, <code>.css</code>, <code>.js</code>, images
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFileModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Add File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation / Alert Dialog Modal */}
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
