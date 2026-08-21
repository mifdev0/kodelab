'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { Meeting, ClassRoom } from '@/types';
import { 
  GraduationCap, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  ArrowLeft, 
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ClassesManagement() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('class-1');

  useEffect(() => {
    loadData();
  }, [selectedClassId]);

  const loadData = () => {
    setClasses(store.getClasses());
    setMeetings(store.getMeetings(selectedClassId));
  };

  const handleToggleActive = (meetingId: string) => {
    store.setActiveMeeting(meetingId);
    setMeetings(store.getMeetings(selectedClassId));
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <header className="fixed top-0 left-64 md:left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-container-padding border-b border-surface-container/60">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold text-on-surface">Manage Classes & Lessons</h1>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 bg-primary text-white text-xs md:text-sm font-bold rounded-xl hover:bg-primary-hover shadow-sm"
        >
          Back to Overview
        </Link>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-container-padding pb-12 max-w-7xl mx-auto space-y-6">
        
        {/* Class Details Card */}
        {classes.map((cls) => (
          <div key={cls.id} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">{cls.name}</h2>
                <p className="text-xs text-on-surface-variant">Instructor: {cls.teacher_name}</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant pt-2">{cls.description}</p>
          </div>
        ))}

        {/* Meetings Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-on-surface">Lesson Schedule</h3>
            <span className="text-xs text-on-surface-variant font-medium">
              Choose a lesson to set as the active session for the class.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  meeting.is_active
                    ? 'bg-surface-container-lowest border-primary shadow-md'
                    : 'bg-surface-container-lowest border-outline-variant/30 shadow-xs hover:border-outline-variant'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">
                      Lesson {meeting.session_number}
                    </span>
                    {meeting.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary text-white px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Lesson
                      </span>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">Inactive</span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-on-surface">{meeting.title}</h4>
                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {meeting.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-surface-container flex items-center justify-between">
                  <div className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{meeting.meeting_date || 'Scheduled'}</span>
                  </div>

                  {!meeting.is_active ? (
                    <button
                      onClick={() => handleToggleActive(meeting.id)}
                      className="px-3 py-1.5 bg-surface-container hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Activate Lesson
                    </button>
                  ) : (
                    <Link
                      href={`/editor/${meeting.id}`}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors flex items-center gap-1"
                    >
                      <span>Open in Editor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
