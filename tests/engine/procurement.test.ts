import { describe, expect, it } from 'vitest';
import { demoDataset } from '@/data/demo/dataset';
import type { DemandRequirement } from '@/domain/demand';
import type { IncomingSupply, InventoryLot } from '@/domain/inventory';
import type { Ingredient } from '@/domain/ingredient';
import { aggregateDemand } from '@/engine/aggregate-demand';
import { calculateDemandPlan, type DemandPlan } from '@/engine/calculate-demand-plan';
import { calculateDemoProcurementPlan, calculateProcurementPlan } from '@/engine/calculate-procurement-plan';
import { DemoClock } from '@/lib/demo-clock';

describe('chronological procurement projection', () => {
  it('finds the expected 3 kg day-two shortage in the canonical tiny fixture', () => {
    const plan = calculate({
      ingredient: ingredient(2_000, 3),
      inventory: [inventory(10_000, '2026-09-10T23:59:59+03:00')],
      demands: [demand('2026-09-01T08:00:00+03:00', 6_000), demand('2026-09-02T08:00:00+03:00', 5_000)],
    });

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].quantity).toBe(3_000);
    expect(plan.lines[0].triggeredByRequiredAt).toBe('2026-09-02T08:00:00+03:00');
  });

  it('counts incoming supply only when it arrives before requiredAt', () => {
    const before = calculate({
      ingredient: ingredient(0, 3),
      demands: [demand('2026-09-02T08:00:00+03:00', 5_000)],
      incoming: [incoming('2026-09-02T07:00:00+03:00', 5_000)],
    });
    const after = calculate({
      ingredient: ingredient(0, 3),
      demands: [demand('2026-09-02T08:00:00+03:00', 5_000)],
      incoming: [incoming('2026-09-02T09:00:00+03:00', 5_000)],
    });

    expect(before.lines).toHaveLength(0);
    expect(before.projections[0].coverage.incoming).toBe(5_000);
    expect(after.lines[0].quantity).toBe(5_000);
    expect(after.projections[0].coverage.incoming).toBe(0);
  });

  it('treats safety stock as a target instead of repeated demand', () => {
    const plan = calculate({
      ingredient: ingredient(2_000, 3),
      demands: [demand('2026-09-02T08:00:00+03:00', 5_000), demand('2026-09-03T08:00:00+03:00', 5_000)],
    });

    expect(plan.lines.map((line) => line.quantity)).toEqual([7_000, 5_000]);
    expect(plan.projections.map((item) => item.balanceAfter)).toEqual([2_000, 2_000]);
  });

  it('expires planned perishable stock before a later requirement', () => {
    const plan = calculate({
      ingredient: ingredient(2_000, 2),
      demands: [demand('2026-09-02T08:00:00+03:00', 5_000), demand('2026-09-04T08:01:00+03:00', 1_000)],
    });

    expect(plan.lines.map((line) => line.quantity)).toEqual([7_000, 3_000]);
    expect(plan.projections[1].expiredQuantity).toBe(2_000);
  });

  it('greedily consolidates compatible stable-goods demand', () => {
    const plan = calculate({
      ingredient: ingredient(0, 90),
      demands: [demand('2026-09-03T08:00:00+03:00', 5_000), demand('2026-09-06T08:00:00+03:00', 4_000)],
    });

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].quantity).toBe(9_000);
    expect(plan.lines[0].coveredRequiredAt).toHaveLength(2);
    expect(plan.projections[1].coverage.planned).toBe(4_000);
  });

  it('does not consolidate demand already covered by confirmed incoming supply', () => {
    const plan = calculate({
      ingredient: ingredient(0, 90),
      demands: [demand('2026-09-03T08:00:00+03:00', 5_000), demand('2026-09-06T08:00:00+03:00', 4_000)],
      incoming: [incoming('2026-09-05T07:00:00+03:00', 4_000)],
    });

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].quantity).toBe(5_000);
    expect(plan.lines[0].coveredRequiredAt).toEqual(['2026-09-03T08:00:00+03:00']);
    expect(plan.projections[1].coverage.incoming).toBe(4_000);
  });
});

describe('Misto Kitchen procurement plan', () => {
  it('turns the complete demand plan into dated, fully covered batches', () => {
    const demandPlan = calculateDemandPlan(demoDataset);
    const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock());

    expect(plan.horizon).toEqual({ startsOn: demandPlan.startsOn, endsOn: demandPlan.endsOn });
    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.batches.length).toBeGreaterThan(1);
    expect(plan.projections).toHaveLength(demandPlan.requirements.length);
    expect(plan.projections.every((item) => item.balanceAfter >= item.safetyTarget)).toBe(true);
    expect(
      plan.projections.every(
        (item) => item.coverage.inventory + item.coverage.incoming + item.coverage.planned === item.grossDemand,
      ),
    ).toBe(true);
    expect(new Set(plan.lines.map((line) => line.id)).size).toBe(plan.lines.length);
    expect(
      plan.batches.every((batch) => {
        const ingredientIds = batch.lines.map((line) => line.ingredientId);
        return new Set(ingredientIds).size === ingredientIds.length;
      }),
    ).toBe(true);
    expect(calculateDemoProcurementPlan(demoDataset, new DemoClock())).toEqual(plan);
  });
});

interface Fixture {
  ingredient: Ingredient;
  demands: DemandRequirement[];
  inventory?: InventoryLot[];
  incoming?: IncomingSupply[];
}

function calculate(fixture: Fixture) {
  const demandPlan: DemandPlan = {
    startsOn: '2026-09-01',
    endsOn: '2026-09-14',
    requirements: aggregateDemand(fixture.demands),
  };
  return calculateProcurementPlan({
    ingredients: [fixture.ingredient],
    inventoryLots: fixture.inventory ?? [],
    incomingSupply: fixture.incoming ?? [],
    demandPlan,
    clock: { now: () => new Date('2026-09-01T08:00:00+03:00') },
  });
}

function ingredient(safetyStock: number, shelfLifeDays: number): Ingredient {
  return { id: 'test', name: 'Test ingredient', unit: 'g', safetyStock, shelfLifeDays };
}

function demand(requiredAt: string, quantity: number): DemandRequirement {
  return {
    ingredientId: 'test',
    quantity,
    unit: 'g',
    requiredAt,
    source: { type: 'restaurant', date: requiredAt.slice(0, 10), load: 'normal' },
  };
}

function inventory(quantity: number, expiresAt: string): InventoryLot {
  return { id: 'inventory', ingredientId: 'test', quantity, unit: 'g', expiresAt };
}

function incoming(arrivesAt: string, quantity: number): IncomingSupply {
  return {
    id: `incoming-${arrivesAt}`,
    name: 'Incoming',
    arrivesAt,
    lines: [{ ingredientId: 'test', quantity, unit: 'g' }],
  };
}
