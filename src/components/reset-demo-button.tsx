'use client';

import { useState } from 'react';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n';

export function ResetDemoButton({ locale }: { locale: Locale }) {
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
      className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-50"
    >
      {busy ? dictionary.resetDemo.busy : dictionary.resetDemo.idle}
    </button>
  );
}
