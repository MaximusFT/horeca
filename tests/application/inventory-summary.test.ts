import { describe, expect, it } from "vitest";
import { buildInventorySummary } from "@/application/inventory-summary";
import { demoDataset } from "@/data/demo/dataset";
import { calculateDemoProcurementPlan } from "@/engine/calculate-procurement-plan";
import { DemoClock } from "@/lib/demo-clock";

describe("inventory summary", () => {
  it("distinguishes low stock, confirmed coverage and expiry risk", () => {
    const clock = new DemoClock();
    const rows = buildInventorySummary(
      demoDataset.ingredients,
      demoDataset.inventoryLots,
      demoDataset.incomingSupply,
      calculateDemoProcurementPlan(demoDataset, clock),
      clock.now(),
    );

    expect(rows).toHaveLength(demoDataset.ingredients.length);
    expect(rows.find((row) => row.ingredientId === "raspberry")?.status).toBe("expiry_risk");
    expect(rows.find((row) => row.ingredientId === "blueberry")?.status).toBe("low");
    expect(rows.find((row) => row.ingredientId === "avocado")).toMatchObject({
      onHand: 0,
      confirmedIncoming: 3_000,
      status: "covered",
    });
    expect(rows.find((row) => row.ingredientId === "flour")?.status).toBe("good");
  });
});
