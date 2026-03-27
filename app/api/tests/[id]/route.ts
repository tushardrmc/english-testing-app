import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatTestForClient } from "@/lib/test-format";
import { getAdminContextFromToken, getBearerToken } from "@/lib/supabase/admin";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = anonClient();
  const token = getBearerToken(request);
  const maybeAdmin = await getAdminContextFromToken(token);
  const isAdmin = !("error" in maybeAdmin);

  let query = supabase
    .from("tests")
    .select(
      `
      id,
      title,
      duration_minutes,
      questions (
        id,
        text,
        type,
        points,
        created_at,
        options (
          id,
          text,
          is_correct,
          created_at
        )
      )
    `
    )
    .eq("id", id);

  if (!isAdmin) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  // For admins, return full data including correct answers
  if (isAdmin) {
    return NextResponse.json({
      id: data.id,
      title: data.title,
      duration_minutes: data.duration_minutes,
      questions: data.questions?.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type || "MCQ",
        points: q.points ?? 10,
        options: q.options?.map((o: any) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.is_correct,
        })) || [],
      })) || [],
    });
  }

  // For students, use the public formatter
  return NextResponse.json(formatTestForClient(data));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAdminContextFromToken(getBearerToken(request));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;

  try {
    const payload = await request.json();

    // Update the test
    const { error: testError } = await admin
      .from("tests")
      .update({
        title: payload.title,
        duration_minutes: payload.durationMinutes ?? 60,
      })
      .eq("id", id);

    if (testError) throw testError;

    // Delete existing questions and options (cascade will handle this)
    const { error: deleteQuestionsError } = await admin
      .from("questions")
      .delete()
      .eq("test_id", id);

    if (deleteQuestionsError) throw deleteQuestionsError;

    // Add new questions and options
    for (const q of payload.questions || []) {
      const { data: qData, error: qError } = await admin
        .from("questions")
        .insert([
          {
            test_id: id,
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

      const { error: optionsError } = await admin
        .from("options")
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;
    }

    return NextResponse.json({ 
      message: "Test updated successfully",
      id 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update test" 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAdminContextFromToken(getBearerToken(request));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;

  try {
    // First check if the test exists and get its details
    const { data: testData, error: fetchError } = await admin
      .from("tests")
      .select("id, title, is_published")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!testData) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Delete the test (cascade will handle questions and options)
    const { error: deleteError } = await admin
      .from("tests")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Test deleted successfully",
      test: { id: testData.id, title: testData.title }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete test" 
    }, { status: 500 });
  }
}
