import type { MenuItem } from "@/domain/menu-item";

const recipeItems: MenuItem[] = [
  "ham-croissant", "cheese-croissant", "salmon-croissant", "chicken-wrap",
  "vegetarian-wrap", "turkey-sandwich", "caesar-salad", "vegetarian-salad",
  "chicken-skewer", "caprese-skewer", "mini-cheesecake", "chocolate-brownie",
  "berry-dessert-cup", "fruit-cup", "orange-juice-portion", "cheese-board", "fruit-box",
].map((id) => ({ id, name: id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "), type: "recipe", recipeId: id }));

export const demoMenuItems: MenuItem[] = [
  ...recipeItems,
  {
    id: "mini-croissant-box",
    name: "Mini Croissant Box — 18 pcs",
    type: "bundle",
    components: [
      { menuItemId: "ham-croissant", quantity: 6 },
      { menuItemId: "cheese-croissant", quantity: 6 },
      { menuItemId: "salmon-croissant", quantity: 6 },
    ],
  },
  {
    id: "premium-croissant-box",
    name: "Premium Croissant Box — 18 pcs",
    type: "bundle",
    components: [
      { menuItemId: "ham-croissant", quantity: 3 },
      { menuItemId: "cheese-croissant", quantity: 6 },
      { menuItemId: "salmon-croissant", quantity: 9 },
    ],
  },
  {
    id: "sandwich-selection-box",
    name: "Sandwich Selection Box — 12 pcs",
    type: "bundle",
    components: [
      { menuItemId: "turkey-sandwich", quantity: 6 },
      { menuItemId: "chicken-wrap", quantity: 3 },
      { menuItemId: "vegetarian-wrap", quantity: 3 },
    ],
  },
  {
    id: "breakfast-box",
    name: "Breakfast Box — 10 guests",
    type: "bundle",
    components: [
      { menuItemId: "ham-croissant", quantity: 10 },
      { menuItemId: "fruit-cup", quantity: 10 },
      { menuItemId: "orange-juice-portion", quantity: 10 },
    ],
  },
  {
    id: "chicken-lunch-set",
    name: "Chicken Lunch Set",
    type: "bundle",
    components: [
      { menuItemId: "chicken-wrap", quantity: 1 },
      { menuItemId: "caesar-salad", quantity: 1 },
      { menuItemId: "mini-cheesecake", quantity: 1 },
    ],
  },
  {
    id: "vegetarian-lunch-set",
    name: "Vegetarian Lunch Set",
    type: "bundle",
    components: [
      { menuItemId: "vegetarian-wrap", quantity: 1 },
      { menuItemId: "vegetarian-salad", quantity: 1 },
      { menuItemId: "berry-dessert-cup", quantity: 1 },
    ],
  },
];
