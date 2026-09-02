import { createClient } from '@libsql/client';
import type { SupplierOrderSessionStore } from '@/application/supplier-order-session-store';
import { MemorySupplierOrderSessionStore } from '@/application/supplier-order-session-store';
import { readTursoOAuthConfiguration } from './create-silpo-oauth-store';
import { TursoSupplierOrderSessionStore } from './turso-supplier-order-session-store';

declare global {
  var __mistoSupplierOrderSessionStore: SupplierOrderSessionStore | undefined;
}

export function createSupplierOrderSessionStore(
  configuration = readTursoOAuthConfiguration(),
  environmentName = process.env.NODE_ENV,
): SupplierOrderSessionStore {
  if (!configuration.url && !configuration.authToken && !configuration.encryptionKey) {
    if (environmentName === 'production') {
      throw new Error('Production supplier sessions require encrypted Turso storage');
    }
    return new MemorySupplierOrderSessionStore();
  }
  if (!configuration.url || !configuration.authToken || !configuration.encryptionKey) {
    throw new Error(
      'Turso supplier session storage requires TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and SILPO_OAUTH_ENCRYPTION_KEY',
    );
  }
  return new TursoSupplierOrderSessionStore(
    createClient({ url: configuration.url, authToken: configuration.authToken }),
    configuration.encryptionKey,
  );
}

export function getSupplierOrderSessionStore(): SupplierOrderSessionStore {
  globalThis.__mistoSupplierOrderSessionStore ??= createSupplierOrderSessionStore();
  return globalThis.__mistoSupplierOrderSessionStore;
}