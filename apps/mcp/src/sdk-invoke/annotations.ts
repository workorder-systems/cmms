import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

export const ann = {
  read: { readOnlyHint: true, openWorldHint: true } satisfies ToolAnnotations,
  write: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
  destructive: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } satisfies ToolAnnotations,
} as const;
