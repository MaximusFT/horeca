import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { createSilpoOAuthStore, readTursoOAuthConfiguration } from '@/infrastructure/create-silpo-oauth-store';
import { MemorySilpoOAuthStore } from '@/infrastructure/silpo-oauth-store';
import { TursoSilpoOAuthStore } from '@/infrastructure/turso-silpo-oauth-store';

const encryptionKey = Buffer.alloc(32, 7).toString('base64');

describe('Turso Silpo OAuth store', () => {
  it('round-trips OAuth state and encrypts tokens at rest', async () => {
    const client = createClient({ url: 'file::memory:' });
    const store = new TursoSilpoOAuthStore(client, encryptionKey);
    const record = {
      clientInformation: { client_id: 'registered-client' },
      codeVerifier: 'pkce-verifier',
      tokens: {
        access_token: 'secret-access-token',
        refresh_token: 'secret-refresh-token',
        token_type: 'Bearer',
      },
      authorizationUrl: 'https://mcp.silpo.ua/authorize',
    };

    await store.set('session-1', record);

    expect(await store.get('session-1')).toEqual(record);
    const persisted = await client.execute(
      "SELECT encrypted_record FROM silpo_oauth_sessions WHERE session_id = 'session-1'",
    );
    const encryptedRecord = String(persisted.rows[0]?.encrypted_record);
    expect(encryptedRecord).toMatch(/^v1\./);
    expect(encryptedRecord).not.toContain('secret-access-token');
    expect(encryptedRecord).not.toContain('secret-refresh-token');

    await store.delete('session-1');
    expect(await store.get('session-1')).toBeUndefined();
    client.close();
  });

  it('uses memory with no Turso env and rejects partial durable configuration', () => {
    expect(createSilpoOAuthStore({})).toBeInstanceOf(MemorySilpoOAuthStore);
    expect(() => createSilpoOAuthStore({ url: 'libsql://example.turso.io' })).toThrow(/requires/);
    expect(
      readTursoOAuthConfiguration({
        TURSO_DATABASE_URL: 'libsql://example.turso.io',
        TURSO_AUTH_TOKEN: 'token',
        SILPO_OAUTH_ENCRYPTION_KEY: encryptionKey,
      }),
    ).toEqual({
      url: 'libsql://example.turso.io',
      authToken: 'token',
      encryptionKey,
    });
  });

  it('rejects invalid encryption keys before persisting secrets', async () => {
    const client = createClient({ url: 'file::memory:' });
    const store = new TursoSilpoOAuthStore(client, Buffer.from('too-short').toString('base64'));

    await expect(store.set('session-1', { tokens: { access_token: 'secret', token_type: 'Bearer' } })).rejects.toThrow(
      /32-byte key/,
    );
    client.close();
  });
});
