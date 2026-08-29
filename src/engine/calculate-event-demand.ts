import type { DemandRequirement } from "@/domain/demand";
import type { Event } from "@/domain/event";
import type { MenuItem } from "@/domain/menu-item";
import type { Recipe } from "@/domain/recipe";
import { expandMenuItem } from "./expand-menu-item";

export function calculateEventDemand(event: Event, menuItems: MenuItem[], recipes: Recipe[]): DemandRequirement[] {
  if (event.status === "cancelled") return [];

  return event.menu.flatMap((line) => {
    const portions = line.mode === "fixed"
      ? line.quantity
      : Math.round((line.quantityPerGuest * event.guestCount + Number.EPSILON) * 1_000_000) / 1_000_000;
    return expandMenuItem(line.menuItemId, portions, menuItems, recipes).map((ingredient) => ({
      ...ingredient,
      requiredAt: event.prepStartsAt,
      source: {
        type: "event" as const,
        eventId: event.id,
        eventName: event.name,
        menuItemId: line.menuItemId,
      },
    }));
  });
}

export function calculateAllEventDemand(events: Event[], menuItems: MenuItem[], recipes: Recipe[]): DemandRequirement[] {
  return events.flatMap((event) => calculateEventDemand(event, menuItems, recipes));
}
