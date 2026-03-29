import { describe, expect, it } from 'vitest';
import { SdkError } from '@workorder-systems/sdk';
import { toStructuredToolError, toToolErrorPayload } from './tool-errors.js';

describe('toStructuredToolError', () => {
  it('preserves structured SDK error fields', () => {
    const err = new SdkError('Permission denied', {
      code: '42501',
      details: 'tenant.admin required',
      hint: 'ask the user to elevate privileges',
    });

    expect(toStructuredToolError(err)).toEqual({
      message: 'Permission denied',
      code: '42501',
      details: 'tenant.admin required',
      hint: 'ask the user to elevate privileges',
    });
  });

  it('falls back to plain Error message', () => {
    expect(toStructuredToolError(new Error('boom'))).toEqual({
      message: 'boom',
    });
  });
});

describe('toToolErrorPayload', () => {
  it('wraps retry guidance in MCP error envelope', () => {
    expect(
      toToolErrorPayload({
        message: 'work order create request abc is already in progress; retry with the same client_request_id',
        code: '40001',
      })
    ).toEqual({
      error: {
        message: 'work order create request abc is already in progress; retry with the same client_request_id',
        code: '40001',
        retryable: true,
      },
    });
  });
});
