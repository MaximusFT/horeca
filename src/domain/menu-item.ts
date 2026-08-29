import { z } from "zod";

export const recipeMenuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("recipe"),
  recipeId: z.string().min(1),
});

export const bundleMenuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("bundle"),
  components: z.array(z.object({ menuItemId: z.string().min(1), quantity: z.number().positive() })).min(1),
});

export const menuItemSchema = z.discriminatedUnion("type", [
  recipeMenuItemSchema,
  bundleMenuItemSchema,
]);
export type MenuItem = z.infer<typeof menuItemSchema>;
export type BundleMenuItem = z.infer<typeof bundleMenuItemSchema>;
