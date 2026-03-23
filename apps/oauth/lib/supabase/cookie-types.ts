/** Shape passed to Supabase SSR cookie `setAll` callbacks. */
export type CookieToSet = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};
