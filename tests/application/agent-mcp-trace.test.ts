import { describe, expect, it } from 'vitest';
import { projectAgentMcpTrace } from '@/application/agent-mcp-trace';
import type { SilpoMcpTraceEntry } from '@/infrastructure/silpo-mcp-trace';

describe('agent MCP trace projection', () => {
  it('keeps only this run in chronological order without session or request data', () => {
    const entries = [
      entry('newer', '2026-09-03T10:00:03.000Z', ['privateArgument']),
      entry('older', '2026-09-03T09:59:59.000Z', ['otherPrivateArgument']),
      entry('first', '2026-09-03T10:00:01.000Z', ['shoppingCartId']),
    ];

    expect(projectAgentMcpTrace(entries, '2026-09-03T10:00:00.000Z')).toEqual([
      {
        id: 'first',
        operation: 'silpo_get_my_shopping_cart',
        status: 'completed',
        durationMs: 10,
        resultSummary: 'MCP result',
        createdAt: '2026-09-03T10:00:01.000Z',
      },
      {
        id: 'newer',
        operation: 'silpo_get_my_shopping_cart',
        status: 'completed',
        durationMs: 10,
        resultSummary: 'MCP result',
        createdAt: '2026-09-03T10:00:03.000Z',
      },
    ]);
  });
});

function entry(id: string, createdAt: string, requestKeys: string[]): SilpoMcpTraceEntry {
  return {
    id,
    sessionId: 'private-session',
    operation: 'silpo_get_my_shopping_cart',
    status: 'completed',
    durationMs: 10,
    requestKeys,
    resultSummary: 'MCP result',
    createdAt,
  };
}