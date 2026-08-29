import { describe, expect, it } from "vitest";
import { roundToPackages } from "@/engine/package-rounding";

describe("package rounding", () => {
  it("rounds a base-unit requirement up to whole supplier packages", () => {
    expect(roundToPackages(1_001, 500, 7_500)).toEqual({
      packageCount: 3,
      suppliedQuantity: 1_500,
      surplusQuantity: 499,
      totalMinor: 22_500,
    });
  });

  it("does not add a package when the requirement is already exact", () => {
    expect(roundToPackages(2_000, 500, 7_500).packageCount).toBe(4);
    expect(roundToPackages(2_000, 500, 7_500).surplusQuantity).toBe(0);
  });

  it("rejects invalid package inputs", () => {
    expect(() => roundToPackages(100, 0, 100)).toThrow(/Package size/);
    expect(() => roundToPackages(-1, 100, 100)).toThrow(/Required quantity/);
    expect(() => roundToPackages(1, 100, 10.5)).toThrow(/minor units/);
  });
});
