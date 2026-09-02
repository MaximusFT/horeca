import { describe, expect, it } from 'vitest';
import { demoDataset } from '@/data/demo/dataset';
import { calculateDemoProcurementPlan } from '@/engine/calculate-procurement-plan';
import { DemoClock } from '@/lib/demo-clock';

describe('demo procurement schedule audit', () => {
  it('justifies the daily batch cadence with short-lived demand', () => {
    const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock());
    const ingredientById = new Map(demoDataset.ingredients.map((ingredient) => [ingredient.id, ingredient]));

    expect(plan.horizon.startsOn).toBe('2026-09-15');
    expect(plan.batches[0].deliveryOn).toBe('2026-09-15');
    expect(plan.batches).toHaveLength(13);
    expect(
      plan.batches.every((batch) =>
        batch.lines.some((line) => (ingredientById.get(line.ingredientId)?.shelfLifeDays ?? Infinity) <= 7),
      ),
    ).toBe(true);
  });

  it('consolidates stable goods while keeping Wedding perishables close to prep', () => {
    const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock());
    const purchasesFor = (ingredientId: string) => plan.lines.filter((line) => line.ingredientId === ingredientId);

    expect(purchasesFor('flour')).toHaveLength(1);
    expect(purchasesFor('sugar')).toHaveLength(1);
    expect(
      purchasesFor('salmon').find((line) => line.coveredRequiredAt.includes('2026-09-27T08:00:00+03:00'))?.deliveryAt,
    ).toBe('2026-09-26T05:00:00.000Z');
    expect(
      purchasesFor('chicken').find((line) => line.coveredRequiredAt.includes('2026-09-27T08:00:00+03:00'))?.deliveryAt,
    ).toBe('2026-09-26T05:00:00.000Z');
    expect(
      purchasesFor('tomato').find((line) => line.coveredRequiredAt.includes('2026-09-27T08:00:00+03:00'))?.deliveryAt,
    ).toBe('2026-09-25T05:00:00.000Z');
    expect(
      plan.lines.every((line) =>
        line.coveredRequiredAt.every(
          (requiredAt) => new Date(requiredAt).getTime() <= new Date(line.expiresAt).getTime(),
        ),
      ),
    ).toBe(true);
  });
});
