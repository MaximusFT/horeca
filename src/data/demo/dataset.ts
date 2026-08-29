import { demoBusiness } from "./business";
import { demoEvents } from "./events";
import { demoIncomingSupply } from "./incoming-supply";
import { demoIngredients } from "./ingredients";
import { demoInventoryLots } from "./inventory";
import { demoMenuItems } from "./menu-items";
import { demoRecipes } from "./recipes";
import { demoNormalRestaurantDemand, demoRestaurantCalendar } from "./restaurant-demand";

export const demoDataset = {
  business: demoBusiness,
  ingredients: demoIngredients,
  recipes: demoRecipes,
  menuItems: demoMenuItems,
  events: demoEvents,
  restaurantCalendar: demoRestaurantCalendar,
  normalRestaurantDemand: demoNormalRestaurantDemand,
  inventoryLots: demoInventoryLots,
  incomingSupply: demoIncomingSupply,
};

export type DemoDataset = typeof demoDataset;
