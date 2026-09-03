import { cookies } from 'next/headers';
import { z } from 'zod';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { getSilpoSupplierRuntime } from '@/application/silpo-supplier-runtime';
import { getServerLocale } from '@/i18n';
import { readSupplierRuntimeConfiguration } from '@/infrastructure/supplier-runtime';
import { SILPO_OAUTH_SESSION_COOKIE } from '../../silpo/oauth/start/route';
import { getSilpoMcpTraceStore } from '@/infrastructure/create-silpo-mcp-trace-store';
import { projectAgentMcpTrace } from '@/application/agent-mcp-trace';
import type { AgentMcpTrace } from '@/domain/agent';

const requestSchema = z.object({ message: z.string().trim().min(1).max(2_000) });

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const locale = await getServerLocale();
    let agent = getDemoPlanningRuntime().agent;
    let sessionId: string | undefined;
    if (readSupplierRuntimeConfiguration().mode === 'silpo') {
      sessionId = (await cookies()).get(SILPO_OAUTH_SESSION_COOKIE)?.value;
      if (sessionId) {
        agent = getSilpoSupplierRuntime(sessionId, new URL('/api/silpo/oauth/callback', request.url)).agent;
      }
    }
    const turn = await agent.run(body.message, locale);
    if (!sessionId) return Response.json(turn);
    let mcpTrace: AgentMcpTrace[] = [];
    try {
      mcpTrace = projectAgentMcpTrace(await getSilpoMcpTraceStore().list(sessionId, 100), turn.startedAt);
    } catch {
      // Observability must never hide a successful agent result.
    }
    return Response.json({ ...turn, mcpTrace });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to run procurement agent' },
      { status: 400 },
    );
  }
}
