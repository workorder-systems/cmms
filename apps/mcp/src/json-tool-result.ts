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

export async function jsonToolTry<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return jsonResult(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonToolError(message);
  }
}
