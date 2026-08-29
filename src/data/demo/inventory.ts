import type { InventoryLot } from "@/domain/inventory";
import type { BaseUnit } from "@/domain/units";

type LotTuple = [id: string, ingredientId: string, quantity: number, unit: BaseUnit, expiresAt: string];

const lots: LotTuple[] = [
  ["chicken-0902", "chicken", 6_000, "g", "2026-09-02T23:59:59+03:00"],
  ["chicken-0904", "chicken", 8_000, "g", "2026-09-04T23:59:59+03:00"],
  ["salmon-0902", "salmon", 3_000, "g", "2026-09-02T23:59:59+03:00"],
  ["salmon-0904", "salmon", 2_000, "g", "2026-09-04T23:59:59+03:00"],
  ["cream-cheese-0906", "cream-cheese", 4_000, "g", "2026-09-06T23:59:59+03:00"],
  ["tomato-0903", "tomato", 8_000, "g", "2026-09-03T23:59:59+03:00"],
  ["cucumber-0904", "cucumber", 6_000, "g", "2026-09-04T23:59:59+03:00"],
  ["lettuce-0902", "lettuce", 4_000, "g", "2026-09-02T23:59:59+03:00"],
  ["raspberry-0902", "raspberry", 1_500, "g", "2026-09-02T23:59:59+03:00"],
  ["strawberry-0903", "strawberry", 4_000, "g", "2026-09-03T23:59:59+03:00"],
  ["eggs-0921", "eggs", 120, "pcs", "2026-09-21T23:59:59+03:00"],
  ["croissant-0903", "croissant", 90, "pcs", "2026-09-03T23:59:59+03:00"],
  ["tortilla-0914", "tortilla", 70, "pcs", "2026-09-14T23:59:59+03:00"],
  ["flour-1129", "flour", 18_000, "g", "2026-11-29T23:59:59+02:00"],
  ["sugar-0228", "sugar", 10_000, "g", "2027-02-28T23:59:59+02:00"],
  ["olive-oil-0228", "olive-oil", 8_000, "ml", "2027-02-28T23:59:59+02:00"],
  ["coffee-1031", "coffee", 6_000, "g", "2026-10-31T23:59:59+02:00"],
  ["orange-juice-0914", "orange-juice", 16_000, "ml", "2026-09-14T23:59:59+03:00"],
];

export const demoInventoryLots: InventoryLot[] = lots.map(([id, ingredientId, quantity, unit, expiresAt]) => ({ id, ingredientId, quantity, unit, expiresAt }));
