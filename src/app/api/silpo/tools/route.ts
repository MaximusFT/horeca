import { cookies } from 'next/headers';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import { SILPO_OAUTH_SESSION_COOKIE } from '../oauth/start/route';

export async function GET(request: Request) {
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ error: 'Silpo OAuth session is missing' }, { status: 401 });

  try {
    const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
    const tools = await new SilpoOAuthCoordinator().listTools(sessionId, redirectUrl);
    if (!tools) return Response.json({ error: 'Silpo OAuth authorization is required' }, { status: 401 });
    return Response.json({ tools });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to list Silpo MCP tools' },
      { status: 502 },
    );
  }
}
