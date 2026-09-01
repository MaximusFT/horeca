import { cookies } from 'next/headers';
import { getSilpoMcpTraceStore } from '@/infrastructure/create-silpo-mcp-trace-store';
import { SILPO_OAUTH_SESSION_COOKIE } from '../oauth/start/route';

export async function GET() {
  const sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
  if (!sessionId) return Response.json({ entries: [] });
  try {
    const entries = await getSilpoMcpTraceStore().list(sessionId, 100);
    return Response.json({ entries: entries.map(({ sessionId: _sessionId, ...entry }) => entry) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load Silpo MCP trace' },
      { status: 502 },
    );
  }
}
