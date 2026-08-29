import { describe, expect, it } from "vitest";
import { buildOverviewSummary } from "@/application/overview-summary";
import { demoDataset } from "@/data/demo/dataset";
import { calculateDemoProcurementPlan } from "@/engine/calculate-procurement-plan";
import { DemoClock } from "@/lib/demo-clock";

describe("Overview summary", () => {
  it("derives the baseline metrics and 14-day operating timeline", () => {
    const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock());
    const summary = buildOverviewSummary(demoDataset, plan);
    const weddingDay = summary.timeline.find((day) => day.date === "2026-09-13");

    expect(summary.guestTotal).toBe(445);
    expect(summary.eventCount).toBe(5);
    expect(summary.batchCount).toBe(plan.batches.length);
    expect(summary.timeline).toHaveLength(14);
    expect(weddingDay).toMatchObject({ load: "busy", loadFactor: 1.25 });
    expect(weddingDay?.events[0]).toMatchObject({ id: "wedding", guestCount: 180 });
  });

  it("keeps demand-source totals separated by compatible units", () => {
    const summary = buildOverviewSummary(
      demoDataset,
      calculateDemoProcurementPlan(demoDataset, new DemoClock()),
    );

    expect(summary.demandSplit.map((item) => item.unit)).toEqual(["g", "ml", "pcs"]);
    expect(summary.demandSplit.every((item) => item.restaurant > 0 && item.events > 0)).toBe(true);
    expect(summary.demandSplit.every((item) => item.restaurantPercent + item.eventPercent >= 99)).toBe(true);
  });
});
