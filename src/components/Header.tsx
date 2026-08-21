'use client';

import React from 'react';
import { CheckCircle2, Clock, Send, ChevronDown, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLayout } from '@/lib/layout-context';
import { useTheme } from '@/lib/theme-context';
import { Meeting, SubmissionStatus } from '@/types';

interface HeaderProps {
  meetingTitle?: string;
  meetings?: Meeting[];
  currentMeetingId?: string;
  onSelectMeeting?: (meetingId: string) => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  submissionStatus?: SubmissionStatus;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export default function Header({
  meetingTitle = 'Kodelab Studio',
  meetings = [],
  currentMeetingId,
  onSelectMeeting,
  saveStatus = 'saved',
  submissionStatus = 'not_started',
  onSubmit,
  isSubmitting = false,
}: HeaderProps) {
  const { user } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-surface/90 dark:bg-[#181a1f]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-container-padding border-b border-surface-container/60 dark:border-gray-800 transition-all duration-200 ease-in-out ${
        isSidebarOpen ? 'left-0 md:left-64 lg:left-72' : 'left-0'
      }`}
    >
      {/* Title, Sidebar Toggle & Meeting Switcher */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Open Sidebar Button (Only shown when sidebar is hidden) */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl text-on-surface-variant dark:text-gray-400 hover:text-primary transition-colors flex items-center justify-center shrink-0"
            title="Show Navigation Menu"
          >
            <PanelLeft className="w-5 h-5 text-primary" />
          </button>
        )}

        {meetings.length > 0 && onSelectMeeting ? (
          <div className="relative group">
            <button className="flex items-center gap-2 text-base font-bold text-on-surface dark:text-gray-100 hover:text-primary transition-colors py-1.5 px-3 rounded-lg hover:bg-surface-container dark:hover:bg-gray-800">
              <span>{meetingTitle}</span>
              <ChevronDown className="w-4 h-4 text-on-surface-variant dark:text-gray-400" />
            </button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-72 bg-surface-container-lowest dark:bg-gray-900 rounded-xl shadow-xl border border-surface-container dark:border-gray-800 p-1 z-50">
              <div className="px-3 py-1.5 text-xs font-bold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider">
                Select Session
              </div>
              {meetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectMeeting(m.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    m.id === currentMeetingId
                      ? 'bg-primary-container text-on-primary-container font-bold'
                      : 'text-on-surface dark:text-gray-200 hover:bg-surface-container dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="truncate">{m.title}</span>
                  {m.is_active && (
                    <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded font-bold ml-2">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <h1 className="text-base md:text-lg font-bold text-on-surface dark:text-gray-100 truncate max-w-xs sm:max-w-md">
            {meetingTitle}
          </h1>
        )}

        {/* Submission badge status */}
        {submissionStatus === 'submitted' && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Submitted
          </span>
        )}
      </div>

      {/* Right Controls: Theme Toggle, Autosave Indicator, Submit Button, Avatar */}
      <div className="flex items-center gap-2 md:gap-gutter">
        
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-on-surface-variant dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-surface-container dark:hover:bg-gray-800 transition-colors flex items-center justify-center shrink-0"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-2 text-on-surface-variant dark:text-gray-400 text-xs font-bold tracking-wider uppercase shrink-0">
          {saveStatus === 'saving' ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed-dim opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="hidden sm:inline">Saving...</span>
            </>
          ) : saveStatus === 'unsaved' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="hidden sm:inline">Unsaved</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="hidden sm:inline">Saved</span>
            </>
          )}
        </div>

        {/* Submit button for students */}
        {onSubmit && user?.role === 'student' && (
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`min-h-[40px] px-4 md:px-5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 shrink-0 ${
              submissionStatus === 'submitted'
                ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'
                : 'bg-primary text-on-primary hover:bg-primary-hover'
            }`}
          >
            <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>{submissionStatus === 'submitted' ? 'Resubmit' : 'Submit Work'}</span>
          </button>
        )}

        <div className="w-px h-6 bg-outline-variant/40 dark:bg-gray-800 hidden sm:block shrink-0" />

        {/* Profile Avatar (Alphabet Initial) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 dark:bg-primary/25 text-primary dark:text-primary-light flex items-center justify-center font-bold text-sm border-2 border-surface-container-highest dark:border-gray-700 shadow-xs">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
