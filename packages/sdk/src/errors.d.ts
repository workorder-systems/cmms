/**
 * Normalized SDK errors. Preserve PostgREST/Supabase codes for debuggability.
 */
export declare class SdkError extends Error {
    readonly code: string | undefined;
    readonly details: string | undefined;
    readonly hint: string | undefined;
    constructor(message: string, options?: {
        cause?: unknown;
        code?: string;
        details?: string;
        hint?: string;
    });
}
/**
 * Normalize a Supabase/PostgREST error into SdkError.
 */
export declare function normalizeError(error: unknown): SdkError;
//# sourceMappingURL=errors.d.ts.map