import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo/dataset";
import { validateDemoDataset } from "@/data/demo/validate";
import type { DemoDataset } from "@/data/demo/dataset";

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
});
