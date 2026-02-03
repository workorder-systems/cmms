/**
 * Normalized SDK errors. Preserve PostgREST/Supabase codes for debuggability.
 */
export class SdkError extends Error {
  readonly code: string | undefined;
  readonly details: string | undefined;
  readonly hint: string | undefined;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      code?: string;
      details?: string;
      hint?: string;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SdkError';
    this.code = options?.code;
    this.details = options?.details;
    this.hint = options?.hint;
    Object.setPrototypeOf(this, SdkError.prototype);
  }
}

/**
 * Normalize a Supabase/PostgREST error into SdkError.
 */
export function normalizeError(error: unknown): SdkError {
  if (error instanceof SdkError) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    return new SdkError(e.message ?? String(error), {
      code: e.code,
      details: e.details,
      hint: e.hint,
      cause: error,
    });
  }
  return new SdkError(String(error), { cause: error });
}
