import { createClient } from '@libsql/client';
import { readTursoOAuthConfiguration } from './create-silpo-oauth-store';
import {
  MemorySilpoProductApprovalStore,
  type SilpoProductApprovalStore,
} from './silpo-product-approval-store';
import { TursoSilpoProductApprovalStore } from './turso-silpo-product-approval-store';

declare global {
  var __mistoSilpoProductApprovalStore: SilpoProductApprovalStore | undefined;
}

export function createSilpoProductApprovalStore(
  configuration = readTursoOAuthConfiguration(),
  environmentName = process.env.NODE_ENV,
): SilpoProductApprovalStore {
  if (!configuration.url && !configuration.authToken && !configuration.encryptionKey) {
    if (environmentName === 'production') {
      throw new Error('Production product approvals require encrypted Turso storage');
    }
    return new MemorySilpoProductApprovalStore();
  }
  if (!configuration.url || !configuration.authToken || !configuration.encryptionKey) {
    throw new Error(
      'Turso product approval storage requires TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and SILPO_OAUTH_ENCRYPTION_KEY',
    );
  }
  return new TursoSilpoProductApprovalStore(
    createClient({ url: configuration.url, authToken: configuration.authToken }),
    configuration.encryptionKey,
  );
}

export function getSilpoProductApprovalStore(): SilpoProductApprovalStore {
  globalThis.__mistoSilpoProductApprovalStore ??= createSilpoProductApprovalStore();
  return globalThis.__mistoSilpoProductApprovalStore;
}