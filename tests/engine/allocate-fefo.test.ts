import { describe, expect, it } from "vitest";
import { allocateFefo, type ProjectedLot } from "@/engine/allocate-fefo";

describe("allocateFefo", () => {
  it("uses the earliest-expiring lot first without mutating the input", () => {
    const lots: ProjectedLot[] = [
      lot("later", 8_000, "2026-09-05T23:59:59+03:00"),
      lot("earlier", 6_000, "2026-09-02T23:59:59+03:00"),
    ];

    const result = allocateFefo(lots, 10_000, "g");

    expect(result.allocations).toEqual([
      expect.objectContaining({ lotId: "earlier", quantity: 6_000 }),
      expect.objectContaining({ lotId: "later", quantity: 4_000 }),
    ]);
    expect(result.remainingLots).toEqual([expect.objectContaining({ id: "later", quantity: 4_000 })]);
    expect(result.unmetQuantity).toBe(0);
    expect(lots[0].quantity).toBe(8_000);
  });
});

function lot(id: string, quantity: number, expiresAt: string): ProjectedLot {
  return {
    id,
    ingredientId: "chicken",
    quantity,
    unit: "g",
    availableAt: "2026-09-01T08:00:00+03:00",
    expiresAt,
    sourceType: "inventory",
    sourceId: id,
  };
}
