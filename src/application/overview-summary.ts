import type { DemoDataset } from '@/data/demo/dataset';
import type { Event } from '@/domain/event';
import type { ChronologicalProcurementPlan } from '@/domain/procurement';
import type { RestaurantLoad } from '@/domain/restaurant-demand';
import type { BaseUnit } from '@/domain/units';
import { BUSINESS_TIME_ZONE } from '@/lib/demo-clock';
import { getDictionary, intlTag, type Locale } from '@/i18n';
import { localizedIngredientName, localizedEventName } from '@/i18n/demo-names';
import type { PlanningChange } from './planning-repository';

export interface OverviewDay {
  date: string;
  dayNumber: number;
  weekday: string;
  load: RestaurantLoad;
  loadFactor: number;
  events: Event[];
  batchCount: number;
  batchId?: string;
  procurementLineCount: number;
}

export interface DemandSourceSplit {
  unit: BaseUnit;
  restaurant: number;
  events: number;
  restaurantPercent: number;
  eventPercent: number;
}

export interface AttentionItem {
  id: string;
  tone: 'warning' | 'info' | 'ready';
  actionable: boolean;
  title: string;
  description: string;
  meta: string;
  href?: string;
  actionLabel?: string;
}

export function buildOverviewSummary(
  dataset: DemoDataset,
  plan: ChronologicalProcurementPlan,
  recentChanges: PlanningChange[] = [],
  locale: Locale = 'uk',
) {
  const weekdayFormatter = new Intl.DateTimeFormat(intlTag(locale), { weekday: 'short', timeZone: BUSINESS_TIME_ZONE });
  const dictionary = getDictionary(locale);
  const ingredientNames = new Map(
    dataset.ingredients.map((ingredient) => [ingredient.id, localizedIngredientName(ingredient.id, ingredient.name, locale)]),
  );
  const eventsByDate = new Map<string, Event[]>();
  for (const event of dataset.events) {
    const date = event.startsAt.slice(0, 10);
    eventsByDate.set(date, [...(eventsByDate.get(date) ?? []), event]);
  }

  const batchesByDate = new Map(plan.batches.map((batch) => [batch.deliveryOn, batch]));
  const timeline: OverviewDay[] = dataset.restaurantCalendar.map((day) => {
    const batch = batchesByDate.get(day.date);
    const date = new Date(`${day.date}T12:00:00+03:00`);
    return {
      date: day.date,
      dayNumber: Number(day.date.slice(-2)),
      weekday: weekdayFormatter.format(date),
      load: day.load,
      loadFactor: { quiet: 0.75, normal: 1, busy: 1.25, peak: 1.55 }[day.load],
      events: eventsByDate.get(day.date) ?? [],
      batchCount: batch ? 1 : 0,
      batchId: batch?.id,
      procurementLineCount: batch?.lines.length ?? 0,
    };
  });

  const demandSplit = calculateDemandSplit(plan);
  const expired = firstExpiryRisk(plan);
  const incomingCoverageCount = plan.projections.filter((projection) => projection.coverage.incoming > 0).length;
  const nextBatch = plan.batches[0];
  const largestEvent = [...dataset.events].sort((left, right) => right.guestCount - left.guestCount)[0];
  const nextPeakDay = timeline.find((day) => day.load === 'peak');
  const attention: AttentionItem[] = [];

  if (expired) {
    attention.push({
      id: 'expiry-risk',
      tone: 'warning',
      actionable: true,
      title: dictionary.overview.attentionItems.expiryRiskTitle(
        ingredientNames.get(expired.ingredientId) ?? expired.ingredientId,
      ),
      description: dictionary.overview.attentionItems.expiryRiskDescription,
      meta: dictionary.overview.attentionItems.expiryRiskMeta(formatAmount(expired.quantity, expired.unit)),
      href: '/procurement',
      actionLabel: dictionary.overview.attentionItems.expiryRiskAction,
    });
  }
  if (incomingCoverageCount > 0) {
    attention.push({
      id: 'incoming-coverage',
      tone: 'info',
      actionable: false,
      title: dictionary.overview.attentionItems.incomingCoverageTitle,
      description: dictionary.overview.attentionItems.incomingCoverageDescription,
      meta: dictionary.overview.attentionItems.incomingCoverageMeta(incomingCoverageCount),
    });
  }
  if (nextBatch) {
    attention.push({
      id: 'supplier-ready',
      tone: 'ready',
      actionable: true,
      title: dictionary.overview.attentionItems.supplierReadyTitle,
      description: dictionary.overview.attentionItems.supplierReadyDescription,
      meta: dictionary.overview.attentionItems.supplierReadyMeta(nextBatch.deliveryOn, nextBatch.lines.length),
      href: `/procurement/${nextBatch.id}`,
      actionLabel: dictionary.overview.attentionItems.supplierReadyAction,
    });
  }

  return {
    planVersion: plan.version,
    guestTotal: dataset.events.reduce((sum, event) => sum + event.guestCount, 0),
    eventCount: dataset.events.length,
    operatingDayCount: dataset.restaurantCalendar.length,
    largestEvent,
    nextPeakDay,
    batchCount: plan.batches.length,
    procurementLineCount: plan.lines.length,
    timeline,
    demandSplit,
    attention,
    upcomingBatches: plan.batches.slice(0, 4).map((batch) => ({
      ...batch,
      ingredientNames: batch.lines
        .slice(0, 3)
        .map((line) => ingredientNames.get(line.ingredientId) ?? line.ingredientId),
    })),
    recentChanges: recentChanges.map((change) => {
      const event = dataset.events.find((item) => item.id === change.eventId);
      const eventName = event ? localizedEventName(event.id, event.name, locale) : change.eventId;
      return {
        id: change.id,
        planVersion: change.planVersion,
        summary: dictionary.overview.recentChanges.guestChangeSummary(eventName, change.beforeGuestCount, change.afterGuestCount),
      };
    }),
  };
}

function calculateDemandSplit(plan: ChronologicalProcurementPlan): DemandSourceSplit[] {
  const totals = new Map<BaseUnit, { restaurant: number; events: number }>([
    ['g', { restaurant: 0, events: 0 }],
    ['ml', { restaurant: 0, events: 0 }],
    ['pcs', { restaurant: 0, events: 0 }],
  ]);
  for (const projection of plan.projections) {
    for (const contribution of projection.contributions) {
      const total = totals.get(contribution.unit)!;
      if (contribution.source.type === 'restaurant') total.restaurant += contribution.quantity;
      else total.events += contribution.quantity;
    }
  }

  return [...totals.entries()].map(([unit, values]) => {
    const total = values.restaurant + values.events;
    return {
      unit,
      restaurant: round(values.restaurant),
      events: round(values.events),
      restaurantPercent: total === 0 ? 0 : Math.round((values.restaurant / total) * 100),
      eventPercent: total === 0 ? 0 : Math.round((values.events / total) * 100),
    };
  });
}

function firstExpiryRisk(
  plan: ChronologicalProcurementPlan,
): { ingredientId: string; quantity: number; unit: BaseUnit } | undefined {
  const first = plan.projections.find((projection) => projection.expiredQuantity > 0);
  return first ? { ingredientId: first.ingredientId, quantity: first.expiredQuantity, unit: first.unit } : undefined;
}

function formatAmount(quantity: number, unit: BaseUnit): string {
  if (unit === 'g') return `${round(quantity / 1_000)} kg`;
  if (unit === 'ml') return `${round(quantity / 1_000)} L`;
  return `${round(quantity)} pcs`;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
