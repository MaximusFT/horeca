import type { DemoDataset } from "@/data/demo/dataset";
import { validateDemoDataset } from "@/data/demo/validate";
import { aggregateDemand, type AggregatedDemandRequirement } from "./aggregate-demand";
import { calculateAllEventDemand } from "./calculate-event-demand";
import { calculateRestaurantDemand } from "./calculate-restaurant-demand";

export interface DemandPlan {
  startsOn: string;
  endsOn: string;
  requirements: AggregatedDemandRequirement[];
}

export function calculateDemandPlan(input?: DemoDataset): DemandPlan {
  const dataset = validateDemoDataset(input);
  const restaurant = calculateRestaurantDemand(dataset.restaurantCalendar, dataset.normalRestaurantDemand);
  const events = calculateAllEventDemand(dataset.events, dataset.menuItems, dataset.recipes);

  return {
    startsOn: dataset.restaurantCalendar[0].date,
    endsOn: dataset.restaurantCalendar.at(-1)!.date,
    requirements: aggregateDemand([...restaurant, ...events]),
  };
}
