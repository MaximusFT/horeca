import { createClient } from '@libsql/client';
import { readTursoOAuthConfiguration } from './create-silpo-oauth-store';
import { MemorySilpoMcpTraceStore, type SilpoMcpTraceStore } from './silpo-mcp-trace';
import { TursoSilpoMcpTraceStore } from './turso-silpo-mcp-trace-store';

declare global {
  var __mistoSilpoMcpTraceStore: SilpoMcpTraceStore | undefined;
}

export function createSilpoMcpTraceStore(): SilpoMcpTraceStore {
  const configuration = readTursoOAuthConfiguration();
  if (!configuration.url && !configuration.authToken && !configuration.encryptionKey) {
    return new MemorySilpoMcpTraceStore();
  }
  if (!configuration.url || !configuration.authToken || !configuration.encryptionKey) {
    throw new Error(
      'Turso MCP trace storage requires TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and SILPO_OAUTH_ENCRYPTION_KEY',
    );
  }
  return new TursoSilpoMcpTraceStore(
    createClient({ url: configuration.url, authToken: configuration.authToken }),
  );
}

export function getSilpoMcpTraceStore(): SilpoMcpTraceStore {
  globalThis.__mistoSilpoMcpTraceStore ??= createSilpoMcpTraceStore();
  return globalThis.__mistoSilpoMcpTraceStore;
}
