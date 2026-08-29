import type { z } from "zod";
import type { DemandRequirement } from "@/domain/demand";
import type { restaurantDaySchema, restaurantDemandLineSchema } from "@/domain/restaurant-demand";
import { RESTAURANT_LOAD_FACTORS } from "@/data/demo/restaurant-demand";

type RestaurantDay = z.infer<typeof restaurantDaySchema>;
type RestaurantDemandLine = z.infer<typeof restaurantDemandLineSchema>;

export function calculateRestaurantDemand(
  calendar: RestaurantDay[],
  normalDemand: RestaurantDemandLine[],
): DemandRequirement[] {
  return calendar.flatMap((day) => {
    const factor = RESTAURANT_LOAD_FACTORS[day.load];
    return normalDemand.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.normalQuantity * factor,
      unit: line.unit,
      requiredAt: `${day.date}T08:00:00+03:00`,
      source: { type: "restaurant" as const, date: day.date, load: day.load },
    }));
  });
}
