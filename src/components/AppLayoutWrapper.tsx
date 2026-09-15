'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useLayout } from '@/lib/layout-context';
import { useAuth } from '@/lib/auth-context';
import { Code2 } from 'lucide-react';

// Routes that are accessible without logging in
const STANDALONE_PATHS = ['/', '/login', '/preview', '/parents', '/recap'];

// Routes that only an instructor may open
const TEACHER_ONLY_PREFIXES = [
  '/dashboard/students',
  '/dashboard/grades',
  '/dashboard/submissions',
];

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isSidebarOpen, setIsSidebarOpen } = useLayout();

  const isStandalone = STANDALONE_PATHS.includes(pathname);
  const isTeacherOnly = TEACHER_ONLY_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  );

  const isForbidden = Boolean(user) && isTeacherOnly && user?.role !== 'teacher';

  // Redirect unauthenticated / unauthorized visitors to the right place
  useEffect(() => {
    if (isStandalone || isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }
    if (isTeacherOnly && user.role !== 'teacher') {
      router.replace('/dashboard');
    }
  }, [isStandalone, isLoading, user, isTeacherOnly, router]);

  if (isStandalone) {
    return <>{children}</>;
  }

  // While auth is hydrating, when there is no user, or when the user is not
  // allowed on this route, never render the protected page content.
  if (isLoading || !user || isForbidden) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#121418] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg">
          <Code2 className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono text-on-surface-variant dark:text-gray-400">
          {isLoading ? 'Memeriksa sesi...' : 'Mengalihkan...'}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121418] text-on-surface dark:text-gray-100 flex transition-colors">
      {/* Sidebar with smooth collapse transition */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Backdrop for mobile & portrait tablet when sidebar is open */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area: transitions pl-0 when collapsed for 100% full screen immersion */}
      <div
        className={`flex-1 w-full min-h-screen transition-all duration-200 ease-in-out ${
          isSidebarOpen ? 'pl-0 lg:pl-72' : 'pl-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
