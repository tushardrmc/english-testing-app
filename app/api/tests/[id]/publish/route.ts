import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;
  let body: { live?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const makeLive = body.live !== false;
  if (makeLive) {
    const { error: clearError } = await admin
      .from("tests")
      .update({ is_published: false, published_at: null })
      .eq("is_published", true);
    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
  }

  const { data, error } = await admin
    .from("tests")
    .update({
      is_published: makeLive,
      published_at: makeLive ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, title, is_published, published_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json({
    message: makeLive ? "Test is now live" : "Test unpublished",
    test: data,
  });
}
