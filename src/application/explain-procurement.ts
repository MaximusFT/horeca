import type { Ingredient } from '@/domain/ingredient';
import type { ChronologicalProcurementPlan, PlannedProcurementLine } from '@/domain/procurement';
import type { BaseUnit } from '@/domain/units';

export interface DemandSourceExplanation {
  id: string;
  label: string;
  type: 'restaurant' | 'event';
  quantity: number;
}

export interface ProcurementLineExplanation {
  lineId: string;
  ingredientId: string;
  unit: BaseUnit;
  deliveryAt: string;
  requiredAt: string;
  coveredRequiredAt: string[];
  expiresAt: string;
  shelfLifeDays: number;
  grossDemand: number;
  demandSources: DemandSourceExplanation[];
  balanceBeforeTrigger: number;
  inventoryUsed: number;
  incomingUsed: number;
  expiredExcluded: number;
  safetyTarget: number;
  purchaseQuantity: number;
  coveredRequirementCount: number;
}

export function explainProcurementLine(
  plan: ChronologicalProcurementPlan,
  line: PlannedProcurementLine,
  ingredient: Ingredient,
): ProcurementLineExplanation {
  if (line.ingredientId !== ingredient.id) {
    throw new Error(`Ingredient ${ingredient.id} does not match procurement line ${line.id}`);
  }

  const coveredDates = new Set(line.coveredRequiredAt);
  const projections = plan.projections.filter(
    (projection) => projection.ingredientId === line.ingredientId && coveredDates.has(projection.requiredAt),
  );
  const trigger = plan.projections.find(
    (projection) =>
      projection.ingredientId === line.ingredientId && projection.requiredAt === line.triggeredByRequiredAt,
  );
  if (!trigger) throw new Error(`Missing trigger projection for procurement line ${line.id}`);

  const sources = new Map<string, DemandSourceExplanation>();
  for (const projection of projections) {
    for (const contribution of projection.contributions) {
      const source = contribution.source;
      const id = source.type === 'restaurant' ? 'restaurant' : `event:${source.eventId}`;
      const current = sources.get(id) ?? {
        id,
        label: source.type === 'restaurant' ? 'Restaurant operations' : source.eventName,
        type: source.type,
        quantity: 0,
      };
      current.quantity = round(current.quantity + contribution.quantity);
      sources.set(id, current);
    }
  }

  return {
    lineId: line.id,
    ingredientId: line.ingredientId,
    unit: line.unit,
    deliveryAt: line.deliveryAt,
    requiredAt: trigger.requiredAt,
    coveredRequiredAt: [...line.coveredRequiredAt],
    expiresAt: line.expiresAt,
    shelfLifeDays: ingredient.shelfLifeDays,
    grossDemand: round(projections.reduce((sum, projection) => sum + projection.grossDemand, 0)),
    demandSources: [...sources.values()].sort((a, b) => b.quantity - a.quantity),
    balanceBeforeTrigger: trigger.balanceBefore,
    inventoryUsed: round(projections.reduce((sum, projection) => sum + projection.coverage.inventory, 0)),
    incomingUsed: round(projections.reduce((sum, projection) => sum + projection.coverage.incoming, 0)),
    expiredExcluded: round(projections.reduce((sum, projection) => sum + projection.expiredQuantity, 0)),
    safetyTarget: ingredient.safetyStock,
    purchaseQuantity: line.quantity,
    coveredRequirementCount: projections.length,
  };
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}
