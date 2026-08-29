import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getDemoPlanningRuntime } from '@/application/demo-runtime';
import { explainProcurementLine } from '@/application/explain-procurement';
import { demoIngredients } from '@/data/demo/ingredients';
import { ProcurementBatchTable } from '@/components/procurement/procurement-batch-table';
import { MockSupplierFlow } from '@/components/procurement/mock-supplier-flow';
import { getDictionary, getServerLocale } from '@/i18n';
import { localizedIngredientName } from '@/i18n/demo-names';
export const dynamic = 'force-dynamic';

export default async function ProcurementBatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const { activePlan } = getDemoPlanningRuntime().repository.getState();
  const batch = activePlan.batches.find((item) => item.id === batchId);
  if (!batch) notFound();
  const ingredientById = new Map(demoIngredients.map((item) => [item.id, item]));
  const lines = batch.lines.map((line) => {
    const ingredient = ingredientById.get(line.ingredientId)!;
    return {
      line,
      ingredientName: localizedIngredientName(ingredient.id, ingredient.name, locale),
      explanation: explainProcurementLine(activePlan, line, ingredient, locale),
    };
  });

  return (
    <AppShell activeKey="procurement">
      <main className="px-5 py-7 md:px-8 md:py-9 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1320px]">
          <Link href="/procurement" className="text-xs font-semibold text-[#5d7565]">
            {dictionary.procurementBatch.backToProcurement}
          </Link>
          <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#fff0d7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#94651f]">
                  {dictionary.procurementBatch.plannedStatus}
                </span>
                <span className="text-xs text-[#849087]">
                  {dictionary.procurementBatch.planLabel(activePlan.version)}
                </span>
              </div>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#18251d]">
                {dictionary.procurementBatch.deliveryTitle(prettyDate(batch.deliveryOn, dictionary.locale))}
              </h1>
              <p className="mt-2 text-sm text-[#6f7c73]">
                {dictionary.procurementBatch.targetArrival(batch.deliveryAt.slice(11, 16), batch.lines.length)}
              </p>
            </div>
            <MockSupplierFlow batchId={batch.id} locale={locale} />
          </div>
          <div className="mt-7">
            <ProcurementBatchTable lines={lines} locale={locale} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function prettyDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(`${date}T12:00:00+03:00`));
}
