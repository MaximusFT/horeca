import { z } from "zod";
import { baseUnitSchema } from "./units";

export const inventoryLotSchema = z.object({
  id: z.string().min(1),
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: baseUnitSchema,
  expiresAt: z.string().datetime({ offset: true }),
});
export type InventoryLot = z.infer<typeof inventoryLotSchema>;

export const incomingSupplyLineSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unit: baseUnitSchema,
});

export const incomingSupplySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arrivesAt: z.string().datetime({ offset: true }),
  lines: z.array(incomingSupplyLineSchema).min(1),
});
export type IncomingSupply = z.infer<typeof incomingSupplySchema>;
