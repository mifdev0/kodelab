'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '@/types';
import { store } from './store';
import { useRouter, usePathname } from 'next/navigation';

interface RegisterStudentData {
  full_name: string;
  gender: 'male' | 'female' | 'Laki-laki' | 'Perempuan';
  class_name: string;
  username: string;
  password: string;
}

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  loginStudent: (username: string, password?: string) => boolean;
  loginTeacher: (emailOrUsername: string, password?: string) => boolean;
  loginAsStudent: (username: string) => boolean;
  loginAsTeacher: (email: string) => boolean;
  registerStudent: (data: RegisterStudentData) => boolean;
  logout: () => void;
  allProfiles: Profile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Trigger background Supabase sync
    store.syncWithSupabase().catch(() => {});

    // 2. Load persisted user on mount
    try {
      const storedId = localStorage.getItem('codecamp_current_user_id');
      const profiles = store.getProfiles();
      if (storedId) {
        const found = profiles.find(p => p.id === storedId);
        if (found) {
          setUser(found);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginStudent = (username: string, password?: string): boolean => {
    const profiles = store.getProfiles();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password?.trim();

    const found = profiles.find(p => {
      if (p.role !== 'student') return false;
      const matchUser = p.username?.toLowerCase() === cleanUser;
      if (!matchUser) return false;
      if (cleanPass && p.password) {
        return p.password === cleanPass;
      }
      return true;
    });

    if (found) {
      setUser(found);
      localStorage.setItem('codecamp_current_user_id', found.id);
      router.push('/dashboard');
      return true;
    }
    return false;
  };

  const loginTeacher = (emailOrUsername: string, password?: string): boolean => {
    const profiles = store.getProfiles();
    const cleanInput = emailOrUsername.trim().toLowerCase();
    const cleanPass = password?.trim();

    const found = profiles.find(p => {
      if (p.role !== 'teacher') return false;
      const matchIdentity = 
        p.email?.toLowerCase() === cleanInput || 
        p.username?.toLowerCase() === cleanInput;
      if (!matchIdentity) return false;
      if (cleanPass && p.password) {
        return p.password === cleanPass;
      }
      return true;
    });

    if (found) {
      setUser(found);
      localStorage.setItem('codecamp_current_user_id', found.id);
      router.push('/dashboard');
      return true;
    }
    return false;
  };

  const registerStudent = (data: RegisterStudentData): boolean => {
    try {
      const created = store.registerStudent(data);
      setUser(created);
      localStorage.setItem('codecamp_current_user_id', created.id);
      router.push('/dashboard');
      return true;
    } catch (e) {
      console.error('Registration failed:', e);
      return false;
    }
  };

  const loginAsStudent = (username: string) => loginStudent(username);
  const loginAsTeacher = (email: string) => loginTeacher(email);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('codecamp_current_user_id');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginStudent,
        loginTeacher,
        loginAsStudent,
        loginAsTeacher,
        registerStudent,
        logout,
        allProfiles: store.getProfiles(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
