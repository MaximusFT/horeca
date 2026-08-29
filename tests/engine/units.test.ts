import { describe, expect, it } from "vitest";
import { formatQuantity, normalizeQuantity, toBaseUnit } from "@/engine/units";

describe("quantity normalization", () => {
  it("converts kilograms and litres to engine base units", () => {
    expect(toBaseUnit(4.8, "kg")).toEqual({ quantity: 4_800, unit: "g" });
    expect(toBaseUnit(2, "l")).toEqual({ quantity: 2_000, unit: "ml" });
    expect(normalizeQuantity(12, "pcs", "pcs")).toBe(12);
  });

  it("rejects incompatible units", () => {
    expect(() => normalizeQuantity(1, "kg", "ml")).toThrow(/Cannot convert/);
  });

  it("formats human-readable quantities", () => {
    expect(formatQuantity(2_450, "g")).toBe("2.45 kg");
    expect(formatQuantity(120, "pcs")).toBe("120 pcs");
  });
});
