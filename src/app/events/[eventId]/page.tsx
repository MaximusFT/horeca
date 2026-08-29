import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { demoMenuItems } from '@/data/demo/menu-items';
import { demoIngredients } from '@/data/demo/ingredients';
import { WeddingEventClient } from '@/components/events/wedding-event-client';
import { getServerLocale } from '@/i18n';
import { localizedIngredientName, localizedMenuItemName } from '@/i18n/demo-names';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const locale = await getServerLocale();
  const state = getDemoPlanningRuntime().repository.getState();
  const event = state.events.find((item) => item.id === eventId);
  if (!event) notFound();
  const menuNames = new Map(
    demoMenuItems.map((item) => [item.id, localizedMenuItemName(item.id, item.name, locale)]),
  );
  const menuLines = event.menu.map((line) => ({
    menuItemId: line.menuItemId,
    name: menuNames.get(line.menuItemId) ?? line.menuItemId,
    mode: line.mode,
    rate: line.mode === 'fixed' ? line.quantity : line.quantityPerGuest,
  }));
  const ingredientById = new Map(demoIngredients.map((ingredient) => [ingredient.id, ingredient]));
  const eventContributions = state.activePlan.projections
    .flatMap((projection) => projection.contributions)
    .filter((contribution) => contribution.source.type === 'event' && contribution.source.eventId === event.id);
  const eventIngredientIds = new Set(eventContributions.map((contribution) => contribution.ingredientId));
  const massDemandByIngredient = new Map<string, number>();
  for (const contribution of eventContributions) {
    if (contribution.unit !== 'g') continue;
    massDemandByIngredient.set(
      contribution.ingredientId,
      (massDemandByIngredient.get(contribution.ingredientId) ?? 0) + contribution.quantity,
    );
  }
  const freshDelivery = state.activePlan.lines
    .filter(
      (line) =>
        eventIngredientIds.has(line.ingredientId) &&
        (ingredientById.get(line.ingredientId)?.shelfLifeDays ?? Infinity) <= 7 &&
        line.coveredRequiredAt.includes(event.prepStartsAt),
    )
    .sort((left, right) => left.deliveryAt.localeCompare(right.deliveryAt))[0];
  const impact = {
    affectedIngredientCount: eventIngredientIds.size,
    nextFreshDeliveryAt: freshDelivery?.deliveryAt,
    largestDrivers: [...massDemandByIngredient.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([ingredientId]) => {
        const ingredient = ingredientById.get(ingredientId);
        return ingredient ? localizedIngredientName(ingredient.id, ingredient.name, locale) : ingredientId;
      }),
  };

  return (
    <AppShell activeKey="events">
      <WeddingEventClient
        locale={locale}
        event={event}
        activePlanVersion={state.activePlan.version}
        menuLines={menuLines}
        impact={impact}
        ingredientNames={Object.fromEntries(
          demoIngredients.map((ingredient) => [ingredient.id, localizedIngredientName(ingredient.id, ingredient.name, locale)]),
        )}
      />
    </AppShell>
  );
}
