import type { SupplierOrderSession } from '@/domain/supplier';

export interface SupplierOrderSessionStore {
  get(scopeId: string, sessionId: string): Promise<SupplierOrderSession | undefined>;
  set(scopeId: string, session: SupplierOrderSession): Promise<void>;
  claimCartApply(scopeId: string, sessionId: string): Promise<SupplierOrderSession | undefined>;
  clearScope(scopeId: string): Promise<void>;
}

export class MemorySupplierOrderSessionStore implements SupplierOrderSessionStore {
  private readonly records = new Map<string, SupplierOrderSession>();

  async get(scopeId: string, sessionId: string): Promise<SupplierOrderSession | undefined> {
    const session = this.records.get(key(scopeId, sessionId));
    return session ? structuredClone(session) : undefined;
  }

  async set(scopeId: string, session: SupplierOrderSession): Promise<void> {
    this.records.set(key(scopeId, session.id), structuredClone(session));
  }

  async claimCartApply(scopeId: string, sessionId: string): Promise<SupplierOrderSession | undefined> {
    const recordKey = key(scopeId, sessionId);
    const session = this.records.get(recordKey);
    if (session?.status !== 'cart_preview') return undefined;
    const claimed: SupplierOrderSession = { ...structuredClone(session), status: 'cart_applying' };
    this.records.set(recordKey, claimed);
    return structuredClone(claimed);
  }

  async clearScope(scopeId: string): Promise<void> {
    for (const recordKey of this.records.keys()) {
      if (recordKey.startsWith(`${scopeId}:`)) this.records.delete(recordKey);
    }
  }
}

function key(scopeId: string, sessionId: string): string {
  return `${scopeId}:${sessionId}`;
}