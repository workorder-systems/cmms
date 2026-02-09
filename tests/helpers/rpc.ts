import { SupabaseClient } from '@supabase/supabase-js';
import { formatPostgrestError } from './errors.js';

/**
 * Call an RPC function with error handling
 * Returns the result or throws a descriptive error
 */
export async function callRPC<T = any>(
  client: SupabaseClient,
  functionName: string,
  params: Record<string, any> = {}
): Promise<T> {
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw new Error(formatPostgrestError(`RPC ${functionName} failed`, error));
  }

  return data as T;
}

/**
 * Call an RPC function and expect it to fail
 * Returns the error message
 */
export async function expectRPCError(
  client: SupabaseClient,
  functionName: string,
  params: Record<string, any> = {}
): Promise<string> {
  const { data, error } = await client.rpc(functionName, params);

  if (!error) {
    throw new Error(
      `Expected RPC ${functionName} to fail, but it succeeded with data: ${JSON.stringify(data)}`
    );
  }

  return error.message;
}
