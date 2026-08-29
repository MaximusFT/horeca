import type { z } from "zod";
import type { restaurantDaySchema, restaurantDemandLineSchema, RestaurantLoad } from "@/domain/restaurant-demand";

export const RESTAURANT_LOAD_FACTORS: Record<RestaurantLoad, number> = {
  quiet: 0.75,
  normal: 1,
  busy: 1.25,
  peak: 1.55,
};

export const demoRestaurantCalendar: z.infer<typeof restaurantDaySchema>[] = [
  ["2026-09-01", "normal"], ["2026-09-02", "normal"], ["2026-09-03", "normal"],
  ["2026-09-04", "busy"], ["2026-09-05", "peak"], ["2026-09-06", "busy"],
  ["2026-09-07", "quiet"], ["2026-09-08", "normal"], ["2026-09-09", "normal"],
  ["2026-09-10", "normal"], ["2026-09-11", "busy"], ["2026-09-12", "peak"],
  ["2026-09-13", "busy"], ["2026-09-14", "quiet"],
].map(([date, load]) => ({ date, load })) as z.infer<typeof restaurantDaySchema>[];

export const demoNormalRestaurantDemand: z.infer<typeof restaurantDemandLineSchema>[] = [
  ["chicken", 4_800, "g"], ["salmon", 1_600, "g"], ["ham", 1_100, "g"],
  ["turkey", 1_000, "g"], ["eggs", 48, "pcs"], ["croissant", 40, "pcs"],
  ["tortilla", 32, "pcs"], ["sandwich-roll", 20, "pcs"], ["cream-cheese", 1_100, "g"],
  ["cheddar", 800, "g"], ["mozzarella", 700, "g"], ["parmesan", 350, "g"],
  ["butter", 450, "g"], ["cream", 1_000, "ml"], ["tomato", 4_000, "g"],
  ["cucumber", 3_000, "g"], ["lettuce", 2_500, "g"], ["bell-pepper", 1_400, "g"],
  ["red-onion", 900, "g"], ["avocado", 1_200, "g"], ["dill", 120, "g"],
  ["parsley", 100, "g"], ["apple", 2_500, "g"], ["banana", 2_000, "g"],
  ["grapes", 1_200, "g"], ["strawberry", 1_000, "g"], ["raspberry", 300, "g"],
  ["blueberry", 350, "g"], ["orange", 2_000, "g"], ["flour", 1_600, "g"],
  ["sugar", 800, "g"], ["olive-oil", 400, "ml"], ["mayonnaise", 600, "g"],
  ["mustard", 150, "g"], ["coffee", 800, "g"], ["orange-juice", 4_000, "ml"],
].map(([ingredientId, normalQuantity, unit]) => ({ ingredientId, normalQuantity, unit })) as z.infer<typeof restaurantDemandLineSchema>[];
