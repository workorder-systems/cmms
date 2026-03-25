import type { PostgrestError } from '@supabase/supabase-js';
/**
 * Unwrap a Supabase result: return data or throw SdkError.
 */
export declare function unwrapResult<T>(data: T | null, error: PostgrestError | null): T;
/** Typed RPC caller: runs RPC and returns data or throws SdkError. */
export declare function callRpc<T>(rpc: (name: string, params?: object) => Promise<{
    data: unknown;
    error: unknown;
}>, name: string, params?: object): Promise<T>;
//# sourceMappingURL=unwrap.d.ts.map