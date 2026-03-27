import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatTestForClient } from "@/lib/test-format";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = anonClient();

  const { data, error } = await supabase
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
          created_at
        )
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json(formatTestForClient(data));
}
