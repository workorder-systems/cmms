import { toToolErrorPayload } from './tool-errors.js';

/**
 * Shared JSON text responses for MCP tools (success and error).
 */

export function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Compact JSON output (no pretty indentation) to reduce tokens for large payloads.
 * Keep `jsonResult` as the default for readability; use this for summary/compact tools.
 */
export function jsonCompactResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data),
      },
    ],
  };
}

export function jsonToolError(
  messageOrPayload:
    | string
    | {
        message: string;
        code?: string;
        details?: string;
        hint?: string;
        retryable?: boolean;
        next_action?: string;
      }
) {
  const payload =
    typeof messageOrPayload === 'string'
      ? { error: { message: messageOrPayload } }
      : { error: messageOrPayload };
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: true as const,
  };
}

export function jsonCompactToolError(
  messageOrPayload:
    | string
    | {
        message: string;
        code?: string;
        details?: string;
        hint?: string;
        retryable?: boolean;
        next_action?: string;
      }
) {
  const payload =
    typeof messageOrPayload === 'string'
      ? { error: { message: messageOrPayload } }
      : { error: messageOrPayload };
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload),
      },
    ],
    isError: true as const,
  };
}

export function jsonStructuredToolError(
  error: unknown,
  options?: {
    next_action?: string;
    retryable?: boolean;
    compact?: boolean;
    extra?: Record<string, unknown>;
  }
) {
  const base = toToolErrorPayload(error);
  const payload = {
    error: {
      ...base.error,
      retryable: options?.retryable ?? base.error.retryable ?? null,
      next_action: options?.next_action ?? base.error.next_action ?? null,
      ...(options?.extra ?? {}),
    },
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, options?.compact ? 0 : 2),
      },
    ],
    isError: true as const,
  };
}

export async function jsonToolTry<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return jsonResult(data);
  } catch (err) {
    return jsonStructuredToolError(err);
  }
}
