import type { Ingredient } from '@/domain/ingredient';
import type { AgentToolDefinition } from '@/domain/agent';
import { formatLocalizedQuantity } from '@/i18n/format';
import type { AgentModelGateway, AgentModelResult, AgentToolInvoker } from './agent-model';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/locale';
import { localizedIngredientName } from '@/i18n/demo-names';

export class LocalAgentModel implements AgentModelGateway {
  readonly mode = 'local' as const;
  readonly model = 'deterministic-local-orchestrator';

  constructor(private readonly ingredients: Ingredient[]) {}

  async run(
    message: string,
    _tools: AgentToolDefinition[],
    invoke: AgentToolInvoker,
    locale: Locale,
  ): Promise<AgentModelResult> {
    const dictionary = getDictionary(locale);
    const normalized = message.toLowerCase();
    const guestCount = extractGuestCount(normalized);
    if (
      (normalized.includes('wedding') || normalized.includes('свад') || normalized.includes('весілл')) &&
      guestCount !== undefined
    ) {
      const event = await invoke('get_event', { eventId: 'wedding' });
      const current = event.output as { guestCount: number };
      if (current.guestCount === guestCount) {
        return { message: dictionary.localAgent.alreadySet(guestCount) };
      }
      const preview = await invoke('preview_event_change', { eventId: 'wedding', guestCount });
      const output = preview.output as {
        beforeGuestCount: number;
        afterGuestCount: number;
        candidatePlanVersion: number;
        changedIngredientCount: number;
        changedBatchCount: number;
      };
      return {
        message: dictionary.localAgent.previewReady(
          output.beforeGuestCount,
          output.afterGuestCount,
          output.candidatePlanVersion,
          output.changedIngredientCount,
          output.changedBatchCount,
        ),
      };
    }

    const ingredient = this.findIngredient(normalized);
    if (ingredient && isExplanationQuestion(normalized)) {
      const result = await invoke('explain_requirement', { ingredientId: ingredient.id, batchId: null });
      const output = result.output as {
        batchId: string;
        ingredientName: string;
        explanation: {
          grossDemand: number;
          unit: Ingredient['unit'];
          inventoryUsed: number;
          incomingUsed: number;
          safetyTarget: number;
          purchaseQuantity: number;
          demandSources: Array<{ label: string; quantity: number }>;
        };
      };
      const facts = output.explanation;
      const sources = facts.demandSources
        .map((source) => `${source.label}: ${formatLocalizedQuantity(source.quantity, facts.unit, locale)}`)
        .join('; ');
      return {
        message: [
          dictionary.localAgent.explanationIntro(
            output.ingredientName,
            output.batchId,
            formatLocalizedQuantity(facts.grossDemand, facts.unit, locale),
            sources,
          ),
          dictionary.localAgent.explanationDetails(
            formatLocalizedQuantity(facts.inventoryUsed, facts.unit, locale),
            formatLocalizedQuantity(facts.incomingUsed, facts.unit, locale),
            formatLocalizedQuantity(facts.safetyTarget, facts.unit, locale),
            formatLocalizedQuantity(facts.purchaseQuantity, facts.unit, locale),
          ),
        ].join(' '),
      };
    }

    if (isSupplierOrderRequest(normalized)) {
      const planResult = await invoke('get_procurement_plan', { batchId: null });
      const plan = planResult.output as { batches: Array<{ id: string }> };
      const nextBatch = plan.batches[0];
      if (!nextBatch) return { message: dictionary.localAgent.noSupplierBatch };
      const prepared = await invoke('prepare_supplier_order', { batchId: nextBatch.id });
      return { message: prepared.summary };
    }

    if (normalized.includes('plan') || normalized.includes('план') || normalized.includes('закуп')) {
      const result = await invoke('get_procurement_plan', { batchId: null });
      const plan = result.output as {
        version: number;
        horizon: { startsOn: string; endsOn: string };
        batches: unknown[];
      };
      return {
        message: dictionary.localAgent.planSummary(
          plan.version,
          plan.horizon.startsOn,
          plan.horizon.endsOn,
          plan.batches.length,
        ),
      };
    }

    return { message: dictionary.localAgent.fallback };
  }

  private findIngredient(message: string): Ingredient | undefined {
    const aliases: Record<string, string[]> = {
      chicken: ['chicken', 'куриц', 'курк', 'куряч'],
      salmon: ['salmon', 'лосос'],
      raspberry: ['raspberry', 'малин'],
    };
    return this.ingredients.find((ingredient) => {
      const candidates = [
        ingredient.id,
        ingredient.name.toLowerCase(),
        localizedIngredientName(ingredient.id, ingredient.name, 'uk').toLowerCase(),
        ...(aliases[ingredient.id] ?? []),
      ];
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
  return ['why', 'explain', 'so much', 'почему', 'объясни', 'много', 'чому', 'поясни', 'багато'].some((word) =>
    message.includes(word),
  );
}

function isSupplierOrderRequest(message: string): boolean {
  const action = ['prepare', 'підгот', 'подготов'].some((word) => message.includes(word));
  const subject = ['supplier order', 'замовлен', 'заказ'].some((word) => message.includes(word));
  return action && subject;
}
