import type { InventoryLot } from "@/domain/inventory";
import type { BaseUnit } from "@/domain/units";

type LotTuple = [id: string, ingredientId: string, quantity: number, unit: BaseUnit, expiresAt: string];

const lots: LotTuple[] = [
  ["chicken-0916", "chicken", 6_000, "g", "2026-09-16T23:59:59+03:00"],
  ["chicken-0918", "chicken", 8_000, "g", "2026-09-18T23:59:59+03:00"],
  ["salmon-0916", "salmon", 3_000, "g", "2026-09-16T23:59:59+03:00"],
  ["salmon-0918", "salmon", 2_000, "g", "2026-09-18T23:59:59+03:00"],
  ["cream-cheese-0920", "cream-cheese", 4_000, "g", "2026-09-20T23:59:59+03:00"],
  ["tomato-0917", "tomato", 8_000, "g", "2026-09-17T23:59:59+03:00"],
  ["cucumber-0918", "cucumber", 6_000, "g", "2026-09-18T23:59:59+03:00"],
  ["lettuce-0916", "lettuce", 4_000, "g", "2026-09-16T23:59:59+03:00"],
  ["raspberry-0916", "raspberry", 1_500, "g", "2026-09-16T23:59:59+03:00"],
  ["strawberry-0917", "strawberry", 4_000, "g", "2026-09-17T23:59:59+03:00"],
  ["eggs-1005", "eggs", 120, "pcs", "2026-10-05T23:59:59+03:00"],
  ["croissant-0917", "croissant", 90, "pcs", "2026-09-17T23:59:59+03:00"],
  ["tortilla-0928", "tortilla", 70, "pcs", "2026-09-28T23:59:59+03:00"],
  ["flour-1213", "flour", 18_000, "g", "2026-12-13T23:59:59+02:00"],
  ["sugar-0314", "sugar", 10_000, "g", "2027-03-14T23:59:59+02:00"],
  ["olive-oil-0314", "olive-oil", 8_000, "ml", "2027-03-14T23:59:59+02:00"],
  ["coffee-1114", "coffee", 6_000, "g", "2026-11-14T23:59:59+02:00"],
  ["orange-juice-0928", "orange-juice", 16_000, "ml", "2026-09-28T23:59:59+03:00"],
];

export const demoInventoryLots: InventoryLot[] = lots.map(([id, ingredientId, quantity, unit, expiresAt]) => ({ id, ingredientId, quantity, unit, expiresAt }));
