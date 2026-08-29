import { z } from "zod";
import { baseUnitSchema } from "./units";

export const restaurantLoadSchema = z.enum(["quiet", "normal", "busy", "peak"]);
export type RestaurantLoad = z.infer<typeof restaurantLoadSchema>;

export const restaurantDaySchema = z.object({
  date: z.string().date(),
  load: restaurantLoadSchema,
});

export const restaurantDemandLineSchema = z.object({
  ingredientId: z.string().min(1),
  normalQuantity: z.number().nonnegative(),
  unit: baseUnitSchema,
});
