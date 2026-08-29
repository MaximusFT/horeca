import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";
import { demoMenuItems } from "@/data/demo/menu-items";
import { demoIngredients } from "@/data/demo/ingredients";
import { WeddingEventClient } from "@/components/events/wedding-event-client";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const state = getDemoPlanningRuntime().repository.getState();
  const event = state.events.find((item) => item.id === eventId);
  if (!event) notFound();
  const menuNames = new Map(demoMenuItems.map((item) => [item.id, item.name]));
  const menuLines = event.menu.map((line) => ({
    menuItemId: line.menuItemId,
    name: menuNames.get(line.menuItemId) ?? line.menuItemId,
    quantityLabel: line.mode === "fixed" ? `${line.quantity} fixed` : `${line.quantityPerGuest} per guest`,
  }));

  return (
    <AppShell active="Events">
      <WeddingEventClient
        event={event}
        activePlanVersion={state.activePlan.version}
        menuLines={menuLines}
        ingredientNames={Object.fromEntries(demoIngredients.map((ingredient) => [ingredient.id, ingredient.name]))}
      />
    </AppShell>
  );
}
