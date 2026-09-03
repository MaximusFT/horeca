'use client';

import { useState } from 'react';
import type { Locale } from '@/i18n';
import type { SilpoTimeslot } from '@/infrastructure/silpo-stage9-workflow';
import type { SilpoTimeslotPreview } from '@/infrastructure/silpo-stage9-timeslot-service';

export function isSupplierSlotError(message: string | undefined): boolean {
  return message?.includes('current supplier cart delivery slot') ?? false;
}

export function SilpoTimeslotRecovery({ locale, onUpdated }: { locale: Locale; onUpdated: () => Promise<void> }) {
  const text = labels[locale];
  const [preview, setPreview] = useState<SilpoTimeslotPreview>();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function findSlots() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/timeslot/preview', { method: 'POST' });
      const payload = (await response.json()) as { preview?: SilpoTimeslotPreview; error?: string };
      if (!response.ok || !payload.preview) throw new Error(payload.error ?? text.findError);
      setPreview(payload.preview);
      if (payload.preview.status === 'approval_required' && payload.preview.slots[0]) {
        setSelectedKey(slotKey(payload.preview.slots[0]));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.findError);
    } finally {
      setBusy(false);
    }
  }

  async function applySlot() {
    if (preview?.status !== 'approval_required' || !selectedKey) return;
    const timeslot = preview.slots.find((slot) => slotKey(slot) === selectedKey);
    if (!timeslot) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/timeslot/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approvalId: preview.approvalId, timeslot }),
      });
      const payload = (await response.json()) as { result?: unknown; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error ?? text.applyError);
      setPreview(undefined);
      setSelectedKey(undefined);
      await onUpdated();
    } catch (reason) {
      setPreview(undefined);
      setSelectedKey(undefined);
      setError(reason instanceof Error ? reason.message : text.applyError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
      <p className="font-semibold">{text.title}</p>
      {(!preview || preview.status === 'no_available_slots' || preview.status === 'cart_creation_required') && (
        <button
          type="button"
          disabled={busy}
          onClick={findSlots}
          className="mt-3 rounded-lg bg-amber-800 px-3 py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? text.loading : preview ? text.retry : text.find}
        </button>
      )}
      {preview?.status === 'no_available_slots' && <p className="mt-2">{text.none}</p>}
      {preview?.status === 'cart_creation_required' && <p className="mt-2">{text.noCart}</p>}
      {preview?.status === 'approval_required' && (
        <>
          <p className="mt-2">{text.choose}</p>
          <div className="mt-2 space-y-2">
            {preview.slots.map((slot) => {
              const key = slotKey(slot);
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white p-2">
                  <input
                    type="radio"
                    name={`supplier-timeslot-${preview.approvalId}`}
                    checked={selectedKey === key}
                    onChange={() => setSelectedKey(key)}
                  />
                  <span>{formatSlot(slot, locale)}</span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            disabled={busy || !selectedKey}
            onClick={applySlot}
            className="mt-3 rounded-lg bg-amber-800 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? text.updating : text.approve}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-red-700">{error}</p>}
    </section>
  );
}

function slotKey(slot: SilpoTimeslot): string {
  return `${slot.start}|${slot.end}`;
}

function formatSlot(slot: SilpoTimeslot, locale: Locale): string {
  const date = new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(slot.start));
  const time = new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });
  return `${date}, ${time.format(new Date(slot.start))}–${time.format(new Date(slot.end))}`;
}

const labels = {
  uk: {
    title: 'Поточний слот кошика Silpo більше недоступний.',
    find: 'Знайти доступні слоти',
    retry: 'Перевірити слоти ще раз',
    loading: 'Пошук слотів…',
    choose: 'Оберіть новий слот. Кошик зміниться лише після підтвердження.',
    approve: 'Підтвердити слот і повторити підбір',
    updating: 'Оновлення кошика…',
    none: 'Silpo зараз не повернув доступних слотів. Спробуйте пізніше.',
    noCart: 'Активний кошик Silpo не знайдено.',
    findError: 'Не вдалося отримати доступні слоти.',
    applyError: 'Не вдалося оновити слот кошика.',
  },
  en: {
    title: 'The current Silpo cart slot is no longer available.',
    find: 'Find available slots',
    retry: 'Check slots again',
    loading: 'Finding slots…',
    choose: 'Choose a new slot. The cart changes only after your confirmation.',
    approve: 'Approve slot and retry matching',
    updating: 'Updating cart…',
    none: 'Silpo returned no available slots right now. Try again later.',
    noCart: 'No active Silpo cart was found.',
    findError: 'Unable to load available slots.',
    applyError: 'Unable to update the cart slot.',
  },
} as const;