import { cookies } from 'next/headers';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import { runSilpoReplacementProbe } from '@/infrastructure/silpo-stage10-replacement-probe';
import { SilpoStage9PayloadError } from '@/infrastructure/silpo-stage9-workflow';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../../oauth/start/route';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Replacement probe requires a same-origin request' }, { status: 403 });
  }
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ error: 'Silpo OAuth session is missing' }, { status: 401 });

  const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
  const coordinator = new SilpoOAuthCoordinator();
  try {
    const report = await runSilpoReplacementProbe((name, args) =>
      coordinator.callReadTool(sessionId, redirectUrl, name, args),
    );
    return Response.json({ report });
  } catch (error) {
    if (error instanceof SilpoStage9PayloadError) {
      return Response.json(
        {
          error: 'Live MCP response did not match documented replacement probe paths',
          diagnostic: {
            phase: error.phase,
            expectedPaths: error.expectedPaths,
            observedKeys: error.observedKeys,
            observedShape: error.observedShape,
          },
        },
        { status: 422 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to run replacement probe' },
      { status: 502 },
    );
  }
}