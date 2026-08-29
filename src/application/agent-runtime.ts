import { z } from "zod";
import type { AgentApprovalView, AgentToolName, AgentToolTrace, AgentTurn } from "@/domain/agent";
import type { AgentModelGateway } from "./agent-model";
import { agentToolDefinitions, type AgentToolResult, AgentToolService } from "./agent-tools";
import type { Locale } from "@/i18n/locale";
import { DEFAULT_LOCALE } from "@/i18n/locale";

export interface AgentApprovalApplyResult {
  approval: AgentApprovalView;
  message: string;
  output: unknown;
  trace: AgentToolTrace;
}

export class AgentRuntime {
  private readonly generateId: () => string;

  constructor(
    private readonly model: AgentModelGateway,
    private readonly tools: AgentToolService,
    generateId?: () => string,
  ) {
    this.generateId = generateId ?? (() => crypto.randomUUID());
  }

  async run(rawMessage: string, locale: Locale = DEFAULT_LOCALE): Promise<AgentTurn> {
    const message = messageSchema.parse(rawMessage);
    const trace: AgentToolTrace[] = [];
    let approval: AgentApprovalView | undefined;
    const invoke = async (name: AgentToolName, args: unknown): Promise<AgentToolResult> => {
      const definition = agentToolDefinitions.find((tool) => tool.name === name)!;
      const startedAt = performance.now();
      try {
        const result = await this.tools.execute(name, args, locale);
        if (result.approval) approval = result.approval;
        trace.push({
          id: this.generateId(),
          name,
          group: definition.group,
          status: "completed",
          summary: result.summary,
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        });
        return result;
      } catch (error) {
        trace.push({
          id: this.generateId(),
          name,
          group: definition.group,
          status: definition.group === "MUTATE" ? "blocked" : "failed",
          summary: error instanceof Error ? error.message : "Tool execution failed",
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        });
        throw error;
      }
    };
    const result = await this.model.run(message, agentToolDefinitions, invoke, locale);
    return {
      id: this.generateId(),
      mode: this.model.mode,
      model: this.model.model,
      message: result.message,
      trace,
      approval,
    };
  }

  async approveAndApply(approvalId: string, locale: Locale = DEFAULT_LOCALE): Promise<AgentApprovalApplyResult> {
    this.tools.approve(approvalId);
    const startedAt = performance.now();
    const result = await this.tools.execute("apply_event_change", { approvalId }, locale);
    const approval = this.tools.getApproval(approvalId);
    return {
      approval,
      output: result.output,
      message: result.summary,
      trace: {
        id: this.generateId(),
        name: "apply_event_change",
        group: "MUTATE",
        status: "completed",
        summary: result.summary,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  }

}

const messageSchema = z.string().trim().min(1).max(2_000);
