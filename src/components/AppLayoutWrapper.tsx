'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useLayout } from '@/lib/layout-context';

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/preview' || 
    pathname === '/parents' || 
    pathname === '/recap';
  const { isSidebarOpen, setIsSidebarOpen } = useLayout();

  if (isStandalone) {
    return <>{children}</>;
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

      {/* Backdrop for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area: transitions pl-0 when collapsed for 100% full screen immersion */}
      <div
        className={`flex-1 w-full min-h-screen transition-all duration-200 ease-in-out ${
          isSidebarOpen ? 'pl-0 md:pl-64 lg:pl-72' : 'pl-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
