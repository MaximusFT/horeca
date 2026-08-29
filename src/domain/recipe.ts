import { z } from "zod";
import { baseUnitSchema } from "./units";

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unit: baseUnitSchema,
});

export const recipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ingredients: z.array(recipeIngredientSchema).min(1),
});
export type Recipe = z.infer<typeof recipeSchema>;
