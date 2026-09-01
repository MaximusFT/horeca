export interface SilpoMcpTraceEntry {
  id: string;
  sessionId: string;
  operation: string;
  status: 'completed' | 'failed';
  durationMs: number;
  requestKeys: string[];
  resultSummary: string;
  createdAt: string;
}

export interface SilpoMcpTraceStore {
  append(entry: SilpoMcpTraceEntry): Promise<void>;
  list(sessionId: string, limit?: number): Promise<SilpoMcpTraceEntry[]>;
  clear(sessionId: string): Promise<void>;
}

declare global {
  var __mistoSilpoMcpTrace: SilpoMcpTraceEntry[] | undefined;
}

export class MemorySilpoMcpTraceStore implements SilpoMcpTraceStore {
  private get entries(): SilpoMcpTraceEntry[] {
    globalThis.__mistoSilpoMcpTrace ??= [];
    return globalThis.__mistoSilpoMcpTrace;
  }

  async append(entry: SilpoMcpTraceEntry): Promise<void> {
    this.entries.push(structuredClone(entry));
  }

  async list(sessionId: string, limit = 100): Promise<SilpoMcpTraceEntry[]> {
    return this.entries
      .filter((entry) => entry.sessionId === sessionId)
      .slice(-limit)
      .reverse()
      .map((entry) => structuredClone(entry));
  }

  async clear(sessionId: string): Promise<void> {
    globalThis.__mistoSilpoMcpTrace = this.entries.filter((entry) => entry.sessionId !== sessionId);
  }
}
