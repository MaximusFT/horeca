import { z } from "zod";

export const approvalSchema = z.object({
  id: z.string(),
  actionType: z.string(),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
  createdAt: z.string().datetime({ offset: true }),
});
