import { addDays, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { DemoDataset } from "@/data/demo/dataset";
import type { IncomingSupply, InventoryLot } from "@/domain/inventory";
import type { Ingredient } from "@/domain/ingredient";
import type {
  ChronologicalProcurementPlan,
  PlannedProcurementLine,
  ProcurementBatch,
  ProcurementCoverage,
  RequirementProjection,
} from "@/domain/procurement";
import { BUSINESS_TIME_ZONE } from "@/lib/demo-clock";
import type { Clock } from "@/lib/clock";
import { aggregateDemand, type AggregatedDemandRequirement } from "./aggregate-demand";
import { allocateFefo, type ProjectedLot, type SupplySourceType } from "./allocate-fefo";
import { calculateDemandPlan, type DemandPlan } from "./calculate-demand-plan";

export interface ProcurementPlanInput {
  ingredients: Ingredient[];
  inventoryLots: InventoryLot[];
  incomingSupply: IncomingSupply[];
  demandPlan: DemandPlan;
  clock: Clock;
  version?: number;
}

export function calculateProcurementPlan(input: ProcurementPlanInput): ChronologicalProcurementPlan {
  const now = input.clock.now();
  const ingredientById = new Map(input.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const initialLotsByIngredient = groupInitialLots(input.inventoryLots, now.toISOString());
  const incomingByIngredient = groupIncoming(input.incomingSupply, ingredientById);
  const requirementsByIngredient = groupRequirements(input.demandPlan.requirements);
  const lines: PlannedProcurementLine[] = [];
  const projections: RequirementProjection[] = [];

  for (const [ingredientId, requirements] of requirementsByIngredient) {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient) throw new Error(`Demand references unknown ingredient ${ingredientId}`);

    const result = projectIngredient({
      ingredient,
      requirements,
      initialLots: initialLotsByIngredient.get(ingredientId) ?? [],
      incomingLots: incomingByIngredient.get(ingredientId) ?? [],
      now,
    });
    lines.push(...result.lines);
    projections.push(...result.projections);
  }

  const consolidatedLines = consolidateDeliveryLines(lines);
  consolidatedLines.sort((a, b) => a.deliveryAt.localeCompare(b.deliveryAt) || a.ingredientId.localeCompare(b.ingredientId));
  projections.sort((a, b) => a.requiredAt.localeCompare(b.requiredAt) || a.ingredientId.localeCompare(b.ingredientId));
  const version = input.version ?? 1;

  return {
    id: `plan-v${version}`,
    version,
    createdAt: now.toISOString(),
    horizon: { startsOn: input.demandPlan.startsOn, endsOn: input.demandPlan.endsOn },
    projections,
    lines: consolidatedLines,
    batches: createBatches(consolidatedLines),
  };
}

export function calculateDemoProcurementPlan(dataset: DemoDataset, clock: Clock, version = 1) {
  return calculateProcurementPlan({
    ingredients: dataset.ingredients,
    inventoryLots: dataset.inventoryLots,
    incomingSupply: dataset.incomingSupply,
    demandPlan: calculateDemandPlan(dataset),
    clock,
    version,
  });
}

interface ProjectionInput {
  ingredient: Ingredient;
  requirements: AggregatedDemandRequirement[];
  initialLots: ProjectedLot[];
  incomingLots: ProjectedLot[];
  now: Date;
}

function projectIngredient(input: ProjectionInput): {
  lines: PlannedProcurementLine[];
  projections: RequirementProjection[];
} {
  let activeLots = input.initialLots.map((lot) => ({ ...lot }));
  const pendingIncoming = input.incomingLots.map((lot) => ({ ...lot }));
  const activatedIncoming = new Set<string>();
  const lines: PlannedProcurementLine[] = [];
  const projections: RequirementProjection[] = [];

  input.requirements.forEach((requirement, index) => {
    const requiredTime = new Date(requirement.requiredAt).getTime();
    for (const lot of pendingIncoming) {
      if (!activatedIncoming.has(lot.id) && new Date(lot.availableAt).getTime() <= requiredTime) {
        activeLots.push({ ...lot });
        activatedIncoming.add(lot.id);
      }
    }

    let expiredQuantity = 0;
    activeLots = activeLots.filter((lot) => {
      const expired = new Date(lot.expiresAt).getTime() < requiredTime;
      if (expired) expiredQuantity = round(expiredQuantity + lot.quantity);
      return !expired;
    });

    const balanceBefore = sumLots(activeLots);
    const shortage = round(Math.max(0, requirement.quantity + input.ingredient.safetyStock - balanceBefore));

    if (shortage > 0) {
      const deliveryAt = scheduleDelivery(requirement.requiredAt, input.ingredient.shelfLifeDays, input.now);
      const expiresAt = addDays(new Date(deliveryAt), input.ingredient.shelfLifeDays).toISOString();
      const consolidation = calculateConsolidation({
        requirements: input.requirements,
        currentIndex: index,
        ingredient: input.ingredient,
        activeLots,
        pendingIncoming,
        activatedIncoming,
        baseShortage: shortage,
        deliveryAt,
        expiresAt,
      });
      const consolidatedQuantity = round(shortage + consolidation.extraQuantity);
      const lineNumber = lines.length + 1;
      const line: PlannedProcurementLine = {
        id: `${input.ingredient.id}-${formatInTimeZone(deliveryAt, BUSINESS_TIME_ZONE, "yyyyMMdd")}-${lineNumber}`,
        ingredientId: input.ingredient.id,
        quantity: consolidatedQuantity,
        unit: input.ingredient.unit,
        deliveryAt,
        expiresAt,
        triggeredByRequiredAt: requirement.requiredAt,
        coveredRequiredAt: [requirement.requiredAt, ...consolidation.coveredRequiredAt],
      };
      lines.push(line);
      activeLots.push({
        id: `planned-${line.id}`,
        ingredientId: input.ingredient.id,
        quantity: consolidatedQuantity,
        unit: input.ingredient.unit,
        availableAt: deliveryAt,
        expiresAt,
        sourceType: "planned",
        sourceId: line.id,
      });
    }

    const allocation = allocateFefo(activeLots, requirement.quantity, input.ingredient.unit);
    if (allocation.unmetQuantity > 0) {
      throw new Error(`Projection failed to cover ${input.ingredient.id} demand at ${requirement.requiredAt}`);
    }
    activeLots = allocation.remainingLots;
    const coverage = summarizeCoverage(allocation.allocations);

    projections.push({
      ingredientId: input.ingredient.id,
      requiredAt: requirement.requiredAt,
      grossDemand: requirement.quantity,
      unit: input.ingredient.unit,
      safetyTarget: input.ingredient.safetyStock,
      balanceBefore,
      coverage,
      balanceAfter: sumLots(activeLots),
      expiredQuantity,
      contributions: requirement.contributions,
    });
  });

  return { lines, projections };
}

interface ConsolidationInput {
  requirements: AggregatedDemandRequirement[],
  currentIndex: number;
  ingredient: Ingredient;
  activeLots: ProjectedLot[];
  pendingIncoming: ProjectedLot[];
  activatedIncoming: Set<string>;
  baseShortage: number;
  deliveryAt: string;
  expiresAt: string;
}

function calculateConsolidation(input: ConsolidationInput): {
  extraQuantity: number;
  coveredRequiredAt: string[];
} {
  const consolidationDays = input.ingredient.shelfLifeDays > 30
    ? 7
    : input.ingredient.shelfLifeDays >= 8 ? 4 : 0;
  if (consolidationDays === 0) return { extraQuantity: 0, coveredRequiredAt: [] };

  const current = input.requirements[input.currentIndex];
  const limit = Math.min(
    addDays(new Date(current.requiredAt), consolidationDays).getTime(),
    new Date(input.expiresAt).getTime(),
  );
  const candidates = input.requirements
    .slice(input.currentIndex + 1)
    .filter((item) => new Date(item.requiredAt).getTime() <= limit);
  if (candidates.length === 0) return { extraQuantity: 0, coveredRequiredAt: [] };

  const simulationLotId = "consolidation-simulation";
  let simulatedLots = input.activeLots.map((lot) => ({ ...lot }));
  simulatedLots.push({
    id: simulationLotId,
    ingredientId: input.ingredient.id,
    quantity: input.baseShortage,
    unit: input.ingredient.unit,
    availableAt: input.deliveryAt,
    expiresAt: input.expiresAt,
    sourceType: "planned",
    sourceId: simulationLotId,
  });
  simulatedLots = allocateFefo(simulatedLots, current.quantity, input.ingredient.unit).remainingLots;

  const simulatedActivated = new Set(input.activatedIncoming);
  const coveredRequiredAt: string[] = [];
  let extraQuantity = 0;

  for (const candidate of candidates) {
    const requiredTime = new Date(candidate.requiredAt).getTime();
    for (const lot of input.pendingIncoming) {
      if (!simulatedActivated.has(lot.id) && new Date(lot.availableAt).getTime() <= requiredTime) {
        simulatedLots.push({ ...lot });
        simulatedActivated.add(lot.id);
      }
    }
    simulatedLots = simulatedLots.filter((lot) => new Date(lot.expiresAt).getTime() >= requiredTime);

    const needed = round(Math.max(
      0,
      candidate.quantity + input.ingredient.safetyStock - sumLots(simulatedLots),
    ));
    if (needed > 0) {
      const plannedLot = simulatedLots.find((lot) => lot.id === simulationLotId);
      if (plannedLot) plannedLot.quantity = round(plannedLot.quantity + needed);
      else {
        simulatedLots.push({
          id: simulationLotId,
          ingredientId: input.ingredient.id,
          quantity: needed,
          unit: input.ingredient.unit,
          availableAt: input.deliveryAt,
          expiresAt: input.expiresAt,
          sourceType: "planned",
          sourceId: simulationLotId,
        });
      }
      extraQuantity = round(extraQuantity + needed);
      coveredRequiredAt.push(candidate.requiredAt);
    }
    simulatedLots = allocateFefo(simulatedLots, candidate.quantity, input.ingredient.unit).remainingLots;
  }

  return { extraQuantity, coveredRequiredAt };
}

function scheduleDelivery(requiredAt: string, shelfLifeDays: number, now: Date): string {
  const leadDays = shelfLifeDays <= 3 ? 1 : shelfLifeDays <= 7 ? 2 : shelfLifeDays <= 30 ? 4 : 7;
  const target = subDays(new Date(requiredAt), leadDays);
  return (target < now ? now : target).toISOString();
}

function groupInitialLots(lots: InventoryLot[], availableAt: string): Map<string, ProjectedLot[]> {
  return groupByIngredient(lots.map((lot) => ({
    ...lot,
    availableAt,
    sourceType: "inventory" as const,
    sourceId: lot.id,
  })));
}

function groupIncoming(
  supplies: IncomingSupply[],
  ingredients: Map<string, Ingredient>,
): Map<string, ProjectedLot[]> {
  const lots = supplies.flatMap((supply) => supply.lines.map((line, index) => {
    const ingredient = ingredients.get(line.ingredientId);
    if (!ingredient) throw new Error(`Incoming supply references unknown ingredient ${line.ingredientId}`);
    return {
      id: `${supply.id}-${index + 1}`,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
      availableAt: supply.arrivesAt,
      expiresAt: addDays(new Date(supply.arrivesAt), ingredient.shelfLifeDays).toISOString(),
      sourceType: "incoming" as const,
      sourceId: supply.id,
    };
  }));
  return groupByIngredient(lots);
}

function groupByIngredient(lots: ProjectedLot[]): Map<string, ProjectedLot[]> {
  const grouped = new Map<string, ProjectedLot[]>();
  for (const lot of lots) grouped.set(lot.ingredientId, [...(grouped.get(lot.ingredientId) ?? []), lot]);
  return grouped;
}

function groupRequirements(requirements: AggregatedDemandRequirement[]): Map<string, AggregatedDemandRequirement[]> {
  const grouped = new Map<string, AggregatedDemandRequirement[]>();
  for (const requirement of aggregateDemand(requirements.flatMap((item) => item.contributions))) {
    grouped.set(requirement.ingredientId, [...(grouped.get(requirement.ingredientId) ?? []), requirement]);
  }
  return grouped;
}

function summarizeCoverage(allocations: Array<{ sourceType: SupplySourceType; quantity: number }>): ProcurementCoverage {
  const result: ProcurementCoverage = { inventory: 0, incoming: 0, planned: 0 };
  for (const allocation of allocations) {
    result[allocation.sourceType] = round(result[allocation.sourceType] + allocation.quantity);
  }
  return result;
}

function createBatches(lines: PlannedProcurementLine[]): ProcurementBatch[] {
  const grouped = new Map<string, PlannedProcurementLine[]>();
  for (const line of lines) {
    const deliveryOn = formatInTimeZone(line.deliveryAt, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
    grouped.set(deliveryOn, [...(grouped.get(deliveryOn) ?? []), line]);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([deliveryOn, batchLines]) => ({
      id: `batch-${deliveryOn}`,
      deliveryOn,
      deliveryAt: batchLines.map((line) => line.deliveryAt).sort()[0],
      lines: batchLines,
    }));
}

function consolidateDeliveryLines(lines: PlannedProcurementLine[]): PlannedProcurementLine[] {
  const grouped = new Map<string, PlannedProcurementLine[]>();
  for (const line of lines) {
    const deliveryOn = formatInTimeZone(line.deliveryAt, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
    const key = `${deliveryOn}:${line.ingredientId}:${line.unit}`;
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
  }

  return [...grouped.entries()].flatMap(([key, group]) => {
    if (group.length === 1) return group;
    const deliveryAt = group.map((line) => line.deliveryAt).sort()[0];
    const expiresAt = group.map((line) => line.expiresAt).sort()[0];
    const coveredRequiredAt = [...new Set(group.flatMap((line) => line.coveredRequiredAt))].sort();
    const remainsUsable = coveredRequiredAt.every(
      (requiredAt) => new Date(requiredAt).getTime() <= new Date(expiresAt).getTime(),
    );
    if (!remainsUsable) return group;

    const reference = group[0];
    return [{
      id: `${key.replaceAll(":", "-")}-consolidated`,
      ingredientId: reference.ingredientId,
      quantity: round(group.reduce((sum, line) => sum + line.quantity, 0)),
      unit: reference.unit,
      deliveryAt,
      expiresAt,
      triggeredByRequiredAt: group.map((line) => line.triggeredByRequiredAt).sort()[0],
      coveredRequiredAt,
    }];
  });
}

function sumLots(lots: ProjectedLot[]): number {
  return round(lots.reduce((sum, lot) => sum + lot.quantity, 0));
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}
