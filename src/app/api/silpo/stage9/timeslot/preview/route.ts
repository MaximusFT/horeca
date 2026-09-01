import { cookies } from 'next/headers';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import { getSilpoTimeslotApprovalStore } from '@/infrastructure/create-silpo-timeslot-approval-store';
import { SilpoStage9PayloadError } from '@/infrastructure/silpo-stage9-workflow';
import { SilpoStage9TimeslotService } from '@/infrastructure/silpo-stage9-timeslot-service';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../../oauth/start/route';

export async function POST(request: Request) {
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ error: 'Silpo OAuth session is missing' }, { status: 401 });

  const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
  const coordinator = new SilpoOAuthCoordinator();
  const service = new SilpoStage9TimeslotService(getSilpoTimeslotApprovalStore());
  try {
    const preview = await service.prepare(sessionId, (name, args) =>
      coordinator.callReadTool(sessionId, redirectUrl, name, args),
    );
    return Response.json({ preview });
  } catch (error) {
    if (error instanceof SilpoStage9PayloadError) {
      return Response.json(
        {
          error: 'Live MCP response did not match the documented response paths',
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
      { error: error instanceof Error ? error.message : 'Unable to prepare timeslot update' },
      { status: 502 },
    );
  }
}