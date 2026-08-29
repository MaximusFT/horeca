import type { Ingredient } from "@/domain/ingredient";
import type { AgentToolDefinition } from "@/domain/agent";
import { formatQuantity } from "@/engine/units";
import type { AgentModelGateway, AgentModelResult, AgentToolInvoker } from "./agent-model";

export class LocalAgentModel implements AgentModelGateway {
  readonly mode = "local" as const;
  readonly model = "deterministic-local-orchestrator";

  constructor(private readonly ingredients: Ingredient[]) {}

  async run(message: string, _tools: AgentToolDefinition[], invoke: AgentToolInvoker): Promise<AgentModelResult> {
    const normalized = message.toLowerCase();
    const guestCount = extractGuestCount(normalized);
    if ((normalized.includes("wedding") || normalized.includes("свад")) && guestCount !== undefined) {
      const event = await invoke("get_event", { eventId: "wedding" });
      const current = event.output as { guestCount: number };
      if (current.guestCount === guestCount) {
        return { message: `Wedding is already set to ${guestCount} guests. No change is needed.` };
      }
      const preview = await invoke("preview_event_change", { eventId: "wedding", guestCount });
      const output = preview.output as { beforeGuestCount: number; afterGuestCount: number; candidatePlanVersion: number; changedIngredientCount: number; changedBatchCount: number };
      return {
        message: `I prepared a protected preview for Wedding ${output.beforeGuestCount} → ${output.afterGuestCount}. It would create Plan v${output.candidatePlanVersion}, changing ${output.changedIngredientCount} ingredient totals across ${output.changedBatchCount} batch dates. Review the structured impact below; nothing has been applied yet.`,
      };
    }

    const ingredient = this.findIngredient(normalized);
    if (ingredient && isExplanationQuestion(normalized)) {
      const result = await invoke("explain_requirement", { ingredientId: ingredient.id, batchId: null });
      const output = result.output as {
        batchId: string;
        ingredientName: string;
        explanation: {
          grossDemand: number;
          unit: Ingredient["unit"];
          inventoryUsed: number;
          incomingUsed: number;
          safetyTarget: number;
          purchaseQuantity: number;
          demandSources: Array<{ label: string; quantity: number }>;
        };
      };
      const facts = output.explanation;
      const sources = facts.demandSources.map((source) => `${source.label}: ${formatQuantity(source.quantity, facts.unit)}`).join("; ");
      return {
        message: `${output.ingredientName} is highest in ${output.batchId}: gross covered demand is ${formatQuantity(facts.grossDemand, facts.unit)} (${sources}). The deterministic projection uses ${formatQuantity(facts.inventoryUsed, facts.unit)} of inventory and ${formatQuantity(facts.incomingUsed, facts.unit)} incoming supply, preserves a ${formatQuantity(facts.safetyTarget, facts.unit)} safety target, and plans ${formatQuantity(facts.purchaseQuantity, facts.unit)}.`,
      };
    }

    if (normalized.includes("plan") || normalized.includes("план") || normalized.includes("закуп")) {
      const result = await invoke("get_procurement_plan", { batchId: null });
      const plan = result.output as { version: number; horizon: { startsOn: string; endsOn: string }; batches: unknown[] };
      return { message: `Active Plan v${plan.version} covers ${plan.horizon.startsOn} through ${plan.horizon.endsOn} with ${plan.batches.length} dated procurement batches.` };
    }

    return {
      message: "I can safely preview a Wedding guest change, explain a procurement requirement, or read the active procurement plan. Try “Increase Wedding to 220 guests” or “Why do we need so much chicken?”.",
    };
  }

  private findIngredient(message: string): Ingredient | undefined {
    const aliases: Record<string, string[]> = {
      chicken: ["chicken", "куриц"],
      salmon: ["salmon", "лосос"],
      raspberry: ["raspberry", "малин"],
    };
    return this.ingredients.find((ingredient) => {
      const candidates = [ingredient.id, ingredient.name.toLowerCase(), ...(aliases[ingredient.id] ?? [])];
      return candidates.some((candidate) => message.includes(candidate));
    });
  }
}

function extractGuestCount(message: string): number | undefined {
  const explicit = message.match(/(?:to|до|на)\s+(\d{1,5})\s*(?:guest|гост)?/);
  const fallback = message.match(/\b(\d{2,5})\b/);
  const value = explicit?.[1] ?? fallback?.[1];
  return value ? Number(value) : undefined;
}

function isExplanationQuestion(message: string): boolean {
  return ["why", "explain", "so much", "почему", "объясни", "много"].some((word) => message.includes(word));
}
