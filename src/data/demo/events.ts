import type { Event } from "@/domain/event";

export const demoEvents: Event[] = [
  {
    id: "birthday-breakfast",
    name: "Birthday Breakfast",
    startsAt: "2026-09-02T09:00:00+03:00",
    prepStartsAt: "2026-09-02T07:00:00+03:00",
    guestCount: 20,
    menu: [
      { menuItemId: "breakfast-box", mode: "fixed", quantity: 2 },
      { menuItemId: "mini-croissant-box", mode: "fixed", quantity: 1 },
    ],
    status: "confirmed",
  },
  {
    id: "office-lunch",
    name: "Office Lunch",
    startsAt: "2026-09-04T13:00:00+03:00",
    prepStartsAt: "2026-09-04T08:00:00+03:00",
    guestCount: 55,
    menu: [
      { menuItemId: "chicken-lunch-set", mode: "fixed", quantity: 35 },
      { menuItemId: "vegetarian-lunch-set", mode: "fixed", quantity: 20 },
    ],
    status: "confirmed",
  },
  {
    id: "private-anniversary",
    name: "Private Anniversary",
    startsAt: "2026-09-06T18:00:00+03:00",
    prepStartsAt: "2026-09-06T11:00:00+03:00",
    guestCount: 70,
    menu: [
      { menuItemId: "premium-croissant-box", mode: "fixed", quantity: 4 },
      { menuItemId: "cheese-board", mode: "fixed", quantity: 4 },
      { menuItemId: "berry-dessert-cup", mode: "fixed", quantity: 70 },
    ],
    status: "confirmed",
  },
  {
    id: "tech-conference",
    name: "Tech Conference",
    startsAt: "2026-09-10T10:00:00+03:00",
    prepStartsAt: "2026-09-10T06:00:00+03:00",
    guestCount: 120,
    menu: [
      { menuItemId: "chicken-lunch-set", mode: "fixed", quantity: 75 },
      { menuItemId: "vegetarian-lunch-set", mode: "fixed", quantity: 45 },
      { menuItemId: "fruit-box", mode: "fixed", quantity: 6 },
    ],
    status: "confirmed",
  },
  {
    id: "wedding",
    name: "Wedding",
    startsAt: "2026-09-13T16:00:00+03:00",
    prepStartsAt: "2026-09-13T08:00:00+03:00",
    guestCount: 180,
    menu: [
      { menuItemId: "salmon-croissant", mode: "per_guest", quantityPerGuest: 0.35 },
      { menuItemId: "cheese-croissant", mode: "per_guest", quantityPerGuest: 0.35 },
      { menuItemId: "ham-croissant", mode: "per_guest", quantityPerGuest: 0.3 },
      { menuItemId: "chicken-skewer", mode: "per_guest", quantityPerGuest: 0.7 },
      { menuItemId: "caprese-skewer", mode: "per_guest", quantityPerGuest: 0.3 },
      { menuItemId: "caesar-salad", mode: "per_guest", quantityPerGuest: 0.7 },
      { menuItemId: "vegetarian-salad", mode: "per_guest", quantityPerGuest: 0.3 },
      { menuItemId: "berry-dessert-cup", mode: "per_guest", quantityPerGuest: 1 },
    ],
    status: "confirmed",
  },
];
