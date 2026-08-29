import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import { SILPO_OAUTH_SESSION_COOKIE } from '../start/route';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL('/api/silpo/oauth/callback', request.url);
  const destination = new URL('/debug/mcp', request.url);
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  const state = requestUrl.searchParams.get('state');
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');

  if (oauthError) {
    destination.searchParams.set('oauth', 'error');
    destination.searchParams.set('detail', oauthError);
    return NextResponse.redirect(destination);
  }
  if (!sessionId || state !== sessionId || !code) {
    destination.searchParams.set('oauth', 'error');
    destination.searchParams.set('detail', 'invalid_callback');
    return NextResponse.redirect(destination);
  }

  try {
    const tools = await new SilpoOAuthCoordinator().finish(sessionId, redirectUrl, code);
    destination.searchParams.set('oauth', 'connected');
    destination.searchParams.set('tools', String(tools.length));
  } catch (error) {
    destination.searchParams.set('oauth', 'error');
    destination.searchParams.set('detail', error instanceof Error ? error.message.slice(0, 120) : 'oauth_failed');
  }
  return NextResponse.redirect(destination);
}
