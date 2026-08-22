'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { 
  Sun, 
  Moon, 
  Code2, 
  Terminal, 
  Laptop, 
  Boxes,
  ChevronUp,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

const DYNAMIC_WORDS = [
  'Real Web Apps',
  'Interactive Games',
  'Creative Websites',
  'HTML & CSS Mastery'
];

interface WorkspaceItem {
  id: string;
  number: string;
  tag: string;
  title: string;
  description: string;
  href: string;
  ctaText: string;
  accentColor: 'blue' | 'indigo' | 'emerald';
  icon: any;
  techBadges: { label: string; logoUrl?: string; bg: string; text: string; border: string }[];
  terminalPrompt: string;
}

const WORKSPACES: WorkspaceItem[] = [
  {
    id: 'student',
    number: '01',
    tag: 'STUDENT_STUDIO',
    title: 'Student Portal',
    description: 'Write HTML, CSS, & JS with instant live preview. Work on class session assignments and personal web apps.',
    href: '/login?role=student',
    ctaText: 'Launch Student Studio',
    accentColor: 'blue',
    icon: Laptop,
    techBadges: [
      { 
        label: 'HTML5', 
        logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
        bg: 'bg-orange-500/10', 
        text: 'text-orange-600 dark:text-orange-400', 
        border: 'border-orange-500/20' 
      },
      { 
        label: 'CSS3', 
        logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
        bg: 'bg-blue-500/10', 
        text: 'text-blue-600 dark:text-blue-400', 
        border: 'border-blue-500/20' 
      },
      { 
        label: 'JavaScript', 
        logoUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
        bg: 'bg-amber-500/10', 
        text: 'text-amber-600 dark:text-amber-400', 
        border: 'border-amber-500/20' 
      },
    ],
    terminalPrompt: '~/student/studio',
  },
  {
    id: 'instructor',
    number: '02',
    tag: 'INSTRUCTOR_HUB',
    title: 'Instructor Hub',
    description: 'Open & lock class sessions, inspect student code in safe mode, and upload classroom learning documentation.',
    href: '/login?role=teacher',
    ctaText: 'Enter Instructor Hub',
    accentColor: 'indigo',
    icon: Terminal,
    techBadges: [
      { label: '🛡️ Safe Inspect', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
      { label: '📸 Class Documentation', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
    ],
    terminalPrompt: '~/instructor/admin',
  },
  {
    id: 'recap',
    number: '03',
    tag: 'CLASS_RECAP',
    title: 'Classroom Recap',
    description: 'Public timeline gallery with classroom documentation photos and 1-click live web previews for each meeting.',
    href: '/recap',
    ctaText: 'Explore Classroom Recap',
    accentColor: 'emerald',
    icon: Boxes,
    techBadges: [
      { label: '🌐 1-Click Live Web', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
      { label: '🔓 Public Access', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20' },
    ],
    terminalPrompt: 'public://classroom-recap',
  },
];

export default function UnifiedPortalGateway() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Active Card Index: 0 (Student), 1 (Instructor), 2 (Recap)
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Dynamic Word Cycling Effect
  const [wordIndex, setWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Wheel and Swipe Navigation Cooldown
  const isRollingRef = useRef<boolean>(false);
  const touchStartYRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % DYNAMIC_WORDS.length);
        setIsFading(false);
      }, 300);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        rollToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        rollToPrev();
      } else if (e.key === 'Enter') {
        router.push(WORKSPACES[activeIndex].href);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, router]);

  const rollToNext = () => {
    setActiveIndex((prev) => (prev + 1) % WORKSPACES.length);
  };

  const rollToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + WORKSPACES.length) % WORKSPACES.length);
  };

  // Wheel scroll handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (isRollingRef.current) return;

    if (Math.abs(e.deltaY) > 20) {
      isRollingRef.current = true;
      if (e.deltaY > 0) {
        rollToNext();
      } else {
        rollToPrev();
      }

      setTimeout(() => {
        isRollingRef.current = false;
      }, 380);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartYRef.current - touchEndY;

    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        rollToNext();
      } else {
        rollToPrev();
      }
    }
  };

  return (
    <div 
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="h-screen w-screen overflow-hidden bg-[#fafbfc] dark:bg-[#07080c] text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-primary selection:text-white relative select-none"
    >
      
      {/* Background Blueprint Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60 dark:opacity-35 -z-10" />
      
      {/* Ambient Color Glows */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[650px] h-[300px] bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ========================================================= */}
      {/* SCATTERED / ASYMMETRICAL FLOATING CODING STICKERS         */}
      {/* ========================================================= */}

      {/* 1. HTML5 Sticker (Scattered Left High, Tilted -6deg) */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#13151f]/90 border border-orange-500/30 shadow-xl shadow-orange-500/10 backdrop-blur-md absolute top-20 left-6 -rotate-6 animate-float-slow pointer-events-none z-0 hover:rotate-0 transition-transform">
        <img 
          src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" 
          alt="HTML5" 
          className="w-5 h-5 object-contain"
        />
        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
          &lt;HTML5 /&gt;
        </span>
      </div>

      {/* 2. CSS3 Sticker (Scattered Far Right Top, Tilted 12deg) */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#13151f]/90 border border-blue-500/30 shadow-xl shadow-blue-500/10 backdrop-blur-md absolute top-16 right-12 rotate-12 animate-float-reverse pointer-events-none z-0 hover:rotate-0 transition-transform">
        <img 
          src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" 
          alt="CSS3" 
          className="w-5 h-5 object-contain"
        />
        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
          CSS3 Flexbox
        </span>
      </div>

      {/* 3. JavaScript Sticker (Scattered Middle Left Low, Tilted 8deg) */}
      <div className="hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-[#13151f]/90 border border-amber-500/35 shadow-xl shadow-amber-500/15 backdrop-blur-md absolute top-[48%] left-4 rotate-8 animate-float-fast pointer-events-none z-0 hover:rotate-0 transition-transform">
        <img 
          src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" 
          alt="JavaScript" 
          className="w-5 h-5 rounded-sm object-contain"
        />
        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
          const code = true;
        </span>
      </div>

      {/* 4. React Sticker (Scattered Middle Right High, Tilted -10deg) */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#13151f]/90 border border-cyan-500/30 shadow-xl shadow-cyan-500/10 backdrop-blur-md absolute top-[42%] right-6 -rotate-10 animate-float-slow pointer-events-none z-0 hover:rotate-0 transition-transform">
        <img 
          src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" 
          alt="React" 
          className="w-5 h-5 object-contain animate-spin"
          style={{ animationDuration: '12s' }}
        />
        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
          React.js
        </span>
      </div>

      {/* 5. TypeScript Sticker (Scattered Lower Left, Tilted -12deg) */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#13151f]/90 border border-blue-600/30 shadow-lg shadow-blue-600/10 backdrop-blur-md absolute bottom-20 left-12 -rotate-12 animate-float-reverse pointer-events-none z-0 hover:rotate-0 transition-transform">
        <img 
          src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" 
          alt="TypeScript" 
          className="w-4 h-4 object-contain rounded-xs"
        />
        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
          type Studio = Dev;
        </span>
      </div>

      {/* 6. Tailwind CSS Sticker (Scattered Lower Right Offset, Tilted 6deg) */}
      <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-[#13151f]/90 border border-sky-500/30 shadow-xl shadow-sky-500/10 backdrop-blur-md absolute bottom-24 right-16 rotate-6 animate-float-fast pointer-events-none z-0 hover:rotate-0 transition-transform">
        <img 
          src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" 
          alt="Tailwind CSS" 
          className="w-5 h-5 object-contain"
        />
        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
          TailwindCSS
        </span>
      </div>

      {/* 7. Python / VSCode Sticker (Scattered Far Right Bottom, Tilted -4deg) */}
      <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/10 backdrop-blur-md absolute bottom-12 right-6 -rotate-4 animate-float-slow pointer-events-none z-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-mono text-xs font-bold">
          $ git commit -m &quot;feat&quot;
        </span>
      </div>

      {/* Top Header */}
      <header className="px-6 md:px-12 h-16 shrink-0 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#07080c]/70 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-primary/25">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              Kodelab
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2.5 text-xs pl-3 border-l border-slate-200 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 hidden md:inline text-xs">
                Hi, <strong>{user.full_name}</strong>
              </span>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover shadow-xs transition-colors flex items-center gap-1"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => logout()}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 px-1.5 py-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-primary px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Single-View Section (No Page Scrolling) */}
      <main className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col justify-center items-center py-2 space-y-4 md:space-y-6 z-10">
        
        {/* Compact Headline */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xs text-xs font-mono">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-600 dark:text-slate-400">Build with code:</span>
            <span className={`font-bold text-primary transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              {DYNAMIC_WORDS[wordIndex]}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Code.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500">
              Build.
            </span>{' '}
            Recap.
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <span>Scroll wheel or swipe to roll workspace deck</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ↑ / ↓
            </span>
          </p>
        </div>

        {/* ========================================================= */}
        {/* 3D LAYERED CARD DECK ROTARY CAROUSEL                      */}
        {/* ========================================================= */}
        <div className="relative w-full max-w-lg h-[290px] md:h-[300px] flex items-center justify-center">
          
          {/* Top & Bottom Quick Arrow Steppers */}
          <button
            onClick={rollToPrev}
            className="absolute -top-6 z-30 p-1.5 rounded-full bg-white/90 dark:bg-[#12141c]/90 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary shadow-sm hover:scale-110 transition-all"
            title="Previous (Scroll Up)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            onClick={rollToNext}
            className="absolute -bottom-6 z-30 p-1.5 rounded-full bg-white/90 dark:bg-[#12141c]/90 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary shadow-sm hover:scale-110 transition-all"
            title="Next (Scroll Down)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* 3 Layered Deck Cards */}
          {WORKSPACES.map((item, index) => {
            const Icon = item.icon;
            
            // Calculate distance in 3-item circular loop (-1, 0, 1)
            let offset = index - activeIndex;
            if (offset === 2) offset = -1;
            if (offset === -2) offset = 1;

            const isFront = offset === 0;
            const isBehindTop = offset === -1;
            const isBehindBottom = offset === 1;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!isFront) {
                    setActiveIndex(index);
                  } else {
                    router.push(item.href);
                  }
                }}
                className={`absolute w-full rounded-2xl border transition-all duration-500 ease-out cursor-pointer overflow-hidden ${
                  isFront
                    ? 'translate-y-0 scale-100 opacity-100 z-20 bg-white dark:bg-[#12141c] border-primary dark:border-primary shadow-2xl shadow-primary/15 ring-2 ring-primary/20 pointer-events-auto'
                    : isBehindTop
                    ? '-translate-y-12 sm:-translate-y-14 scale-[0.90] opacity-35 hover:opacity-65 z-10 bg-white/70 dark:bg-[#12141c]/60 border-slate-200 dark:border-slate-800 pointer-events-auto blur-[0.5px]'
                    : 'translate-y-12 sm:translate-y-14 scale-[0.90] opacity-35 hover:opacity-65 z-10 bg-white/70 dark:bg-[#12141c]/60 border-slate-200 dark:border-slate-800 pointer-events-auto blur-[0.5px]'
                }`}
              >
                {/* Mac window top bar */}
                <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${isFront ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className={`w-2.5 h-2.5 rounded-full ${isFront ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className={`w-2.5 h-2.5 rounded-full ${isFront ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
                      {item.terminalPrompt}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                    {item.number}
                  </span>
                </div>

                {/* Card Content Body */}
                <div className="p-5 md:p-6 space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0 ${
                      item.accentColor === 'blue' ? 'bg-blue-600' :
                      item.accentColor === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {item.title}
                      </h2>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                        {item.tag}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Tech Badges with Official Logos */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.techBadges.map((badge) => (
                      <span
                        key={badge.label}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.logoUrl && (
                          <img src={badge.logoUrl} alt={badge.label} className="w-3.5 h-3.5 object-contain" />
                        )}
                        <span>{badge.label}</span>
                      </span>
                    ))}
                  </div>

                  {/* Action CTA Button when in Front */}
                  {isFront && (() => {
                    const isTargetActiveUser = Boolean(
                      user && (
                        (item.id === 'student' && user.role === 'student') ||
                        (item.id === 'instructor' && user.role === 'teacher')
                      )
                    );
                    const targetHref = item.id === 'recap'
                      ? '/recap'
                      : isTargetActiveUser
                      ? '/dashboard'
                      : item.href;
                    const ctaLabel = isTargetActiveUser
                      ? `Continue as ${user?.full_name?.split(' ')[0] || user?.username}`
                      : item.ctaText;

                    return (
                      <div className="pt-1">
                        <Link
                          href={targetHref}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                            item.accentColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' :
                            item.accentColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20' :
                            'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                          }`}
                        >
                          <span>{ctaLabel}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })()}

                </div>
              </div>
            );
          })}

        </div>

        {/* Minimal Stack Indicators */}
        <div className="flex items-center gap-2 pt-3">
          {WORKSPACES.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-7 bg-primary shadow-xs'
                  : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
              title={`Switch to ${item.title}`}
            />
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="py-3 px-6 text-center text-[11px] font-mono text-slate-400 dark:text-slate-600 border-t border-slate-200/60 dark:border-slate-800/60 shrink-0">
        <span>&lt;/&gt; Kodelab Web Platform • Single-View Workspace Switcher</span>
      </footer>

    </div>
  );
}
