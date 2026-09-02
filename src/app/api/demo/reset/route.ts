import { cookies } from 'next/headers';
import { resetDemoPlanningRuntime } from '@/application/demo-runtime';
import { getSupplierOrderSessionStore } from '@/infrastructure/create-supplier-order-session-store';
import { readSupplierRuntimeConfiguration } from '@/infrastructure/supplier-runtime';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../silpo/oauth/start/route';

export async function POST() {
  try {
    if (readSupplierRuntimeConfiguration().mode === 'silpo') {
      const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
      if (sessionId) await getSupplierOrderSessionStore().clearScope(sessionId);
    }
    resetDemoPlanningRuntime();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to reset the demo' },
      { status: 500 },
    );
  }
}
