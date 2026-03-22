import { appendFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { verifyPluginSignature } from './verify-signature.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');

loadEnv({ path: join(appRoot, '.env.local') });
loadEnv({ path: join(appRoot, '.env') });

const pkg = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as { name?: string; version?: string };
const SERVICE = pkg.name ?? 'work-order-systems-example';
const VERSION = pkg.version ?? '0.0.0';
const LOG = '[example]';

const PORT = Number(process.env.PORT ?? '8765');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';
const DATA_DIR = process.env.DATA_DIR ?? join(appRoot, 'data');
const EVENTS_FILE = join(DATA_DIR, 'events.jsonl');
const startedAt = Date.now();

/** In-memory ring buffer for GET /events (newest last; API reverses for display). */
const MAX_MEMORY = 100;

type StoredEvent = {
  receivedAt: string;
  deliveryId?: string;
  eventType?: string;
  body: unknown;
};

const memory: StoredEvent[] = [];

function pushMemory(entry: StoredEvent): void {
  memory.push(entry);
  if (memory.length > MAX_MEMORY) {
    memory.splice(0, memory.length - MAX_MEMORY);
  }
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 0));
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function appendEventLine(line: string): Promise<void> {
  await ensureDataDir();
  await appendFile(EVENTS_FILE, line + '\n', 'utf8');
}

async function handleWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readBody(req);
  const sig = req.headers['x-plugin-signature'];
  const sigStr = Array.isArray(sig) ? sig[0] : sig;

  if (WEBHOOK_SECRET) {
    if (!verifyPluginSignature(raw, WEBHOOK_SECRET, sigStr)) {
      json(res, 401, { error: 'invalid_signature', message: 'X-Plugin-Signature does not match WEBHOOK_SECRET' });
      return;
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    json(res, 400, { error: 'invalid_json', message: 'Body must be JSON' });
    return;
  }

  const deliveryId = req.headers['x-plugin-delivery-id'];
  const eventType = req.headers['x-plugin-event-type'];
  const receivedAt = new Date().toISOString();

  const record: StoredEvent = {
    receivedAt,
    deliveryId:
      typeof deliveryId === 'string' ? deliveryId : Array.isArray(deliveryId) ? deliveryId[0] : undefined,
    eventType:
      typeof eventType === 'string' ? eventType : Array.isArray(eventType) ? eventType[0] : undefined,
    body: parsed,
  };

  pushMemory(record);

  const line = JSON.stringify({
    ...record,
    rawLength: raw.length,
  });
  await appendEventLine(line).catch((err) => {
    console.error(`${LOG} failed to append event file`, err);
  });

  json(res, 200, { ok: true, receivedAt: record.receivedAt });
}

async function handleEvents(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  json(res, 200, {
    events: [...memory].reverse(),
    totalInMemory: memory.length,
    maxInMemory: MAX_MEMORY,
  });
}

async function handleReplay(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const text = await readFile(EVENTS_FILE, 'utf8');
    const lines = text
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-50)
      .map((l) => JSON.parse(l) as unknown);
    json(res, 200, { fromFile: lines.reverse(), file: EVENTS_FILE });
  } catch {
    json(res, 200, { fromFile: [], file: EVENTS_FILE });
  }
}

/** Clear ring buffer and delete JSONL (local debugging). */
async function handleDevReset(res: ServerResponse): Promise<void> {
  memory.length = 0;
  await unlink(EVENTS_FILE).catch(() => {});
  json(res, 200, { ok: true, cleared: true, eventsFile: EVENTS_FILE });
}

function handleRoot(res: ServerResponse): void {
  json(res, 200, {
    service: SERVICE,
    version: VERSION,
    description: 'Local webhook receiver for Postgres plugin deliveries (pg_net).',
    endpoints: {
      'GET /': 'This summary',
      'GET /health': 'Liveness and runtime stats',
      'POST /webhook': 'Signed plugin delivery target',
      'GET /events': 'Recent events (in-memory, this process)',
      'GET /events/replay': 'Last 50 lines from events.jsonl',
      'POST /dev/reset': 'Clear memory + delete events.jsonl (dev only)',
    },
  });
}

function handleHealth(res: ServerResponse): void {
  const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
  json(res, 200, {
    ok: true,
    service: SERVICE,
    version: VERSION,
    uptimeSec,
    eventsInMemory: memory.length,
    signature: WEBHOOK_SECRET ? 'required' : 'optional',
    port: PORT,
    dataDir: DATA_DIR,
  });
}

function handleNotFound(res: ServerResponse, method: string, path: string): void {
  json(res, 404, {
    error: 'not_found',
    method,
    path,
    hint: 'GET / for available routes',
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url?.split('?')[0] ?? '/';
    const method = req.method ?? 'GET';

    if (method === 'GET' && url === '/') {
      handleRoot(res);
      return;
    }

    if (method === 'GET' && url === '/health') {
      handleHealth(res);
      return;
    }

    if (method === 'GET' && url === '/events') {
      await handleEvents(req, res);
      return;
    }

    if (method === 'GET' && url === '/events/replay') {
      await handleReplay(req, res);
      return;
    }

    if (method === 'POST' && url === '/dev/reset') {
      await handleDevReset(res);
      return;
    }

    if (method === 'POST' && url === '/webhook') {
      await handleWebhook(req, res);
      return;
    }

    handleNotFound(res, method, url);
  } catch (e) {
    console.error(LOG, e);
    json(res, 500, { error: 'internal_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`${LOG} ${SERVICE} v${VERSION} — http://0.0.0.0:${PORT}`);
  console.log(`${LOG} POST /webhook · GET /events · GET /health · GET / · POST /dev/reset`);
  if (WEBHOOK_SECRET) {
    console.log(`${LOG} WEBHOOK_SECRET set: signatures will be verified`);
  } else {
    console.log(`${LOG} WEBHOOK_SECRET unset: accepting unsigned webhooks (dev only)`);
  }
  console.log(`${LOG} events file: ${EVENTS_FILE}`);
});
