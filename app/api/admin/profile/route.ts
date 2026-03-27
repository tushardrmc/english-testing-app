import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { admin, user } = auth;

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || "",
      role: profile?.role || "admin",
      created_at: profile?.created_at || null,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { admin, user } = auth;

  const body = (await request.json()) as { fullName?: string };
  const fullName = (body.fullName || "").trim();
  if (!fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Profile updated" });
}
