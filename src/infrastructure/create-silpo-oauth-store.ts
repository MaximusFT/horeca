import { createClient } from '@libsql/client';
import { MemorySilpoOAuthStore, type SilpoOAuthStore } from './silpo-oauth-store';
import { TursoSilpoOAuthStore } from './turso-silpo-oauth-store';

export interface TursoOAuthConfiguration {
  url?: string;
  authToken?: string;
  encryptionKey?: string;
}

declare global {
  var __mistoSilpoOAuthStore: SilpoOAuthStore | undefined;
}

export function readTursoOAuthConfiguration(
  environment: Record<string, string | undefined> = process.env,
): TursoOAuthConfiguration {
  return {
    url: environment.TURSO_DATABASE_URL,
    authToken: environment.TURSO_AUTH_TOKEN,
    encryptionKey: environment.SILPO_OAUTH_ENCRYPTION_KEY,
  };
}

export function createSilpoOAuthStore(configuration = readTursoOAuthConfiguration()): SilpoOAuthStore {
  const configuredValues = [configuration.url, configuration.authToken, configuration.encryptionKey].filter(Boolean);
  if (configuredValues.length === 0) return new MemorySilpoOAuthStore();
  if (!configuration.url || !configuration.authToken || !configuration.encryptionKey) {
    throw new Error('Turso OAuth storage requires TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and SILPO_OAUTH_ENCRYPTION_KEY');
  }
  return new TursoSilpoOAuthStore(
    createClient({ url: configuration.url, authToken: configuration.authToken }),
    configuration.encryptionKey,
  );
}

export function getSilpoOAuthStore(): SilpoOAuthStore {
  globalThis.__mistoSilpoOAuthStore ??= createSilpoOAuthStore();
  return globalThis.__mistoSilpoOAuthStore;
}
