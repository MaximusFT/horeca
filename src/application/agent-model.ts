import type { AgentApprovalView, AgentToolDefinition, AgentToolName } from '@/domain/agent';
import type { Locale } from '@/i18n/locale';
import type { AgentToolResult } from './agent-tools';

export interface AgentModelResult {
  message: string;
}

export type AgentToolInvoker = (name: AgentToolName, args: unknown) => Promise<AgentToolResult>;

export interface AgentModelGateway {
  readonly mode: 'openai' | 'local';
  readonly model: string;
  run(
    message: string,
    tools: AgentToolDefinition[],
    invoke: AgentToolInvoker,
    locale: Locale,
  ): Promise<AgentModelResult>;
}

export interface AgentRuntimeContext {
  approval?: AgentApprovalView;
}
