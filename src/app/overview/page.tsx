import Link from "next/link";
import { AppShell, Icon } from "@/components/app-shell";
import { buildOverviewSummary, type DemandSourceSplit, type OverviewDay } from "@/application/overview-summary";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";
import { demoDataset } from "@/data/demo/dataset";
import { DEMO_PERIOD } from "@/lib/demo-clock";

export const dynamic = "force-dynamic";

const loadStyle = {
  quiet: { label: "Quiet", bar: "w-[38%] bg-[#b9c6bd]", text: "text-[#718078]" },
  normal: { label: "Normal", bar: "w-[58%] bg-[#67aa7d]", text: "text-[#4f6d5a]" },
  busy: { label: "Busy", bar: "w-[78%] bg-[#df9d44]", text: "text-[#9b6826]" },
  peak: { label: "Peak", bar: "w-full bg-[#d96b57]", text: "text-[#a34738]" },
} as const;

export default function OverviewPage() {
  const state = getDemoPlanningRuntime().repository.getState();
  const activeDataset = { ...demoDataset, events: state.events };
  const summary = buildOverviewSummary(activeDataset, state.activePlan, state.recentChanges);

  return (
    <AppShell>
      <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1480px]">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#66766c]">
                <span>{DEMO_PERIOD.label}</span><span className="text-[#bcc4be]">/</span>
                <span className="rounded-full bg-[#e1eee5] px-2 py-1 text-[10px] uppercase tracking-wide text-[#39704d]">Plan v{summary.planVersion}</span>
              </div>
              <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#18251d] md:text-[36px]">Good morning, Operations</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65736a]">Restaurant demand, five events, stock and incoming supply are reconciled into one dated procurement plan.</p>
            </div>
            <Link href="/procurement" className="flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#1c5b37] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(28,91,55,.18)] md:self-auto">
              Open procurement <Icon name="arrow" className="size-4" />
            </Link>
          </div>

          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Planning summary">
            <MetricCard label="Confirmed event guests" value={String(summary.guestTotal)} detail={`${summary.eventCount} events across 14 days`} accent="green" />
            <MetricCard label="Procurement batches" value={String(summary.batchCount)} detail={`${summary.procurementLineCount} dated ingredient lines`} accent="blue" />
            <MetricCard label="Restaurant operating days" value="14" detail="Daily baseline stays active" accent="neutral" />
            <MetricCard label="Needs attention" value={String(summary.attention.length)} detail="All non-blocking at plan level" accent="amber" />
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <header className="flex flex-col justify-between gap-3 border-b border-[#e5e8e3] px-5 py-5 md:flex-row md:items-center md:px-6">
              <div><h2 className="text-[15px] font-semibold text-[#1c2921]">14-day operations timeline</h2><p className="mt-1 text-xs text-[#7a877f]">Restaurant load, confirmed events and planned procurement arrivals</p></div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#69766e]"><Legend color="bg-[#67aa7d]" label="Restaurant load" /><Legend color="bg-[#486fdd]" label="Event" /><Legend color="bg-[#8f9a93]" label="Procurement" square /></div>
            </header>
            <div className="overflow-x-auto"><div className="grid min-w-[1260px] grid-cols-14 divide-x divide-[#eef0ed]">{summary.timeline.map((day) => <TimelineDay key={day.date} day={day} />)}</div></div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader title="Upcoming procurement batches" subtitle="Planned delivery timing from the chronological projection" action="View all" />
              <div className="divide-y divide-[#edf0ec]">
                {summary.upcomingBatches.map((batch, index) => (
                  <div key={batch.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[78px_minmax(0,1fr)_auto] sm:items-center md:px-6">
                    <div className="flex items-center gap-3 sm:block"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#839087]">{monthLabel(batch.deliveryOn)}</p><p className="mt-0.5 text-xl font-semibold tracking-tight text-[#25332a]">{Number(batch.deliveryOn.slice(-2))}</p></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${index === 0 ? "bg-[#e2a341]" : "bg-[#70ae82]"}`} /><p className="truncate text-sm font-semibold text-[#27352c]">{batch.ingredientNames.join(", ")}{batch.lines.length > 3 ? ` +${batch.lines.length - 3}` : ""}</p></div>
                      <p className="mt-1 pl-4 text-xs text-[#7c8981]">{batch.lines.length} ingredients · required by active demand timeline</p>
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${index === 0 ? "bg-[#fff1d8] text-[#99671d]" : "bg-[#e9f3ec] text-[#467255]"}`}>{index === 0 ? "Next" : "Planned"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader title="Needs attention" subtitle="Exceptions and execution cues" />
              <div className="space-y-3 p-4 md:p-5">
                {summary.attention.map((item) => {
                  const tone = { warning: "border-[#f0dfc1] bg-[#fffaf0] text-[#9a6b25]", info: "border-[#dbe5f8] bg-[#f6f8fe] text-[#4f6ea8]", ready: "border-[#d7e9dc] bg-[#f5faf6] text-[#3e7650]" }[item.tone];
                  return <article key={item.id} className={`rounded-xl border p-4 ${tone}`}><div className="flex items-start gap-3"><span className="mt-1 size-2 rounded-full bg-current opacity-80" /><div><h3 className="text-xs font-semibold text-[#26342b]">{item.title}</h3><p className="mt-1 text-[11px] leading-5 text-[#748078]">{item.description}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide">{item.meta}</p></div></div></article>;
                })}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader title="Restaurant vs event demand" subtitle="Separated by compatible engine units — no mixed-unit totals" />
              <div className="grid gap-5 p-5 md:grid-cols-3 md:p-6">{summary.demandSplit.map((split) => <DemandSplitCard key={split.unit} split={split} />)}</div>
            </section>
            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader title="Recent changes" subtitle="Approved business changes and plan versions" />
              {summary.recentChanges.length > 0 ? <div className="divide-y divide-[#edf0ec]">{summary.recentChanges.slice(0, 3).map((change) => <div key={change.id} className="flex items-start gap-3 px-5 py-4"><div className="mt-0.5 grid size-8 place-items-center rounded-full bg-[#e5f1e8] text-[#4e785a]"><Icon name="calendar" className="size-4" /></div><div><p className="text-sm font-semibold text-[#344238]">{change.summary}</p><p className="mt-1 text-xs text-[#7c8981]">Plan v{change.planVersion} activated · approved change</p></div></div>)}</div> : <div className="flex min-h-[170px] items-center justify-center px-6 py-8 text-center"><div><div className="mx-auto grid size-10 place-items-center rounded-full bg-[#eef2ee] text-[#718078]"><Icon name="calendar" /></div><p className="mt-3 text-sm font-semibold text-[#344238]">Plan v1 is the active baseline</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#7c8981]">No approved event changes yet. Wedding is currently planned for 180 guests.</p></div></div>}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: "green" | "blue" | "neutral" | "amber" }) {
  const accentStyle = { green: "bg-[#5ead76]", blue: "bg-[#6c85d7]", neutral: "bg-[#9aa59e]", amber: "bg-[#dca04a]" }[accent];
  return <article className="rounded-2xl border border-[#dfe3dc] bg-white p-5 shadow-[0_1px_2px_rgba(24,37,29,.03)]"><div className="flex items-start justify-between gap-4"><p className="text-xs font-medium text-[#748178]">{label}</p><span className={`size-2 rounded-full ${accentStyle}`} /></div><p className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-[#1c2921]">{value}</p><p className="mt-1 text-[11px] text-[#89938d]">{detail}</p></article>;
}

function TimelineDay({ day }: { day: OverviewDay }) {
  const style = loadStyle[day.load]; const isToday = day.date === "2026-09-01";
  return <article className={`min-h-[208px] px-3 py-4 ${isToday ? "bg-[#f5faf6]" : "bg-white"}`}><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#97a099]">{day.weekday}</p><p className={`mt-1 text-lg font-semibold ${isToday ? "text-[#2f7650]" : "text-[#354139]"}`}>{day.dayNumber}</p></div>{isToday && <span className="rounded-full bg-[#dcefe2] px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#3d7751]">Today</span>}</div><div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-[#edf0ed]"><div className={`h-full rounded-full ${style.bar}`} /></div><div className="mt-1.5 flex items-center justify-between gap-1"><span className={`text-[9px] font-semibold uppercase tracking-wide ${style.text}`}>{style.label}</span><span className="text-[9px] text-[#9aa39d]">×{day.loadFactor.toFixed(2)}</span></div></div><div className="mt-4 space-y-1.5">{day.events.map((event) => <div key={event.id} className="rounded-lg bg-[#eef2fe] px-2 py-1.5 text-[9px] leading-3.5 text-[#455f9e]"><p className="font-semibold">{event.name}</p><p className="mt-0.5 opacity-70">{event.guestCount} guests</p></div>)}{day.batchCount > 0 && <div className="flex items-center gap-1.5 rounded-lg border border-[#e1e5e0] bg-[#f8f9f7] px-2 py-1.5 text-[9px] text-[#68756d]"><span className="size-1.5 rounded-sm bg-[#8d9991]" />{day.procurementLineCount} lines arriving</div>}</div></article>;
}

function DemandSplitCard({ split }: { split: DemandSourceSplit }) {
  const labels = { g: ["Mass demand", "kg"], ml: ["Volume demand", "L"], pcs: ["Unit demand", "pcs"] } as const; const divisor = split.unit === "pcs" ? 1 : 1_000; const [title, displayUnit] = labels[split.unit];
  return <article><div className="flex items-baseline justify-between gap-3"><h3 className="text-xs font-semibold text-[#37443b]">{title}</h3><span className="text-[10px] uppercase tracking-wide text-[#9aa39d]">{displayUnit}</span></div><div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#edf0ed]"><div className="bg-[#4f9267]" style={{ width: `${split.restaurantPercent}%` }} /><div className="bg-[#647fd3]" style={{ width: `${split.eventPercent}%` }} /></div><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[10px] text-[#89938d]">Restaurant</p><p className="mt-1 text-sm font-semibold text-[#315f40]">{formatCompact(split.restaurant / divisor)} <span className="text-[10px] font-medium text-[#9aa39d]">{displayUnit}</span></p></div><div><p className="text-[10px] text-[#89938d]">Events</p><p className="mt-1 text-sm font-semibold text-[#4f65a4]">{formatCompact(split.events / divisor)} <span className="text-[10px] font-medium text-[#9aa39d]">{displayUnit}</span></p></div></div></article>;
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) { return <header className="flex items-center justify-between gap-4 border-b border-[#e8ebe7] px-5 py-4 md:px-6"><div><h2 className="text-sm font-semibold text-[#253229]">{title}</h2><p className="mt-1 text-[11px] text-[#879188]">{subtitle}</p></div>{action && <Link href="/procurement" className="text-xs font-semibold text-[#3e7650]">{action}</Link>}</header>; }
function Legend({ color, label, square = false }: { color: string; label: string; square?: boolean }) { return <span className="flex items-center gap-1.5"><span className={`${square ? "rounded-[2px]" : "rounded-full"} size-2 ${color}`} />{label}</span>; }
function monthLabel(date: string): string { return new Intl.DateTimeFormat("en", { month: "short", timeZone: "Europe/Kyiv" }).format(new Date(`${date}T12:00:00+03:00`)); }
function formatCompact(value: number): string { return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value); }
