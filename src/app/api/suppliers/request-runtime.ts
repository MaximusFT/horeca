import { cookies } from 'next/headers';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { getSilpoSupplierRuntime } from '@/application/silpo-supplier-runtime';
import { readSupplierRuntimeConfiguration } from '@/infrastructure/supplier-runtime';
import { SILPO_OAUTH_SESSION_COOKIE } from '../silpo/oauth/start/route';

export async function getSupplierRequestRuntime(request: Request) {
  if (readSupplierRuntimeConfiguration().mode === 'mock') return getDemoPlanningRuntime();
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) throw new Error('Connect Silpo before preparing a live supplier order');
  return getSilpoSupplierRuntime(sessionId, new URL('/api/silpo/oauth/callback', request.url));
}