import { z } from "zod";
import { baseUnitSchema } from "./units";

export const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: baseUnitSchema,
  shelfLifeDays: z.number().int().positive(),
  safetyStock: z.number().nonnegative(),
});
export type Ingredient = z.infer<typeof ingredientSchema>;
