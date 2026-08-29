import { demoDataset } from "@/data/demo/dataset";
import { calculateDemoProcurementPlan } from "@/engine/calculate-procurement-plan";
import { formatQuantity } from "@/engine/units";
import { DemoClock } from "@/lib/demo-clock";

export default function ProcurementDebugPage() {
  const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock());
  const ingredientNames = new Map(demoDataset.ingredients.map((ingredient) => [ingredient.id, ingredient.name]));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Debug</p>
      <h1 className="mt-2 text-3xl font-semibold">Chronological procurement plan</h1>
      <p className="mt-2 text-slate-600">
        Plan v{plan.version} · {plan.batches.length} batches · {plan.lines.length} ingredient lines
      </p>

      <div className="mt-8 space-y-6">
        {plan.batches.map((batch) => (
          <section key={batch.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between bg-slate-50 px-5 py-4">
              <div>
                <h2 className="font-semibold">Delivery {batch.deliveryOn}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{batch.id}</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                {batch.lines.length} lines
              </span>
            </header>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Ingredient</th>
                  <th className="px-5 py-3 text-right">Purchase</th>
                  <th className="px-5 py-3">Triggered by</th>
                  <th className="px-5 py-3 text-right">Needs covered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batch.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-5 py-3 font-medium">{ingredientNames.get(line.ingredientId)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatQuantity(line.quantity, line.unit)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{line.triggeredByRequiredAt}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{line.coveredRequiredAt.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </main>
  );
}
