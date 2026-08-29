import type { BaseUnit } from "@/domain/units";

export type SupportedUnit = BaseUnit | "kg" | "l";

export function toBaseUnit(quantity: number, unit: SupportedUnit): { quantity: number; unit: BaseUnit } {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantity must be a finite non-negative number");
  if (unit === "kg") return { quantity: quantity * 1_000, unit: "g" };
  if (unit === "l") return { quantity: quantity * 1_000, unit: "ml" };
  return { quantity, unit };
}

export function normalizeQuantity(quantity: number, unit: SupportedUnit, expectedUnit: BaseUnit) {
  const normalized = toBaseUnit(quantity, unit);
  if (normalized.unit !== expectedUnit) {
    throw new Error(`Cannot convert ${unit} to ${expectedUnit}`);
  }
  return normalized.quantity;
}

export function formatQuantity(quantity: number, unit: BaseUnit): string {
  if (unit === "g" && quantity >= 1_000) return `${trim(quantity / 1_000)} kg`;
  if (unit === "ml" && quantity >= 1_000) return `${trim(quantity / 1_000)} L`;
  return `${trim(quantity)} ${unit}`;
}

function trim(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}
