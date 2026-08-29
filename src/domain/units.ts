import { z } from "zod";

export const baseUnitSchema = z.enum(["g", "ml", "pcs"]);
export type BaseUnit = z.infer<typeof baseUnitSchema>;

export const quantitySchema = z.object({
  quantity: z.number().nonnegative(),
  unit: baseUnitSchema,
});
export type Quantity = z.infer<typeof quantitySchema>;
