import type { SilpoProductCandidate } from './silpo-stage9-workflow';

export interface SilpoProductApproval {
  id: string;
  createdAt: string;
  expiresAt: string;
  shoppingCartId: string;
  candidate: SilpoProductCandidate;
}

export interface SilpoProductApprovalStore {
  save(sessionId: string, approval: SilpoProductApproval): Promise<void>;
  claim(sessionId: string, approvalId: string, now: string): Promise<SilpoProductApproval | undefined>;
  finish(sessionId: string, approvalId: string, status: 'applied' | 'failed'): Promise<void>;
}

interface MemoryProductApprovalRecord {
  sessionId: string;
  status: 'pending' | 'applying' | 'applied' | 'failed';
  approval: SilpoProductApproval;
}

declare global {
  var __mistoSilpoProductApprovals: Map<string, MemoryProductApprovalRecord> | undefined;
}

export class MemorySilpoProductApprovalStore implements SilpoProductApprovalStore {
  private get records(): Map<string, MemoryProductApprovalRecord> {
    globalThis.__mistoSilpoProductApprovals ??= new Map();
    return globalThis.__mistoSilpoProductApprovals;
  }

  async save(sessionId: string, approval: SilpoProductApproval): Promise<void> {
    this.records.set(approval.id, { sessionId, status: 'pending', approval: structuredClone(approval) });
  }

  async claim(sessionId: string, approvalId: string, now: string): Promise<SilpoProductApproval | undefined> {
    const record = this.records.get(approvalId);
    if (
      !record ||
      record.sessionId !== sessionId ||
      record.status !== 'pending' ||
      new Date(record.approval.expiresAt).getTime() < new Date(now).getTime()
    ) {
      return undefined;
    }
    record.status = 'applying';
    return structuredClone(record.approval);
  }

  async finish(sessionId: string, approvalId: string, status: 'applied' | 'failed'): Promise<void> {
    const record = this.records.get(approvalId);
    if (record?.sessionId === sessionId && record.status === 'applying') record.status = status;
  }
}