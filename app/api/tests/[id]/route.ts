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

  return NextResponse.json(formatTestForClient(data));
}
