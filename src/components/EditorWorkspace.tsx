'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import LivePreview from '@/components/LivePreview';

const CodeMirrorEditor = dynamic(() => import('@/components/CodeMirrorEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-xs text-on-surface-variant dark:text-gray-400">
      Loading Code Editor...
    </div>
  ),
});

import Header from '@/components/Header';
import ConfirmModal from '@/components/ConfirmModal';
import { EditorTab, UserProject, ProjectFile } from '@/types';
import { store } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { 
  Folder, 
  FolderPlus, 
  FileCode, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  PanelLeftClose, 
  PanelLeft, 
  FilePlus, 
  Upload, 
  Image as ImageIcon,
  Copy,
  GripVertical,
  Columns,
  Radio
} from 'lucide-react';

interface EditorWorkspaceProps {
  initialMeetingId?: string;
}

export default function EditorWorkspace({ initialMeetingId }: EditorWorkspaceProps) {
  const { user } = useAuth();

  // All custom user folders/projects
  const [customProjects, setCustomProjects] = useState<UserProject[]>([]);

  // Current active folder
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('');

  // Active folder files
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Explorer collapse state
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isFolderTreeOpen, setIsFolderTreeOpen] = useState(true);

  // Side Preview Visibility (Closed by default per user request) & Resizable Split Ratio
  const [showSidePreview, setShowSidePreview] = useState(false);
  const [splitRatio, setSplitRatio] = useState<number>(55);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Status & Save
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Modals & Inputs
  const [isOpenFolderModalOpen, setIsOpenFolderModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [newFolderSessionId, setNewFolderSessionId] = useState('');
  const [newFolderWithStarter, setNewFolderWithStarter] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isRenameFileModalOpen, setIsRenameFileModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<ProjectFile | null>(null);
  // Custom Confirmation / Alert Dialog Modal
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

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Preview
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Undo / Redo / Format refs
  const undoRef = useRef<(() => void) | null>(null);
  const redoRef = useRef<(() => void) | null>(null);
  const formatRef = useRef<(() => void) | null>(null);
  const [showFormatToast, setShowFormatToast] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTeacher = user?.role === 'teacher';

  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  const activeProject = useMemo(() => {
    if (!activeFolderId) return null;
    return store.getUserProject(activeFolderId) || null;
  }, [activeFolderId, customProjects]);

  // Check if current active folder belongs to a closed class session (Student only)
  const isLockedBySession = useMemo(() => {
    if (isTeacher) return false;
    if (!activeFolderId) return false;
    const proj = store.getUserProject(activeFolderId);
    if (!proj || !proj.meeting_id) return false;
    return !store.isMeetingActive(proj.meeting_id);
  }, [activeFolderId, isTeacher, meetings]);

  // Check if instructor is inspecting a student's folder (Read-Only to protect student work)
  const isInstructorInspecting = useMemo(() => {
    if (!isTeacher || !activeProject) return false;
    return activeProject.student_id !== user?.id;
  }, [isTeacher, activeProject, user?.id]);

  const isReadOnly = isLockedBySession || isInstructorInspecting;

  // Load initial data
  useEffect(() => {
    loadFolders();
  }, [user?.id, initialMeetingId]);

  const loadFolders = () => {
    if (!user) {
      if (initialMeetingId) {
        window.location.href = `/preview?project=${initialMeetingId}`;
        return;
      }
      window.location.href = '/login';
      return;
    }

    const projectList = user.role === 'teacher'
      ? store.getUserProjects()
      : store.getUserProjects(user.id);
    setCustomProjects(projectList);
    setMeetings(store.getMeetings());

    if (initialMeetingId) {
      const foundProj = store.getUserProject(initialMeetingId) || projectList.find(
        p => p.id === initialMeetingId || p.name.toLowerCase() === initialMeetingId.toLowerCase()
      );
      if (foundProj) {
        // Anti-Cheating Protection: Students can only view their own code or teacher starters
        if (user.role === 'student' && foundProj.student_id !== user.id && foundProj.student_id !== 'teacher-1') {
          window.location.href = `/preview?project=${foundProj.id}`;
          return;
        }
        openCustomProjectFolder(foundProj);
        return;
      }
    }

    if (projectList.length > 0) {
      openCustomProjectFolder(projectList[0]);
    } else {
      setActiveFolderId(null);
      setFolderName('');
      setFiles([]);
      setActiveFileId(null);
    }
  };

  // Open a Folder
  const openCustomProjectFolder = (project: UserProject) => {
    // Anti-Cheating Protection: Students cannot open other students' source code
    if (user?.role === 'student' && project.student_id !== user.id && project.student_id !== 'teacher-1') {
      window.location.href = `/preview?project=${project.id}`;
      return;
    }
    setActiveFolderId(project.id);
    setFolderName(project.name);
    setFiles(project.files || []);
    setActiveFileId(project.files && project.files.length > 0 ? project.files[0].id : null);
    setSaveStatus('saved');
    setIsOpenFolderModalOpen(false);
  };

  const activeFile = useMemo(() => {
    if (!activeFileId || files.length === 0) return null;
    return files.find(f => f.id === activeFileId) || files[0] || null;
  }, [files, activeFileId]);

  // Assets dictionary (images) mapping file names to base64 Data URLs
  const assetsMap = useMemo(() => {
    const map: { [name: string]: string } = {};
    files.forEach(f => {
      if (f.language === 'image' || f.name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
        map[f.name] = f.content;
      }
    });
    return map;
  }, [files]);

  // Combined code for live preview
  const { previewHtml, previewCss, previewJs } = useMemo(() => {
    if (files.length === 0) return { previewHtml: '', previewCss: '', previewJs: '' };

    let mainHtml = '';
    if (activeFile && activeFile.language === 'html') {
      mainHtml = activeFile.content;
    } else {
      const indexFile = files.find(f => f.name.toLowerCase() === 'index.html');
      const anyHtml = files.find(f => f.language === 'html');
      mainHtml = indexFile ? indexFile.content : anyHtml ? anyHtml.content : '';
    }

    const allCss = files
      .filter(f => f.language === 'css')
      .map(f => `/* ${f.name} */\n${f.content}`)
      .join('\n\n');

    const allJs = files
      .filter(f => f.language === 'js')
      .map(f => `// ${f.name}\n${f.content}`)
      .join('\n\n');

    return {
      previewHtml: mainHtml,
      previewCss: allCss,
      previewJs: allJs,
    };
  }, [files, activeFile]);

  // Save changes with instant synchronous persistence & responsive UI status
  const handleCodeChange = useCallback((newContent: string) => {
    if (!activeFile || !user || !activeFolderId || isReadOnly) return;

    // 1. Update React state immediately
    const updatedFiles = files.map(f =>
      f.id === activeFile.id ? { ...f, content: newContent, updated_at: new Date().toISOString() } : f
    );
    setFiles(updatedFiles);

    // 2. Persist locally to store immediately (0 delay / zero data loss)
    store.updateProjectFileContent(activeFolderId, activeFile.id, newContent);

    // 3. Update saving indicator smoothly
    setSaveStatus('saving');
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 400);
  }, [activeFile, files, activeFolderId, user, isReadOnly]);

  // Flush save on beforeunload / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeFolderId && activeFile && !isReadOnly) {
        store.updateProjectFileContent(activeFolderId, activeFile.id, activeFile.content);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeFolderId, activeFile, isReadOnly]);

  // Add File in Folder
  const handleAddNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileNameInput.trim() || !activeFolderId || isReadOnly) return;

    let cleanName = newFileNameInput.trim();
    if (!cleanName.includes('.')) {
      cleanName = `${cleanName}.html`;
    }

    const addedFile = store.addProjectFile(activeFolderId, cleanName, '');
    if (addedFile) {
      setFiles(prev => {
        const existingIdx = prev.findIndex(f => f.id === addedFile.id || f.name === addedFile.name);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = addedFile;
          return updated;
        }
        return [...prev, addedFile];
      });
      setActiveFileId(addedFile.id);
    }

    setIsNewFileModalOpen(false);
    setNewFileNameInput('');
  };

  // Upload Local Files (Images & Code)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !activeFolderId || isReadOnly) return;

    Array.from(selectedFiles).forEach(file => {
      const fileName = file.name;
      const ext = fileName.split('.').pop()?.toLowerCase();
      const isImage = file.type.startsWith('image/') || (ext && ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext));

      const reader = new FileReader();

      if (isImage) {
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const addedFile = store.addProjectFile(activeFolderId, fileName, dataUrl);
          if (addedFile) {
            setFiles(prev => {
              const existsIdx = prev.findIndex(f => f.id === addedFile.id || f.name === fileName);
              if (existsIdx >= 0) {
                const updated = [...prev];
                updated[existsIdx] = addedFile;
                return updated;
              }
              return [...prev, addedFile];
            });
            setActiveFileId(addedFile.id);
          }
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const textContent = event.target?.result as string;
          const addedFile = store.addProjectFile(activeFolderId, fileName, textContent);
          if (addedFile) {
            setFiles(prev => {
              const existsIdx = prev.findIndex(f => f.id === addedFile.id || f.name === fileName);
              if (existsIdx >= 0) {
                const updated = [...prev];
                updated[existsIdx] = addedFile;
                return updated;
              }
              return [...prev, addedFile];
            });
            setActiveFileId(addedFile.id);
          }
        };
        reader.readAsText(file);
      }
    });

    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete File
  const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    const file = files.find(f => f.id === fileId);
    const fileName = file?.name || 'this file';

    setConfirmDialog({
      isOpen: true,
      title: 'Delete File',
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      confirmText: 'Delete File',
      confirmVariant: 'danger',
      showCancel: true,
      onConfirm: () => {
        const filtered = files.filter(f => f.id !== fileId);
        setFiles(filtered);
        setActiveFileId(filtered.length > 0 ? filtered[0].id : null);

        if (activeFolderId) {
          store.deleteProjectFile(activeFolderId, fileId);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Rename File
  const handleRenameFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToRename || !renamedName.trim() || !activeFolderId || isReadOnly) return;

    const newName = renamedName.trim();
    const ext = newName.split('.').pop()?.toLowerCase();
    let language: EditorTab = 'html';
    if (ext === 'css') language = 'css';
    else if (ext === 'js') language = 'js';
    else if (ext && ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) language = 'image';

    const updated = files.map(f =>
      f.id === fileToRename.id ? { ...f, name: newName, language } : f
    );
    setFiles(updated);

    store.renameProjectFile(activeFolderId, fileToRename.id, newName);

    setIsRenameFileModalOpen(false);
    setFileToRename(null);
  };

  // Create & Open New Folder
  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderNameInput.trim() || !user) return;

    const newProj = store.createUserProject(
      user.id,
      newFolderNameInput.trim(),
      '',
      newFolderWithStarter,
      newFolderSessionId || undefined
    );

    const updatedProjects = store.getUserProjects(user.id);
    setCustomProjects(updatedProjects);
    setIsNewFolderModalOpen(false);
    setNewFolderNameInput('');
    setNewFolderSessionId('');

    openCustomProjectFolder(newProj);
  };

  // Resizable Split Pane Drag Handlers
  const handleMouseDownSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleTouchStartSplit = (e: React.TouchEvent) => {
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleMove = (clientX: number) => {
      if (!isDraggingSplit || !containerRef.current) return;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = clientX - rect.left;
        const newRatio = (newWidth / rect.width) * 100;
        // Clamp between 15% and 85%
        setSplitRatio(Math.min(Math.max(newRatio, 15), 85));
      });
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };

    const handleEnd = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsDraggingSplit(false);
    };

    if (isDraggingSplit) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingSplit]);

  // Auto-sync payload to BroadcastChannel & localStorage for "Go Live" new tab preview
  useEffect(() => {
    try {
      const htmlFilesMap: { [name: string]: string } = {};
      files.forEach(f => {
        if (f.language === 'html' || f.name.endsWith('.html')) {
          htmlFilesMap[f.name] = f.content;
        }
      });

      const payload = {
        html: previewHtml,
        css: previewCss,
        js: previewJs,
        assets: assetsMap,
        htmlFiles: htmlFilesMap,
        currentFile: activeFile?.name || 'index.html',
        timestamp: Date.now(),
      };
      localStorage.setItem('kodelab_preview_payload', JSON.stringify(payload));
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('kodelab_live_preview');
        channel.postMessage(payload);
        channel.close();
      }
    } catch (e) {}
  }, [previewHtml, previewCss, previewJs, assetsMap, files, activeFile]);

  // Navigate to local HTML file when clicking relative <a href="lain.html"> links in live preview
  const handleNavigateFile = useCallback((fileName: string) => {
    if (!files || files.length === 0) return;
    const cleanTarget = fileName.trim().toLowerCase();

    const matchedFile = files.find(f => {
      const name = f.name.toLowerCase();
      return name === cleanTarget || 
             name === `${cleanTarget}.html` || 
             name.replace(/\.html$/, '') === cleanTarget;
    });

    if (matchedFile) {
      setActiveFileId(matchedFile.id);
    } else {
      const targetName = fileName.includes('.') ? fileName : `${fileName}.html`;
      setConfirmDialog({
        isOpen: true,
        title: 'Halaman Belum Dibuat',
        message: `File "${targetName}" belum ada di folder ini. Mau buat file "${targetName}" sekarang agar halaman ini bisa terbuka?`,
        confirmText: '+ Buat File Sekarang',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setNewFileNameInput(targetName);
          setIsNewFileModalOpen(true);
        }
      });
    }
  }, [files]);

  const handleFormatCode = () => {
    if (isReadOnly || !activeFile || activeFile.language === 'image') return;
    if (formatRef.current) {
      formatRef.current();
      setShowFormatToast(true);
      setTimeout(() => setShowFormatToast(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#121418] text-on-surface dark:text-gray-100 select-none transition-colors">
      {/* Hidden File Upload Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*,.html,.css,.js,.svg,.json,.txt"
        className="hidden"
      />

      {/* Top Header */}
      <Header
        meetingTitle={folderName ? `📁 ${folderName}` : 'Kodelab Studio'}
        saveStatus={saveStatus}
      />

      {/* Invisible Fullscreen Backdrop during Split Drag to prevent iframe mouse event loss */}
      {isDraggingSplit && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto bg-transparent" />
      )}

      {/* Main VS Code Workspace */}
      <main className="relative pt-16 bg-background dark:bg-[#121418] min-h-screen transition-colors">
        <div
          ref={containerRef}
          className="flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] p-container-padding relative"
        >
          {/* Left Column: VS Code Explorer + Multi-File Code Editor */}
          <section
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (showSidePreview ? `${splitRatio}%` : '100%') : '100%' }}
            className={`h-full bg-surface-container-lowest dark:bg-[#181a1f] shadow-sm rounded-xl overflow-hidden border border-outline-variant/30 dark:border-gray-800 transition-colors shrink-0 select-text ${
              mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* VS Code File Explorer Sidebar */}
            <div
              className={`${
                isExplorerOpen ? 'w-56 md:w-60' : 'w-12'
              } h-full bg-surface-container-low dark:bg-[#14161a] border-r border-surface-container dark:border-gray-800 flex flex-col transition-all duration-150 select-none shrink-0`}
            >
              {/* Explorer Header */}
              <div className="h-10 px-3 flex items-center justify-between border-b border-surface-container dark:border-gray-800 bg-surface-container/40 dark:bg-gray-900/40">
                {isExplorerOpen && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    Explorer
                  </span>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {isExplorerOpen && activeFolderId && (
                    <>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => setIsNewFileModalOpen(true)}
                            className="p-1 hover:bg-surface-container dark:hover:bg-gray-800 rounded text-on-surface-variant dark:text-gray-400 hover:text-primary transition-colors"
                            title="New File"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1 hover:bg-surface-container dark:hover:bg-gray-800 rounded text-on-surface-variant dark:text-gray-400 hover:text-primary transition-colors"
                            title="Upload File / Image from Device"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsOpenFolderModalOpen(true)}
                        className="p-1 hover:bg-surface-container dark:hover:bg-gray-800 rounded text-on-surface-variant dark:text-gray-400 hover:text-primary transition-colors"
                        title="Open Folder"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                    className="p-1 hover:bg-surface-container dark:hover:bg-gray-800 rounded text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white transition-colors"
                    title={isExplorerOpen ? 'Collapse Explorer' : 'Expand Explorer'}
                  >
                    {isExplorerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Explorer Body */}
              {isExplorerOpen && (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {!activeFolderId ? (
                    <div className="p-3 text-center space-y-3 pt-6">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto text-primary">
                        <FolderPlus className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-on-surface dark:text-gray-200">No folder opened</div>
                        <div className="text-[11px] text-on-surface-variant dark:text-gray-400">
                          Create or open a folder to start coding.
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsNewFolderModalOpen(true)}
                            className="w-full py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>+ New Folder</span>
                          </button>
                        )}
                        {customProjects.length > 0 && (
                          <button
                            onClick={() => setIsOpenFolderModalOpen(true)}
                            className="w-full py-1.5 bg-surface-container dark:bg-gray-800 text-on-surface dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Open Folder</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Folder Title Accordion */}
                      <div
                        onClick={() => setIsFolderTreeOpen(!isFolderTreeOpen)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-gray-800/80 cursor-pointer font-bold text-xs text-on-surface dark:text-gray-200 group"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isFolderTreeOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant dark:text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant dark:text-gray-400 shrink-0" />
                          )}
                          <Folder className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{folderName}</span>
                        </div>
                      </div>

                      {/* Files in Folder */}
                      {isFolderTreeOpen && (
                        <div className="pl-4 space-y-0.5">
                          {files.map((file) => {
                            const isActive = file.id === activeFile?.id;
                            const isHtml = file.language === 'html';
                            const isCss = file.language === 'css';
                            const isJs = file.language === 'js';
                            const isImage = file.language === 'image';

                            return (
                              <div
                                key={file.id}
                                onClick={() => setActiveFileId(file.id)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer group transition-colors ${
                                  isActive
                                    ? 'bg-primary/10 dark:bg-primary/20 text-primary font-bold shadow-xs'
                                    : 'text-on-surface-variant dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-800 hover:text-on-surface dark:hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`text-[11px] font-bold px-1 rounded ${
                                    isHtml ? 'text-primary bg-primary/10 dark:bg-primary/25' :
                                    isCss ? 'text-[#264de4] dark:text-[#60a5fa] bg-[#264de4]/10 dark:bg-[#60a5fa]/20' :
                                    isJs ? 'text-[#d97706] dark:text-[#fbbf24] bg-[#f59e0b]/15 dark:bg-[#fbbf24]/20' :
                                    'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50'
                                  }`}>
                                    {isHtml ? '</>' : isCss ? '#' : isJs ? 'JS' : '🖼️'}
                                  </span>
                                  <span className="truncate">{file.name}</span>
                                </div>

                                {/* Hover actions: Rename & Delete */}
                                {!isReadOnly && (
                                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFileToRename(file);
                                        setRenamedName(file.name);
                                        setIsRenameFileModalOpen(true);
                                      }}
                                      className="p-0.5 hover:text-primary rounded"
                                      title="Rename"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteFile(file.id, e)}
                                      className="p-0.5 hover:text-error dark:hover:text-red-400 rounded"
                                      title="Delete File"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Quick Add & Upload inside Tree */}
                          {!isReadOnly && (
                            <div className="pt-1.5 space-y-1">
                              <button
                                onClick={() => setIsNewFileModalOpen(true)}
                                className="w-full text-left px-2 py-1 text-[11px] font-sans font-semibold text-primary hover:bg-primary/5 dark:hover:bg-primary/20 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>New File...</span>
                              </button>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full text-left px-2 py-1 text-[11px] font-sans font-semibold text-on-surface-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-primary/5 dark:hover:bg-gray-800 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Upload Image / File</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Editor Body Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#181a1f] transition-colors">
              
              {/* Tabs Bar */}
              <header className="flex items-center justify-between px-2 pt-2 bg-surface-container-low dark:bg-[#14161a] border-b border-surface-container/60 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {files.map((file) => {
                    const isActive = file.id === activeFile?.id;
                    const isHtml = file.language === 'html';
                    const isCss = file.language === 'css';
                    const isJs = file.language === 'js';
                    const isImage = file.language === 'image';

                    return (
                      <div
                        key={file.id}
                        onClick={() => setActiveFileId(file.id)}
                        className={`relative flex items-center h-10 px-3.5 gap-2 rounded-t-lg font-bold text-xs md:text-sm transition-all cursor-pointer group shrink-0 ${
                          isActive
                            ? 'bg-white dark:bg-[#181a1f] text-on-surface dark:text-white shadow-[0_-2px_4px_rgba(0,0,0,0.02)]'
                            : 'bg-transparent text-on-surface-variant dark:text-gray-400 hover:bg-surface-container-lowest/50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          isHtml ? 'text-primary bg-primary/10 dark:bg-primary/25' :
                          isCss ? 'text-[#264de4] dark:text-[#60a5fa] bg-[#264de4]/10 dark:bg-[#60a5fa]/20' :
                          isJs ? 'text-[#d97706] dark:text-[#fbbf24] bg-[#f59e0b]/15 dark:bg-[#fbbf24]/20' :
                          'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50'
                        }`}>
                          {isHtml ? '</>' : isCss ? '#' : isJs ? 'JS' : '🖼️'}
                        </span>
                        <span className="font-mono">{file.name}</span>

                        {!isLockedBySession && (
                          <button
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant dark:text-gray-400 hover:text-error dark:hover:text-red-400 rounded transition-opacity ml-1"
                            title="Delete File"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isActive && (
                          <div className={`absolute bottom-0 left-0 w-full h-0.5 ${
                            isHtml ? 'bg-primary' : isCss ? 'bg-[#264de4]' : isJs ? 'bg-[#d97706]' : 'bg-emerald-600'
                          }`} />
                        )}
                      </div>
                    );
                  })}

                  {activeFolderId && !isLockedBySession && (
                    <button
                      onClick={() => setIsNewFileModalOpen(true)}
                      className="w-8 h-8 flex items-center justify-center text-on-surface-variant dark:text-gray-400 hover:text-primary hover:bg-surface-container dark:hover:bg-gray-800 rounded-lg transition-colors ml-1 shrink-0"
                      title="New File"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </header>

              {/* Sub-toolbar */}
              <div className="flex items-center justify-between px-3 md:px-4 py-1.5 bg-surface-container-lowest dark:bg-[#181a1f] border-b border-surface-container dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => undoRef.current?.()}
                    className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Undo"
                  >
                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => redoRef.current?.()}
                    className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Redo"
                  >
                    <RotateCw className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  {/* Format / Beautify Code Button */}
                  <button
                    onClick={handleFormatCode}
                    disabled={isReadOnly || !activeFile || activeFile.language === 'image'}
                    className="h-9 md:h-11 px-2.5 md:px-3 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors shadow-2xs ml-1 min-h-[44px]"
                    title="Format Code / Rapikan (Shift + Alt + F)"
                  >
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                    <span className="hidden sm:inline font-sans">Rapikan Code</span>
                  </button>
                </div>

                {/* Mobile View Switcher: Code vs Preview */}
                <div className="flex lg:hidden items-center p-1 rounded-xl bg-surface-container dark:bg-gray-800 text-xs font-bold">
                  <button
                    onClick={() => setMobileTab('editor')}
                    className={`px-3 py-2 rounded-lg transition-all min-h-[44px] flex items-center justify-center ${
                      mobileTab === 'editor'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white'
                    }`}
                  >
                    💻 Code
                  </button>
                  <button
                    onClick={() => setMobileTab('preview')}
                    className={`px-3 py-2 rounded-lg transition-all min-h-[44px] flex items-center justify-center ${
                      mobileTab === 'preview'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white'
                    }`}
                  >
                    🌐 Preview
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Go Live (New Tab Live Sync Preview) */}
                  <button
                    onClick={() => window.open('/preview', 'kodelab_live_preview_tab')}
                    className="flex items-center gap-1.5 px-3 h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors"
                    title="Go Live (Open Auto-Sync Preview in New Tab)"
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                    <span className="hidden sm:inline">Go Live</span>
                  </button>

                  {/* Re-open Side Preview if closed */}
                  {!showSidePreview && (
                    <button
                      onClick={() => setShowSidePreview(true)}
                      className="hidden lg:flex items-center gap-1.5 px-3 h-8 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light rounded-lg text-xs font-bold transition-colors border border-primary/20"
                      title="Tampilkan Preview (Split Screen)"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Tampilkan Preview</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Read-Only Lock Banner for Closed Sessions */}
              {isLockedBySession && (
                <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 font-semibold shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <span>
                      <strong>Session Closed:</strong> This class session was closed by the instructor. Code edits and file management are locked.
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    Read-Only
                  </span>
                </div>
              )}

              {/* Review / Inspection Mode Banner for Instructors */}
              {!isLockedBySession && isInstructorInspecting && (
                <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-xs text-primary dark:text-primary-light font-semibold shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👁️</span>
                    <span>
                      <strong>Instructor Review Mode:</strong> You are inspecting the student folder for <strong>{activeProject?.student?.full_name || 'Student'}</strong> in Read-Only Mode to preserve the original student code.
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/20 text-primary dark:text-primary-light">
                    Inspection Only
                  </span>
                </div>
              )}

              {/* CodeMirror Editor or Image Viewer */}
              <div className="flex-1 overflow-hidden relative">
                {/* Floating Format Success Toast */}
                {showFormatToast && (
                  <div className="absolute top-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-slate-900/90 text-white dark:bg-white/90 dark:text-slate-900 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
                    <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-500 animate-spin" />
                    <span>Code Formatted & Indented! ✨</span>
                  </div>
                )}

                {activeFile?.language === 'image' ? (
                  /* Clean Image Viewer */
                  <div className="flex flex-col items-center justify-center h-full p-6 bg-surface-container-low dark:bg-[#14161a] overflow-auto space-y-3">
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-surface-container dark:border-gray-800 max-w-lg max-h-[70vh] flex items-center justify-center">
                      <img
                        src={activeFile.content}
                        alt={activeFile.name}
                        className="max-h-[60vh] max-w-full object-contain rounded-lg"
                      />
                    </div>
                    <div className="text-center font-mono text-xs text-on-surface-variant dark:text-gray-400">
                      {activeFile.name}
                    </div>
                  </div>
                ) : activeFile ? (
                  <CodeMirrorEditor
                    key={activeFile.id}
                    value={activeFile.content}
                    language={activeFile.language as any}
                    readOnly={isReadOnly}
                    onChange={handleCodeChange}
                    onUndoRef={undoRef}
                    onRedoRef={redoRef}
                    onFormatRef={formatRef}
                  />
                ) : !activeFolderId ? (
                  /* No Folder Opened State */
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 bg-surface-container-lowest dark:bg-[#181a1f]">
                    <div className="w-14 h-14 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                      <FolderPlus className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <div className="text-base font-bold text-on-surface dark:text-gray-100">
                        No folder opened
                      </div>
                      <p className="text-xs text-on-surface-variant dark:text-gray-400">
                        Create a new project folder or open an existing folder to start coding.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        onClick={() => setIsNewFolderModalOpen(true)}
                        className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>+ New Folder</span>
                      </button>
                      {customProjects.length > 0 && (
                        <button
                          onClick={() => setIsOpenFolderModalOpen(true)}
                          className="px-4 py-2.5 bg-surface-container dark:bg-gray-800 text-on-surface dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Open Folder</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Folder is Empty State */
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 bg-surface-container-lowest dark:bg-[#181a1f]">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <div className="text-sm font-bold text-on-surface dark:text-gray-200">
                        This folder is currently empty
                      </div>
                      <p className="text-xs text-on-surface-variant dark:text-gray-400">
                        Create your files (e.g. <code className="text-primary font-bold">index.html</code>, <code className="text-[#264de4] font-bold">style.css</code>) or upload files to start coding!
                      </p>
                    </div>
                    {!isLockedBySession && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setIsNewFileModalOpen(true)}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ New File</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-surface-container dark:bg-gray-800 text-on-surface dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload File / Image</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Footer */}
              <footer className="h-8 bg-surface-bright dark:bg-[#14161a] flex items-center justify-between px-4 text-xs font-semibold text-on-surface-variant dark:text-gray-400 border-t border-surface-container dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                    {activeFile?.name || 'No file'}
                  </span>
                  <span className="text-on-surface-variant/60 dark:text-gray-500">UTF-8</span>
                </div>
                <div className="text-on-surface-variant/80 dark:text-gray-400">
                  {activeFile?.content ? (activeFile.language === 'image' ? 'Image Asset' : `${activeFile.content.split('\n').length} lines`) : '0 lines'}
                </div>
              </footer>

            </div>
          </section>

          {/* Resizable Divider Handle & Right Column (Desktop Split or Mobile Full Preview) */}
          {(showSidePreview || mobileTab === 'preview') && (
            <>
              <div
                onMouseDown={handleMouseDownSplit}
                onTouchStart={handleTouchStartSplit}
                className={`hidden lg:flex w-4 items-center justify-center cursor-col-resize select-none shrink-0 group relative z-30 ${
                  isDraggingSplit ? 'text-primary' : 'text-on-surface-variant/40 dark:text-gray-600 hover:text-primary'
                }`}
                title="Drag to resize Editor & Preview"
              >
                <div className="w-1.5 h-12 rounded-full bg-surface-container-highest dark:bg-gray-800 group-hover:bg-primary transition-colors flex items-center justify-center shadow-xs">
                  <GripVertical className="w-3 h-3 text-on-surface-variant dark:text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </div>

              <div
                style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `calc(${100 - splitRatio}% - 16px)` : '100%' }}
                className={`h-full w-full shrink-0 ${isDraggingSplit ? 'pointer-events-none' : ''} ${
                  mobileTab === 'preview' ? 'block' : 'hidden lg:block'
                }`}
              >
                <LivePreview
                  htmlCode={previewHtml}
                  cssCode={previewCss}
                  jsCode={previewJs}
                  assets={assetsMap}
                  onNavigateFile={handleNavigateFile}
                  onClose={() => {
                    setShowSidePreview(false);
                    setMobileTab('editor');
                  }}
                  onGoLive={() => window.open('/preview', 'kodelab_live_preview_tab')}
                />
              </div>
            </>
          )}

        </div>
      </main>

      {/* Modal: Select / Open Folder */}
      {isOpenFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">Select / Open Folder</h3>
              </div>
              <button
                onClick={() => setIsOpenFolderModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Folder List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  📁 Your Folders & Projects
                </span>
                <button
                  onClick={() => {
                    setIsOpenFolderModalOpen(false);
                    setIsNewFolderModalOpen(true);
                  }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Folder
                </button>
              </div>

              {customProjects.length === 0 ? (
                <div className="p-6 bg-surface-container dark:bg-gray-900 rounded-2xl text-xs text-on-surface-variant dark:text-gray-400 text-center space-y-2">
                  <div>No folders created yet.</div>
                  <button
                    onClick={() => {
                      setIsOpenFolderModalOpen(false);
                      setIsNewFolderModalOpen(true);
                    }}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
                  >
                    + Create Folder Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {customProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openCustomProjectFolder(p)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        activeFolderId === p.id
                          ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-xs'
                          : 'bg-surface-container dark:bg-gray-900 hover:bg-surface-container-high dark:hover:bg-gray-850 border-transparent text-on-surface dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate text-xs md:text-sm">{p.name}</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant/80 dark:text-gray-400 shrink-0">
                        {p.files.length} {p.files.length === 1 ? 'file' : 'files'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-surface-container dark:border-gray-800">
              <button
                onClick={() => {
                  setIsOpenFolderModalOpen(false);
                  setIsNewFolderModalOpen(true);
                }}
                className="px-4 py-2 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-xl hover:bg-secondary-container/80 transition-colors flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Create New Folder</span>
              </button>

              <button
                onClick={() => setIsOpenFolderModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New File */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">Add New File</h3>
              </div>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewFile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  File Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="about.html / navbar.css / game.js"
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm font-mono focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Folder */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface dark:text-gray-100">Create New Folder</h3>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lesson 1, Web Calculator, Portfolio"
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary font-medium text-on-surface dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  Class Session / Meeting (Optional)
                </label>
                <select
                  value={newFolderSessionId}
                  onChange={(e) => setNewFolderSessionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-gray-100 font-medium"
                >
                  <option value="">-- Personal / Standalone Folder --</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({new Date(m.created_at || m.meeting_date || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-surface-container dark:bg-gray-900 rounded-xl">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFolderWithStarter}
                    onChange={(e) => setNewFolderWithStarter(e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary accent-primary"
                  />
                  <span className="text-xs text-on-surface dark:text-gray-200 font-semibold">
                    Include starter template files (<code>index.html</code>, <code>style.css</code>, <code>script.js</code>)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename File */}
      {isRenameFileModalOpen && fileToRename && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-on-surface dark:text-gray-100">Rename File</h3>
              <button
                onClick={() => setIsRenameFileModalOpen(false)}
                className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenameFileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase mb-1.5">
                  New File Name
                </label>
                <input
                  type="text"
                  required
                  value={renamedName}
                  onChange={(e) => setRenamedName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-gray-900 rounded-xl border border-outline-variant/40 dark:border-gray-700 text-sm font-mono focus:outline-none focus:border-primary text-on-surface dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameFileModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Save Name
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
