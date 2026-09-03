import type { Client } from '@libsql/client';
import type { SilpoMcpTraceEntry, SilpoMcpTraceStore } from './silpo-mcp-trace';

export class TursoSilpoMcpTraceStore implements SilpoMcpTraceStore {
  private schemaReady?: Promise<void>;

  constructor(private readonly client: Client) {}

  async append(entry: SilpoMcpTraceEntry): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: `
        INSERT INTO silpo_mcp_trace
          (id, session_id, operation, status, duration_ms, request_keys, result_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        entry.id,
        entry.sessionId,
        entry.operation,
        entry.status,
        entry.durationMs,
        JSON.stringify(entry.requestKeys),
        entry.resultSummary,
        entry.createdAt,
      ],
    });
  }

  async list(sessionId: string, limit = 100): Promise<SilpoMcpTraceEntry[]> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: `
        SELECT id, session_id, operation, status, duration_ms, request_keys, result_summary, created_at
        FROM silpo_mcp_trace
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      args: [sessionId, limit],
    });
    return result.rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      operation: String(row.operation),
      status: row.status === 'failed' ? 'failed' : 'completed',
      durationMs: Number(row.duration_ms),
      requestKeys: JSON.parse(String(row.request_keys)) as string[],
      resultSummary: String(row.result_summary),
      createdAt: String(row.created_at),
    }));
  }

  async clear(sessionId: string): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: 'DELETE FROM silpo_mcp_trace WHERE session_id = ?',
      args: [sessionId],
    });
  }

  private async ensureSchema(): Promise<void> {
    this.schemaReady ??= this.client
      .execute(
        `
        CREATE TABLE IF NOT EXISTS silpo_mcp_trace (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          status TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          request_keys TEXT NOT NULL,
          result_summary TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `,
      )
      .then(() => undefined);
    await this.schemaReady;
  }
}
