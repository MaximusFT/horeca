import type { BaseUnit } from "@/domain/units";

export type SupplySourceType = "inventory" | "incoming" | "planned";

export interface ProjectedLot {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: BaseUnit;
  availableAt: string;
  expiresAt: string;
  sourceType: SupplySourceType;
  sourceId: string;
}

export interface FefoAllocation {
  lotId: string;
  sourceType: SupplySourceType;
  sourceId: string;
  quantity: number;
}

export interface FefoResult {
  allocations: FefoAllocation[];
  remainingLots: ProjectedLot[];
  unmetQuantity: number;
}

export function allocateFefo(lots: ProjectedLot[], requestedQuantity: number, unit: BaseUnit): FefoResult {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 0) {
    throw new Error("Requested FEFO quantity must be a finite non-negative number");
  }

  const remainingLots = lots
    .map((lot) => ({ ...lot }))
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  const allocations: FefoAllocation[] = [];
  let unmetQuantity = requestedQuantity;

  for (const lot of remainingLots) {
    if (lot.unit !== unit) throw new Error(`FEFO unit mismatch for lot ${lot.id}: ${lot.unit} !== ${unit}`);
    if (unmetQuantity <= 0) break;

    const allocated = round(Math.min(lot.quantity, unmetQuantity));
    if (allocated === 0) continue;
    lot.quantity = round(lot.quantity - allocated);
    unmetQuantity = round(unmetQuantity - allocated);
    allocations.push({
      lotId: lot.id,
      sourceType: lot.sourceType,
      sourceId: lot.sourceId,
      quantity: allocated,
    });
  }

  return {
    allocations,
    remainingLots: remainingLots.filter((lot) => lot.quantity > 0),
    unmetQuantity,
  };
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}
