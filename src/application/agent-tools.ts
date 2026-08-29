import { z } from "zod";
import type { AgentApprovalView, AgentToolDefinition, AgentToolName } from "@/domain/agent";
import type { Ingredient } from "@/domain/ingredient";
import { explainProcurementLine } from "./explain-procurement";
import { toEventChangePreviewDto } from "./event-change-dto";
import type { ProcurementPlanningService } from "./procurement-planning-service";
import type { PlanningRepository } from "./planning-repository";
import { MemoryAgentApprovalRepository } from "./agent-approval-repository";
import type { Clock } from "@/lib/clock";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/locale";
import { localizedEventName, localizedIngredientName } from "@/i18n/demo-names";

export interface AgentToolResult {
  output: unknown;
  summary: string;
  approval?: AgentApprovalView;
}

interface Dependencies {
  repository: PlanningRepository;
  planningService: ProcurementPlanningService;
  approvals: MemoryAgentApprovalRepository;
  ingredients: Ingredient[];
  clock: Clock;
  generateId?: () => string;
}

const nullableString = { type: ["string", "null"] };

export const agentToolDefinitions: AgentToolDefinition[] = [
  {
    name: "get_event",
    group: "READ",
    description: "Read one event by its stable event ID. Never infer or calculate event facts.",
    parameters: objectSchema({ eventId: { type: "string" } }, ["eventId"]),
  },
  {
    name: "get_procurement_plan",
    group: "READ",
    description: "Read the active deterministic procurement plan, optionally focusing on one batch.",
    parameters: objectSchema({ batchId: nullableString }, ["batchId"]),
  },
  {
    name: "explain_requirement",
    group: "CALCULATE",
    description: "Return deterministic provenance and quantities for an ingredient requirement. Use this instead of doing arithmetic.",
    parameters: objectSchema({ ingredientId: { type: "string" }, batchId: nullableString }, ["ingredientId", "batchId"]),
  },
  {
    name: "preview_event_change",
    group: "PREVIEW",
    description: "Create a backend-stored event-change preview. This does not mutate the event or active plan.",
    parameters: objectSchema({ eventId: { type: "string" }, guestCount: { type: "integer", minimum: 0 } }, ["eventId", "guestCount"]),
  },
  {
    name: "apply_event_change",
    group: "MUTATE",
    description: "Apply an event-change preview only after its backend approval record was explicitly approved by a human.",
    parameters: objectSchema({ approvalId: { type: "string" } }, ["approvalId"]),
  },
];

export class AgentToolService {
  private readonly ingredientById: Map<string, Ingredient>;
  private readonly generateId: () => string;

  constructor(private readonly dependencies: Dependencies) {
    this.ingredientById = new Map(dependencies.ingredients.map((ingredient) => [ingredient.id, ingredient]));
    this.generateId = dependencies.generateId ?? (() => crypto.randomUUID());
  }

  async execute(name: AgentToolName, rawArguments: unknown, locale: Locale = "uk"): Promise<AgentToolResult> {
    switch (name) {
      case "get_event": return this.getEvent(getEventSchema.parse(rawArguments), locale);
      case "get_procurement_plan": return this.getProcurementPlan(getPlanSchema.parse(rawArguments), locale);
      case "explain_requirement": return this.explainRequirement(explainSchema.parse(rawArguments), locale);
      case "preview_event_change": return this.previewEventChange(previewSchema.parse(rawArguments), locale);
      case "apply_event_change": return this.applyEventChange(applySchema.parse(rawArguments), locale);
    }
  }

  approve(approvalId: string): AgentApprovalView {
    const approval = this.dependencies.approvals.require(approvalId);
    if (approval.status !== "pending") throw new Error(`Approval ${approvalId} is already ${approval.status}`);
    return this.dependencies.approvals.setStatus(approvalId, "approved");
  }

  getApproval(approvalId: string): AgentApprovalView {
    return this.dependencies.approvals.require(approvalId);
  }

  private getEvent({ eventId }: z.infer<typeof getEventSchema>, locale: Locale): AgentToolResult {
    const event = this.dependencies.repository.getState().events.find((item) => item.id === eventId);
    if (!event) throw new Error(`Unknown event ${eventId}`);
    const dictionary = getDictionary(locale);
    const eventName = localizedEventName(event.id, event.name, locale);
    return { output: event, summary: dictionary.agentTools.readEvent(eventName, event.guestCount) };
  }

