'use client';

import { useState } from 'react';
import type { Locale } from '@/i18n';

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [busy, setBusy] = useState(false);

  async function switchTo(next: Locale) {
    if (next === locale || busy) return;
    setBusy(true);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="flex items-center rounded-full border border-[#d9ded7] bg-white p-0.5 text-[11px] font-semibold">
      <button
        type="button"
        disabled={busy}
        onClick={() => switchTo('uk')}
        className={`rounded-full px-2.5 py-1.5 transition ${locale === 'uk' ? 'bg-[#1c5b37] text-white' : 'text-[#526159]'}`}
      >
        UA
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => switchTo('en')}
        className={`rounded-full px-2.5 py-1.5 transition ${locale === 'en' ? 'bg-[#1c5b37] text-white' : 'text-[#526159]'}`}
      >
        EN
      </button>
    </div>
  );
}
