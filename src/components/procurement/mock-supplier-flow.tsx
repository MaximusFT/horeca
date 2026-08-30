'use client';

import { useState } from 'react';
import type { SupplierOrderSession } from '@/domain/supplier';
import { formatLocalizedQuantity } from '@/i18n/format';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n';

export function SupplierOrderFlow({ batchId, locale }: { batchId: string; locale: Locale }) {
  const dictionary = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SupplierOrderSession>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function call(url: string, body?: object) {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as SupplierOrderSession | { error?: string };
      if (!response.ok || !('status' in result)) {
        throw new Error('error' in result && result.error ? result.error : 'Supplier workflow failed');
      }
      setSession(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Supplier workflow failed');
    } finally {
      setBusy(false);
    }
  }

  async function prepare() {
    setOpen(true);
    if (!session) await call(`/api/suppliers/batches/${batchId}/prepare`);
  }

  const unresolved = session?.lines.filter((line) => !line.selectedProduct) ?? [];
  const matchedCount = session?.lines.filter((line) => line.selectedProduct).length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={prepare}
        className="h-11 rounded-xl bg-[#1d5d38] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,93,56,.16)] hover:bg-[#174d2f]"
      >
        {dictionary.mockSupplier.prepareOrder}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#132019]/35 backdrop-blur-[2px]" role="presentation">
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-order-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[620px] flex-col bg-[#f6f7f4] shadow-[-20px_0_60px_rgba(20,35,27,.2)]"
          >
            <header className="border-b border-[#dde2dc] bg-white px-5 py-5 md:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#edf3ef] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#42664f]">
                      {dictionary.mockSupplier.badge}
                    </span>
                    {session && (
                      <span className="text-[10px] text-[#859087]">
                        {dictionary.mockSupplier.planLabel(session.planVersion)}
                      </span>
                    )}
                  </div>
                  <h2 id="supplier-order-title" className="mt-2 text-xl font-semibold text-[#223028]">
                    {dictionary.mockSupplier.prepareOrder}
                  </h2>
                  <p className="mt-1 text-xs text-[#7d8981]">{dictionary.mockSupplier.subtitle}</p>
                </div>
                <button
                  type="button"
                  aria-label={dictionary.mockSupplier.closeAria}
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-full border border-[#dde2dc] text-lg text-[#65736a]"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 md:p-7">
              {!session && !error && (
                <div className="grid min-h-56 place-items-center rounded-2xl border border-[#dfe3dc] bg-white">
                  <div className="text-center">
                    <span className="mx-auto block size-7 animate-spin rounded-full border-2 border-[#b9c9bd] border-t-[#2d7046]" />
                    <p className="mt-3 text-sm text-[#637168]">{dictionary.mockSupplier.matching}</p>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-[#efc9bb] bg-[#fff4ef] px-4 py-3 text-sm text-[#9c5138]"
                >
                  {error}
                </div>
              )}

              {session && (
                <>
                  <section className="rounded-2xl border border-[#dfe3dc] bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#869188]">
                          {dictionary.mockSupplier.productMatching}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#344138]">
                          {dictionary.mockSupplier.linesResolved(matchedCount, session.lines.length)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${unresolved.length ? 'bg-[#fff0e7] text-[#a65e3f]' : 'bg-[#e9f3ec] text-[#477258]'}`}
                      >
                        {unresolved.length
                          ? dictionary.mockSupplier.decisions(unresolved.length)
                          : dictionary.mockSupplier.complete}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf0ec]">
                      <div
                        className="h-full rounded-full bg-[#4d8a61] transition-all"
                        style={{ width: `${(matchedCount / session.lines.length) * 100}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-[#718078]">{session.delivery.label}</p>
                  </section>

                  {unresolved.map((line) => (
                    <section
                      key={line.lineId}
                      className="mt-4 overflow-hidden rounded-2xl border border-[#edc5b5] bg-white"
                    >
                      <div className="bg-[#fff5f0] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#aa5a3d]">
                          {dictionary.mockSupplier.approvalSubstitution}
                        </p>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-[#3b443e]">{line.ingredientName}</h3>
                            <p className="mt-1 text-xs text-[#7d756f]">
                              {dictionary.mockSupplier.need(
                                formatLocalizedQuantity(line.requiredQuantity, line.unit, dictionary.locale),
                              )}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold uppercase text-[#ae6044]">
                            {dictionary.mockSupplier.unavailable}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-[#7f6b61]">
                          {dictionary.mockSupplier.preferred(
                            line.preferredProduct.name,
                            formatLocalizedQuantity(line.preferredProduct.packageSize, line.unit, dictionary.locale),
                          )}
                        </p>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#849087]">
                          {dictionary.mockSupplier.availableReplacement}
                        </p>
                        {line.replacements.map((replacement) => {
                          const packages = Math.ceil(line.requiredQuantity / replacement.packageSize);
                          return (
                            <div
                              key={replacement.id}
                              className="mt-3 rounded-xl border border-[#dfe3dc] bg-[#fafbf9] p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#36433a]">{replacement.name}</p>
                                  <p className="mt-1 text-xs text-[#768279]">
                                    {dictionary.mockSupplier.replacementSupplies(
                                      packages,
                                      formatLocalizedQuantity(replacement.packageSize, line.unit, dictionary.locale),
                                      formatLocalizedQuantity(
                                        packages * replacement.packageSize,
                                        line.unit,
                                        dictionary.locale,
                                      ),
                                    )}
                                  </p>
                                  <p className="mt-1 text-[10px] text-[#969e98]">
                                    {dictionary.mockSupplier.syntheticPrice}{' '}
                                    {money(replacement.priceMinor, dictionary.locale)}{' '}
                                    {dictionary.mockSupplier.perPackage}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    call(`/api/suppliers/orders/${session.id}/substitution`, {
                                      ingredientId: line.ingredientId,
                                      productId: replacement.id,
                                    })
                                  }
                                  className="shrink-0 rounded-lg bg-[#1d5d38] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {dictionary.mockSupplier.approveReplacement}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {session.status === 'ready_for_cart' && (
                    <section className="mt-4 rounded-2xl border border-[#cddfd2] bg-[#f3f8f4] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#4b7658]">
                        {dictionary.mockSupplier.matchingComplete}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-[#304b38]">
                        {dictionary.mockSupplier.reviewRoundingTitle}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#67806e]">
                        {dictionary.mockSupplier.reviewRoundingBody}
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => call(`/api/suppliers/orders/${session.id}/preview-cart`)}
                        className="mt-4 w-full rounded-xl border border-[#2e6b43] bg-white px-4 py-3 text-sm font-semibold text-[#285f3b] disabled:opacity-50"
                      >
                        {dictionary.mockSupplier.reviewCartPreview}
                      </button>
                    </section>
                  )}

                  {session.status === 'cart_preview' && session.cartPreview && (
                    <section className="mt-4 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white">
                      <header className="border-b border-[#e5e9e4] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#a06533]">
                          {dictionary.mockSupplier.approvalCartMutation}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-[#344138]">
                          {dictionary.mockSupplier.cartPreviewTitle}
                        </h3>
                      </header>
                      <div className="max-h-72 divide-y divide-[#edf0ec] overflow-y-auto">
                        {session.cartPreview.lines.map((line) => (
                          <div key={line.lineId} className="flex items-start justify-between gap-4 px-4 py-3">
                            <div>
                              <p className="text-xs font-semibold text-[#3d4a41]">{line.productName}</p>
                              <p className="mt-1 text-[10px] text-[#879189]">
                                {dictionary.mockSupplier.packages(line.packageCount)} ·{' '}
                                {dictionary.mockSupplier.suppliedSurplus(
                                  formatLocalizedQuantity(line.suppliedQuantity, line.unit, dictionary.locale),
                                  formatLocalizedQuantity(line.surplusQuantity, line.unit, dictionary.locale),
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-[#405047]">
                              {money(line.totalMinor, dictionary.locale)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#dfe3dc] bg-[#fafbf9] px-4 py-3">
                        <div className="flex justify-between text-xs text-[#748077]">
                          <span>{dictionary.mockSupplier.productsAndDelivery}</span>
                          <span>
                            {money(session.cartPreview.subtotalMinor, dictionary.locale)} +{' '}
                            {money(session.cartPreview.feeMinor, dictionary.locale)}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-between text-sm font-semibold text-[#2d3a31]">
                          <span>{dictionary.mockSupplier.total}</span>
                          <span>{money(session.cartPreview.totalMinor, dictionary.locale)}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => call(`/api/suppliers/orders/${session.id}/apply-cart`)}
                          className="w-full rounded-xl bg-[#1d5d38] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {dictionary.mockSupplier.approveAndApplyCart}
                        </button>
                        <p className="mt-2 text-center text-[10px] text-[#8b948e]">
                          {dictionary.mockSupplier.onlyThisClickMutates}
                        </p>
                      </div>
                    </section>
                  )}

                  {session.status === 'cart_applied' && session.cart && (
                    <section className="mt-4 rounded-2xl border border-[#bcd9c4] bg-[#edf7f0] p-5 text-center">
                      <div className="mx-auto grid size-10 place-items-center rounded-full bg-[#2f7548] text-lg text-white">
                        ✓
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-[#2d5439]">
                        {dictionary.mockSupplier.cartAppliedTitle}
                      </h3>
                      <p className="mt-1 text-xs text-[#66816d]">
                        {dictionary.mockSupplier.cartAppliedSummary(
                          session.cart.lines.length,
                          money(session.cart.totalMinor, dictionary.locale),
                        )}
                      </p>
                    </section>
                  )}

                  <section className="mt-4 rounded-2xl border border-[#dfe3dc] bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#849087]">
                      {dictionary.mockSupplier.activityTrace}
                    </p>
                    <div className="mt-3 space-y-3">
                      {session.activity.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#629073]" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-[#89948d]">
                              {item.type.replace('_', ' ')}
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-[#5e6d63]">{item.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function money(minor: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
