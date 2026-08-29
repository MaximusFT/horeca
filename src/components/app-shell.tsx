import type { ReactNode } from 'react';
import Link from 'next/link';
import { AgentLauncher } from '@/components/agent/agent-launcher';
import { ResetDemoButton } from '@/components/reset-demo-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getDictionary, getServerLocale } from '@/i18n';

type IconName = 'overview' | 'procurement' | 'events' | 'inventory' | 'spark' | 'calendar' | 'package' | 'arrow';
export type ActiveNavKey = 'overview' | 'procurement' | 'events' | 'inventory';

export async function AppShell({
  children,
  activeKey = 'overview',
}: {
  children: ReactNode;
  activeKey?: ActiveNavKey;
}) {
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const navigation: Array<{ key: ActiveNavKey; label: string; icon: IconName; href?: string }> = [
    { key: 'overview', label: dictionary.nav.overview, icon: 'overview', href: '/overview' },
    { key: 'procurement', label: dictionary.nav.procurement, icon: 'procurement', href: '/procurement' },
    { key: 'events', label: dictionary.nav.events, icon: 'events', href: '/events' },
    { key: 'inventory', label: dictionary.nav.inventory, icon: 'inventory', href: '/inventory' },
  ];
  const activeLabel = navigation.find((item) => item.key === activeKey)?.label ?? dictionary.nav.overview;

  return (
    <div className="min-h-screen bg-[#f4f5f2] lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-r border-[#dfe3dc] bg-[#17231c] text-white lg:flex lg:flex-col">
        <div className="flex h-[78px] items-center gap-3 border-b border-white/10 px-6">
          <div className="grid size-9 place-items-center rounded-xl bg-[#b8edca] text-sm font-black text-[#14351f]">
            M
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">{dictionary.nav.brand}</p>
            <p className="mt-0.5 text-[11px] text-white/50">{dictionary.nav.tagline}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6" aria-label="Primary navigation">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            {dictionary.nav.workspace}
          </p>
          <div className="mt-3 space-y-1">
            {navigation.map((item) => {
              const selected = item.key === activeKey;
              const className = `flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${selected ? 'bg-white/10 font-semibold text-white' : 'text-white/55'}`;
              return item.href ? (
                <Link key={item.key} href={item.href} className={className}>
                  <Icon name={item.icon} className={selected ? 'text-[#a9e9bf]' : 'text-white/45'} />
                  {item.label}
                </Link>
              ) : (
                <div key={item.key} className={className} aria-disabled="true">
                  <Icon name={item.icon} className="text-white/35" />
                  {item.label}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="m-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#b8edca]">
            <span className="size-1.5 rounded-full bg-[#75db9a] shadow-[0_0_0_4px_rgba(117,219,154,.12)]" />
            {dictionary.nav.demoStatusTitle}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">{dictionary.nav.demoStatusSubtitle}</p>
          <ResetDemoButton locale={locale} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#dfe3dc] bg-[#f8f9f6]/95 px-5 backdrop-blur md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#193126] text-sm font-black text-white lg:hidden">
              M
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#708076]">
                {dictionary.nav.operationsEyebrow}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#1b2820]">{activeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#d9ded7] bg-white px-3 py-2 text-xs font-medium text-[#526159] sm:flex">
              <span className="size-1.5 rounded-full bg-[#34a863]" />
              {dictionary.nav.demoClock}
            </div>
            <LanguageSwitcher locale={locale} />
            <AgentLauncher locale={locale} />
            <div className="grid size-10 place-items-center rounded-full bg-[#dfe8e1] text-xs font-bold text-[#31503d]">
              MK
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    procurement: (
      <>
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    events: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    inventory: (
      <>
        <path d="M4 5h16v5H4zM5.5 10h13v11h-13zM9 14h6" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8z" />
        <path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    package: (
      <>
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={`size-[18px] shrink-0 fill-none stroke-current stroke-[1.8] ${className}`}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
