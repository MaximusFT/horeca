import { describe, expect, it } from 'vitest';
import { createSilpoMcpTraceStore } from '@/infrastructure/create-silpo-mcp-trace-store';
import { MemorySilpoMcpTraceStore } from '@/infrastructure/silpo-mcp-trace';

describe('Silpo MCP trace store factory', () => {
  it('allows memory in tests and requires durable storage in production', () => {
    expect(createSilpoMcpTraceStore({}, 'test')).toBeInstanceOf(MemorySilpoMcpTraceStore);
    expect(() => createSilpoMcpTraceStore({}, 'production')).toThrow(/durable Turso storage/);
  });

  it('rejects partial Turso configuration', () => {
    expect(() => createSilpoMcpTraceStore({ url: 'libsql://database.example' }, 'test')).toThrow(
      /requires TURSO_DATABASE_URL/,
    );
  });
});