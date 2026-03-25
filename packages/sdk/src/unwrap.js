import { normalizeError } from './errors.js';
/**
 * Unwrap a Supabase result: return data or throw SdkError.
 */
export function unwrapResult(data, error) {
    if (error) {
        throw normalizeError(error);
    }
    return data;
}
/** Typed RPC caller: runs RPC and returns data or throws SdkError. */
export async function callRpc(rpc, name, params) {
    const { data, error } = await rpc(name, params);
    unwrapResult(data, error);
    return data;
}
