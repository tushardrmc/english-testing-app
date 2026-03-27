import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.replace(/^Bearer\s+/i, "");
}

export async function getAdminContextFromToken(token?: string | null) {
  if (!token) {
    return { error: "Unauthorized" as const, status: 401 };
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    return { error: "Unauthorized" as const, status: 401 };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: "Forbidden" as const, status: 403 };
  }

  return { user, admin };
}

export async function requireAdmin(request: Request) {
  const token = getBearerToken(request);
  return getAdminContextFromToken(token);
}
