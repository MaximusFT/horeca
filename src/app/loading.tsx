import { getDictionary, getServerLocale } from '@/i18n';

export default async function Loading() {
  const dictionary = getDictionary(await getServerLocale());
  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f5f2]">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-[#bdc9c0] border-t-[#3b7950]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a877f]">{dictionary.loadingPage.label}</p>
      </div>
    </div>
  );
}
