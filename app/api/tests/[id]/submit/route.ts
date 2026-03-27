import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OptionFull = {
  id: string;
  text: string;
  is_correct: boolean | null;
  question_id?: string;
};

type QuestionFull = {
  id: string;
  text: string;
  points: number | null;
  options?: OptionFull[] | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: testId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { answers?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const answers = body.answers ?? {};

  const admin = createAdminClient();
  const { data: test, error: loadError } = await admin
    .from("tests")
    .select(
      `
      id,
      questions (
        id,
        points,
        options ( id, is_correct )
      )
    `
    )
    .eq("id", testId)
    .maybeSingle();

  if (loadError || !test) {
    return NextResponse.json(
      { error: loadError?.message || "Test not found" },
      { status: loadError ? 500 : 404 }
    );
  }

  const questions = (test.questions || []) as QuestionFull[];
  let score = 0;
  let total = 0;

  const results = questions.map((q) => {
    const points = q.points ?? 10;
    total += points;
    const correct = (q.options || []).find((o) => o.is_correct);
    const correctOptionId = correct?.id ?? "";
    const isCorrect = answers[q.id] === correctOptionId;
    if (isCorrect) score += points;
    return {
      questionId: q.id,
      isCorrect,
      correctOptionId,
    };
  });

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const { error: insertError } = await supabase.from("test_results").insert({
    user_id: user.id,
    test_id: testId,
    score,
    total,
    percentage,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ score, total, results });
}
