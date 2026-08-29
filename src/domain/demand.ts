import { z } from "zod";
import { baseUnitSchema } from "./units";

export const demandSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("restaurant"), date: z.string().date(), load: z.string() }),
  z.object({ type: z.literal("event"), eventId: z.string(), eventName: z.string(), menuItemId: z.string() }),
]);

export const demandRequirementSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().nonnegative(),
  unit: baseUnitSchema,
  requiredAt: z.string().datetime({ offset: true }),
  source: demandSourceSchema,
});
export type DemandRequirement = z.infer<typeof demandRequirementSchema>;
