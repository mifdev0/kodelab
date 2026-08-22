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
  loginStudent: (username: string, password?: string) => Promise<boolean>;
  loginTeacher: (emailOrUsername: string, password?: string) => Promise<boolean>;
  loginAsStudent: (username: string) => Promise<boolean>;
  loginAsTeacher: (email: string) => Promise<boolean>;
  registerStudent: (data: RegisterStudentData) => Promise<boolean>;
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
    // 1. Load persisted user immediately from local data
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

    // 2. Trigger background Supabase sync (will update local data for next reads)
    store.syncWithSupabase().then(() => {
      // Re-check user after sync in case profile was updated
      const storedId = localStorage.getItem('codecamp_current_user_id');
      if (storedId) {
        const found = store.getProfiles().find(p => p.id === storedId);
        if (found) setUser(found);
      }
    }).catch(() => {});
  }, []);

  const loginStudent = async (username: string, password?: string): Promise<boolean> => {
    // Force sync from Supabase before login so instructor-created accounts are available
    await store.forceSyncProfiles();
    
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

  const loginTeacher = async (emailOrUsername: string, password?: string): Promise<boolean> => {
    // Force sync from Supabase before login
    await store.forceSyncProfiles();

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

  const registerStudent = async (data: RegisterStudentData): Promise<boolean> => {
    try {
      const created = await store.registerStudent(data);
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
