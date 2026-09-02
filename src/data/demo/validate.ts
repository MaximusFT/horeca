import { z } from "zod";
import { businessSchema } from "@/domain/business";
import { eventSchema } from "@/domain/event";
import { incomingSupplySchema, inventoryLotSchema } from "@/domain/inventory";
import { ingredientSchema } from "@/domain/ingredient";
import { menuItemSchema, type MenuItem } from "@/domain/menu-item";
import { recipeSchema } from "@/domain/recipe";
import { restaurantDaySchema, restaurantDemandLineSchema } from "@/domain/restaurant-demand";
import { demoDataset, type DemoDataset } from "./dataset";

const datasetSchema = z.object({
  business: businessSchema,
  ingredients: z.array(ingredientSchema).min(1),
  recipes: z.array(recipeSchema).min(1),
  menuItems: z.array(menuItemSchema).min(1),
  events: z.array(eventSchema).min(1),
  restaurantCalendar: z.array(restaurantDaySchema).length(14),
  normalRestaurantDemand: z.array(restaurantDemandLineSchema).min(1),
  inventoryLots: z.array(inventoryLotSchema),
  incomingSupply: z.array(incomingSupplySchema),
});

function assertUniqueIds(label: string, values: Array<{ id: string }>): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) throw new Error(`Duplicate ${label} id: ${value.id}`);
    seen.add(value.id);
  }
}

function assertBundleGraphIsAcyclic(menuItems: MenuItem[]): void {
  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string, path: string[]): void => {
    if (visiting.has(id)) throw new Error(`Circular menu composition: ${[...path, id].join(" -> ")}`);
    if (visited.has(id)) return;

    const item = menuById.get(id);
    if (!item) throw new Error(`Unknown menu item: ${id}`);
    if (item.type === "recipe") {
      visited.add(id);
      return;
    }

    visiting.add(id);
    for (const component of item.components) visit(component.menuItemId, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };

  for (const item of menuItems) visit(item.id, []);
}

export function validateDemoDataset(input: DemoDataset = demoDataset): DemoDataset {
  const dataset = datasetSchema.parse(input) as DemoDataset;

  assertUniqueIds("ingredient", dataset.ingredients);
  assertUniqueIds("recipe", dataset.recipes);
  assertUniqueIds("menu item", dataset.menuItems);
  assertUniqueIds("event", dataset.events);
  assertUniqueIds("inventory lot", dataset.inventoryLots);
  assertUniqueIds("incoming supply", dataset.incomingSupply);

  const ingredients = new Map(dataset.ingredients.map((item) => [item.id, item]));
  const recipes = new Set(dataset.recipes.map((item) => item.id));
  const menuItems = new Set(dataset.menuItems.map((item) => item.id));

  for (const recipe of dataset.recipes) {
    for (const line of recipe.ingredients) {
      const ingredient = ingredients.get(line.ingredientId);
      if (!ingredient) throw new Error(`Recipe ${recipe.id} references unknown ingredient ${line.ingredientId}`);
      if (ingredient.unit !== line.unit) throw new Error(`Recipe ${recipe.id} uses invalid unit for ${line.ingredientId}`);
    }
  }

  for (const item of dataset.menuItems) {
    if (item.type === "recipe" && !recipes.has(item.recipeId)) {
      throw new Error(`Menu item ${item.id} references unknown recipe ${item.recipeId}`);
    }
    if (item.type === "bundle") {
      for (const component of item.components) {
        if (!menuItems.has(component.menuItemId)) {
          throw new Error(`Bundle ${item.id} references unknown menu item ${component.menuItemId}`);
        }
      }
    }
  }

  assertBundleGraphIsAcyclic(dataset.menuItems);

  for (const event of dataset.events) {
    if (new Date(event.prepStartsAt) > new Date(event.startsAt)) {
      throw new Error(`Event ${event.id} prep starts after the event`);
    }
    for (const line of event.menu) {
      if (!menuItems.has(line.menuItemId)) throw new Error(`Event ${event.id} references unknown menu item ${line.menuItemId}`);
    }
  }

  const assertIngredientUnit = (context: string, ingredientId: string, unit: string): void => {
    const ingredient = ingredients.get(ingredientId);
    if (!ingredient) throw new Error(`${context} references unknown ingredient ${ingredientId}`);
    if (ingredient.unit !== unit) throw new Error(`${context} uses invalid unit for ${ingredientId}`);
  };

  for (const line of dataset.normalRestaurantDemand) assertIngredientUnit("Restaurant demand", line.ingredientId, line.unit);
  for (const lot of dataset.inventoryLots) assertIngredientUnit(`Inventory lot ${lot.id}`, lot.ingredientId, lot.unit);
  for (const supply of dataset.incomingSupply) {
    for (const line of supply.lines) assertIngredientUnit(`Incoming supply ${supply.id}`, line.ingredientId, line.unit);
  }

  const calendarDates = dataset.restaurantCalendar.map((day) => day.date);
  if (new Set(calendarDates).size !== 14 || calendarDates[0] !== "2026-09-15" || calendarDates[13] !== "2026-09-28") {
    throw new Error("Restaurant calendar must cover 15–28 September 2026 exactly once");
  }

  return dataset;
}
