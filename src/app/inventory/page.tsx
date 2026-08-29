import Link from "next/link";
import { buildInventorySummary, type InventoryStatus } from "@/application/inventory-summary";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";
import { AppShell, Icon } from "@/components/app-shell";
import { demoDataset } from "@/data/demo/dataset";
import { formatQuantity } from "@/engine/units";

export const dynamic = "force-dynamic";

const statusStyle: Record<InventoryStatus, { label: string; className: string }> = {
  expiry_risk: { label: "Expiry risk", className: "bg-[#fff0e8] text-[#a85a3d]" },
  low: { label: "Low", className: "bg-[#fff2d9] text-[#94651f]" },
  covered: { label: "Covered", className: "bg-[#edf2fd] text-[#536eae]" },
  good: { label: "Good", className: "bg-[#e9f3ec] text-[#477258]" },
};

export default function InventoryPage() {
  const runtime = getDemoPlanningRuntime();
  const { activePlan } = runtime.repository.getState();
  const rows = buildInventorySummary(
    demoDataset.ingredients,
    demoDataset.inventoryLots,
    demoDataset.incomingSupply,
    activePlan,
    runtime.clock.now(),
  );
  const counts = Object.fromEntries(
    Object.keys(statusStyle).map((status) => [status, rows.filter((row) => row.status === status).length]),
  ) as Record<InventoryStatus, number>;

  return (
    <AppShell active="Inventory">
      <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#728078]">Shared kitchen · Plan v{activePlan.version}</p>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#18251d]">Inventory coverage</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7a72]">What is on hand, what is confirmed to arrive and where the procurement plan must fill a gap.</p>
            </div>
            <Link href="/procurement" className="flex h-11 items-center gap-2 self-start rounded-xl border border-[#d7ddd7] bg-white px-4 text-sm font-semibold text-[#456b53] md:self-auto">Open procurement <Icon name="arrow" className="size-4" /></Link>
          </div>

          <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Inventory status summary">
            {(Object.entries(statusStyle) as Array<[InventoryStatus, (typeof statusStyle)[InventoryStatus]]>).map(([status, presentation]) => (
              <article key={status} className="rounded-xl border border-[#dfe3dc] bg-white px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#879188]">{presentation.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#29372e]">{counts[status]}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="border-b border-[#e6e9e5] bg-[#f8f9f7] text-[10px] font-semibold uppercase tracking-wide text-[#88938c]">
                  <tr><th className="px-5 py-3.5 md:px-6">Ingredient</th><th className="px-5 py-3.5 text-right">On hand</th><th className="px-5 py-3.5 text-right">Safety target</th><th className="px-5 py-3.5 text-right">Confirmed incoming</th><th className="px-5 py-3.5">Next requirement</th><th className="px-5 py-3.5 text-right md:px-6">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ec]">
                  {rows.map((row) => (
                    <tr key={row.ingredientId} className="hover:bg-[#fbfcfa]">
                      <td className="px-5 py-4 text-sm font-semibold text-[#334037] md:px-6">{row.ingredientName}</td>
                      <td className="px-5 py-4 text-right text-sm tabular-nums text-[#526058]">{formatQuantity(row.onHand, row.unit)}</td>
                      <td className="px-5 py-4 text-right text-sm tabular-nums text-[#718078]">{formatQuantity(row.safetyTarget, row.unit)}</td>
                      <td className="px-5 py-4 text-right text-sm tabular-nums text-[#526058]">{formatQuantity(row.confirmedIncoming, row.unit)}</td>
                      <td className="px-5 py-4"><p className="text-xs font-semibold text-[#46544b]">{row.nextNeedAt ? formatDateTime(row.nextNeedAt) : "No requirement"}</p>{row.nextNeedAt && <p className="mt-1 text-[10px] text-[#909a93]">{formatQuantity(row.nextNeedQuantity, row.unit)}</p>}</td>
                      <td className="px-5 py-4 text-right md:px-6"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${statusStyle[row.status].className}`}>{statusStyle[row.status].label}</span></td>
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Kyiv" }).format(new Date(value));
}
