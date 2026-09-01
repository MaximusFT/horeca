import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { MemorySilpoMcpTraceStore, type SilpoMcpTraceEntry } from '@/infrastructure/silpo-mcp-trace';
import { TursoSilpoMcpTraceStore } from '@/infrastructure/turso-silpo-mcp-trace-store';

const entry: SilpoMcpTraceEntry = {
  id: 'trace-1',
  sessionId: 'session-1',
  operation: 'silpo_get_shopping_cart_by_id',
  status: 'completed',
  durationMs: 42,
  requestKeys: ['shoppingCartId'],
  resultSummary: 'MCP result · 1 content items',
  createdAt: '2026-09-01T14:00:00.000Z',
};

describe('Silpo MCP trace stores', () => {
  const memory = new MemorySilpoMcpTraceStore();

  afterEach(async () => {
    await memory.clear('session-1');
    await memory.clear('session-2');
  });

  it('isolates memory trace by OAuth session and clears it', async () => {
    await memory.append(entry);
    await memory.append({ ...entry, id: 'trace-2', sessionId: 'session-2' });

    expect(await memory.list('session-1')).toEqual([entry]);
    await memory.clear('session-1');
    expect(await memory.list('session-1')).toEqual([]);
    expect(await memory.list('session-2')).toHaveLength(1);
  });

  it('persists only sanitized trace metadata in libSQL', async () => {
    const client = createClient({ url: 'file::memory:' });
    const store = new TursoSilpoMcpTraceStore(client);
    await store.append(entry);

    expect(await store.list('session-1')).toEqual([entry]);
    const raw = await client.execute('SELECT * FROM silpo_mcp_trace');
    expect(Object.keys(raw.rows[0] ?? {}).sort()).toEqual([
      'created_at',
      'duration_ms',
      'id',
      'operation',
      'request_keys',
      'result_summary',
      'session_id',
      'status',
    ]);
    expect(JSON.stringify(raw.rows[0])).not.toContain('cart contents');

    await store.clear('session-1');
    expect(await store.list('session-1')).toEqual([]);
    client.close();
  });
});
