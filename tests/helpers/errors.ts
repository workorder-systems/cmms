/**
 * Format a PostgREST/Supabase error for thrown Error messages.
 * Includes details and hint when present so failures are easier to debug.
 */
export function formatPostgrestError(
  context: string,
  error: { message?: string; code?: string; details?: string; hint?: string }
): string {
  const msg = error.message ?? 'Unknown error';
  const code = error.code ?? '';
  let out = `${context}: ${msg}`;
  if (code) out += ` (code: ${code})`;
  if (error.details) out += ` | details: ${error.details}`;
  if (error.hint) out += ` | hint: ${error.hint}`;
  return out;
}
