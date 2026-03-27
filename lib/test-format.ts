type OptionRow = { id: string; text: string; created_at?: string };
type QuestionRow = {
  id: string;
  text: string;
  type?: string | null;
  points?: number | null;
  created_at?: string;
  options?: OptionRow[] | null;
};

type TestRow = {
  id: string;
  title: string;
  duration_minutes: number;
  questions?: QuestionRow[] | null;
};

function sortByCreated<T extends { created_at?: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime()
  );
}

/** Public test payload (no correct answers). */
export function formatTestForClient(row: TestRow) {
  const questions = sortByCreated(row.questions || []).map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type || "MCQ",
    points: q.points ?? 10,
    options: sortByCreated(q.options || []).map((o) => ({
      id: o.id,
      text: o.text,
    })),
  }));

  return {
    id: row.id,
    title: row.title,
    time_limit_minutes: row.duration_minutes,
    questions,
  };
}
