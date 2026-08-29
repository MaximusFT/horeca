import type { Recipe } from "@/domain/recipe";
import type { BaseUnit } from "@/domain/units";

type IngredientTuple = [ingredientId: string, quantity: number, unit: BaseUnit];

function recipe(id: string, name: string, ingredients: IngredientTuple[]): Recipe {
  return { id, name, ingredients: ingredients.map(([ingredientId, quantity, unit]) => ({ ingredientId, quantity, unit })) };
}

export const demoRecipes: Recipe[] = [
  recipe("ham-croissant", "Ham Croissant", [["croissant", 1, "pcs"], ["ham", 30, "g"], ["cream-cheese", 18, "g"], ["cucumber", 12, "g"], ["lettuce", 2, "g"]]),
  recipe("cheese-croissant", "Cheese Croissant", [["croissant", 1, "pcs"], ["cheddar", 28, "g"], ["cream-cheese", 18, "g"], ["tomato", 15, "g"], ["lettuce", 2, "g"]]),
  recipe("salmon-croissant", "Salmon Croissant", [["croissant", 1, "pcs"], ["salmon", 35, "g"], ["cream-cheese", 22, "g"], ["cucumber", 18, "g"], ["dill", 2, "g"]]),
  recipe("chicken-wrap", "Chicken Wrap", [["tortilla", 1, "pcs"], ["chicken", 90, "g"], ["tomato", 35, "g"], ["cucumber", 25, "g"], ["lettuce", 25, "g"], ["red-onion", 15, "g"], ["mayonnaise", 18, "g"], ["mustard", 5, "g"]]),
  recipe("vegetarian-wrap", "Vegetarian Wrap", [["tortilla", 1, "pcs"], ["avocado", 50, "g"], ["tomato", 35, "g"], ["cucumber", 30, "g"], ["bell-pepper", 30, "g"], ["lettuce", 25, "g"], ["mozzarella", 35, "g"]]),
  recipe("turkey-sandwich", "Turkey Sandwich", [["sandwich-roll", 1, "pcs"], ["turkey", 65, "g"], ["cheddar", 25, "g"], ["tomato", 30, "g"], ["cucumber", 20, "g"], ["lettuce", 15, "g"], ["mayonnaise", 15, "g"]]),
  recipe("caesar-salad", "Caesar Salad", [["chicken", 85, "g"], ["lettuce", 75, "g"], ["tomato", 40, "g"], ["parmesan", 15, "g"], ["mayonnaise", 20, "g"]]),
  recipe("vegetarian-salad", "Vegetarian Salad", [["lettuce", 80, "g"], ["tomato", 60, "g"], ["cucumber", 45, "g"], ["bell-pepper", 35, "g"], ["avocado", 35, "g"], ["olive-oil", 10, "ml"]]),
  recipe("chicken-skewer", "Chicken Skewer", [["chicken", 110, "g"], ["bell-pepper", 35, "g"], ["red-onion", 25, "g"], ["olive-oil", 5, "ml"], ["parsley", 3, "g"]]),
  recipe("caprese-skewer", "Caprese Skewer", [["mozzarella", 50, "g"], ["tomato", 45, "g"], ["parsley", 5, "g"], ["olive-oil", 5, "ml"]]),
  recipe("mini-cheesecake", "Mini Cheesecake", [["cream-cheese", 35, "g"], ["sugar", 12, "g"], ["flour", 8, "g"], ["eggs", 0.2, "pcs"], ["cream", 12, "ml"], ["butter", 5, "g"]]),
  recipe("chocolate-brownie", "Chocolate Brownie", [["flour", 25, "g"], ["sugar", 18, "g"], ["eggs", 0.18, "pcs"], ["butter", 12, "g"]]),
  recipe("berry-dessert-cup", "Berry Dessert Cup", [["strawberry", 30, "g"], ["raspberry", 20, "g"], ["blueberry", 15, "g"], ["cream", 30, "ml"], ["sugar", 8, "g"]]),
  recipe("fruit-cup", "Fruit Cup", [["apple", 45, "g"], ["banana", 40, "g"], ["grapes", 35, "g"], ["orange", 30, "g"], ["strawberry", 20, "g"]]),
  recipe("orange-juice-portion", "Orange Juice Portion", [["orange-juice", 250, "ml"]]),
  recipe("cheese-board", "Cheese Board", [["cheddar", 350, "g"], ["mozzarella", 350, "g"], ["parmesan", 150, "g"], ["grapes", 350, "g"], ["apple", 250, "g"]]),
  recipe("fruit-box", "Fruit Box", [["apple", 450, "g"], ["banana", 400, "g"], ["grapes", 350, "g"], ["orange", 300, "g"], ["strawberry", 250, "g"], ["blueberry", 150, "g"]]),
];
