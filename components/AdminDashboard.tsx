"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Circle,
  BarChart3,
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"create" | "analytics">("create");
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
                Create Test
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
            </div>
          </div>

          {activeTab === "create" && (
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
