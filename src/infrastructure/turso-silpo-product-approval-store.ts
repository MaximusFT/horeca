import type { Client } from '@libsql/client';
import type { SilpoProductApproval, SilpoProductApprovalStore } from './silpo-product-approval-store';

const TABLE_NAME = 'silpo_product_approvals';

export class TursoSilpoProductApprovalStore implements SilpoProductApprovalStore {
  private schemaReady?: Promise<void>;
  private readonly encryptionKey: Promise<CryptoKey>;

  constructor(
    private readonly client: Client,
    encryptionKeyBase64: string,
  ) {
    this.encryptionKey = importEncryptionKey(encryptionKeyBase64);
  }

  async save(sessionId: string, approval: SilpoProductApproval): Promise<void> {
    await this.ensureSchema();
    const encryptedPayload = await encryptApproval(approval, await this.encryptionKey);
    await this.client.execute({
      sql: `
        INSERT INTO ${TABLE_NAME}
          (approval_id, session_id, status, expires_at, encrypted_payload, updated_at)
        VALUES (?, ?, 'pending', ?, ?, ?)
      `,
      args: [approval.id, sessionId, approval.expiresAt, encryptedPayload, new Date().toISOString()],
    });
  }

  async claim(sessionId: string, approvalId: string, now: string): Promise<SilpoProductApproval | undefined> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: `
        UPDATE ${TABLE_NAME}
        SET status = 'applying', updated_at = ?
        WHERE approval_id = ? AND session_id = ? AND status = 'pending' AND expires_at >= ?
        RETURNING encrypted_payload
      `,
      args: [now, approvalId, sessionId, now],
    });
    const encryptedPayload = result.rows[0]?.encrypted_payload;
    if (typeof encryptedPayload !== 'string') return undefined;
    return decryptApproval(encryptedPayload, await this.encryptionKey);
  }

  async finish(sessionId: string, approvalId: string, status: 'applied' | 'failed'): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: `
        UPDATE ${TABLE_NAME}
        SET status = ?, updated_at = ?
        WHERE approval_id = ? AND session_id = ? AND status = 'applying'
      `,
      args: [status, new Date().toISOString(), approvalId, sessionId],
    });
  }

  private async ensureSchema(): Promise<void> {
    this.schemaReady ??= this.client
      .execute(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          approval_id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          status TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          encrypted_payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      .then(() => undefined);
    await this.schemaReady;
  }
}

async function importEncryptionKey(value: string): Promise<CryptoKey> {
  const bytes = Buffer.from(value, 'base64');
  if (bytes.byteLength !== 32) {
    throw new Error('SILPO_OAUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptApproval(approval: SilpoProductApproval, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(approval));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return `v1.${Buffer.from(iv).toString('base64url')}.${Buffer.from(encrypted).toString('base64url')}`;
}

async function decryptApproval(value: string, key: CryptoKey): Promise<SilpoProductApproval> {
  const [version, ivValue, encryptedValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !encryptedValue) throw new Error('Unsupported Silpo approval format');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(ivValue, 'base64url') },
    key,
    Buffer.from(encryptedValue, 'base64url'),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as SilpoProductApproval;
}