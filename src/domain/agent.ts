import type { EventChangePreviewDto } from '@/application/event-change-dto';
import type { SupplierOrderSession } from '@/application/mock-supplier-order-service';

export type AgentToolName =
  | 'get_event'
  | 'get_procurement_plan'
  | 'explain_requirement'
  | 'preview_event_change'
  | 'apply_event_change'
  | 'prepare_supplier_order';

export type AgentToolGroup = 'READ' | 'CALCULATE' | 'PREVIEW' | 'MUTATE' | 'SUPPLIER';

export interface AgentToolDefinition {
  name: AgentToolName;
  description: string;
  group: AgentToolGroup;
  parameters: Record<string, unknown>;
}

export type AgentApprovalStatus = 'pending' | 'approved' | 'applied' | 'failed';

export interface AgentApprovalView {
  id: string;
  type: 'EVENT_CHANGE';
  status: AgentApprovalStatus;
  createdAt: string;
  preview: EventChangePreviewDto;
}

export interface AgentToolTrace {
  id: string;
  name: AgentToolName;
  group: AgentToolGroup;
  status: 'completed' | 'blocked' | 'failed';
  summary: string;
  durationMs: number;
}

export interface AgentTurn {
  id: string;
  mode: 'openai' | 'local';
  model: string;
  message: string;
  trace: AgentToolTrace[];
  approval?: AgentApprovalView;
  supplierOrder?: SupplierOrderSession;
}
