import type { Client } from '@libsql/client';
import type { SupplierOrderSession } from '@/domain/supplier';
import type { SupplierOrderSessionStore } from '@/application/supplier-order-session-store';

const TABLE_NAME = 'supplier_order_sessions';

export class TursoSupplierOrderSessionStore implements SupplierOrderSessionStore {
  private schemaReady?: Promise<void>;
  private readonly encryptionKey: Promise<CryptoKey>;

  constructor(
    private readonly client: Client,
    encryptionKeyBase64: string,
  ) {
    this.encryptionKey = importEncryptionKey(encryptionKeyBase64);
  }

  async get(scopeId: string, sessionId: string): Promise<SupplierOrderSession | undefined> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: `SELECT encrypted_session FROM ${TABLE_NAME} WHERE scope_id = ? AND session_id = ?`,
      args: [scopeId, sessionId],
    });
    const encryptedSession = result.rows[0]?.encrypted_session;
    if (typeof encryptedSession !== 'string') return undefined;
    return decryptSession(encryptedSession, await this.encryptionKey);
  }

  async set(scopeId: string, session: SupplierOrderSession): Promise<void> {
    await this.ensureSchema();
    const encryptedSession = await encryptSession(session, await this.encryptionKey);
    await this.client.execute({
      sql: `
        INSERT INTO ${TABLE_NAME} (scope_id, session_id, status, encrypted_session, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(scope_id, session_id) DO UPDATE SET
          status = excluded.status,
          encrypted_session = excluded.encrypted_session,
          updated_at = excluded.updated_at
      `,
      args: [scopeId, session.id, session.status, encryptedSession, new Date().toISOString()],
    });
  }

  async claimCartApply(scopeId: string, sessionId: string): Promise<SupplierOrderSession | undefined> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: `
        UPDATE ${TABLE_NAME}
        SET status = 'cart_applying', updated_at = ?
        WHERE scope_id = ? AND session_id = ? AND status = 'cart_preview'
        RETURNING encrypted_session
      `,
      args: [new Date().toISOString(), scopeId, sessionId],
    });
    const encryptedSession = result.rows[0]?.encrypted_session;
    if (typeof encryptedSession !== 'string') return undefined;
    const session = await decryptSession(encryptedSession, await this.encryptionKey);
    return { ...session, status: 'cart_applying' };
  }

  async clearScope(scopeId: string): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: `DELETE FROM ${TABLE_NAME} WHERE scope_id = ?`,
      args: [scopeId],
    });
  }

  private async ensureSchema(): Promise<void> {
    this.schemaReady ??= this.client
      .execute(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          scope_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          status TEXT NOT NULL,
          encrypted_session TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (scope_id, session_id)
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

async function encryptSession(session: SupplierOrderSession, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return `v1.${Buffer.from(iv).toString('base64url')}.${Buffer.from(encrypted).toString('base64url')}`;
}

async function decryptSession(value: string, key: CryptoKey): Promise<SupplierOrderSession> {
  const [version, ivValue, encryptedValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !encryptedValue) throw new Error('Unsupported supplier session format');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(ivValue, 'base64url') },
    key,
    Buffer.from(encryptedValue, 'base64url'),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as SupplierOrderSession;
}