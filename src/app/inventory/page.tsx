import Link from 'next/link';
import { buildInventorySummary, type InventoryStatus } from '@/application/inventory-summary';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { AppShell, Icon } from '@/components/app-shell';
import { demoDataset } from '@/data/demo/dataset';
import { formatQuantity } from '@/engine/units';
import { getDictionary, getServerLocale, type Dictionary } from '@/i18n';
import { localizedIngredientName } from '@/i18n/demo-names';

export const dynamic = 'force-dynamic';

const statusClassName: Record<InventoryStatus, string> = {
  expiry_risk: 'bg-[#fff0e8] text-[#a85a3d]',
  low: 'bg-[#fff2d9] text-[#94651f]',
  covered: 'bg-[#edf2fd] text-[#536eae]',
  good: 'bg-[#e9f3ec] text-[#477258]',
};

function statusLabel(status: InventoryStatus, dictionary: Dictionary): string {
  return {
    expiry_risk: dictionary.inventory.statusExpiryRisk,
    low: dictionary.inventory.statusLow,
    covered: dictionary.inventory.statusCovered,
    good: dictionary.inventory.statusGood,
  }[status];
}

export default async function InventoryPage() {
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const runtime = getDemoPlanningRuntime();
  const { activePlan } = runtime.repository.getState();
  const rows = buildInventorySummary(
    demoDataset.ingredients,
    demoDataset.inventoryLots,
    demoDataset.incomingSupply,
    activePlan,
    runtime.clock.now(),
  );
  const statuses: InventoryStatus[] = ['expiry_risk', 'low', 'covered', 'good'];
  const counts = Object.fromEntries(
    statuses.map((status) => [status, rows.filter((row) => row.status === status).length]),
  ) as Record<InventoryStatus, number>;

  return (
    <AppShell activeKey="inventory">
      <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#728078]">
                {dictionary.inventory.planLabel(activePlan.version)}
              </p>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#18251d]">
                {dictionary.inventory.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7a72]">{dictionary.inventory.subtitle}</p>
            </div>
            <Link
              href="/procurement"
              className="flex h-11 items-center gap-2 self-start rounded-xl border border-[#d7ddd7] bg-white px-4 text-sm font-semibold text-[#456b53] md:self-auto"
            >
              {dictionary.inventory.openProcurement} <Icon name="arrow" className="size-4" />
            </Link>
          </div>

          <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Inventory status summary">
            {statuses.map((status) => (
              <article key={status} className="rounded-xl border border-[#dfe3dc] bg-white px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#879188]">
                  {statusLabel(status, dictionary)}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#29372e]">{counts[status]}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="border-b border-[#e6e9e5] bg-[#f8f9f7] text-[10px] font-semibold uppercase tracking-wide text-[#88938c]">
                  <tr>
                    <th className="px-5 py-3.5 md:px-6">{dictionary.inventory.columnIngredient}</th>
                    <th className="px-5 py-3.5 text-right">{dictionary.inventory.columnOnHand}</th>
                    <th className="px-5 py-3.5 text-right">{dictionary.inventory.columnSafetyTarget}</th>
                    <th className="px-5 py-3.5 text-right">{dictionary.inventory.columnConfirmedIncoming}</th>
                    <th className="px-5 py-3.5">{dictionary.inventory.columnNextRequirement}</th>
                    <th className="px-5 py-3.5 text-right md:px-6">{dictionary.inventory.columnStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ec]">
                  {rows.map((row) => (
                    <tr key={row.ingredientId} className="hover:bg-[#fbfcfa]">
                      <td className="px-5 py-4 text-sm font-semibold text-[#334037] md:px-6">
                        {localizedIngredientName(row.ingredientId, row.ingredientName, locale)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm tabular-nums text-[#526058]">
                        {formatQuantity(row.onHand, row.unit)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm tabular-nums text-[#718078]">
                        {formatQuantity(row.safetyTarget, row.unit)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm tabular-nums text-[#526058]">
                        {formatQuantity(row.confirmedIncoming, row.unit)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-[#46544b]">
                          {row.nextNeedAt
                            ? formatDateTime(row.nextNeedAt, dictionary.locale)
                            : dictionary.inventory.noRequirement}
                        </p>
                        {row.nextNeedAt && (
                          <p className="mt-1 text-[10px] text-[#909a93]">
                            {formatQuantity(row.nextNeedQuantity, row.unit)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right md:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${statusClassName[row.status]}`}
                        >
                          {statusLabel(row.status, dictionary)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
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
