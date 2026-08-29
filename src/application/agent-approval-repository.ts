import type { AgentApprovalStatus, AgentApprovalView } from "@/domain/agent";
import type { EventChangePreviewDto } from "./event-change-dto";

interface AgentApprovalRecord {
  id: string;
  type: "EVENT_CHANGE";
  status: AgentApprovalStatus;
  createdAt: string;
  preview: EventChangePreviewDto;
  error?: string;
}

export class MemoryAgentApprovalRepository {
  private readonly records = new Map<string, AgentApprovalRecord>();

  save(record: AgentApprovalRecord): AgentApprovalView {
    this.records.set(record.id, structuredClone(record));
    return toView(record);
  }

  get(id: string): AgentApprovalView | undefined {
    const record = this.records.get(id);
    return record ? toView(record) : undefined;
  }

  require(id: string): AgentApprovalView {
    const record = this.get(id);
    if (!record) throw new Error(`Unknown agent approval ${id}`);
    return record;
  }

  setStatus(id: string, status: AgentApprovalStatus, error?: string): AgentApprovalView {
    const record = this.records.get(id);
    if (!record) throw new Error(`Unknown agent approval ${id}`);
    const updated = { ...record, status, error };
    this.records.set(id, updated);
    return toView(updated);
  }
}

function toView(record: AgentApprovalRecord): AgentApprovalView {
  return structuredClone({
    id: record.id,
    type: record.type,
    status: record.status,
    createdAt: record.createdAt,
    preview: record.preview,
  });
}
