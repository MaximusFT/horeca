import { z } from "zod";

export const businessSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  timeZone: z.string().min(1),
  locationName: z.string().min(1),
  seatCount: z.number().int().positive(),
});
export type Business = z.infer<typeof businessSchema>;
