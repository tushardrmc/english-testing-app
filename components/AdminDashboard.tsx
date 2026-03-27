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
  Edit,
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
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [groupByUser, setGroupByUser] = useState<
    { user_id: string; name: string; submissions: number; avg_percentage: number }[]
  >([]);
  const [groupByTest, setGroupByTest] = useState<
    { test_id: string; title: string; submissions: number; avg_percentage: number }[]
  >([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
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
      console.error("Error fetching tests:", error);
      setSaveMessage({
        type: "error",
        text: "Failed to load tests. Please try refreshing the page.",
      });
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
      const res = await fetch(`/api/admin/results`, {
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
  }, [activeTab]);

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
      const isEditing = !!editingTestId;
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/tests/${editingTestId}` : "/api/tests";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'save'} test`);
      }

      setSaveMessage({ 
        type: "success", 
        text: `Test ${isEditing ? 'updated' : 'saved'} successfully!` 
      });
      
      // Clear editing state
      setEditingTestId(null);
      
      // Switch to tests tab to show the test
      setActiveTab("tests");
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
      
      // Refresh the tests list to show the newly saved test
      fetchTests();
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

  const editTest = async (test: SavedTest) => {
    // Fetch the full test data including questions
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/tests/${test.id}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch test details");
      }
      
      const data = await response.json();
      
      // Populate the form with the test data
      setTitle(data.title);
      setDuration(data.duration_minutes);
      setQuestions(data.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        options: q.options.map((o: any) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      })));
      
      // Set editing mode
      setEditingTestId(test.id);
      
      // Switch to create tab for editing
      setActiveTab("create");
      setSaveMessage({ type: "info", text: `Editing "${data.title}". Make your changes and save.` });
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load test for editing.",
      });
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test? This action cannot be undone.")) {
      return;
    }

    setDeletingId(testId);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/tests/${testId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Failed to delete test");
      }
      
      await fetchTests();
      setSaveMessage({ type: "success", text: "Test deleted successfully." });
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete test.",
      });
    } finally {
      setDeletingId(null);
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
          <h1 className="text-xl font-semibold text-slate-800">
            Admin Dashboard
          </h1>
          {(activeTab === "create" || activeTab === "tests") && (
            <div className="flex items-center gap-4">
              {saveMessage && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    saveMessage.type === "success"
                      ? "text-emerald-600"
                      : saveMessage.type === "error"
                      ? "text-red-600"
                      : "text-blue-600"
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

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center">
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
      </nav>

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
                      <button
                        type="button"
                        onClick={() => editTest(test)}
                        className="text-xs px-3 py-1.5 rounded-md bg-slate-600 text-white hover:bg-slate-700"
                      >
                        <Edit className="w-3.5 h-3.5 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTest(test.id)}
                        disabled={deletingId === test.id}
                        className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === test.id ? (
                          <div className="w-3.5 h-3.5 inline mr-1 rounded-full border border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                        )}
                        Delete
                      </button>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Student Results
              </h2>
              {(selectedTest || selectedStudent) && (
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setSelectedTest(null);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  ← Back to Tests
                </button>
              )}
            </div>

            {resultsLoading ? (
              <p className="text-sm text-slate-500">Loading results...</p>
            ) : !selectedTest ? (
              // Show all tests
              <div>
                <h3 className="text-md font-medium text-slate-700 mb-4">
                  Select a Test
                </h3>
                {groupByTest.length === 0 ? (
                  <p className="text-sm text-slate-500">No tests with submissions yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {groupByTest.map((test) => (
                      <div
                        key={test.test_id}
                        onClick={() => setSelectedTest(test.test_id)}
                        className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-slate-800">{test.title}</h4>
                            <p className="text-sm text-slate-600">
                              {test.submissions} submission{test.submissions !== 1 ? 's' : ''} · Average: {test.avg_percentage}%
                            </p>
                          </div>
                          <div className="text-slate-400">
                            →
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : !selectedStudent ? (
              // Show students for selected test
              <div>
                <h3 className="text-md font-medium text-slate-700 mb-4">
                  Students for: {groupByTest.find(t => t.test_id === selectedTest)?.title}
                </h3>
                {(() => {
                  const testSubmissions = submissions.filter(s => s.test_id === selectedTest);
                  const students = [...new Set(testSubmissions.map(s => s.user_id))];
                  
                  return students.length === 0 ? (
                    <p className="text-sm text-slate-500">No submissions for this test yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {students.map((studentId) => {
                        const studentSubs = testSubmissions.filter(s => s.user_id === studentId);
                        const latestSub = studentSubs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                        
                        return (
                          <div
                            key={studentId}
                            onClick={() => setSelectedStudent(studentId)}
                            className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium text-slate-800">{latestSub.user_name}</h4>
                                <p className="text-sm text-slate-600">
                                  Best Score: {Math.max(...studentSubs.map(s => s.percentage))}% · 
                                  Attempts: {studentSubs.length} · 
                                  Latest: {new Date(latestSub.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-slate-400">
                                →
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Show detailed results for selected student and test
              <div>
                <h3 className="text-md font-medium text-slate-700 mb-4">
                  Detailed Results
                </h3>
                {(() => {
                  const studentSubs = submissions.filter(s => s.user_id === selectedStudent && s.test_id === selectedTest);
                  
                  return studentSubs.length === 0 ? (
                    <p className="text-sm text-slate-500">No submissions found.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h4 className="font-medium text-slate-800 mb-2">
                          {studentSubs[0].user_name} - {studentSubs[0].test_title}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Total Attempts:</span>
                            <span className="ml-2 font-medium">{studentSubs.length}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Best Score:</span>
                            <span className="ml-2 font-medium">{Math.max(...studentSubs.map(s => s.percentage))}%</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Latest Attempt:</span>
                            <span className="ml-2 font-medium">
                              {new Date(Math.max(...studentSubs.map(s => new Date(s.created_at).getTime()))).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-slate-800 mb-3">All Attempts</h4>
                        <div className="space-y-2">
                          {studentSubs
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((sub, index) => (
                            <div key={sub.id} className="border border-slate-200 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-medium">
                                    Attempt {studentSubs.length - index}
                                  </span>
                                  <span className="text-sm text-slate-600 ml-4">
                                    {new Date(sub.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-slate-800">
                                    {sub.score}/{sub.total} ({sub.percentage}%)
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-800 mb-2">Question Details</h4>
                        <p className="text-sm text-amber-700">
                          Detailed question-by-question breakdown is not yet implemented. 
                          This feature requires additional database schema changes to store individual question responses.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingTestId ? "Edit Test" : "Create Test"}
                </h2>
                {editingTestId && (
                  <button
                    onClick={() => {
                      setEditingTestId(null);
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
                      setSaveMessage({ type: "info", text: "Cancelled editing. Create a new test instead." });
                    }}
                    className="text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
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
