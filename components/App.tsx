"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import TestingEngine from "@/components/TestingEngine";
import Auth from "@/components/Auth";
import BrandLogo from "@/components/BrandLogo";
import {
  GraduationCap,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentTestId, setStudentTestId] = useState<string | null>(null);
  const [testsLoading, setTestsLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", authUser.id)
      .maybeSingle();

    setUser({
      id: authUser.id,
      email: authUser.email ?? "",
      name:
        profile?.full_name ||
        (authUser.user_metadata?.full_name as string) ||
        authUser.email ||
        "User",
      role: (profile?.role as "student" | "admin") ?? "student",
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refreshUser();
      if (mounted) setLoading(false);
    })();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  useEffect(() => {
    if (user?.role !== "student") {
      setStudentTestId(null);
      return;
    }
    setTestsLoading(true);
    fetch("/api/tests")
      .then((res) => res.json())
      .then((data) => {
        const id = data.tests?.[0]?.id ?? null;
        setStudentTestId(id);
      })
      .catch(() => setStudentTestId(null))
      .finally(() => setTestsLoading(false));
  }, [user?.role, user?.id]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={refreshUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[72px] justify-between py-2">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <BrandLogo
                  priority
                  className="w-[130px] sm:w-[170px]"
                  imageClassName="object-contain"
                />
              </div>
              <div className="ml-8 flex space-x-8">
                {user.role === "student" && (
                  <div className="inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium text-slate-900">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Student Panel
                  </div>
                )}
                {user.role === "admin" && (
                  <div className="inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium text-slate-900">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                <UserIcon className="w-4 h-4" />
                <span className="font-medium">{user.name}</span>
                <span className="text-slate-400 capitalize">
                  ({user.role})
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {user.role === "admin" ? (
        <AdminDashboard user={user} />
      ) : testsLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : studentTestId ? (
        <TestingEngine testId={studentTestId} />
      ) : (
        <div className="max-w-xl mx-auto mt-16 text-center text-slate-600 bg-white rounded-2xl border border-slate-200 p-8">
          <p className="font-medium text-slate-800 mb-2">No tests available</p>
          <p className="text-sm">
            Ask an admin to create a test in EduCare English Test. After that,
            refresh this page.
          </p>
        </div>
      )}
    </div>
  );
}
