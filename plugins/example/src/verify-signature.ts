import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies `X-Plugin-Signature`: hex-encoded HMAC-SHA256 of the raw body bytes,
 * matching `rpc_process_plugin_deliveries` / `rpc_plugin_ingest_webhook` in Postgres.
 */
export function verifyPluginSignature(rawBody: Buffer, secret: string, headerHex: string | undefined): boolean {
  if (!headerHex || !secret) {
    return false;
  }
  const received = headerHex.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]+$/.test(received) || received.length % 2 !== 0) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (received.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
