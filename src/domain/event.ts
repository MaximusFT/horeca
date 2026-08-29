import { z } from "zod";

export const eventMenuLineSchema = z.discriminatedUnion("mode", [
  z.object({ menuItemId: z.string().min(1), mode: z.literal("fixed"), quantity: z.number().nonnegative() }),
  z.object({
    menuItemId: z.string().min(1),
    mode: z.literal("per_guest"),
    quantityPerGuest: z.number().nonnegative(),
  }),
]);

export const eventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  prepStartsAt: z.string().datetime({ offset: true }),
  guestCount: z.number().int().nonnegative(),
  menu: z.array(eventMenuLineSchema).min(1),
  status: z.enum(["confirmed", "draft", "cancelled"]),
});
export type Event = z.infer<typeof eventSchema>;
