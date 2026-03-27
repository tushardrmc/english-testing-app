"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  UserCog,
  ListChecks,
  FileCheck2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Circle,
  BarChart3,
  RadioTower,
  Search,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { createClient } from "@/lib/supabase/client";

const Bar = dynamic(
  () => import("react-chartjs-2").then((m) => m.Bar),
  { ssr: false }
);

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface AdminDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "student";
  };
  onProfileUpdated: (name: string) => void;
}

type AdminTab = "create" | "tests" | "results" | "analytics" | "profile";
type SavedTest = {
  id: string;
  title: string;
  duration_minutes: number;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
};

type Submission = {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
  user_name: string;
  test_title: string;
};

export default function AdminDashboard({
  user,
  onProfileUpdated,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("create");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: crypto.randomUUID(),
      text: "",
      options: [
        { id: crypto.randomUUID(), text: "", isCorrect: true },
        { id: crypto.randomUUID(), text: "", isCorrect: false },
      ],
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [groupByUser, setGroupByUser] = useState<
    { user_id: string; name: string; submissions: number; avg_percentage: number }[]
  >([]);
  const [groupByTest, setGroupByTest] = useState<
    { test_id: string; title: string; submissions: number; avg_percentage: number }[]
  >([]);
  const [resultFilter, setResultFilter] = useState({ userId: "", testId: "" });
  const [profileName, setProfileName] = useState(user.name);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Tests Completed",
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "rgba(79, 70, 229, 0.8)",
        borderRadius: 4,
      },
      {
        label: "Average Score (%)",
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderRadius: 4,
      },
    ],
  });

  const [statCards, setStatCards] = useState({
    totalStudents: 0,
    totalSubmissions: 0,
    testsCreated: 0,
  });

  const fetchTests = async () => {
    setLoadingTests(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/tests", {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load tests");
      setTests(body.tests || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTests(false);
    }
  };

  const fetchResults = async () => {
    setResultsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (resultFilter.userId) params.set("userId", resultFilter.userId);
      if (resultFilter.testId) params.set("testId", resultFilter.testId);
      const res = await fetch(`/api/admin/results?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load results");
      setSubmissions(body.submissions || []);
      setGroupByUser(body.byUser || []);
      setGroupByTest(body.byTest || []);
    } catch (error) {
      console.error(error);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "analytics") return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;

      const res = await fetch("/api/admin/analytics", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const body = await res.json();
      if (!res.ok || cancelled) return;

      setAnalyticsData({
        labels: body.chart?.labels ?? analyticsData.labels,
        datasets: [
          {
            label: "Tests Completed",
            data: body.chart?.testsCompleted ?? [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: "rgba(79, 70, 229, 0.8)",
            borderRadius: 4,
          },
          {
            label: "Average Score (%)",
            data: body.chart?.averageScorePct ?? [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: "rgba(16, 185, 129, 0.8)",
            borderRadius: 4,
          },
        ],
      });

      setStatCards({
        totalStudents: body.stats?.totalStudents ?? 0,
        totalSubmissions: body.stats?.totalSubmissions ?? 0,
        testsCreated: body.stats?.testsCreated ?? 0,
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when tab opens
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tests") {
      fetchTests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "results") {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, resultFilter.userId, resultFilter.testId]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Last 7 days (from Supabase)",
      },
    },
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        text: "",
        options: [
          { id: crypto.randomUUID(), text: "", isCorrect: true },
          { id: crypto.randomUUID(), text: "", isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: [
              ...q.options,
              { id: crypto.randomUUID(), text: "", isCorrect: false },
            ],
          };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (q.options.length <= 1) return q;
          const newOptions = q.options.filter((o) => o.id !== optionId);
          if (q.options.find((o) => o.id === optionId)?.isCorrect) {
            if (newOptions.length > 0) newOptions[0].isCorrect = true;
          }
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const updateOptionText = (
    questionId: string,
    optionId: string,
    text: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((o) =>
              o.id === optionId ? { ...o, text } : o
            ),
          };
        }
        return q;
      })
    );
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((o) => ({
              ...o,
              isCorrect: o.id === optionId,
            })),
          };
        }
        return q;
      })
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setSaveMessage({ type: "error", text: "Test title is required." });
      return;
    }
    if (questions.length === 0) {
      setSaveMessage({ type: "error", text: "At least one question is required." });
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        setSaveMessage({
          type: "error",
          text: "All questions must have text.",
        });
        return;
      }
      if (q.options.length < 2) {
        setSaveMessage({
          type: "error",
          text: "Each question must have at least 2 options.",
        });
        return;
      }
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        setSaveMessage({
          type: "error",
          text: "Each question must have exactly one correct answer.",
        });
        return;
      }
      for (const o of q.options) {
        if (!o.text.trim()) {
          setSaveMessage({
            type: "error",
            text: "All options must have text.",
          });
          return;
        }
      }
    }

    setIsSaving(true);
    setSaveMessage(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const payload = {
      title,
      durationMinutes: duration,
      questions: questions.map((q) => ({
        text: q.text,
        type: "MCQ",
        options: q.options.map((o) => ({
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      })),
    };

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save test");
      }

      setSaveMessage({ type: "success", text: "Test saved successfully!" });
      setTitle("");
      setDuration(60);
      setQuestions([
        {
          id: crypto.randomUUID(),
          text: "",
          options: [
            { id: crypto.randomUUID(), text: "", isCorrect: true },
            { id: crypto.randomUUID(), text: "", isCorrect: false },
          ],
        },
      ]);
    } catch (error) {
      console.error("Error saving test:", error);
      setSaveMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save test. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const publishTest = async (testId: string) => {
    setPublishingId(testId);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(`/api/tests/${testId}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ live: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to publish");
      await fetchTests();
      setSaveMessage({ type: "success", text: "Live test updated." });
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to publish test.",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const saveProfile = async () => {
    if (!profileName.trim()) return;
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ fullName: profileName }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to update profile");
      onProfileUpdated(profileName);
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Failed to update profile."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-slate-800">
              Admin Dashboard
            </h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === "create"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Create
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tests")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === "tests"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4" /> Tests
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("results")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === "results"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4" /> Results
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                  activeTab === "analytics"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                  activeTab === "profile"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <UserCog className="w-4 h-4" />
                Profile
              </button>
            </div>
          </div>

          {(activeTab === "create" || activeTab === "tests") && (
            <div className="flex items-center gap-4">
              {saveMessage && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    saveMessage.type === "success"
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {saveMessage.text}
                </span>
              )}
              {activeTab === "create" ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-sm"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Test
                </button>
              ) : (
                <button
                  type="button"
                  onClick={fetchTests}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2 shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh list
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === "analytics" ? (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Performance Overview
            </h2>
            <div className="w-full h-[400px] flex items-center justify-center">
              <Bar options={chartOptions} data={analyticsData} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-sm font-medium text-indigo-600 mb-1">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-indigo-900">
                  {statCards.totalStudents.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm font-medium text-emerald-600 mb-1">
                  Total submissions
                </p>
                <p className="text-3xl font-bold text-emerald-900">
                  {statCards.totalSubmissions.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-sm font-medium text-amber-600 mb-1">
                  Tests Created
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {statCards.testsCreated}
                </p>
              </div>
            </div>
          </section>
        ) : activeTab === "tests" ? (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Manage tests and live publishing
            </h2>
            {loadingTests ? (
              <p className="text-slate-500 text-sm">Loading tests...</p>
            ) : tests.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No tests found. Create one first.
              </p>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between border border-slate-200 rounded-lg p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{test.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {test.duration_minutes} min · created{" "}
                        {new Date(test.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {test.is_published ? (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                          <RadioTower className="w-3.5 h-3.5" /> Live now
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          Not live
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={publishingId === test.id || test.is_published}
                        onClick={() => publishTest(test.id)}
                        className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {publishingId === test.id ? "Publishing..." : "Set Live"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : activeTab === "results" ? (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Student results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600">Filter by student</label>
                <div className="mt-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={resultFilter.userId}
                    onChange={(e) =>
                      setResultFilter((p) => ({ ...p, userId: e.target.value }))
                    }
                    className="w-full h-10 pl-8 pr-3 rounded-md border border-slate-300 text-sm"
                  >
                    <option value="">All students</option>
                    {groupByUser.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Filter by test</label>
                <div className="mt-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={resultFilter.testId}
                    onChange={(e) =>
                      setResultFilter((p) => ({ ...p, testId: e.target.value }))
                    }
                    className="w-full h-10 pl-8 pr-3 rounded-md border border-slate-300 text-sm"
                  >
                    <option value="">All tests</option>
                    {groupByTest.map((t) => (
                      <option key={t.test_id} value={t.test_id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  By student
                </h3>
                <div className="space-y-2 max-h-56 overflow-auto">
                  {groupByUser.map((u) => (
                    <div key={u.user_id} className="text-sm text-slate-700 flex justify-between">
                      <span>{u.name}</span>
                      <span>
                        {u.submissions} tests · {u.avg_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  By test
                </h3>
                <div className="space-y-2 max-h-56 overflow-auto">
                  {groupByTest.map((t) => (
                    <div key={t.test_id} className="text-sm text-slate-700 flex justify-between">
                      <span>{t.title}</span>
                      <span>
                        {t.submissions} attempts · {t.avg_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Latest submissions
              </h3>
              {resultsLoading ? (
                <p className="text-sm text-slate-500">Loading results...</p>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-slate-500">No submissions yet.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left p-3">Student</th>
                        <th className="text-left p-3">Test</th>
                        <th className="text-left p-3">Score</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="p-3">{s.user_name}</td>
                          <td className="p-3">{s.test_title}</td>
                          <td className="p-3">
                            {s.score}/{s.total} ({s.percentage}%)
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(s.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : activeTab === "profile" ? (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Admin profile & settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full name
                </label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  value={user.email}
                  disabled
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-slate-50 text-slate-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
              {profileMessage && (
                <p className="text-sm text-slate-600">{profileMessage}</p>
              )}
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-800 mb-2">Security options</h3>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Password is managed by Supabase Auth.</li>
                <li>Use Supabase password reset flow from login if needed.</li>
                <li>Keep `SUPABASE_SERVICE_ROLE_KEY` secret in Vercel only.</li>
              </ul>
            </div>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Test Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Advanced English Grammar - Midterm"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    min={1}
                    value={duration}
                    onChange={(e) =>
                      setDuration(parseInt(e.target.value, 10) || 0)
                    }
                    className="flex h-10 w-full sm:w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Questions
                </h2>
                <span className="text-sm text-slate-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {questions.length}{" "}
                  {questions.length === 1 ? "Question" : "Questions"}
                </span>
              </div>

              <div className="space-y-6">
                {questions.map((question, qIndex) => (
                  <div
                    key={question.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent"
                  >
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {qIndex + 1}
                        </div>
                        <h3 className="text-sm font-medium text-slate-700">
                          Multiple Choice
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                        title="Remove Question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) =>
                            updateQuestionText(question.id, e.target.value)
                          }
                          placeholder="Enter your question here..."
                          className="flex w-full bg-transparent text-lg font-medium placeholder:text-slate-300 focus:outline-none border-b border-transparent focus:border-indigo-500 pb-2 transition-colors"
                        />
                      </div>

                      <div className="space-y-3">
                        {question.options.map((option, oIndex) => (
                          <div
                            key={option.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                              option.isCorrect
                                ? "bg-indigo-50/50 border-indigo-200"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setCorrectOption(question.id, option.id)
                              }
                              className={cn(
                                "flex-shrink-0 transition-colors focus:outline-none rounded-full focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                                option.isCorrect
                                  ? "text-indigo-600"
                                  : "text-slate-300 hover:text-indigo-400"
                              )}
                              title={
                                option.isCorrect
                                  ? "Correct answer"
                                  : "Mark as correct"
                              }
                            >
                              {option.isCorrect ? (
                                <CheckCircle2 className="h-6 w-6" />
                              ) : (
                                <Circle className="h-6 w-6" />
                              )}
                            </button>

                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) =>
                                updateOptionText(
                                  question.id,
                                  option.id,
                                  e.target.value
                                )
                              }
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeOption(question.id, option.id)
                              }
                              disabled={question.options.length <= 2}
                              className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addOption(question.id)}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 text-indigo-600 hover:bg-indigo-50 h-9 px-4 py-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addQuestion}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="h-5 w-5" />
                Add New Question
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
