import Link from 'next/link';
import { AppShell, Icon } from '@/components/app-shell';
import { buildOverviewSummary, type DemandSourceSplit, type OverviewDay } from '@/application/overview-summary';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { demoDataset } from '@/data/demo/dataset';
import { DEMO_PERIOD } from '@/lib/demo-clock';

export const dynamic = 'force-dynamic';

const loadStyle = {
  quiet: { label: 'Quiet', bar: 'w-[38%] bg-[#b9c6bd]', text: 'text-[#718078]' },
  normal: { label: 'Normal', bar: 'w-[58%] bg-[#67aa7d]', text: 'text-[#4f6d5a]' },
  busy: { label: 'Busy', bar: 'w-[78%] bg-[#df9d44]', text: 'text-[#9b6826]' },
  peak: { label: 'Peak', bar: 'w-full bg-[#d96b57]', text: 'text-[#a34738]' },
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
                <span>{DEMO_PERIOD.label}</span>
                <span className="text-[#bcc4be]">/</span>
                <span className="rounded-full bg-[#e1eee5] px-2 py-1 text-[10px] uppercase tracking-wide text-[#39704d]">
                  Plan v{summary.planVersion}
                </span>
              </div>
              <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#18251d] md:text-[36px]">
                Good morning, Operations
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65736a]">
                Restaurant demand, {summary.eventCount} events, stock and incoming supply are reconciled into one dated
                procurement plan.
              </p>
            </div>
            <Link
              href="/procurement"
              className="flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#1c5b37] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(28,91,55,.18)] md:self-auto"
            >
              Open procurement <Icon name="arrow" className="size-4" />
            </Link>
          </div>

          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business planning summary">
            <BusinessMetricCard
              eyebrow="Restaurant operations"
              value={`${summary.operatingDayCount} operating days`}
              detail="Regular daily demand active"
              meta={
                summary.nextPeakDay
                  ? `Next peak · ${summary.nextPeakDay.weekday} Sep ${summary.nextPeakDay.dayNumber} · ×${summary.nextPeakDay.loadFactor.toFixed(2)}`
                  : 'Normal service calendar active'
              }
              accent="green"
            />
            <BusinessMetricCard
              eyebrow="Events & catering"
              value={`${summary.eventCount} confirmed events`}
              detail={`${summary.guestTotal} guests`}
              meta={
                summary.largestEvent
                  ? `Largest · ${summary.largestEvent.name} · ${summary.largestEvent.guestCount} guests`
                  : 'No events scheduled'
              }
              accent="blue"
            />
            <BusinessMetricCard
              eyebrow="Combined procurement"
              value={`${summary.batchCount} planned deliveries`}
              detail={
                summary.upcomingBatches[0]
                  ? `Next · Sep ${Number(summary.upcomingBatches[0].deliveryOn.slice(-2))}`
                  : 'No delivery required'
              }
              meta={
                summary.upcomingBatches[0]
                  ? `${summary.upcomingBatches[0].lines.length} ingredients in next batch`
                  : 'Demand currently covered'
              }
              accent="neutral"
            />
            <BusinessMetricCard
              eyebrow="Attention"
              value={`${summary.attention.filter((item) => item.actionable).length} actions`}
              detail={`${summary.attention.filter((item) => !item.actionable).length} planning insight`}
              meta="Review before the next delivery"
              accent="amber"
            />
          </section>

          <section
            className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]"
            aria-label="How demand becomes procurement"
          >
            <div className="grid divide-y divide-[#e8ebe7] md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="px-5 py-5 md:px-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4c7c5b]">
                  Restaurant operations
                </p>
                <p className="mt-2 text-lg font-semibold text-[#26342b]">Regular daily demand</p>
                <p className="mt-1 text-xs leading-5 text-[#77837b]">
                  A {summary.operatingDayCount}-day service calendar keeps the kitchen supplied even when no catering
                  event is scheduled.
                </p>
              </div>
              <div className="px-5 py-5 md:px-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#526bb2]">Events & catering</p>
                <p className="mt-2 text-lg font-semibold text-[#26342b]">
                  {summary.eventCount} events · {summary.guestTotal} guests
                </p>
                <p className="mt-1 text-xs leading-5 text-[#77837b]">
                  Menus and guest counts add dated demand to the same kitchen and shared inventory.
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-4 bg-[#1d3126] px-5 py-5 text-white md:flex-row md:items-center md:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a9daba]">Combined procurement</p>
                <p className="mt-1 text-lg font-semibold">One plan for what to buy, how much and when</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/65">
                <span>Shared stock</span>
                <span>+</span>
                <span>Confirmed incoming</span>
                <Icon name="arrow" className="text-[#a9daba]" />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <SectionHeader
              title="Where demand comes from"
              subtitle={`Regular restaurant operations and ${summary.eventCount} scheduled events · ${summary.guestTotal} guests`}
            />
            <div className="grid gap-5 p-5 md:grid-cols-3 md:p-6">
              {summary.demandSplit.map((split) => (
                <DemandSplitCard key={split.unit} split={split} />
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <header className="flex flex-col justify-between gap-3 border-b border-[#e5e8e3] px-5 py-5 md:flex-row md:items-center md:px-6">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1c2921]">14-day operations timeline</h2>
                <p className="mt-1 text-xs text-[#7a877f]">Three views of the same planning horizon</p>
              </div>
            </header>
            <TimelineLanes days={summary.timeline} />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader
                title="Upcoming procurement batches"
                subtitle="Planned delivery timing from the chronological projection"
                action="View all"
              />
              <div className="divide-y divide-[#edf0ec]">
                {summary.upcomingBatches.map((batch, index) => (
                  <div
                    key={batch.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[78px_minmax(0,1fr)_auto] sm:items-center md:px-6"
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#839087]">
                        {monthLabel(batch.deliveryOn)}
                      </p>
                      <p className="mt-0.5 text-xl font-semibold tracking-tight text-[#25332a]">
                        {Number(batch.deliveryOn.slice(-2))}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${index === 0 ? 'bg-[#e2a341]' : 'bg-[#70ae82]'}`} />
                        <p className="truncate text-sm font-semibold text-[#27352c]">
                          {batch.ingredientNames.join(', ')}
                          {batch.lines.length > 3 ? ` +${batch.lines.length - 3}` : ''}
                        </p>
                      </div>
                      <p className="mt-1 pl-4 text-xs text-[#7c8981]">
                        {batch.lines.length} ingredients · covers restaurant operations and upcoming events
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${index === 0 ? 'bg-[#fff1d8] text-[#99671d]' : 'bg-[#e9f3ec] text-[#467255]'}`}
                    >
                      {index === 0 ? 'Next' : 'Planned'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader title="Needs attention" subtitle="Exceptions and execution cues" />
              <div className="space-y-3 p-4 md:p-5">
                {summary.attention.map((item) => {
                  const tone = {
                    warning: 'border-[#f0dfc1] bg-[#fffaf0] text-[#9a6b25]',
                    info: 'border-[#dbe5f8] bg-[#f6f8fe] text-[#4f6ea8]',
                    ready: 'border-[#d7e9dc] bg-[#f5faf6] text-[#3e7650]',
                  }[item.tone];
                  return (
                    <article key={item.id} className={`rounded-xl border p-4 ${tone}`}>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 size-2 rounded-full bg-current opacity-80" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-semibold text-[#26342b]">{item.title}</h3>
                          <p className="mt-1 text-[11px] leading-5 text-[#748078]">{item.description}</p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide">{item.meta}</p>
                            {item.href && item.actionLabel && (
                              <Link
                                href={item.href}
                                className="text-[10px] font-bold text-current underline decoration-current/30 underline-offset-4"
                              >
                                {item.actionLabel} →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="mt-6">
            <section className="rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
              <SectionHeader title="Recent changes" subtitle="Approved business changes and plan versions" />
              {summary.recentChanges.length > 0 ? (
                <div className="divide-y divide-[#edf0ec]">
                  {summary.recentChanges.slice(0, 3).map((change) => (
                    <div key={change.id} className="flex items-start gap-3 px-5 py-4">
                      <div className="mt-0.5 grid size-8 place-items-center rounded-full bg-[#e5f1e8] text-[#4e785a]">
                        <Icon name="calendar" className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#344238]">{change.summary}</p>
                        <p className="mt-1 text-xs text-[#7c8981]">
                          Plan v{change.planVersion} activated · approved change
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[170px] items-center justify-center px-6 py-8 text-center">
                  <div>
                    <div className="mx-auto grid size-10 place-items-center rounded-full bg-[#eef2ee] text-[#718078]">
                      <Icon name="calendar" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#344238]">Plan v1 is the active baseline</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#7c8981]">
                      No approved event changes yet. Wedding is currently planned for 180 guests.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function BusinessMetricCard({
  eyebrow,
  value,
  detail,
  meta,
  accent,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  meta: string;
  accent: 'green' | 'blue' | 'neutral' | 'amber';
}) {
  const accentStyle = { green: 'bg-[#5ead76]', blue: 'bg-[#6c85d7]', neutral: 'bg-[#9aa59e]', amber: 'bg-[#dca04a]' }[
    accent
  ];
  return (
    <article className="rounded-2xl border border-[#dfe3dc] bg-white p-5 shadow-[0_1px_2px_rgba(24,37,29,.03)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#748178]">{eyebrow}</p>
        <span className={`size-2 rounded-full ${accentStyle}`} />
      </div>
      <p className="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#1c2921]">{value}</p>
      <p className="mt-1 text-sm font-medium text-[#536158]">{detail}</p>
      <p className="mt-4 border-t border-[#edf0ec] pt-3 text-[10px] leading-4 text-[#89938d]">{meta}</p>
    </article>
  );
}

function TimelineLanes({ days }: { days: OverviewDay[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1320px] grid-cols-[156px_repeat(14,minmax(80px,1fr))] text-center">
        <div className="sticky left-0 z-10 border-r border-[#e5e8e3] bg-[#f8f9f7]" />
        {days.map((day) => (
          <div
            key={day.date}
            className={`border-r border-[#eef0ed] px-2 py-3 ${day.date === '2026-09-01' ? 'bg-[#f1f8f3]' : 'bg-[#f8f9f7]'}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#929c95]">{day.weekday}</p>
            <p className="mt-1 text-sm font-semibold text-[#344138]">Sep {day.dayNumber}</p>
          </div>
        ))}
        <TimelineLabel title="Restaurant" subtitle="Operations" />
        {days.map((day) => {
          const style = loadStyle[day.load];
          return (
            <div
              key={`restaurant-${day.date}`}
              className={`border-r border-t border-[#eef0ed] px-2 py-4 ${day.date === '2026-09-01' ? 'bg-[#f5faf6]' : 'bg-white'}`}
            >
              <p className={`text-[10px] font-bold uppercase ${style.text}`}>{style.label}</p>
              <p className="mt-1 text-[9px] text-[#929c95]">×{day.loadFactor.toFixed(2)}</p>
              <div className="mx-auto mt-2 h-1.5 w-12 overflow-hidden rounded-full bg-[#edf0ed]">
                <div className={`h-full rounded-full ${style.bar}`} />
              </div>
            </div>
          );
        })}
        <TimelineLabel title="Events" subtitle="& catering" />
        {days.map((day) => (
          <div
            key={`events-${day.date}`}
            className={`min-h-[82px] border-r border-t border-[#eef0ed] px-1.5 py-3 ${day.date === '2026-09-01' ? 'bg-[#f5faf6]' : 'bg-white'}`}
          >
            {day.events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className={`block rounded-lg px-2 py-2 text-left text-[9px] leading-3.5 ${event.id === 'wedding' ? 'bg-[#e7ecfb] text-[#3e579b] ring-1 ring-[#cfd8f3]' : 'bg-[#eef2fe] text-[#455f9e]'}`}
              >
                <span className="block font-semibold">{event.name}</span>
                <span className="opacity-70">{event.guestCount} guests</span>
              </Link>
            ))}
          </div>
        ))}
        <TimelineLabel title="Procurement" subtitle="Deliveries" />
        {days.map((day) => (
          <div
            key={`procurement-${day.date}`}
            className={`min-h-[68px] border-r border-t border-[#eef0ed] px-1.5 py-3 ${day.date === '2026-09-01' ? 'bg-[#f5faf6]' : 'bg-white'}`}
          >
            {day.batchId ? (
              <Link
                href={`/procurement/${day.batchId}`}
                className="block rounded-lg border border-[#dfe4df] bg-[#f8faf8] px-2 py-2 text-left text-[9px] text-[#5e6c63]"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="size-1.5 rounded-full bg-[#708f79]" />
                  Delivery
                </span>
                <span className="mt-0.5 block opacity-75">{day.procurementLineCount} ingredients</span>
              </Link>
            ) : (
              <span className="text-[9px] text-[#bdc4bf]">Covered</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineLabel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sticky left-0 z-10 flex min-h-[68px] flex-col justify-center border-r border-t border-[#e5e8e3] bg-[#f8f9f7] px-5 text-left">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#526159]">{title}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-[#98a19b]">{subtitle}</p>
    </div>
  );
}

function DemandSplitCard({ split }: { split: DemandSourceSplit }) {
  const labels = { g: ['Mass demand', 'kg'], ml: ['Volume demand', 'L'], pcs: ['Unit demand', 'pcs'] } as const;
  const divisor = split.unit === 'pcs' ? 1 : 1_000;
  const [title, displayUnit] = labels[split.unit];
  return (
    <article>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold text-[#37443b]">{title}</h3>
        <span className="text-[10px] uppercase tracking-wide text-[#9aa39d]">{displayUnit}</span>
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#edf0ed]">
        <div className="bg-[#4f9267]" style={{ width: `${split.restaurantPercent}%` }} />
        <div className="bg-[#647fd3]" style={{ width: `${split.eventPercent}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-[#89938d]">Restaurant</p>
          <p className="mt-1 text-sm font-semibold text-[#315f40]">
            {formatCompact(split.restaurant / divisor)}{' '}
            <span className="text-[10px] font-medium text-[#9aa39d]">{displayUnit}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#89938d]">Events</p>
          <p className="mt-1 text-sm font-semibold text-[#4f65a4]">
            {formatCompact(split.events / divisor)}{' '}
            <span className="text-[10px] font-medium text-[#9aa39d]">{displayUnit}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#e8ebe7] px-5 py-4 md:px-6">
      <div>
        <h2 className="text-sm font-semibold text-[#253229]">{title}</h2>
        <p className="mt-1 text-[11px] text-[#879188]">{subtitle}</p>
      </div>
      {action && (
        <Link href="/procurement" className="text-xs font-semibold text-[#3e7650]">
          {action}
        </Link>
      )}
    </header>
  );
}
function monthLabel(date: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'Europe/Kyiv' }).format(
    new Date(`${date}T12:00:00+03:00`),
  );
}
function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
}
