import type { Ingredient } from '@/domain/ingredient';
import type { IncomingSupply, InventoryLot } from '@/domain/inventory';
import type { ChronologicalProcurementPlan } from '@/domain/procurement';
import type { BaseUnit } from '@/domain/units';

export type InventoryStatus = 'good' | 'low' | 'covered' | 'expiry_risk';

export interface InventorySummaryRow {
  ingredientId: string;
  ingredientName: string;
  unit: BaseUnit;
  onHand: number;
  confirmedIncoming: number;
  safetyTarget: number;
  nextNeedAt?: string;
  nextNeedQuantity: number;
  status: InventoryStatus;
}

export function buildInventorySummary(
  ingredients: Ingredient[],
  inventoryLots: InventoryLot[],
  incomingSupply: IncomingSupply[],
  plan: ChronologicalProcurementPlan,
  now: Date,
): InventorySummaryRow[] {
  return ingredients
    .map((ingredient) => {
      const onHand = inventoryLots
        .filter((lot) => lot.ingredientId === ingredient.id && new Date(lot.expiresAt).getTime() >= now.getTime())
        .reduce((total, lot) => total + lot.quantity, 0);
      const confirmedIncoming = incomingSupply
        .flatMap((supply) => supply.lines)
        .filter((line) => line.ingredientId === ingredient.id)
        .reduce((total, line) => total + line.quantity, 0);
      const projections = plan.projections.filter((projection) => projection.ingredientId === ingredient.id);
      const nextNeed = projections[0];
      const hasExpiryRisk = onHand > 0 && projections.some((projection) => projection.expiredQuantity > 0);
      const incomingCoversNeed = projections.some((projection) => projection.coverage.incoming > 0);
      const status: InventoryStatus = hasExpiryRisk
        ? 'expiry_risk'
        : onHand < ingredient.safetyStock && incomingCoversNeed
          ? 'covered'
          : onHand < ingredient.safetyStock
            ? 'low'
            : 'good';

      return {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        onHand,
        confirmedIncoming,
        safetyTarget: ingredient.safetyStock,
        nextNeedAt: nextNeed?.requiredAt,
        nextNeedQuantity: nextNeed?.grossDemand ?? 0,
        status,
      };
    })
    .sort(
      (left, right) =>
        statusPriority(left.status) - statusPriority(right.status) ||
        left.ingredientName.localeCompare(right.ingredientName),
    );
}

function statusPriority(status: InventoryStatus): number {
  return { expiry_risk: 0, low: 1, covered: 2, good: 3 }[status];
}
