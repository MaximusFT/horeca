import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo/dataset";
import { demoEvents } from "@/data/demo/events";
import { demoMenuItems } from "@/data/demo/menu-items";
import { demoRecipes } from "@/data/demo/recipes";
import { demoNormalRestaurantDemand, demoRestaurantCalendar } from "@/data/demo/restaurant-demand";
import type { Event } from "@/domain/event";
import type { MenuItem } from "@/domain/menu-item";
import { calculateDemandPlan } from "@/engine/calculate-demand-plan";
import { calculateEventDemand } from "@/engine/calculate-event-demand";
import { calculateRestaurantDemand } from "@/engine/calculate-restaurant-demand";
import { expandMenuItem } from "@/engine/expand-menu-item";

describe("recursive BOM expansion", () => {
  it("expands a Premium Croissant Box correctly", () => {
    const result = expandMenuItem("premium-croissant-box", 1, demoMenuItems, demoRecipes);
    const amount = (ingredientId: string) => result.find((line) => line.ingredientId === ingredientId)?.quantity;

    expect(amount("croissant")).toBe(18);
    expect(amount("ham")).toBe(90);
    expect(amount("cheddar")).toBe(168);
    expect(amount("salmon")).toBe(315);
    expect(amount("cream-cheese")).toBe(360);
  });

  it("fails cleanly for circular bundles at runtime", () => {
    const cyclic: MenuItem[] = [
      { id: "a", name: "A", type: "bundle", components: [{ menuItemId: "b", quantity: 1 }] },
      { id: "b", name: "B", type: "bundle", components: [{ menuItemId: "a", quantity: 1 }] },
    ];

    expect(() => expandMenuItem("a", 1, cyclic, [])).toThrow(/Circular menu composition/);
  });
});

describe("event demand", () => {
  const wedding = demoEvents.find((event) => event.id === "wedding")!;

  it("calculates Wedding 180 portions from guest-based menu lines", () => {
    const result = calculateEventDemand(wedding, demoMenuItems, demoRecipes);
    const salmon = result.find((line) => line.source.type === "event" && line.source.menuItemId === "salmon-croissant" && line.ingredientId === "salmon");
    const chicken = result.filter((line) => line.ingredientId === "chicken").reduce((sum, line) => sum + line.quantity, 0);

    expect(salmon?.quantity).toBe(2_205);
    expect(chicken).toBe(24_570);
  });

  it("calculates Wedding 200 portions after changing only guestCount", () => {
    const changed: Event = { ...wedding, guestCount: 200 };
    const result = calculateEventDemand(changed, demoMenuItems, demoRecipes);
    const salmon = result.find((line) => line.source.type === "event" && line.source.menuItemId === "salmon-croissant" && line.ingredientId === "salmon");
    const croissants = result.filter((line) => line.ingredientId === "croissant").reduce((sum, line) => sum + line.quantity, 0);

    expect(salmon?.quantity).toBe(2_450);
    expect(croissants).toBe(200);
  });
});

describe("restaurant demand", () => {
  it("applies the PEAK factor of 1.55", () => {
    const result = calculateRestaurantDemand(demoRestaurantCalendar, demoNormalRestaurantDemand);
    const peakChicken = result.find((line) => line.requiredAt.startsWith("2026-09-19") && line.ingredientId === "chicken");

    expect(peakChicken?.quantity).toBe(7_440);
    expect(peakChicken?.source).toMatchObject({ type: "restaurant", load: "peak" });
  });
});

describe("14-day demand plan", () => {
  it("combines restaurant operations and five events with provenance", () => {
    const plan = calculateDemandPlan(demoDataset);
    const eventContribution = plan.requirements
      .flatMap((requirement) => requirement.contributions)
      .find((line) => line.source.type === "event" && line.source.eventId === "wedding");

    expect(plan.startsOn).toBe("2026-09-15");
    expect(plan.endsOn).toBe("2026-09-28");
    expect(plan.requirements.length).toBeGreaterThan(14 * 30);
    expect(eventContribution).toBeDefined();
  });
});
