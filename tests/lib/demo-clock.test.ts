import { describe, expect, it } from "vitest";
import { DemoClock } from "@/lib/demo-clock";
import { formatBusinessDate } from "@/lib/dates";

describe("DemoClock", () => {
  it("fixes the scenario at 1 September 2026 08:00 in Kyiv", () => {
    expect(formatBusinessDate(new DemoClock().now())).toBe("2026-09-01 08:00");
  });
});
