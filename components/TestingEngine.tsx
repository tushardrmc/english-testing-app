"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  options: Option[];
}

interface Test {
  id: string;
  title: string;
  time_limit_minutes: number;
  questions: Question[];
}

interface TestResult {
  score: number;
  total: number;
  results: {
    questionId: string;
    isCorrect: boolean;
    correctOptionId: string;
  }[];
}

export default function TestingEngine({ testId }: { testId: string }) {
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/tests/${testId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load test");
        return res.json();
      })
      .then((data) => {
        setTest(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load test.");
        setLoading(false);
      });
  }, [testId]);

  useEffect(() => {
    if (!hasStarted || timeLeft === null || timeLeft <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, timeLeft, result]);

  const handleSubmit = useCallback(async () => {
    if (!test || isSubmitting || result) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tests/${test.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
        credentials: "same-origin",
      });

      if (!response.ok) throw new Error("Failed to submit test");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to submit test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [test, isSubmitting, result, answers]);

  useEffect(() => {
    if (hasStarted && timeLeft === 0 && !result && !isSubmitting) {
      handleSubmit();
    }
  }, [timeLeft, hasStarted, result, isSubmitting, handleSubmit]);

  const startTest = () => {
    if (test) {
      setTimeLeft(test.time_limit_minutes * 60);
      setHasStarted(true);
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="text-center text-red-600 mt-20">
        {error || "Test not found"}
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          {test.title}
        </h1>
        <div className="flex items-center justify-center gap-6 text-slate-600 mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>{test.time_limit_minutes} Minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <span>{test.questions.length} Questions</span>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-8 text-sm text-left">
          <p className="font-semibold flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" /> Instructions:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The timer starts immediately after you click Start Test.</li>
            <li>You cannot pause the test once it begins.</li>
            <li>The test will automatically submit when the timer reaches zero.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={startTest}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-100"
        >
          <Play className="w-5 h-5" />
          Start Test
        </button>
      </div>
    );
  }

  if (result) {
    const percentage =
      result.total > 0
        ? Math.round((result.score / result.total) * 100)
        : 0;
    const isPassing = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div
            className={cn(
              "inline-flex items-center justify-center w-20 h-20 rounded-full mb-6",
              isPassing ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}
          >
            {isPassing ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : (
              <XCircle className="w-10 h-10" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Test Complete!
          </h2>
          <p className="text-slate-500 mb-8">
            You have successfully submitted the test.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-500 font-medium mb-1">
                Your Score
              </p>
              <p className="text-3xl font-bold text-indigo-600">
                {result.score}{" "}
                <span className="text-lg text-slate-400 font-normal">
                  / {result.total}
                </span>
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-500 font-medium mb-1">
                Percentage
              </p>
              <p
                className={cn(
                  "text-3xl font-bold",
                  isPassing ? "text-green-600" : "text-red-600"
                )}
              >
                {percentage}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            Review Answers
          </h3>
          <div className="space-y-6">
            {test.questions.map((q, i) => {
              const qResult = result.results.find(
                (r) => r.questionId === q.id
              );
              const userAnswer = answers[q.id];

              return (
                <div
                  key={q.id}
                  className="border-b border-slate-100 pb-6 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span
                      className={cn(
                        "flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5",
                        qResult?.isCorrect
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {i + 1}
                    </span>
                    <p className="text-slate-800 font-medium">{q.text}</p>
                  </div>
                  <div className="space-y-2 pl-9">
                    {q.options.map((opt) => {
                      const isSelected = userAnswer === opt.id;
                      const isCorrectOption = qResult?.correctOptionId === opt.id;

                      let optClass = "border-slate-200 text-slate-600";
                      if (isCorrectOption) {
                        optClass =
                          "bg-green-50 border-green-200 text-green-800 font-medium";
                      } else if (isSelected && !isCorrectOption) {
                        optClass = "bg-red-50 border-red-200 text-red-800";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "px-4 py-2 rounded-lg border text-sm flex items-center justify-between",
                            optClass
                          )}
                        >
                          <span>{opt.text}</span>
                          {isCorrectOption && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {isSelected && !isCorrectOption && (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const isLastQuestion =
    currentQuestionIndex === test.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="bg-white rounded-t-2xl border border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-500">
            Question {currentQuestionIndex + 1} of {test.questions.length}
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-sm font-medium text-slate-500">
            Answered: {answeredCount}
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-lg",
            timeLeft !== null && timeLeft < 60
              ? "bg-red-100 text-red-700 animate-pulse"
              : "bg-slate-100 text-slate-700"
          )}
        >
          <Clock className="w-5 h-5" />
          {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
        </div>
      </div>

      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full bg-indigo-500 transition-all duration-300 ease-out"
          style={{
            width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%`,
          }}
        />
      </div>

      <div className="bg-white border-x border-slate-200 p-8 min-h-[400px]">
        <h2 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  handleOptionSelect(currentQuestion.id, option.id)
                }
                className={cn(
                  "w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors",
                    isSelected ? "border-indigo-600" : "border-slate-300"
                  )}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-base",
                    isSelected
                      ? "text-indigo-900 font-medium"
                      : "text-slate-700"
                  )}
                >
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-50 rounded-b-2xl border border-t-0 border-slate-200 p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          disabled={isFirstQuestion}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        {isLastQuestion ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70 transition-colors shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit Test"}
            {!isSubmitting && <CheckCircle2 className="w-5 h-5" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
