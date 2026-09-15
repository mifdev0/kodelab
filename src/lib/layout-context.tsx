'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-collapse on small screens and expand when returning to desktop width.
  // Only reacts when crossing the breakpoint so manual toggles are respected.
  useEffect(() => {
    const isMobile = () => window.innerWidth < 768;
    let wasMobile = isMobile();

    // Initial state based on current viewport
    setIsSidebarOpen(!wasMobile);

    const handleResize = () => {
      const nowMobile = isMobile();
      if (nowMobile !== wasMobile) {
        setIsSidebarOpen(!nowMobile);
        wasMobile = nowMobile;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <LayoutContext.Provider value={{ isSidebarOpen, setIsSidebarOpen, toggleSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
