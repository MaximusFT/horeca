import type { BaseUnit } from "@/domain/units";
import type { MenuItem } from "@/domain/menu-item";
import type { Recipe } from "@/domain/recipe";

export interface ExpandedIngredient {
  ingredientId: string;
  quantity: number;
  unit: BaseUnit;
}

export function expandMenuItem(
  menuItemId: string,
  quantity: number,
  menuItems: MenuItem[],
  recipes: Recipe[],
): ExpandedIngredient[] {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Menu item quantity must be non-negative");

  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const recipeById = new Map(recipes.map((item) => [item.id, item]));

  const expand = (id: string, multiplier: number, path: string[]): ExpandedIngredient[] => {
    if (path.includes(id)) throw new Error(`Circular menu composition: ${[...path, id].join(" -> ")}`);
    const item = menuById.get(id);
    if (!item) throw new Error(`Unknown menu item: ${id}`);

    if (item.type === "recipe") {
      const recipe = recipeById.get(item.recipeId);
      if (!recipe) throw new Error(`Unknown recipe: ${item.recipeId}`);
      return recipe.ingredients.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: roundQuantity(line.quantity * multiplier),
        unit: line.unit,
      }));
    }

    return item.components.flatMap((component) =>
      expand(component.menuItemId, multiplier * component.quantity, [...path, id]),
    );
  };

  return aggregateExpanded(expand(menuItemId, quantity, []));
}

function aggregateExpanded(lines: ExpandedIngredient[]): ExpandedIngredient[] {
  const result = new Map<string, ExpandedIngredient>();
  for (const line of lines) {
    const key = `${line.ingredientId}:${line.unit}`;
    const current = result.get(key);
    if (current) current.quantity = roundQuantity(current.quantity + line.quantity);
    else result.set(key, { ...line });
  }
  return [...result.values()];
}

function roundQuantity(quantity: number): number {
  return Math.round((quantity + Number.EPSILON) * 1_000_000) / 1_000_000;
}
