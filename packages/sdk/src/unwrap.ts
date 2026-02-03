import type { PostgrestError } from '@supabase/supabase-js';
import { normalizeError } from './errors.js';

/**
 * Unwrap a Supabase result: return data or throw SdkError.
 */
export function unwrapResult<T>(data: T | null, error: PostgrestError | null): T {
  if (error) {
    throw normalizeError(error);
  }
  return data as T;
}

/** Typed RPC caller: runs RPC and returns data or throws SdkError. */
export async function callRpc<T>(
  rpc: (name: string, params?: object) => Promise<{ data: unknown; error: unknown }>,
  name: string,
  params?: object
): Promise<T> {
  const { data, error } = await rpc(name, params);
  unwrapResult(data, error as PostgrestError | null);
  return data as T;
}
