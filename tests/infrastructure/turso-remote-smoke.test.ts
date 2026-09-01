import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { TursoSilpoOAuthStore } from '@/infrastructure/turso-silpo-oauth-store';
import { TursoSilpoMcpTraceStore } from '@/infrastructure/turso-silpo-mcp-trace-store';

const configuration = {
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  encryptionKey: process.env.SILPO_OAUTH_ENCRYPTION_KEY,
};
const hasRemoteConfiguration = Object.values(configuration).every(Boolean);

const remoteDescribe = hasRemoteConfiguration ? describe : describe.skip;

remoteDescribe('remote Turso OAuth storage smoke test', () => {
  it('writes, reads, verifies ciphertext and removes an encrypted OAuth record', async () => {
    const client = createClient({
      url: configuration.url!,
      authToken: configuration.authToken!,
    });
    const store = new TursoSilpoOAuthStore(client, configuration.encryptionKey!);
    const traceStore = new TursoSilpoMcpTraceStore(client);
    const sessionId = `github-smoke-${crypto.randomUUID()}`;
    const marker = `oauth-secret-${crypto.randomUUID()}`;
    const record = {
      clientInformation: { client_id: 'github-actions-smoke-client' },
      codeVerifier: marker,
      tokens: {
        access_token: `${marker}-access`,
        refresh_token: `${marker}-refresh`,
        token_type: 'Bearer',
      },
    };

    try {
      await store.set(sessionId, record);
      expect(await store.get(sessionId)).toEqual(record);

      const persisted = await client.execute({
        sql: 'SELECT encrypted_record FROM silpo_oauth_sessions WHERE session_id = ?',
        args: [sessionId],
      });
      const encryptedRecord = String(persisted.rows[0]?.encrypted_record);
      expect(encryptedRecord).toMatch(/^v1\./);
      expect(encryptedRecord).not.toContain(marker);

      await traceStore.append({
        id: `trace-${crypto.randomUUID()}`,
        sessionId,
        operation: 'tools/list',
        status: 'completed',
        durationMs: 10,
        requestKeys: [],
        resultSummary: '40 tools',
        createdAt: new Date().toISOString(),
      });
      expect(await traceStore.list(sessionId)).toHaveLength(1);
    } finally {
      await traceStore.clear(sessionId);
      await store.delete(sessionId);
      expect(await store.get(sessionId)).toBeUndefined();
      client.close();
    }
  });
});
