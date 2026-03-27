import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function last7DayLabels() {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-US", { weekday: "short" })
    );
  }
  return labels;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;

  const { data: results, error } = await admin
    .from("test_results")
    .select("created_at, percentage")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = startOfDay(new Date());
  const buckets: { count: number; pctSum: number }[] = Array.from(
    { length: 7 },
    () => ({ count: 0, pctSum: 0 })
  );

  for (const row of results || []) {
    if (!row.created_at) continue;
    const day = startOfDay(new Date(row.created_at));
    const diffDays = Math.round(
      (now.getTime() - day.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diffDays < 0 || diffDays > 6) continue;
    const idx = 6 - diffDays;
    if (idx < 0 || idx > 6) continue;
    buckets[idx].count += 1;
    buckets[idx].pctSum += row.percentage ?? 0;
  }

  const labels = last7DayLabels();
  const testsCompleted = buckets.map((b) => b.count);
  const averageScorePct = buckets.map((b) =>
    b.count > 0 ? Math.round(b.pctSum / b.count) : 0
  );

  const { count: testCount } = await admin
    .from("tests")
    .select("*", { count: "exact", head: true });

  const { count: resultsCount } = await admin
    .from("test_results")
    .select("*", { count: "exact", head: true });

  const { count: profileCount } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

  return NextResponse.json({
    chart: {
      labels,
      testsCompleted,
      averageScorePct,
    },
    stats: {
      totalStudents: profileCount ?? 0,
      testsCreated: testCount ?? 0,
      totalSubmissions: resultsCount ?? 0,
    },
  });
}
