'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Code2, 
  Terminal, 
  Laptop, 
  Sparkles,
  Lock,
  UserPlus
} from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'teacher' ? 'teacher' : 'student';

  const { loginStudent, loginTeacher, registerStudent } = useAuth();
  
  // Selected Role: 'student' | 'teacher'
  const [role, setRole] = useState<'student' | 'teacher'>(initialRole);

  // Student Auth Mode: 'signin' | 'register'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  
  // Sign In Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Register Fields (Student)
  const [regFullName, setRegFullName] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'Laki-laki' | 'Perempuan'>('male');
  const [regClassName, setRegClassName] = useState('7A');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'teacher') setRole('teacher');
    else if (r === 'student') setRole('student');
  }, [searchParams]);

  const handleNameChange = (val: string) => {
    setRegFullName(val);
    if (!regUsername || regUsername.includes('.')) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      const classSlug = regClassName.toLowerCase().replace(/[^a-z0-9]/g, '') || '7a';
      if (slug) {
        setRegUsername(`${slug}.${classSlug}`);
      }
    }
  };

  const handleClassChange = (val: string) => {
    setRegClassName(val);
    if (regFullName) {
      const slug = regFullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      const classSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '') || '7a';
      if (slug) {
        setRegUsername(`${slug}.${classSlug}`);
      }
    }
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim()) {
      setErrorMsg('Please enter your student username.');
      return;
    }
    const success = loginStudent(username.trim(), password);
    if (!success) {
      setErrorMsg('Invalid student username or password.');
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Please enter instructor email or username.');
      return;
    }
    const success = loginTeacher(email.trim(), password);
    if (!success) {
      setErrorMsg('Invalid instructor credentials.');
    }
  };

  const handleStudentRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regFullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!regClassName.trim()) {
      setErrorMsg('Please enter your class.');
      return;
    }
    if (!regUsername.trim()) {
      setErrorMsg('Please create a username.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    const success = registerStudent({
      full_name: regFullName.trim(),
      gender: regGender,
      class_name: regClassName.trim(),
      username: regUsername.trim().toLowerCase(),
      password: regPassword.trim(),
    });

    if (!success) {
      setErrorMsg('Registration failed. Username may already exist.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 relative selection:bg-primary selection:text-white">
      
      {/* Background blueprint grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50 dark:opacity-30 -z-10" />

      <div className="w-full max-w-sm space-y-5">
        
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main Gateway</span>
          </Link>

          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {role === 'teacher' ? 'role: instructor' : 'role: student'}
          </span>
        </div>

        {/* Card with Mac Window Top Bar */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          
          {/* Mac window header */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              {role === 'teacher' ? 'auth://instructor-login' : 'auth://student-login'}
            </span>
          </div>

          <div className="p-6 md:p-7 space-y-5">
            
            {/* Header Title */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-xs ${
                  role === 'teacher' ? 'bg-indigo-600' : 'bg-primary'
                }`}>
                  {role === 'teacher' ? <Terminal className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                </div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {role === 'teacher' ? 'Instructor Portal' : 'Student Studio'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {role === 'teacher'
                  ? 'Access your instructor workspace & session controls.'
                  : 'Sign in to access code editor & assignments.'}
              </p>
            </div>

            {/* Student Toggle: Signin vs Register */}
            {role === 'student' && (
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg('');
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    authMode === 'signin'
                      ? 'bg-white dark:bg-[#12141c] text-primary shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    authMode === 'register'
                      ? 'bg-white dark:bg-[#12141c] text-primary shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  New Account
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* Teacher Sign In Form */}
            {role === 'teacher' ? (
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. guru / admin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Default: admin123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Enter Instructor Workspace →
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('student');
                      setErrorMsg('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Student? Switch to Student Login
                  </button>
                </div>
              </form>
            ) : authMode === 'register' ? (
              /* Student Register */
              <form onSubmit={handleStudentRegister} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raditya Pratama"
                    value={regFullName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Gender
                    </label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Class
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7A"
                      value={regClassName}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. raditya.7a"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min. 4 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-md transition-colors mt-2"
                >
                  Create Account & Launch Studio →
                </button>
              </form>
            ) : (
              /* Student Sign In */
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Student Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. raditya.7a"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-md transition-colors"
                >
                  Sign In to Studio →
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('teacher');
                      setErrorMsg('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Instructor? Switch to Instructor Portal
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-500 font-mono">loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
