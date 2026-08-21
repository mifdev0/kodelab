'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import { store } from '@/lib/store';
import { Submission, EditorTab, SubmissionStatus } from '@/types';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar,
  Sparkles,
  MessageSquare,
  Check
} from 'lucide-react';

export default function SubmissionDetail() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('html');
  const [feedbackText, setFeedbackText] = useState('');
  const [statusOverride, setStatusOverride] = useState<SubmissionStatus>('submitted');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!rawId) return;

    let sub: Submission | undefined;
    if (rawId.includes('_')) {
      const [meetingId, studentId] = rawId.split('_');
      sub = store.getSubmission(meetingId, studentId);
    } else {
      sub = store.getSubmissionById(rawId);
    }

    if (sub) {
      setSubmission(sub);
      setFeedbackText(sub.teacher_feedback || '');
      setStatusOverride(sub.status);
    }
  }, [rawId]);

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;

    setIsSavingFeedback(true);
    setTimeout(() => {
      const updated = store.saveTeacherFeedback(
        submission.id,
        feedbackText,
        statusOverride
      );

      if (updated) {
        setSubmission(updated);
      }
      setIsSavingFeedback(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-on-surface">Submission Not Found</h2>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const student = submission.student;
  const currentCode = activeTab === 'html' ? submission.html_code : activeTab === 'css' ? submission.css_code : submission.js_code;

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Top Navbar for Teacher Inspector */}
      <header className="h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-container-padding border-b border-surface-container/60 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3">
            <img
              src={student?.avatar_url || '/assets/avatar.png'}
              alt={student?.full_name || 'Student'}
              className="w-10 h-10 rounded-full object-cover border border-surface-container shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/avatar.png';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-on-surface">{student?.full_name}</span>
                <span className="text-xs bg-surface-container text-on-surface-variant font-semibold px-2 py-0.5 rounded">
                  @{student?.username}
                </span>
              </div>
              <div className="text-xs text-on-surface-variant">
                {submission.meeting?.title || 'Lesson Session'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge & Timestamp */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Updated: {new Date(submission.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {submission.status === 'submitted' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Submitted
            </span>
          ) : submission.status === 'in_progress' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              In Progress
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              Not Started
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace for Review */}
      <div className="flex-1 flex flex-col lg:flex-row p-container-padding gap-gutter overflow-hidden h-[calc(100vh-64px)]">
        
        {/* Left Column: Read-Only Code Viewer & Tabs */}
        <section className="flex flex-col w-full lg:w-[50%] h-full bg-surface-container-lowest shadow-sm rounded-xl overflow-hidden border border-outline-variant/30">
          <header className="flex items-center justify-between px-2 pt-2 bg-surface-container-low border-b border-surface-container/60 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('html')}
                className={`relative flex items-center h-10 px-4 gap-2 rounded-t-lg font-bold text-sm transition-all ${
                  activeTab === 'html'
                    ? 'bg-surface-container-lowest text-on-surface'
                    : 'bg-transparent text-on-surface-variant hover:bg-surface-container-lowest/50'
                }`}
              >
                <span className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">&lt;/&gt;</span>
                <span>index.html</span>
                {activeTab === 'html' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>

              <button
                onClick={() => setActiveTab('css')}
                className={`relative flex items-center h-10 px-4 gap-2 rounded-t-lg font-bold text-sm transition-all ${
                  activeTab === 'css'
                    ? 'bg-surface-container-lowest text-on-surface'
                    : 'bg-transparent text-on-surface-variant hover:bg-surface-container-lowest/50'
                }`}
              >
                <span className="text-[#264de4] text-xs bg-[#264de4]/10 px-1.5 py-0.5 rounded">#</span>
                <span>style.css</span>
                {activeTab === 'css' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#264de4]" />}
              </button>

              <button
                onClick={() => setActiveTab('js')}
                className={`relative flex items-center h-10 px-4 gap-2 rounded-t-lg font-bold text-sm transition-all ${
                  activeTab === 'js'
                    ? 'bg-surface-container-lowest text-on-surface'
                    : 'bg-transparent text-on-surface-variant hover:bg-surface-container-lowest/50'
                }`}
              >
                <span className="text-[#d97706] text-xs bg-[#f59e0b]/15 px-1.5 py-0.5 rounded">JS</span>
                <span>script.js</span>
                {activeTab === 'js' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#d97706]" />}
              </button>
            </div>

            <div className="px-3 text-xs font-semibold text-on-surface-variant/70">
              Instructor Mode (Read-Only)
            </div>
          </header>

          {/* Editor Body (Read-only) */}
          <div className="flex-1 overflow-hidden relative">
            <CodeMirrorEditor
              key={activeTab}
              value={currentCode}
              language={activeTab}
              readOnly={true}
            />
          </div>

          <footer className="h-8 bg-surface-bright flex items-center justify-between px-4 text-xs font-semibold text-on-surface-variant border-t border-surface-container shrink-0">
            <span>{currentCode.split('\n').length} code lines</span>
            <span>UTF-8</span>
          </footer>
        </section>

        {/* Right Column: Live Preview + Teacher Feedback Form */}
        <div className="w-full lg:w-[50%] h-full flex flex-col gap-gutter">
          {/* Live Preview Pane */}
          <div className="flex-1 min-h-[280px]">
            <LivePreview
              htmlCode={submission.html_code}
              cssCode={submission.css_code}
              jsCode={submission.js_code}
              isFullscreen={false}
            />
          </div>

          {/* Teacher Feedback & Evaluation Card */}
          <form
            onSubmit={handleSaveFeedback}
            className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm shrink-0 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-on-surface">
                  Teacher Evaluation & Feedback
                </span>
              </div>

              {/* Status Override Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">
                  Change Status:
                </span>
                <select
                  value={statusOverride}
                  onChange={(e) => setStatusOverride(e.target.value as SubmissionStatus)}
                  className="text-xs font-bold bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-surface-container-highest focus:outline-none focus:border-primary"
                >
                  <option value="submitted">✅ Submitted</option>
                  <option value="in_progress">⏳ In Progress</option>
                  <option value="not_started">⚪ Not Started</option>
                </select>
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="Write feedback, praise, or code suggestions for this student..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-outline-variant/40 text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/60"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-on-surface-variant">
                {saveSuccess && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Feedback saved & sent to student!
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSavingFeedback}
                className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-xs md:text-sm hover:bg-primary-hover shadow-sm transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSavingFeedback ? 'Saving...' : 'Save Feedback'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
