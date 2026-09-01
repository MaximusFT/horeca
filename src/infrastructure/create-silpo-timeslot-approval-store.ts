import { createClient } from '@libsql/client';
import { readTursoOAuthConfiguration } from './create-silpo-oauth-store';
import {
  MemorySilpoTimeslotApprovalStore,
  type SilpoTimeslotApprovalStore,
} from './silpo-timeslot-approval-store';
import { TursoSilpoTimeslotApprovalStore } from './turso-silpo-timeslot-approval-store';

declare global {
  var __mistoSilpoTimeslotApprovalStore: SilpoTimeslotApprovalStore | undefined;
}

export function createSilpoTimeslotApprovalStore(
  configuration = readTursoOAuthConfiguration(),
  environmentName = process.env.NODE_ENV,
): SilpoTimeslotApprovalStore {
  if (!configuration.url && !configuration.authToken && !configuration.encryptionKey) {
    if (environmentName === 'production') {
      throw new Error('Production timeslot approvals require encrypted Turso storage');
    }
    return new MemorySilpoTimeslotApprovalStore();
  }
  if (!configuration.url || !configuration.authToken || !configuration.encryptionKey) {
    throw new Error(
      'Turso timeslot approval storage requires TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and SILPO_OAUTH_ENCRYPTION_KEY',
    );
  }
  return new TursoSilpoTimeslotApprovalStore(
    createClient({ url: configuration.url, authToken: configuration.authToken }),
    configuration.encryptionKey,
  );
}

export function getSilpoTimeslotApprovalStore(): SilpoTimeslotApprovalStore {
  globalThis.__mistoSilpoTimeslotApprovalStore ??= createSilpoTimeslotApprovalStore();
  return globalThis.__mistoSilpoTimeslotApprovalStore;
}