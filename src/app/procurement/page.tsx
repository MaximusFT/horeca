import Link from "next/link";
import { AppShell, Icon } from "@/components/app-shell";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";
import { demoIngredients } from "@/data/demo/ingredients";

export const dynamic = "force-dynamic";

export default function ProcurementPage() {
  const { activePlan } = getDemoPlanningRuntime().repository.getState();
  const ingredientNames = new Map(demoIngredients.map((item) => [item.id, item.name]));

  return (
    <AppShell active="Procurement">
      <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#728078]">Active Plan v{activePlan.version}</p><h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#18251d]">Procurement</h1><p className="mt-2 text-sm text-[#6d7a72]">Dated purchase batches generated from demand, stock, incoming supply and safety targets.</p></div>
            <div className="flex gap-3"><SummaryPill label="Batches" value={activePlan.batches.length} /><SummaryPill label="Lines" value={activePlan.lines.length} /></div>
          </div>

          <section className="mt-7 space-y-3">
            {activePlan.batches.map((batch, index) => (
              <Link key={batch.id} href={`/procurement/${batch.id}`} className="grid gap-4 rounded-2xl border border-[#dfe3dc] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(24,37,29,.03)] transition hover:border-[#bccbc0] hover:shadow-[0_6px_24px_rgba(24,37,29,.06)] md:grid-cols-[120px_minmax(0,1fr)_130px_32px] md:items-center md:px-6">
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a958e]">{monthLabel(batch.deliveryOn)}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-[#28362d]">{Number(batch.deliveryOn.slice(-2))}</p></div>
                <div className="min-w-0"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${index === 0 ? "bg-[#df9f43]" : "bg-[#65a87a]"}`} /><h2 className="text-sm font-semibold text-[#2c3930]">Delivery batch · {batch.lines.length} ingredients</h2></div><p className="mt-2 truncate pl-4 text-xs text-[#7f8a83]">{batch.lines.slice(0, 5).map((line) => ingredientNames.get(line.ingredientId)).join(" · ")}{batch.lines.length > 5 ? ` · +${batch.lines.length - 5}` : ""}</p></div>
                <div className="md:text-right"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${index === 0 ? "bg-[#fff0d5] text-[#99671e]" : "bg-[#e8f2eb] text-[#487158]"}`}>{index === 0 ? "Next" : "Planned"}</span><p className="mt-2 text-[10px] text-[#919a94]">{batch.deliveryAt.slice(11, 16)} target</p></div>
                <Icon name="arrow" className="ml-auto size-4 text-[#9ca69f]" />
              </Link>
            ))}
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) { return <div className="min-w-24 rounded-xl border border-[#dce2dc] bg-white px-4 py-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-[#909a93]">{label}</p><p className="mt-1 text-lg font-semibold text-[#2d3a31]">{value}</p></div>; }
function monthLabel(date: string): string { return new Intl.DateTimeFormat("en", { month: "short", timeZone: "Europe/Kyiv" }).format(new Date(`${date}T12:00:00+03:00`)); }
