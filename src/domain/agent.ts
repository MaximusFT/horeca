import type { EventChangePreviewDto } from '@/application/event-change-dto';
import type { SupplierOrderSession } from './supplier';

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

export interface AgentMcpTrace {
  id: string;
  operation: string;
  status: 'completed' | 'failed';
  durationMs: number;
  resultSummary: string;
  createdAt: string;
}

export interface AgentTurn {
  id: string;
  startedAt: string;
  mode: 'openai' | 'local';
  model: string;
  message: string;
  trace: AgentToolTrace[];
  mcpTrace?: AgentMcpTrace[];
  approval?: AgentApprovalView;
  supplierOrder?: SupplierOrderSession;
}
