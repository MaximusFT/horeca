'use client';

import { useState } from 'react';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n';

export function ResetDemoButton({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const dictionary = getDictionary(locale);
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
    } finally {
      // Full reload also clears client-only state (Ask Misto chat history) for a clean demo restart.
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={busy}
      aria-label={dictionary.resetDemo.idle}
      title={dictionary.resetDemo.idle}
      className={
        compact
          ? 'grid size-11 place-items-center border-l border-[#dfe3dc] text-lg text-[#607067] disabled:opacity-50'
          : 'mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-50'
      }
    >
      {compact ? <span aria-hidden="true">↻</span> : busy ? dictionary.resetDemo.busy : dictionary.resetDemo.idle}
    </button>
  );
}
