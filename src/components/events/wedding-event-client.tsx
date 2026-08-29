'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EventChangePreviewDto } from '@/application/event-change-dto';
import type { Event } from '@/domain/event';
import { formatLocalizedQuantity } from '@/i18n/format';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedEventName } from '@/i18n/demo-names';
import type { Dictionary, Locale } from '@/i18n';

interface Props {
  locale: Locale;
  event: Event;
  activePlanVersion: number;
  menuLines: Array<{ menuItemId: string; name: string; mode: 'fixed' | 'per_guest'; rate: number }>;
  impact: {
    affectedIngredientCount: number;
    nextFreshDeliveryAt?: string;
    largestDrivers: string[];
  };
  ingredientNames: Record<string, string>;
}

export function WeddingEventClient({ locale, event, activePlanVersion, menuLines, impact, ingredientNames }: Props) {
  const dictionary = getDictionary(locale);
  const eventName = localizedEventName(event.id, event.name, locale);
  const router = useRouter();
  const canChangeGuests = menuLines.some((line) => line.mode === 'per_guest');
  const [currentGuestCount, setCurrentGuestCount] = useState(event.guestCount);
  const [guestCount, setGuestCount] = useState(event.guestCount);
  const [planVersion, setPlanVersion] = useState(activePlanVersion);
  const [preview, setPreview] = useState<EventChangePreviewDto>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function reviewImpact() {
    setLoading(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const response = await fetch(`/api/events/${event.id}/preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ guestCount }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPreview(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : dictionary.wedding.errorPreview);
    } finally {
      setLoading(false);
    }
  }

  async function applyChange() {
    if (!preview) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/previews/${preview.id}/apply`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCurrentGuestCount(result.event.guestCount);
      setGuestCount(result.event.guestCount);
      setPlanVersion(result.planVersion);
      setPreview(undefined);
      setSuccess(dictionary.wedding.updated(eventName, result.planVersion));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : dictionary.wedding.errorApply);
    } finally {
      setLoading(false);
    }
  }

  const changed = guestCount !== currentGuestCount;

  return (
    <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1240px]">
        <Link href="/events" className="text-xs font-semibold text-[#5d7565]">
          {dictionary.wedding.backToEvents}
        </Link>
        <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e8f2eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#477257]">
                {dictionary.wedding.confirmed}
              </span>
              <span className="text-xs text-[#849087]">{dictionary.wedding.planLabel(planVersion)}</span>
            </div>
            <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.04em] text-[#18251d]">{eventName}</h1>
            <p className="mt-2 text-sm text-[#6f7c73]">
              {dictionary.wedding.dateLine(
                Number(event.startsAt.slice(8, 10)),
                event.startsAt.slice(11, 16),
                event.prepStartsAt.slice(11, 16),
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-[#dce2dc] bg-white p-4 shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#879188]">
              {dictionary.wedding.currentGuests}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-[#27352c]">{currentGuestCount}</p>
          </div>
        </div>

        {success && (
          <div className="mt-6 rounded-xl border border-[#cfe5d5] bg-[#f2faf4] px-4 py-3 text-sm font-medium text-[#39704b]">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-[#efd2cc] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#a65243]">
            {error}
          </div>
        )}

        <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white">
            <header className="border-b border-[#e8ebe7] px-6 py-5">
              <h2 className="text-sm font-semibold text-[#27342c]">{dictionary.wedding.menuTitle}</h2>
              <p className="mt-1 text-xs text-[#879188]">{dictionary.wedding.menuSubtitle}</p>
            </header>
            <div className="divide-y divide-[#edf0ec]">
              {menuLines.map((line) => {
                const currentQuantity = line.mode === 'fixed' ? line.rate : line.rate * currentGuestCount;
                const candidateQuantity = line.mode === 'fixed' ? line.rate : line.rate * guestCount;
                const delta = candidateQuantity - currentQuantity;
                return (
                  <div key={line.menuItemId} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#344138]">{line.name}</p>
                      <p className="mt-1 text-[10px] text-[#8a948e]">
                        {line.mode === 'fixed'
                          ? `${formatPortions(line.rate, dictionary.locale)} ${dictionary.wedding.fixedSuffix}`
                          : `${line.rate} ${dictionary.wedding.perGuestSuffix}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[#35443a]">
                        {line.mode === 'per_guest'
                          ? `${formatPortions(candidateQuantity, dictionary.locale)} ${dictionary.wedding.portionsSuffix}`
                          : `× ${formatPortions(candidateQuantity, dictionary.locale)}`}
                      </p>
                      {delta !== 0 && (
                        <p className="mt-1 text-[10px] font-semibold tabular-nums text-[#39704b]">
                          {delta > 0 ? '+' : ''}
                          {formatPortions(delta, dictionary.locale)} {dictionary.wedding.pendingSuffix}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="h-fit space-y-4">
            <section className="rounded-2xl border border-[#dfe3dc] bg-white p-5 shadow-[0_8px_28px_rgba(30,47,36,.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64806d]">
                {dictionary.wedding.impact.eyebrow}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#27352c]">
                {impact.affectedIngredientCount}
              </p>
              <p className="mt-1 text-xs text-[#748078]">{dictionary.wedding.impact.ingredientsUsed}</p>
              <div className="mt-5 space-y-4 border-t border-[#edf0ec] pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#919a94]">
                    {dictionary.wedding.impact.nextFreshDelivery}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#35443a]">
                    {impact.nextFreshDeliveryAt
                      ? formatDateTime(impact.nextFreshDeliveryAt, dictionary.locale)
                      : dictionary.wedding.impact.coveredByPlan}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#919a94]">
                    {dictionary.wedding.impact.largestDrivers}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#536158]">{impact.largestDrivers.join(' · ')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#919a94]">
                    {dictionary.wedding.impact.supplierStatus}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#8c6428]">
                    {dictionary.wedding.impact.matchingPending}
                  </p>
                </div>
              </div>
              <Link
                href="/procurement"
                className="mt-5 flex h-10 items-center justify-center rounded-xl border border-[#d7ddd7] text-xs font-semibold text-[#456b53]"
              >
                {dictionary.wedding.impact.viewFullProcurement}
              </Link>
            </section>
            <section className="rounded-2xl border border-[#dfe3dc] bg-white p-5 shadow-[0_8px_28px_rgba(30,47,36,.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#879188]">
                {dictionary.wedding.guestChange.eyebrow}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#253229]">{dictionary.wedding.guestChange.title}</h2>
              {!canChangeGuests ? (
                <p className="mt-2 text-xs leading-5 text-[#7a867e]">{dictionary.wedding.guestChange.fixedNote}</p>
              ) : (
                <>
                  <p className="mt-2 text-xs leading-5 text-[#7a867e]">{dictionary.wedding.guestChange.hint}</p>
                  <label className="mt-5 block text-xs font-semibold text-[#536158]" htmlFor="guest-count">
                    {dictionary.wedding.guestChange.guestsLabel}
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="guest-count"
                      type="number"
                      min={0}
                      value={guestCount}
                      onChange={(changeEvent) => setGuestCount(Number(changeEvent.target.value))}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-[#d7ddd7] px-3 text-sm font-semibold outline-none focus:border-[#5b936e]"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestCount(currentGuestCount + 20)}
                      className="rounded-xl border border-[#d7ddd7] px-3 text-xs font-semibold text-[#526159]"
                    >
                      +20
                    </button>
                  </div>
                  {changed && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f1f5f1] px-3 py-2 text-xs">
                      <span className="text-[#748078]">{dictionary.wedding.guestChange.changeLabel}</span>
                      <span className="font-semibold text-[#356849]">
                        {guestCount - currentGuestCount > 0 ? '+' : ''}
                        {guestCount - currentGuestCount} {dictionary.wedding.guestChange.guestsSuffix}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!changed || loading}
                    onClick={reviewImpact}
                    className="mt-5 h-11 w-full rounded-xl bg-[#1d5d38] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? dictionary.wedding.guestChange.calculating : dictionary.wedding.guestChange.reviewImpact}
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>

      {preview && (
        <ImpactDrawer
          dictionary={dictionary}
          eventName={eventName}
          preview={preview}
          ingredientNames={ingredientNames}
          loading={loading}
          onCancel={() => setPreview(undefined)}
          onApply={applyChange}
        />
      )}
    </main>
  );
}

function ImpactDrawer({
  dictionary,
  eventName,
  preview,
  ingredientNames,
  loading,
  onCancel,
  onApply,
}: {
  dictionary: Dictionary;
  eventName: string;
  preview: EventChangePreviewDto;
  ingredientNames: Record<string, string>;
  loading: boolean;
  onCancel: () => void;
  onApply: () => void;
}) {
  const topDeltas = preview.diff.ingredientDeltas.slice(0, 8);
  return (
    <div className="fixed inset-0 z-50 bg-[#132019]/35 backdrop-blur-[2px]" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="impact-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-[#f8f9f6] shadow-[-20px_0_60px_rgba(20,35,27,.18)]"
      >
        <header className="border-b border-[#dde2dc] bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6c7b71]">
                {dictionary.wedding.drawer.protectedPreview}
              </p>
              <h2 id="impact-title" className="mt-2 text-xl font-semibold text-[#223028]">
                {eventName} {dictionary.wedding.drawer.titleSuffix}
              </h2>
              <p className="mt-1 text-xs text-[#7d8981]">{dictionary.wedding.drawer.nothingChanges}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="grid size-9 place-items-center rounded-full border border-[#dde2dc] text-lg text-[#65736a]"
            >
              ×
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ImpactMetric
              label={dictionary.wedding.drawer.metricGuests}
              value={`+${preview.afterGuestCount - preview.beforeGuestCount}`}
            />
            <ImpactMetric
              label={dictionary.wedding.drawer.metricPlan}
              value={`v${preview.basePlanVersion} → v${preview.candidatePlanVersion}`}
            />
            <ImpactMetric
              label={dictionary.wedding.drawer.metricIngredients}
              value={String(preview.diff.ingredientDeltas.length)}
            />
            <ImpactMetric
              label={dictionary.wedding.drawer.metricPurchaseLines}
              value={String(preview.diff.lines.length)}
            />
          </div>
          <div className="mt-6 rounded-2xl border border-[#dfe3dc] bg-white">
            <div className="border-b border-[#e8ebe7] px-4 py-3">
              <h3 className="text-xs font-semibold text-[#344138]">{dictionary.wedding.drawer.topDeltas}</h3>
            </div>
            <div className="divide-y divide-[#edf0ec]">
              {topDeltas.map((item) => (
                <div key={item.ingredientId} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-[#455248]">
                    {ingredientNames[item.ingredientId] ?? item.ingredientId}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] tabular-nums text-[#8b958e]">
                      {formatLocalizedQuantity(item.beforeQuantity, item.unit, dictionary.locale)} →{' '}
                      {formatLocalizedQuantity(item.afterQuantity, item.unit, dictionary.locale)}
                    </p>
                    <p
                      className={`mt-0.5 text-sm font-semibold tabular-nums ${item.delta >= 0 ? 'text-[#33704a]' : 'text-[#a65345]'}`}
                    >
                      {item.delta >= 0 ? '+' : ''}
                      {formatLocalizedQuantity(item.delta, item.unit, dictionary.locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#d9e5f4] bg-[#f3f7fd] p-4 text-xs leading-5 text-[#536c92]">
            {dictionary.wedding.drawer.footnote}
          </div>
        </div>
        <footer className="flex gap-3 border-t border-[#dde2dc] bg-white p-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-[#d7ddd7] text-sm font-semibold text-[#536158]"
          >
            {dictionary.wedding.drawer.cancel}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="h-11 flex-[1.4] rounded-xl bg-[#1d5d38] text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? dictionary.wedding.drawer.applying : dictionary.wedding.drawer.apply}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dfe3dc] bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#929b95]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#2c3930]">{value}</p>
    </div>
  );
}

function formatPortions(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en', { maximumFractionDigits: 2 }).format(value);
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Kyiv',
  }).format(new Date(value));
}
