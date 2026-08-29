import Link from 'next/link';
import { getDictionary, getServerLocale } from '@/i18n';

export default async function NotFound() {
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f5f2] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#dfe3dc] bg-white p-8 text-center shadow-[0_1px_2px_rgba(24,37,29,.03)]">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[#193126] text-lg font-black text-[#b8edca]">
          M
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#728078]">
          {dictionary.notFound.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#18251d]">{dictionary.notFound.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#65736a]">{dictionary.notFound.body}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/overview"
            className="flex h-11 items-center justify-center rounded-xl bg-[#1c5b37] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(28,91,55,.18)]"
          >
            {dictionary.notFound.backToOverview}
          </Link>
          <Link
            href="/procurement"
            className="flex h-11 items-center justify-center rounded-xl border border-[#d7ddd7] px-4 text-sm font-semibold text-[#456b53]"
          >
            {dictionary.notFound.openProcurement}
          </Link>
        </div>
      </div>
    </div>
  );
}
