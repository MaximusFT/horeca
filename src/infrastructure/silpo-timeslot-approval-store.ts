import type { SilpoCartUpdateSource, SilpoTimeslot } from './silpo-stage9-workflow';

export interface SilpoTimeslotApproval {
  id: string;
  createdAt: string;
  expiresAt: string;
  source: SilpoCartUpdateSource;
  slots: SilpoTimeslot[];
}

export interface SilpoTimeslotApprovalStore {
  save(sessionId: string, approval: SilpoTimeslotApproval): Promise<void>;
  claim(sessionId: string, approvalId: string, now: string): Promise<SilpoTimeslotApproval | undefined>;
  finish(sessionId: string, approvalId: string, status: 'applied' | 'failed'): Promise<void>;
}

interface MemoryApprovalRecord {
  sessionId: string;
  status: 'pending' | 'applying' | 'applied' | 'failed';
  approval: SilpoTimeslotApproval;
}

declare global {
  var __mistoSilpoTimeslotApprovals: Map<string, MemoryApprovalRecord> | undefined;
}

export class MemorySilpoTimeslotApprovalStore implements SilpoTimeslotApprovalStore {
  private get records(): Map<string, MemoryApprovalRecord> {
    globalThis.__mistoSilpoTimeslotApprovals ??= new Map();
    return globalThis.__mistoSilpoTimeslotApprovals;
  }

  async save(sessionId: string, approval: SilpoTimeslotApproval): Promise<void> {
    this.records.set(approval.id, {
      sessionId,
      status: 'pending',
      approval: structuredClone(approval),
    });
  }

  async claim(sessionId: string, approvalId: string, now: string): Promise<SilpoTimeslotApproval | undefined> {
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
