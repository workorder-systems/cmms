import { SdkError, normalizeError } from '@workorder-systems/sdk';

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

export function jsonToolError(message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
    isError: true as const,
  };
}

export function jsonCompactToolError(message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message }),
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
  const normalized = normalizeError(error);
  const payload = {
    error: {
      message: normalized.message,
      code: normalized.code ?? null,
      details: normalized.details ?? null,
      hint: normalized.hint ?? null,
      retryable: options?.retryable ?? null,
      next_action: options?.next_action ?? null,
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

export function isSdkLikeError(error: unknown): error is SdkError {
  return error instanceof SdkError;
}

export async function jsonToolTry<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return jsonResult(data);
  } catch (err) {
    return jsonStructuredToolError(err);
  }
}
