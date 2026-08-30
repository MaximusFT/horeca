import { cookies } from 'next/headers';
import { z } from 'zod';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import { isSilpoReadToolName } from '@/infrastructure/silpo-tool-policy';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../oauth/start/route';

const requestSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ error: 'Silpo OAuth session is missing' }, { status: 401 });

  try {
    const body = requestSchema.parse(await request.json());
    if (!isSilpoReadToolName(body.name)) {
      return Response.json({ error: `Tool ${body.name} is blocked in read-only spike mode` }, { status: 403 });
    }
    const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
    const result = await new SilpoOAuthCoordinator().callReadTool(sessionId, redirectUrl, body.name, body.arguments);
    return Response.json({ result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to call Silpo MCP tool' },
      { status: 502 },
    );
  }
}
