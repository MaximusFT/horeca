import type { BaseUnit } from "@/domain/units";
import type { IngredientSupplierProfile, SupplierProduct } from "@/domain/supplier";
import { demoIngredients } from "./ingredients";

const packageOverrides: Partial<Record<string, number>> = {
  croissant: 12,
  tortilla: 8,
  baguette: 6,
  "sandwich-roll": 6,
  eggs: 10,
  dill: 100,
  parsley: 100,
  strawberry: 250,
  raspberry: 250,
  blueberry: 250,
  cream: 500,
  flour: 1_000,
  sugar: 1_000,
  coffee: 1_000,
};

function packageSize(ingredientId: string, unit: BaseUnit): number {
  return packageOverrides[ingredientId] ?? (unit === "pcs" ? 10 : unit === "ml" ? 1_000 : 500);
}

const regularProducts = demoIngredients
  .filter((ingredient) => ingredient.id !== "salmon")
  .map((ingredient, index): SupplierProduct => ({
    id: `mock-${ingredient.id}-${packageSize(ingredient.id, ingredient.unit)}`,
    ingredientId: ingredient.id,
    name: `Misto Mock ${ingredient.name}`,
    packageSize: packageSize(ingredient.id, ingredient.unit),
    unit: ingredient.unit,
    priceMinor: 2_900 + index * 173,
    currency: "UAH",
    available: true,
    description: "Synthetic demo product. No real supplier listing or price is implied.",
  }));

export const mockSupplierCatalog: SupplierProduct[] = [
  ...regularProducts,
  {
    id: "mock-salmon-premium-500",
    ingredientId: "salmon",
    name: "Misto Mock premium salmon fillet",
    packageSize: 500,
    unit: "g",
    priceMinor: 18_900,
    currency: "UAH",
    available: false,
    description: "Synthetic preferred demo SKU, intentionally unavailable for the approval scenario.",
  },
  {
    id: "mock-salmon-fillet-400",
    ingredientId: "salmon",
    name: "Misto Mock salmon fillet alternative",
    packageSize: 400,
    unit: "g",
    priceMinor: 15_900,
    currency: "UAH",
    available: true,
    description: "Synthetic replacement SKU used only after explicit human approval.",
  },
];

export const mockIngredientSupplierProfiles: IngredientSupplierProfile[] = demoIngredients.map((ingredient) => ({
  ingredientId: ingredient.id,
  searchQuery: `${ingredient.name} ${ingredient.unit}`,
  preferredProductId: ingredient.id === "salmon"
    ? "mock-salmon-premium-500"
    : mockSupplierCatalog.find((product) => product.ingredientId === ingredient.id)!.id,
}));

export const preferredMockProductByIngredient = Object.fromEntries(
  mockIngredientSupplierProfiles.map((profile) => [profile.ingredientId, profile.preferredProductId]),
) as Record<string, string>;
