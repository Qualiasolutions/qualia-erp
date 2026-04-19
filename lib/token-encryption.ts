import crypto from 'node:crypto';

// Integration-token encryption helpers. Shared by every site that reads or
// writes `workspace_integrations.encrypted_token` so decryption is not skipped
// on any code path. Using `lib/` rather than colocating with
// `app/actions/integrations.ts` means non-action consumers (planning sync,
// lib/integrations/*, webhook installer) can import without pulling in the
// server-action bundle.

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

function deriveKey(material: string): Buffer {
  return crypto.scryptSync(material, 'qualia-token-salt', 32);
}

export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured — cannot encrypt integration tokens');
  }
  const key = deriveKey(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith('enc:')) {
    // All rows were re-encrypted during the 2026-04-19 rotation. Plaintext
    // should never appear — log loudly if it does so the operator can
    // investigate (manual DB edit? cross-env copy?).
    console.error(
      `[token-encryption] Plaintext token encountered after rotation (prefix: ${stored.slice(0, 4)}). Investigate.`
    );
    return stored;
  }
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured — cannot decrypt integration tokens');
  }
  const [, ivHex, authTagHex, encryptedHex] = stored.split(':');
  const key = deriveKey(ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
