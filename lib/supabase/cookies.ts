/** Shape used by @supabase/ssr cookie callbacks (options match Next cookie serialization). */
export type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};
