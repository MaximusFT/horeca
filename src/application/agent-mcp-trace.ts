import type { AgentMcpTrace } from '@/domain/agent';
import type { SilpoMcpTraceEntry } from '@/infrastructure/silpo-mcp-trace';

export function projectAgentMcpTrace(entries: SilpoMcpTraceEntry[], startedAt: string): AgentMcpTrace[] {
  return entries
    .filter((entry) => entry.createdAt >= startedAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(({ sessionId: _sessionId, requestKeys: _requestKeys, ...entry }) => entry);
}