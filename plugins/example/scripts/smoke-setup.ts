/**
 * End-to-end local smoke: register catalog plugin, Vault secret, user + tenant,
 * install + subscription, create work order, run delivery processor (service role).
 *
 * Prereqs: `pnpm supabase:start`, Docker (for Vault SQL), root `.env.local` with
 * SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (or CLI defaults).
 *
 * Run in another terminal first: `pnpm --filter work-order-systems-example dev`
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const repoRoot = join(__dirname, '..', '..', '..');

const LOG = '[example:smoke]';

config({ path: join(repoRoot, '.env.local') });
config({ path: join(repoRoot, '.env') });
config({ path: join(appRoot, '.env.local'), override: true });
config({ path: join(appRoot, '.env'), override: true });

const PLUGIN_KEY = 'example_receiver';
const VAULT_SECRET_NAME = 'example_plugin_hmac';
const DEFAULT_HMAC_SECRET = 'example-plugin-dev-hmac-secret-key-32chars!!';
const DOCKER_DB = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_database';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hmacPlaintext =
  process.env.EXAMPLE_HMAC_SECRET ?? process.env.EXAMPLE_PLUGIN_HMAC_SECRET ?? DEFAULT_HMAC_SECRET;
const webhookUrl =
  process.env.EXAMPLE_WEBHOOK_URL ??
  process.env.EXAMPLE_PLUGIN_WEBHOOK_URL ??
  'http://host.docker.internal:8765/webhook';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function seedVaultViaDocker(): boolean {
  const sql = `delete from vault.secrets where name = '${VAULT_SECRET_NAME}'; select vault.create_secret('${hmacPlaintext.replace(/'/g, "''")}', '${VAULT_SECRET_NAME}', 'example smoke');`;
  try {
    execSync(`docker exec ${DOCKER_DB} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`, {
      stdio: 'inherit',
    });
    return true;
  } catch {
    console.warn(`${LOG} Vault seed via Docker failed (container ${DOCKER_DB}?). Create the secret manually in SQL:`);
    console.warn(`  select vault.create_secret('${hmacPlaintext}', '${VAULT_SECRET_NAME}', 'example');`);
    return false;
  }
}

async function refreshSessionAfterTenantContext(
  userClient: SupabaseClient,
  email: string,
  password: string,
) {
  await userClient.auth.signOut();
  const { error } = await userClient.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`sign-in after tenant context: ${error.message}`);
  }
}

async function main() {
  if (!serviceKey) {
    console.error(`${LOG} Missing SUPABASE_SERVICE_ROLE_KEY (set in repo root .env.local or env).`);
    process.exit(1);
  }

  const service = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`${LOG} [1/8] Register plugin catalog entry (service role)…`);
  const { error: regErr } = await service.rpc('rpc_register_plugin', {
    p_key: PLUGIN_KEY,
    p_name: 'Example receiver',
    p_description: 'Local webhook smoke test',
    p_is_integration: true,
    p_is_active: true,
  });
  if (regErr) {
    console.error(regErr);
    process.exit(1);
  }

  console.log(`${LOG} [2/8] Vault secret (Docker psql)…`);
  seedVaultViaDocker();

  const stamp = Date.now();
  const email = `example-smoke-${stamp}@local.test`;
  const password = 'ExampleSmokeDev1!';

  console.log(`${LOG} [3/8] Create Auth user (service admin)…`);
  const { data: created, error: cuErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cuErr || !created.user) {
    console.error(cuErr);
    process.exit(1);
  }

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`${LOG} [4/8] Sign in + create tenant…`);
  const { error: siErr } = await userClient.auth.signInWithPassword({ email, password });
  if (siErr) {
    console.error(siErr);
    process.exit(1);
  }

  const slug = `example-${stamp}`;
  const { data: tenantId, error: tErr } = await userClient.rpc('rpc_create_tenant', {
    p_name: `Example smoke ${stamp}`,
    p_slug: slug,
  });
  if (tErr || !tenantId) {
    console.error(tErr);
    process.exit(1);
  }

  const { error: ctxErr } = await userClient.rpc('rpc_set_tenant_context', {
    p_tenant_id: tenantId,
  });
  if (ctxErr) {
    console.error(ctxErr);
    process.exit(1);
  }
  await refreshSessionAfterTenantContext(userClient, email, password);

  console.log(`${LOG} [5/8] Install plugin + webhook URL + secret_ref…`);
  const { data: installationId, error: instErr } = await userClient.rpc('rpc_install_plugin', {
    p_tenant_id: tenantId,
    p_plugin_key: PLUGIN_KEY,
    p_secret_ref: VAULT_SECRET_NAME,
    p_config: { webhook_url: webhookUrl },
  });
  if (instErr || !installationId) {
    console.error(instErr);
    process.exit(1);
  }

  console.log(`${LOG} [6/8] Subscription: app.work_orders INSERT…`);
  const { error: subErr } = await userClient.rpc('rpc_upsert_plugin_webhook_subscription', {
    p_tenant_id: tenantId,
    p_installation_id: installationId,
    p_table_schema: 'app',
    p_table_name: 'work_orders',
    p_operations: ['INSERT'],
    p_include_payload: false,
  });
  if (subErr) {
    console.error(subErr);
    process.exit(1);
  }

  console.log(`${LOG} [7/8] Create work order (enqueues delivery)…`);
  const { error: woErr } = await userClient.rpc('rpc_create_work_order', {
    p_tenant_id: tenantId,
    p_title: `Smoke ${stamp}`,
    p_description: 'plugins/example smoke-setup',
  });
  if (woErr) {
    console.error(woErr);
    process.exit(1);
  }

  console.log(`${LOG} [8/8] Run delivery processor (service role), twice for pg_net collect…`);
  const { data: n1, error: p1 } = await service.rpc('rpc_process_plugin_deliveries', { p_batch_size: 25 });
  if (p1) {
    console.error(p1);
    process.exit(1);
  }
  console.log(`  first pass processed: ${n1}`);
  await sleep(2500);
  const { data: n2, error: p2 } = await service.rpc('rpc_process_plugin_deliveries', { p_batch_size: 25 });
  if (p2) {
    console.error(p2);
    process.exit(1);
  }
  console.log(`  second pass processed: ${n2}`);

  console.log(`\n${LOG} Done. With the receiver running and WEBHOOK_SECRET matching Vault:`);
  console.log(`  curl -s http://127.0.0.1:8765/events | jq .`);
  console.log(`\n${LOG} Sign-in used for manual follow-up:`);
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  tenant: ${tenantId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
