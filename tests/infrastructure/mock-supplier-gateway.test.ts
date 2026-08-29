import { describe, expect, it } from "vitest";
import { demoIngredients } from "@/data/demo/ingredients";
import { mockIngredientSupplierProfiles, mockSupplierCatalog, preferredMockProductByIngredient } from "@/data/demo/mock-supplier-catalog";
import { MockSupplierGateway } from "@/infrastructure/mock-supplier-gateway";

describe("MockSupplierGateway", () => {
  it("has a preferred product mapping for every demo ingredient", () => {
    expect(Object.keys(preferredMockProductByIngredient)).toHaveLength(demoIngredients.length);
    expect(mockIngredientSupplierProfiles).toHaveLength(demoIngredients.length);
    for (const ingredient of demoIngredients) {
      expect(mockSupplierCatalog.some((product) => product.id === preferredMockProductByIngredient[ingredient.id])).toBe(true);
      expect(mockIngredientSupplierProfiles.find((profile) => profile.ingredientId === ingredient.id)?.searchQuery).toContain(ingredient.name);
    }
  });

  it("reports the preferred salmon SKU unavailable and offers the explicit alternative", async () => {
    const gateway = new MockSupplierGateway();
    const [result] = await gateway.searchProducts([{
      lineId: "line-salmon",
      ingredientId: "salmon",
      requiredQuantity: 2_100,
      unit: "g",
      preferredProductId: preferredMockProductByIngredient.salmon,
    }]);

    expect(result.status).toBe("unavailable");
    expect(result.product?.id).toBe("mock-salmon-premium-500");
    expect(await gateway.findReplacements(result.product!.id)).toEqual([
      expect.objectContaining({ id: "mock-salmon-fillet-400", available: true, ingredientId: "salmon" }),
    ]);
  });

  it("adds or updates requested products without clearing unrelated mock cart lines", async () => {
    const gateway = new MockSupplierGateway();
    const deliveryOptionId = "mock-delivery-2026-09-13";
    const chickenId = preferredMockProductByIngredient.chicken;
    const eggsId = preferredMockProductByIngredient.eggs;
    const chicken = await gateway.getProductDetails(chickenId);
    const eggs = await gateway.getProductDetails(eggsId);

    const first = await gateway.prepareCart({
      reference: "first",
      deliveryOptionId,
      lines: [draftLine("chicken", chickenId, "g", 500)],
    });
    await gateway.applyCart(first);
    const second = await gateway.prepareCart({
      reference: "second",
      deliveryOptionId,
      lines: [draftLine("eggs", eggsId, "pcs", 10)],
    });
    const cart = await gateway.applyCart(second);

    expect(cart.lines.map((line) => line.productId)).toEqual([chicken.id, eggs.id]);
  });
});

function draftLine(ingredientId: string, productId: string, unit: "g" | "ml" | "pcs", quantity: number) {
  return {
    lineId: `line-${ingredientId}`,
    ingredientId,
    requiredQuantity: quantity,
    unit,
    productId,
    packageCount: 1,
    suppliedQuantity: quantity,
    surplusQuantity: 0,
  };
}
