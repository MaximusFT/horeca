import { createClient } from '@libsql/client';
import { MemoryPlanningRepository } from '@/application/memory-planning-repository';
import type { PlanningRepository, PlanningState } from '@/application/planning-repository';
import { readTursoOAuthConfiguration } from './create-silpo-oauth-store';
import { TursoPlanningRepository } from './turso-planning-repository';

export function createPlanningRepository(
  initialState: PlanningState,
  configuration = readTursoOAuthConfiguration(),
  environmentName = process.env.NODE_ENV,
): PlanningRepository {
  if (!configuration.url && !configuration.authToken) {
    if (environmentName === 'production') {
      throw new Error('Production planning state requires Turso storage');
    }
    return new MemoryPlanningRepository(initialState);
  }
  if (!configuration.url || !configuration.authToken) {
    throw new Error('Planning storage requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  }
  return new TursoPlanningRepository(
    createClient({ url: configuration.url, authToken: configuration.authToken }),
    initialState,
  );
}