import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo/dataset";
import { validateDemoDataset } from "@/data/demo/validate";
import type { DemoDataset } from "@/data/demo/dataset";
import { DEMO_PERIOD } from "@/lib/demo-clock";

describe("Misto Kitchen demo dataset", () => {
  it("loads the complete validated demo business", () => {
    const result = validateDemoDataset();

    expect(result.business.name).toBe("Misto Kitchen");
    expect(result.ingredients).toHaveLength(38);
    expect(result.events).toHaveLength(5);
    expect(result.events.reduce((sum, event) => sum + event.guestCount, 0)).toBe(445);
    expect(result.restaurantCalendar).toHaveLength(14);
  });

  it("rejects circular bundle composition", () => {
    const cyclic = structuredClone(demoDataset) as DemoDataset;
    cyclic.menuItems.push({
      id: "cycle-a",
      name: "Cycle A",
      type: "bundle",
      components: [{ menuItemId: "cycle-b", quantity: 1 }],
    });
    cyclic.menuItems.push({
      id: "cycle-b",
      name: "Cycle B",
      type: "bundle",
      components: [{ menuItemId: "cycle-a", quantity: 1 }],
    });

    expect(() => validateDemoDataset(cyclic)).toThrow(/Circular menu composition/);
  });

  it("keeps calendar and events inside the configured demo horizon", () => {
    expect(demoDataset.restaurantCalendar[0].date).toBe(DEMO_PERIOD.startsOn);
    expect(demoDataset.restaurantCalendar.at(-1)?.date).toBe(DEMO_PERIOD.endsOn);
    expect(
      demoDataset.events.every((event) => {
        const date = event.startsAt.slice(0, 10);
        return date >= DEMO_PERIOD.startsOn && date <= DEMO_PERIOD.endsOn;
      }),
    ).toBe(true);
  });
});
