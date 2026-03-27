import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getAdminContextFromToken,
  getBearerToken,
  requireAdmin,
} from "@/lib/supabase/admin";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** List tests (public read via RLS). */
export async function GET(request: Request) {
  const token = getBearerToken(request);
  const maybeAdmin = await getAdminContextFromToken(token);
  const isAdmin = !("error" in maybeAdmin);

  let supabase;
  if (isAdmin) {
    // Use admin client for admins to bypass RLS
    supabase = maybeAdmin.admin;
  } else {
    // Use anon client for students (subject to RLS)
    supabase = anonClient();
  }

  let query = supabase
    .from("tests")
    .select("id, title, duration_minutes, is_published, published_at, created_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tests: data ?? [] });
}

/** Create test + questions + options (admin only, service role). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;

  try {
    const payload = await request.json();

    const { data: testData, error: testError } = await admin
      .from("tests")
      .insert([
        {
          title: payload.title,
          duration_minutes: payload.durationMinutes ?? 60,
          is_published: false,
          published_at: null,
        },
      ])
      .select()
      .single();

    if (testError) throw testError;

    for (const q of payload.questions || []) {
      const { data: qData, error: qError } = await admin
        .from("questions")
        .insert([
          {
            test_id: testData.id,
            text: q.text,
            type: q.type ?? "MCQ",
            points: q.points ?? 10,
          },
        ])
        .select()
        .single();

      if (qError) throw qError;

      const options = q.options || [];
      const correctCount = options.filter(
        (o: { isCorrect: boolean }) => o.isCorrect
      ).length;
      if (correctCount !== 1) {
        throw new Error("Each question must have exactly one correct option.");
      }

      const optionsToInsert = options.map(
        (o: { text: string; isCorrect: boolean }) => ({
          question_id: qData.id,
          text: o.text,
          is_correct: o.isCorrect,
        })
      );

      const { error: optError } = await admin.from("options").insert(optionsToInsert);
      if (optError) throw optError;
    }

    return NextResponse.json(
      { message: "Test saved successfully", testId: testData.id },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
