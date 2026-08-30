import type { Client } from '@libsql/client';
import type { SilpoOAuthRecord, SilpoOAuthStore } from './silpo-oauth-store';

const TABLE_NAME = 'silpo_oauth_sessions';

export class TursoSilpoOAuthStore implements SilpoOAuthStore {
  private schemaReady?: Promise<void>;
  private readonly encryptionKey: Promise<CryptoKey>;

  constructor(
    private readonly client: Client,
    encryptionKeyBase64: string,
  ) {
    this.encryptionKey = importEncryptionKey(encryptionKeyBase64);
  }

  async get(sessionId: string): Promise<SilpoOAuthRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: `SELECT encrypted_record FROM ${TABLE_NAME} WHERE session_id = ?`,
      args: [sessionId],
    });
    const encryptedRecord = result.rows[0]?.encrypted_record;
    if (typeof encryptedRecord !== 'string') return undefined;
    return decryptRecord(encryptedRecord, await this.encryptionKey);
  }

  async set(sessionId: string, record: SilpoOAuthRecord): Promise<void> {
    await this.ensureSchema();
    const encryptedRecord = await encryptRecord(record, await this.encryptionKey);
    await this.client.execute({
      sql: `
        INSERT INTO ${TABLE_NAME} (session_id, encrypted_record, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          encrypted_record = excluded.encrypted_record,
          updated_at = excluded.updated_at
      `,
      args: [sessionId, encryptedRecord, new Date().toISOString()],
    });
  }

  async delete(sessionId: string): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: `DELETE FROM ${TABLE_NAME} WHERE session_id = ?`,
      args: [sessionId],
    });
  }

  private async ensureSchema(): Promise<void> {
    this.schemaReady ??= this.createSchema();
    await this.schemaReady;
  }

  private async createSchema(): Promise<void> {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        session_id TEXT PRIMARY KEY,
        encrypted_record TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
}

async function importEncryptionKey(value: string): Promise<CryptoKey> {
  const bytes = Buffer.from(value, 'base64');
  if (bytes.byteLength !== 32) {
    throw new Error('SILPO_OAUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptRecord(record: SilpoOAuthRecord, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(record));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return `v1.${Buffer.from(iv).toString('base64url')}.${Buffer.from(encrypted).toString('base64url')}`;
}

async function decryptRecord(value: string, key: CryptoKey): Promise<SilpoOAuthRecord> {
  const [version, ivValue, encryptedValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !encryptedValue) throw new Error('Unsupported Silpo OAuth record format');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(ivValue, 'base64url') },
    key,
    Buffer.from(encryptedValue, 'base64url'),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as SilpoOAuthRecord;
}
