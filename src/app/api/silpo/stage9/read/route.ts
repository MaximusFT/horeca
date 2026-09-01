import { cookies } from 'next/headers';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import {
  runSilpoStage9ReadSequence,
  SilpoStage9PayloadError,
} from '@/infrastructure/silpo-stage9-workflow';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../oauth/start/route';

export async function POST(request: Request) {
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ error: 'Silpo OAuth session is missing' }, { status: 401 });

  const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
  const coordinator = new SilpoOAuthCoordinator();
  try {
    const report = await runSilpoStage9ReadSequence((name, args) =>
      coordinator.callReadTool(sessionId, redirectUrl, name, args),
    );
    return Response.json({ report });
  } catch (error) {
    if (error instanceof SilpoStage9PayloadError) {
      return Response.json(
        {
          error: 'Live MCP response did not match the documented response paths',
          diagnostic: {
            phase: error.phase,
            expectedPaths: error.expectedPaths,
            observedKeys: error.observedKeys,
          },
        },
        { status: 422 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to run Stage 9 read sequence' },
      { status: 502 },
    );
  }
}
