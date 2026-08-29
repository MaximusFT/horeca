import { describe, expect, it } from 'vitest';
import { explainProcurementLine } from '@/application/explain-procurement';
import { demoDataset } from '@/data/demo/dataset';
import { calculateDemoProcurementPlan } from '@/engine/calculate-procurement-plan';
import { DemoClock } from '@/lib/demo-clock';

describe('explainProcurementLine', () => {
  it('returns deterministic demand provenance and coverage for a purchase line', () => {
    const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock());
    const line = plan.lines.find(
      (item) => item.ingredientId === 'chicken' && item.coveredRequiredAt.some((date) => date.startsWith('2026-09-13')),
    )!;
    const ingredient = demoDataset.ingredients.find((item) => item.id === 'chicken')!;
    const explanation = explainProcurementLine(plan, line, ingredient);

    expect(explanation.purchaseQuantity).toBe(line.quantity);
    expect(explanation.safetyTarget).toBe(4_000);
    expect(explanation.deliveryAt).toBe(line.deliveryAt);
    expect(explanation.requiredAt).toBe(line.triggeredByRequiredAt);
    expect(explanation.coveredRequiredAt).toEqual(line.coveredRequiredAt);
    expect(explanation.expiresAt).toBe(line.expiresAt);
    expect(explanation.shelfLifeDays).toBe(ingredient.shelfLifeDays);
    expect(explanation.demandSources.some((source) => source.label === 'Wedding')).toBe(true);
    expect(explanation.demandSources.reduce((sum, source) => sum + source.quantity, 0)).toBe(explanation.grossDemand);
  });
});
