import { SdkError } from '@workorder-systems/sdk';

type ErrorWithFields = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  cause?: unknown;
};

export type ToolErrorPayload = {
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
    retryable?: boolean;
    next_action?: string;
  };
};

function isErrorWithFields(value: unknown): value is ErrorWithFields {
  return Boolean(value) && typeof value === 'object';
}

function retryableFromCode(code: string | undefined): boolean | undefined {
  if (!code) {
    return undefined;
  }

  if (code === '40001' || code === '57014') {
    return true;
  }

  return undefined;
}

function nextActionFromMessage(message: string, code: string | undefined): string | undefined {
  if (
    code === 'P0001' &&
    /tenant context required|call rpc_set_tenant_context first|call set_active_tenant first/i.test(message)
  ) {
    return 'Call resolve_active_tenant, then set_active_tenant, then retry the tenant-scoped tool.';
  }

  if (/refresh token|x-supabase-refresh-token|tenant_id/i.test(message)) {
    return 'Refresh the Supabase session so the JWT includes tenant_id, then retry.';
  }

  return undefined;
}

export function toToolErrorPayload(err: unknown): ToolErrorPayload {
  if (err instanceof SdkError) {
    return {
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        retryable: retryableFromCode(err.code),
        next_action: nextActionFromMessage(err.message, err.code),
      },
    };
  }

  if (err instanceof Error && isErrorWithFields(err)) {
    const payload = err as ErrorWithFields;
    return {
      error: {
        message: err.message,
        code: payload.code,
        details: payload.details,
        hint: payload.hint,
        retryable: retryableFromCode(payload.code),
        next_action: nextActionFromMessage(err.message, payload.code),
      },
    };
  }

  if (isErrorWithFields(err)) {
    const message = typeof err.message === 'string' ? err.message : String(err);
    return {
      error: {
        message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        retryable: retryableFromCode(err.code),
        next_action: nextActionFromMessage(message, err.code),
      },
    };
  }

  return {
    error: {
      message: String(err),
    },
  };
}

export function toStructuredToolError(err: unknown): ToolErrorPayload['error'] {
  return toToolErrorPayload(err).error;
}
