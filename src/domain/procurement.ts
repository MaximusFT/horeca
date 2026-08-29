import { z } from "zod";
import type { DemandRequirement } from "./demand";
import { baseUnitSchema } from "./units";
import type { BaseUnit } from "./units";

export const procurementLineSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().nonnegative(),
  unit: baseUnitSchema,
  requiredAt: z.string().datetime({ offset: true }),
  deliveryAt: z.string().datetime({ offset: true }),
});

export const procurementPlanSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true }),
  lines: z.array(procurementLineSchema),
});

export interface ProcurementCoverage {
  inventory: number;
  incoming: number;
  planned: number;
}

export interface RequirementProjection {
  ingredientId: string;
  requiredAt: string;
  grossDemand: number;
  unit: BaseUnit;
  safetyTarget: number;
  balanceBefore: number;
  coverage: ProcurementCoverage;
  balanceAfter: number;
  expiredQuantity: number;
  contributions: DemandRequirement[];
}

export interface PlannedProcurementLine {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: BaseUnit;
  deliveryAt: string;
  expiresAt: string;
  triggeredByRequiredAt: string;
  coveredRequiredAt: string[];
}

export interface ProcurementBatch {
  id: string;
  deliveryOn: string;
  deliveryAt: string;
  lines: PlannedProcurementLine[];
}

export interface ChronologicalProcurementPlan {
  id: string;
  version: number;
  createdAt: string;
  horizon: { startsOn: string; endsOn: string };
  projections: RequirementProjection[];
  lines: PlannedProcurementLine[];
  batches: ProcurementBatch[];
}
