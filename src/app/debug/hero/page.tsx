import { createDemoPlanning } from "@/application/demo-planning";
import { demoIngredients } from "@/data/demo/ingredients";
import { formatQuantity } from "@/engine/units";

export default function HeroDebugPage() {
  const { service } = createDemoPlanning();
  const preview = service.previewEventChange("wedding", 200);
  const ingredientNames = new Map(demoIngredients.map((ingredient) => [ingredient.id, ingredient.name]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Debug</p>
      <h1 className="mt-2 text-3xl font-semibold">Wedding impact preview</h1>
      <p className="mt-2 text-slate-600">
        {preview.beforeGuestCount} → {preview.afterGuestCount} guests · Plan v{preview.basePlanVersion} → v{preview.candidatePlan.version}
      </p>

      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-semibold">Procurement impact by ingredient</h2>
          <p className="mt-1 text-sm text-slate-600">Candidate only; current state remains unchanged.</p>
        </header>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Ingredient</th>
              <th className="px-5 py-3 text-right">Before</th>
              <th className="px-5 py-3 text-right">After</th>
              <th className="px-5 py-3 text-right">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.diff.ingredientDeltas.map((item) => (
              <tr key={item.ingredientId}>
                <td className="px-5 py-3 font-medium">{ingredientNames.get(item.ingredientId)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{formatQuantity(item.beforeQuantity, item.unit)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{formatQuantity(item.afterQuantity, item.unit)}</td>
                <td className="px-5 py-3 text-right font-semibold text-blue-700 tabular-nums">
                  +{formatQuantity(item.delta, item.unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
