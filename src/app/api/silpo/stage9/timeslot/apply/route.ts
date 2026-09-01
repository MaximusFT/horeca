import { cookies } from 'next/headers';
import { z } from 'zod';
import { getSilpoTimeslotApprovalStore } from '@/infrastructure/create-silpo-timeslot-approval-store';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import {
  SilpoStage9TimeslotService,
  SilpoTimeslotApprovalError,
} from '@/infrastructure/silpo-stage9-timeslot-service';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../../oauth/start/route';

const requestSchema = z.object({
  approvalId: z.string().min(1),
  timeslot: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Timeslot approval requires a same-origin request' }, { status: 403 });
  }
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ error: 'Silpo OAuth session is missing' }, { status: 401 });

  const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
  const coordinator = new SilpoOAuthCoordinator();
  const service = new SilpoStage9TimeslotService(getSilpoTimeslotApprovalStore());
  try {
    const body = requestSchema.parse(await request.json());
    const result = await service.apply(
      sessionId,
      body.approvalId,
      body.timeslot,
      (name, args) => coordinator.callReadTool(sessionId, redirectUrl, name, args),
      (_name, args) => coordinator.callApprovedTimeslotUpdate(sessionId, redirectUrl, args),
    );
    return Response.json({ result });
  } catch (error) {
    if (error instanceof SilpoTimeslotApprovalError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid timeslot approval request' }, { status: 400 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to apply timeslot update' },
      { status: 502 },
    );
  }
}