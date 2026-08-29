import { cookies } from 'next/headers';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';

export const SILPO_OAUTH_SESSION_COOKIE = 'silpo_oauth_session';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SILPO_OAUTH_SESSION_COOKIE)?.value ?? crypto.randomUUID();
    const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
    const result = await new SilpoOAuthCoordinator().start(sessionId, redirectUrl);
    const response = Response.json(result);
    response.headers.append(
      'set-cookie',
      `${SILPO_OAUTH_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`,
    );
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to start Silpo OAuth' },
      { status: 502 },
    );
  }
}
