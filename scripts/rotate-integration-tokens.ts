/**
 * One-shot token re-encryption for TOKEN_ENCRYPTION_KEY rotation.
 *
 * Run this AFTER:
 *   1. Deploying the decryptToken fallback to prod
 *   2. Setting TOKEN_ENCRYPTION_KEY_OLD = old key value on Vercel
 *   3. Replacing TOKEN_ENCRYPTION_KEY = new key value on Vercel
 *
 * The script:
 *   - Reads every workspace_integrations row with a non-null encrypted_token
 *   - Decrypts each with the OLD key
 *   - Re-encrypts with the NEW key
 *   - Writes the updated ciphertext back
 *
 * After this succeeds, all stored ciphertexts are NEW-keyed and you can remove
 * TOKEN_ENCRYPTION_KEY_OLD from Vercel + drop the fallback branch in
 * app/actions/integrations.ts.
 *
 * Usage (from repo root):
 *   SUPABASE_URL="https://vbpzaiqovffpsroxaulv.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="<service-role-jwt>" \
 *   OLD_KEY="<previous TOKEN_ENCRYPTION_KEY value>" \
 *   NEW_KEY="<new TOKEN_ENCRYPTION_KEY value>" \
 *   npx ts-node scripts/rotate-integration-tokens.ts
 *
 * Add --dry-run to preview without writing.
 */
import crypto from 'node:crypto';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OLD_KEY, NEW_KEY } = process.env;
const DRY_RUN = process.argv.includes('--dry-run');

function die(msg: string): never {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL) die('SUPABASE_URL not set');
if (!SUPABASE_SERVICE_ROLE_KEY) die('SUPABASE_SERVICE_ROLE_KEY not set');
if (!OLD_KEY) die('OLD_KEY not set');
if (!NEW_KEY) die('NEW_KEY not set');
if (OLD_KEY === NEW_KEY) die('OLD_KEY === NEW_KEY — nothing to rotate');

const deriveKey = (material: string): Buffer =>
  crypto.scryptSync(material, 'qualia-token-salt', 32);

function decrypt(stored: string, material: string): string {
  if (!stored.startsWith('enc:')) {
    // Legacy plaintext — pass through. Will get re-encrypted below.
    return stored;
  }
  const [, ivHex, authTagHex, encryptedHex] = stored.split(':');
  const key = deriveKey(material);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function encrypt(plaintext: string, material: string): string {
  const key = deriveKey(material);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

type Row = { id: string; provider: string; workspace_id: string; encrypted_token: string };

async function main() {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  console.log(`[rotate] fetching rows from workspace_integrations${DRY_RUN ? ' (DRY RUN)' : ''}`);
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/workspace_integrations?select=id,provider,workspace_id,encrypted_token&encrypted_token=not.is.null`,
    { headers }
  );
  if (!listRes.ok) die(`fetch list failed: ${listRes.status} ${await listRes.text()}`);
  const rows: Row[] = await listRes.json();
  console.log(`[rotate] ${rows.length} rows to rotate`);

  let ok = 0;
  let alreadyNewKey = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // First, check whether the ciphertext is already decryptable with the new
      // key (idempotency — safe to re-run this script).
      let plaintext: string;
      try {
        plaintext = decrypt(row.encrypted_token, NEW_KEY!);
        alreadyNewKey++;
        console.log(`[rotate] ${row.provider}/${row.id.slice(0, 8)}: already new-keyed, skipping`);
        continue;
      } catch {
        // Fall through — try the old key.
      }

      plaintext = decrypt(row.encrypted_token, OLD_KEY!);
      const reEncrypted = encrypt(plaintext, NEW_KEY!);

      if (DRY_RUN) {
        console.log(
          `[rotate] ${row.provider}/${row.id.slice(0, 8)}: would re-encrypt (token len ${plaintext.length})`
        );
        ok++;
        continue;
      }

      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/workspace_integrations?id=eq.${row.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ encrypted_token: reEncrypted }),
        }
      );
      if (!updateRes.ok) {
        const txt = await updateRes.text();
        throw new Error(`update ${row.id} → ${updateRes.status} ${txt}`);
      }
      ok++;
      console.log(`[rotate] ${row.provider}/${row.id.slice(0, 8)}: re-encrypted`);
    } catch (err) {
      failed++;
      console.error(
        `[rotate] ${row.provider}/${row.id.slice(0, 8)}: FAILED —`,
        (err as Error).message
      );
    }
  }

  console.log('---');
  console.log(`[rotate] done: ${ok} rotated, ${alreadyNewKey} already new-keyed, ${failed} failed`);
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error('[rotate] UNHANDLED ERROR:', err);
  process.exit(3);
});
