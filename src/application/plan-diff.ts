import { formatInTimeZone } from "date-fns-tz";
import type { ChronologicalProcurementPlan, PlannedProcurementLine } from "@/domain/procurement";
import type { BaseUnit } from "@/domain/units";
import { BUSINESS_TIME_ZONE } from "@/lib/demo-clock";

export interface ProcurementLineDiff {
  key: string;
  ingredientId: string;
  unit: BaseUnit;
  deliveryOn: string;
  beforeQuantity: number;
  afterQuantity: number;
  delta: number;
  change: "added" | "removed" | "changed";
}

export interface IngredientProcurementDelta {
  ingredientId: string;
  unit: BaseUnit;
  beforeQuantity: number;
  afterQuantity: number;
  delta: number;
}

export interface ProcurementPlanDiff {
  beforePlanId: string;
  afterPlanId: string;
  beforeVersion: number;
  afterVersion: number;
  lines: ProcurementLineDiff[];
  ingredientDeltas: IngredientProcurementDelta[];
}

export function diffProcurementPlans(
  before: ChronologicalProcurementPlan,
  after: ChronologicalProcurementPlan,
): ProcurementPlanDiff {
  const beforeLines = aggregateLines(before.lines);
  const afterLines = aggregateLines(after.lines);
  const keys = new Set([...beforeLines.keys(), ...afterLines.keys()]);
  const lines: ProcurementLineDiff[] = [];

  for (const key of keys) {
    const previous = beforeLines.get(key);
    const next = afterLines.get(key);
    const beforeQuantity = previous?.quantity ?? 0;
    const afterQuantity = next?.quantity ?? 0;
    const delta = round(afterQuantity - beforeQuantity);
    if (delta === 0) continue;

    const reference = next ?? previous!;
    lines.push({
      key,
      ingredientId: reference.ingredientId,
      unit: reference.unit,
      deliveryOn: reference.deliveryOn,
      beforeQuantity,
      afterQuantity,
      delta,
      change: beforeQuantity === 0 ? "added" : afterQuantity === 0 ? "removed" : "changed",
    });
  }

  lines.sort((a, b) => a.deliveryOn.localeCompare(b.deliveryOn) || a.ingredientId.localeCompare(b.ingredientId));

  return {
    beforePlanId: before.id,
    afterPlanId: after.id,
    beforeVersion: before.version,
    afterVersion: after.version,
    lines,
    ingredientDeltas: aggregateIngredientDeltas(before.lines, after.lines),
  };
}

interface AggregatedLine {
  ingredientId: string;
  unit: BaseUnit;
  deliveryOn: string;
  quantity: number;
}

function aggregateLines(lines: PlannedProcurementLine[]): Map<string, AggregatedLine> {
  const result = new Map<string, AggregatedLine>();
  for (const line of lines) {
    const deliveryOn = formatInTimeZone(line.deliveryAt, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
    const key = `${deliveryOn}:${line.ingredientId}:${line.unit}`;
    const current = result.get(key);
    if (current) current.quantity = round(current.quantity + line.quantity);
    else result.set(key, { ingredientId: line.ingredientId, unit: line.unit, deliveryOn, quantity: line.quantity });
  }
  return result;
}

function aggregateIngredientDeltas(
  beforeLines: PlannedProcurementLine[],
  afterLines: PlannedProcurementLine[],
): IngredientProcurementDelta[] {
  const totals = new Map<string, IngredientProcurementDelta>();
  for (const [side, lines] of [["before", beforeLines], ["after", afterLines]] as const) {
    for (const line of lines) {
      const current = totals.get(line.ingredientId) ?? {
        ingredientId: line.ingredientId,
        unit: line.unit,
        beforeQuantity: 0,
        afterQuantity: 0,
        delta: 0,
      };
      if (side === "before") current.beforeQuantity = round(current.beforeQuantity + line.quantity);
      else current.afterQuantity = round(current.afterQuantity + line.quantity);
      totals.set(line.ingredientId, current);
    }
  }

  return [...totals.values()]
    .map((item) => ({ ...item, delta: round(item.afterQuantity - item.beforeQuantity) }))
    .filter((item) => item.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.ingredientId.localeCompare(b.ingredientId));
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}