  private getProcurementPlan({ batchId }: z.infer<typeof getPlanSchema>, locale: Locale): AgentToolResult {
    const plan = this.dependencies.repository.getState().activePlan;
    const ingredientNames = this.ingredientById;
    const dictionary = getDictionary(locale);
    if (batchId) {
      const batch = plan.batches.find((item) => item.id === batchId);
      if (!batch) throw new Error(`Unknown procurement batch ${batchId}`);
      return {
        output: {
          planVersion: plan.version,
          batch: {
            id: batch.id,
            deliveryOn: batch.deliveryOn,
            deliveryAt: batch.deliveryAt,
            lines: batch.lines.map((line) => {
              const ingredient = ingredientNames.get(line.ingredientId);
              return {
                lineId: line.id,
                ingredientId: line.ingredientId,
                ingredientName: ingredient ? localizedIngredientName(ingredient.id, ingredient.name, locale) : undefined,
                quantity: line.quantity,
                unit: line.unit,
              };
            }),
          },
        },
        summary: dictionary.agentTools.readBatch(batch.deliveryOn, batch.lines.length),
      };
    }
    return {
      output: {
        id: plan.id,
        version: plan.version,
        horizon: plan.horizon,
        batches: plan.batches.map((batch) => ({ id: batch.id, deliveryOn: batch.deliveryOn, lineCount: batch.lines.length })),
      },
      summary: dictionary.agentTools.readPlan(plan.version, plan.batches.length),
    };
  }

  private explainRequirement({ ingredientId, batchId }: z.infer<typeof explainSchema>, locale: Locale): AgentToolResult {
    const plan = this.dependencies.repository.getState().activePlan;
    const ingredient = this.ingredientById.get(ingredientId);
    if (!ingredient) throw new Error(`Unknown ingredient ${ingredientId}`);
    const candidates = batchId
      ? plan.batches.find((batch) => batch.id === batchId)?.lines.filter((line) => line.ingredientId === ingredientId) ?? []
      : plan.lines.filter((line) => line.ingredientId === ingredientId);
    const line = [...candidates].sort((a, b) => b.quantity - a.quantity || a.deliveryAt.localeCompare(b.deliveryAt))[0];
    if (!line) throw new Error(`No planned requirement for ${ingredient.name}${batchId ? ` in ${batchId}` : ""}`);
    const explanation = explainProcurementLine(plan, line, ingredient, locale);
    const batch = plan.batches.find((item) => item.lines.some((candidate) => candidate.id === line.id))!;
    const ingredientName = localizedIngredientName(ingredient.id, ingredient.name, locale);
    const dictionary = getDictionary(locale);
    return {
      output: { planVersion: plan.version, batchId: batch.id, ingredientName, explanation },
      summary: dictionary.agentTools.explained(ingredientName, batch.id, explanation.demandSources.length),
    };
  }

  private previewEventChange({ eventId, guestCount }: z.infer<typeof previewSchema>, locale: Locale): AgentToolResult {
    const preview = this.dependencies.planningService.previewEventChange(eventId, guestCount);
    const dto = toEventChangePreviewDto(preview);
    const approval = this.dependencies.approvals.save({
      id: this.generateId(),
      type: "EVENT_CHANGE",
      status: "pending",
      createdAt: this.dependencies.clock.now().toISOString(),
      preview: dto,
    });
    const dictionary = getDictionary(locale);
    return {
      output: {
        approvalId: approval.id,
        eventId,
        beforeGuestCount: dto.beforeGuestCount,
        afterGuestCount: dto.afterGuestCount,
        candidatePlanVersion: dto.candidatePlanVersion,
        changedIngredientCount: dto.diff.ingredientDeltas.length,
        changedBatchCount: new Set(dto.diff.lines.map((line) => line.deliveryOn)).size,
        requiresHumanApproval: true,
      },
      summary: dictionary.agentTools.previewed(dto.beforeGuestCount, dto.afterGuestCount),
      approval,
    };
  }

  private applyEventChange({ approvalId }: z.infer<typeof applySchema>, locale: Locale): AgentToolResult {
    const approval = this.dependencies.approvals.require(approvalId);
    if (approval.status !== "approved") {
      throw new Error(`Mutation blocked: approval ${approvalId} is ${approval.status}`);
    }
    try {
      const result = this.dependencies.planningService.applyEventChange(approval.preview.id);
      this.dependencies.approvals.setStatus(approvalId, "applied");
      const dictionary = getDictionary(locale);
      const eventName = localizedEventName(result.event.id, result.event.name, locale);
      return {
        output: { event: result.event, planVersion: result.plan.version, change: result.change },
        summary: dictionary.agentTools.applied(eventName, result.event.guestCount, result.plan.version),
      };
    } catch (error) {
      this.dependencies.approvals.setStatus(approvalId, "failed", error instanceof Error ? error.message : "Apply failed");
      throw error;
    }
  }
}

const getEventSchema = z.object({ eventId: z.string().min(1) });
const getPlanSchema = z.object({ batchId: z.string().min(1).nullable() });
const explainSchema = z.object({ ingredientId: z.string().min(1), batchId: z.string().min(1).nullable() });
const previewSchema = z.object({ eventId: z.string().min(1), guestCount: z.number().int().nonnegative() });
const applySchema = z.object({ approvalId: z.string().min(1) });

function objectSchema(properties: Record<string, unknown>, required: string[]) {
  return { type: "object", properties, required, additionalProperties: false };
}
