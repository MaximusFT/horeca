'use client';

import { useState } from 'react';
import type { PlannedProcurementLine } from '@/domain/procurement';
import type { ProcurementLineExplanation } from '@/application/explain-procurement';
import { formatQuantity } from '@/engine/units';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Dictionary, Locale } from '@/i18n';

export interface ProcurementBatchLineView {
  line: PlannedProcurementLine;
  ingredientName: string;
  explanation: ProcurementLineExplanation;
}

export function ProcurementBatchTable({ lines, locale }: { lines: ProcurementBatchLineView[]; locale: Locale }) {
  const dictionary = getDictionary(locale);
  const [selected, setSelected] = useState<ProcurementBatchLineView>();
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-[#f8f9f7] text-[10px] font-semibold uppercase tracking-wide text-[#89948d]">
              <tr>
                <th className="px-5 py-3.5">{dictionary.procurementBatch.columnIngredient}</th>
                <th className="px-5 py-3.5 text-right">{dictionary.procurementBatch.columnCoveredDemand}</th>
                <th className="px-5 py-3.5 text-right">{dictionary.procurementBatch.columnStockIncoming}</th>
                <th className="px-5 py-3.5 text-right">{dictionary.procurementBatch.columnPurchase}</th>
                <th className="px-5 py-3.5 text-right">{dictionary.procurementBatch.columnStatus}</th>
                <th className="px-5 py-3.5 text-right">{dictionary.procurementBatch.columnExplanation}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0ec]">
              {lines.map((item) => (
                <tr key={item.line.id} className="hover:bg-[#fbfcfa]">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#334037]">{item.ingredientName}</p>
                    <p className="mt-1 text-[10px] text-[#919a94]">
                      {dictionary.procurementBatch.upcomingRequirements(item.explanation.coveredRequirementCount)}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right text-sm tabular-nums text-[#526058]">
                    {formatQuantity(item.explanation.grossDemand, item.line.unit)}
                  </td>
                  <td className="px-5 py-4 text-right text-sm tabular-nums text-[#526058]">
                    {formatQuantity(item.explanation.inventoryUsed + item.explanation.incomingUsed, item.line.unit)}
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-[#28362d]">
                    {formatQuantity(item.line.quantity, item.line.unit)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="rounded-full bg-[#e9f3ec] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#477258]">
                      {dictionary.procurementBatch.plannedStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="rounded-lg border border-[#d7ddd7] px-3 py-1.5 text-[10px] font-semibold text-[#4d7059]"
                    >
                      {dictionary.procurementBatch.whyButton}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#132019]/30 backdrop-blur-[2px]" role="presentation">
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="why-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col bg-[#f8f9f6] shadow-[-20px_0_60px_rgba(20,35,27,.18)]"
          >
            <header className="border-b border-[#dde2dc] bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6c7b71]">
                    {dictionary.procurementBatch.why.title}
                  </p>
                  <h2 id="why-title" className="mt-2 text-xl font-semibold text-[#223028]">
                    {selected.ingredientName}
                  </h2>
                  <p className="mt-1 text-xs text-[#7d8981]">{dictionary.procurementBatch.why.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(undefined)}
                  className="grid size-9 place-items-center rounded-full border border-[#dde2dc] text-lg text-[#65736a]"
                >
                  ×
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
              <section className="rounded-2xl border border-[#dfe3dc] bg-white">
                <header className="border-b border-[#e8ebe7] px-4 py-3">
                  <h3 className="text-xs font-semibold text-[#344138]">
                    {dictionary.procurementBatch.why.demandSources}
                  </h3>
                </header>
                <div className="divide-y divide-[#edf0ec]">
                  {selected.explanation.demandSources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${source.type === 'restaurant' ? 'bg-[#5a9870]' : 'bg-[#697fd0]'}`}
                        />
                        <span className="text-xs text-[#4c5951]">{source.label}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-[#344138]">
                        {formatQuantity(source.quantity, selected.line.unit)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-[#dfe3dc] bg-[#fafbf9] px-4 py-3">
                  <span className="text-xs font-semibold text-[#536158]">
                    {dictionary.procurementBatch.why.grossCoveredDemand}
                  </span>
                  <span className="text-sm font-semibold text-[#2d3a31]">
                    {formatQuantity(selected.explanation.grossDemand, selected.line.unit)}
                  </span>
                </div>
              </section>
              <section className="mt-4 rounded-2xl border border-[#dfe3dc] bg-white p-4">
                <h3 className="text-xs font-semibold text-[#344138]">
                  {dictionary.procurementBatch.why.coverageAndTarget}
                </h3>
                <div className="mt-4 space-y-3">
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.balanceBeforeTrigger}
                    value={formatQuantity(selected.explanation.balanceBeforeTrigger, selected.line.unit)}
                  />
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.inventoryConsumed}
                    value={`− ${formatQuantity(selected.explanation.inventoryUsed, selected.line.unit)}`}
                  />
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.incomingConsumed}
                    value={`− ${formatQuantity(selected.explanation.incomingUsed, selected.line.unit)}`}
                  />
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.safetyTarget}
                    value={formatQuantity(selected.explanation.safetyTarget, selected.line.unit)}
                    accent
                  />
                  {selected.explanation.expiredExcluded > 0 && (
                    <BreakdownRow
                      label={dictionary.procurementBatch.why.expiredExcluded}
                      value={formatQuantity(selected.explanation.expiredExcluded, selected.line.unit)}
                      warning
                    />
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#e9f3ec] px-4 py-3">
                  <span className="text-sm font-semibold text-[#355b42]">
                    {dictionary.procurementBatch.why.purchaseRequirement}
                  </span>
                  <span className="text-lg font-semibold text-[#28593b]">
                    {formatQuantity(selected.explanation.purchaseQuantity, selected.line.unit)}
                  </span>
                </div>
              </section>
              <section className="mt-4 rounded-2xl border border-[#dfe3dc] bg-white p-4">
                <h3 className="text-xs font-semibold text-[#344138]">{dictionary.procurementBatch.why.timing}</h3>
                <div className="mt-4 space-y-3">
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.deliveryScheduled}
                    value={formatDateTime(selected.explanation.deliveryAt, dictionary.locale)}
                  />
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.firstRequirement}
                    value={formatDateTime(selected.explanation.requiredAt, dictionary.locale)}
                  />
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.requirementsCovered}
                    value={String(selected.explanation.coveredRequirementCount)}
                  />
                  <BreakdownRow
                    label={dictionary.procurementBatch.why.usableUntil}
                    value={formatDateTime(selected.explanation.expiresAt, dictionary.locale)}
                  />
                </div>
                <p className="mt-4 rounded-lg bg-[#f3f6f3] px-3 py-2 text-[10px] leading-4 text-[#6b786f]">
                  {timingReason(selected.explanation.shelfLifeDays, dictionary)}
                </p>
              </section>
              <section className="mt-4 rounded-2xl border border-dashed border-[#d6ddd7] bg-[#f6f8f5] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#78857c]">
                  {dictionary.procurementBatch.why.supplierLabel}
                </p>
                <p className="mt-2 text-xs text-[#68756d]">{dictionary.procurementBatch.why.supplierPending}</p>
              </section>
              <p className="mt-4 text-[11px] leading-5 text-[#7e8982]">{dictionary.procurementBatch.why.footnote}</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function BreakdownRow({
  label,
  value,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-[#768279]">{label}</span>
      <span
        className={`font-semibold tabular-nums ${warning ? 'text-[#ae684f]' : accent ? 'text-[#4c765a]' : 'text-[#3c493f]'}`}
      >
        {value}
      </span>
    </div>
  );
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

function timingReason(shelfLifeDays: number, dictionary: Dictionary): string {
  if (shelfLifeDays <= 3) return dictionary.procurementBatch.why.timingReasonShort(shelfLifeDays);
  if (shelfLifeDays <= 7) return dictionary.procurementBatch.why.timingReasonMedium(shelfLifeDays);
  return dictionary.procurementBatch.why.timingReasonLong(shelfLifeDays);
}
