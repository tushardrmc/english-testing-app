import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

type Submission = {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const testId = searchParams.get("testId");

  let query = admin
    .from("test_results")
    .select("id,user_id,test_id,score,total,percentage,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (userId) query = query.eq("user_id", userId);
  if (testId) query = query.eq("test_id", testId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Submission[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const testIds = [...new Set(rows.map((r) => r.test_id))];

  const [{ data: profiles }, { data: tests }] = await Promise.all([
    userIds.length
      ? admin
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    testIds.length
      ? admin.from("tests").select("id, title").in("id", testIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));
  const testMap = new Map((tests || []).map((t) => [t.id, t.title]));

  const submissions = rows.map((r) => ({
    ...r,
    user_name: profileMap.get(r.user_id) || "Unknown",
    test_title: testMap.get(r.test_id) || "Untitled test",
  }));

  const byUserMap = new Map<string, { name: string; submissions: number; avgPct: number; sumPct: number }>();
  const byTestMap = new Map<string, { title: string; submissions: number; avgPct: number; sumPct: number }>();

  for (const s of submissions) {
    const u = byUserMap.get(s.user_id) || {
      name: s.user_name,
      submissions: 0,
      avgPct: 0,
      sumPct: 0,
    };
    u.submissions += 1;
    u.sumPct += s.percentage;
    byUserMap.set(s.user_id, u);

    const t = byTestMap.get(s.test_id) || {
      title: s.test_title,
      submissions: 0,
      avgPct: 0,
      sumPct: 0,
    };
    t.submissions += 1;
    t.sumPct += s.percentage;
    byTestMap.set(s.test_id, t);
  }

  const byUser = [...byUserMap.entries()].map(([id, v]) => ({
    user_id: id,
    name: v.name,
    submissions: v.submissions,
    avg_percentage: Math.round(v.sumPct / v.submissions),
  }));
  const byTest = [...byTestMap.entries()].map(([id, v]) => ({
    test_id: id,
    title: v.title,
    submissions: v.submissions,
    avg_percentage: Math.round(v.sumPct / v.submissions),
  }));

  return NextResponse.json({ submissions, byUser, byTest });
}
