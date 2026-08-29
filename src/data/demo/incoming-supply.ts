import type { IncomingSupply } from "@/domain/inventory";

export const demoIncomingSupply: IncomingSupply[] = [
  {
    id: "incoming-fresh-produce-0902",
    name: "Fresh produce",
    arrivesAt: "2026-09-02T06:30:00+03:00",
    lines: [
      { ingredientId: "tomato", quantity: 10_000, unit: "g" },
      { ingredientId: "cucumber", quantity: 8_000, unit: "g" },
      { ingredientId: "lettuce", quantity: 5_000, unit: "g" },
      { ingredientId: "avocado", quantity: 3_000, unit: "g" },
      { ingredientId: "bell-pepper", quantity: 4_000, unit: "g" },
    ],
  },
  {
    id: "incoming-protein-0903",
    name: "Protein",
    arrivesAt: "2026-09-03T07:00:00+03:00",
    lines: [
      { ingredientId: "chicken", quantity: 12_000, unit: "g" },
      { ingredientId: "ham", quantity: 5_000, unit: "g" },
      { ingredientId: "turkey", quantity: 4_000, unit: "g" },
    ],
  },
  {
    id: "incoming-dairy-breakfast-0905",
    name: "Dairy / breakfast",
    arrivesAt: "2026-09-05T07:00:00+03:00",
    lines: [
      { ingredientId: "cream-cheese", quantity: 4_000, unit: "g" },
      { ingredientId: "mozzarella", quantity: 2_000, unit: "g" },
      { ingredientId: "eggs", quantity: 120, unit: "pcs" },
      { ingredientId: "croissant", quantity: 120, unit: "pcs" },
    ],
  },
];
