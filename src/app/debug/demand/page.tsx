import { demoDataset } from "@/data/demo/dataset";
import { calculateDemandPlan } from "@/engine/calculate-demand-plan";
import { formatQuantity } from "@/engine/units";

export default function DemandDebugPage() {
  const plan = calculateDemandPlan(demoDataset);
  const ingredientNames = new Map(demoDataset.ingredients.map((ingredient) => [ingredient.id, ingredient.name]));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Debug</p>
          <h1 className="mt-2 text-3xl font-semibold">Demand requirements</h1>
          <p className="mt-2 text-slate-600">{plan.startsOn} → {plan.endsOn}</p>
        </div>
        <div className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          {plan.requirements.length} chronological rows
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Required at</th>
              <th className="px-4 py-3">Ingredient</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plan.requirements.map((requirement) => (
              <tr key={`${requirement.requiredAt}:${requirement.ingredientId}`}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                  {requirement.requiredAt}
                </td>
                <td className="px-4 py-3 font-medium">{ingredientNames.get(requirement.ingredientId)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatQuantity(requirement.quantity, requirement.unit)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {requirement.contributions.map(sourceLabel).join(" + ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function sourceLabel(requirement: (ReturnType<typeof calculateDemandPlan>)["requirements"][number]["contributions"][number]): string {
  return requirement.source.type === "restaurant"
    ? `Restaurant ${requirement.source.load}`
    : `${requirement.source.eventName} / ${requirement.source.menuItemId}`;
}
