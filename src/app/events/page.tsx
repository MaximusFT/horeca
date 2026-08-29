import Link from 'next/link';
import { AppShell, Icon } from '@/components/app-shell';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { getDictionary, getServerLocale } from '@/i18n';
import { localizedEventName } from '@/i18n/demo-names';
import { formatMonthShort } from '@/i18n/format';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const { events, activePlan } = getDemoPlanningRuntime().repository.getState();

  return (
    <AppShell activeKey="events">
      <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#728078]">
                {dictionary.events.planLabel(activePlan.version)}
              </p>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#18251d]">
                {dictionary.events.title}
              </h1>
              <p className="mt-2 text-sm text-[#6d7a72]">{dictionary.events.subtitle}</p>
            </div>
            <div className="rounded-xl border border-[#dce2dc] bg-white px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a958e]">
                {dictionary.events.confirmedGuests}
              </p>
              <p className="mt-1 text-xl font-semibold text-[#243229]">
                {events.reduce((sum, event) => sum + event.guestCount, 0)}
              </p>
            </div>
          </div>

          <section className="mt-7 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(24,37,29,.03)]">
            <div className="grid grid-cols-[92px_minmax(0,1fr)_100px_110px_32px] border-b border-[#e6e9e5] bg-[#f8f9f7] px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#88938c] md:grid-cols-[120px_minmax(0,1fr)_140px_130px_32px] md:px-6">
              <span>{dictionary.events.columnDate}</span>
              <span>{dictionary.events.columnEvent}</span>
              <span className="text-right">{dictionary.events.columnGuests}</span>
              <span className="text-right">{dictionary.events.columnStatus}</span>
              <span />
            </div>
            <div className="divide-y divide-[#edf0ec]">
              {events.map((event) => {
                const isHero = event.id === 'wedding';
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className={`grid grid-cols-[92px_minmax(0,1fr)_100px_110px_32px items-center px-5 py-5 transition hover:bg-[#fafbf9] md:grid-cols-[120px_minmax(0,1fr)_140px_130px_32px] md:px-6 ${isHero ? 'bg-[#f8fbf8]' : ''}`}
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[#8b958e]">
                        {formatMonthShort(event.startsAt, locale)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#2d3a31]">{Number(event.startsAt.slice(8, 10))}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#27352c]">
                          {localizedEventName(event.id, event.name, locale)}
                        </p>
                        {isHero && (
                          <span className="rounded-full bg-[#e2f0e6] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#447557]">
                            {dictionary.events.heroFlow}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#869088]">
                        {dictionary.events.prepStarts(event.prepStartsAt.slice(11, 16), event.menu.length)}
                      </p>
                    </div>
                    <p className="text-right text-sm font-semibold tabular-nums text-[#354239]">{event.guestCount}</p>
                    <div className="text-right">
                      <span className="rounded-full bg-[#e9f3ec] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#467255]">
                        {dictionary.events.confirmed}
                      </span>
                    </div>
                    <Icon name="arrow" className="ml-auto size-4 text-[#9ca69f]" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
