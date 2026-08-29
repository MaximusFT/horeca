import type { DemandRequirement } from "@/domain/demand";
import type { BaseUnit } from "@/domain/units";

export interface AggregatedDemandRequirement {
  ingredientId: string;
  quantity: number;
  unit: BaseUnit;
  requiredAt: string;
  contributions: DemandRequirement[];
}

export function aggregateDemand(requirements: DemandRequirement[]): AggregatedDemandRequirement[] {
  const groups = new Map<string, AggregatedDemandRequirement>();

  for (const requirement of requirements) {
    const key = `${requirement.requiredAt}:${requirement.ingredientId}:${requirement.unit}`;
    const current = groups.get(key);
    if (current) {
      current.quantity = Math.round((current.quantity + requirement.quantity + Number.EPSILON) * 1_000_000) / 1_000_000;
      current.contributions.push(requirement);
    } else {
      groups.set(key, {
        ingredientId: requirement.ingredientId,
        quantity: requirement.quantity,
        unit: requirement.unit,
        requiredAt: requirement.requiredAt,
        contributions: [requirement],
      });
    }
  }

  return [...groups.values()].sort(
    (a, b) => a.requiredAt.localeCompare(b.requiredAt) || a.ingredientId.localeCompare(b.ingredientId),
  );
}
