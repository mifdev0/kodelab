'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Code2, 
  FolderGit2, 
  LayoutDashboard, 
  Users, 
  LogOut,
  PanelLeftClose
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLayout } from '@/lib/layout-context';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { setIsSidebarOpen } = useLayout();

  const isTeacher = user?.role === 'teacher';

  const studentNavItems = [
    { label: 'Class Sessions', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Personal Projects', href: '/projects', icon: FolderGit2 },
    { label: 'Code Editor', href: '/editor', icon: Code2 },
  ];

  const teacherNavItems = [
    { label: 'Class Sessions', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Registered Students', href: '/dashboard/students', icon: Users },
    { label: 'Code Editor', href: '/editor', icon: Code2 },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <aside className="h-full w-64 md:w-72 bg-white dark:bg-[#0c0e14] flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 select-none shadow-xs transition-colors">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 gap-3 border-b border-slate-100 dark:border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight">
              Kodelab
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
              {isTeacher ? 'Instructor Studio' : 'Student Hub'}
            </span>
          </div>
        </Link>

        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Hide Sidebar"
        >
          <PanelLeftClose className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = (() => {
            if (item.href === '/dashboard') return pathname === '/dashboard';
            if (item.href === '/dashboard/students') return pathname.startsWith('/dashboard/students');
            if (item.href === '/projects') return pathname === '/projects';
            if (item.href === '/editor') return pathname === '/editor' || pathname.startsWith('/projects/');
            return pathname === item.href;
          })();

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-3 md:py-3.5 min-h-[44px] rounded-xl transition-all text-xs md:text-sm font-bold ${
                isActive
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout in Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#12141c] border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 text-primary dark:text-primary-light flex items-center justify-center font-black text-xs md:text-sm shrink-0 border border-primary/20">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.full_name || 'Guest'}
              </span>
              <span className="text-[10px] md:text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                {user?.role === 'teacher' ? 'Instructor' : `@${user?.username || 'student'}`}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

    </aside>
  );
}
