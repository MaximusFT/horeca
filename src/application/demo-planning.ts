import { demoDataset } from "@/data/demo/dataset";
import type { Clock } from "@/lib/clock";
import { DemoClock } from "@/lib/demo-clock";
import { calculateDemoProcurementPlan } from "@/engine/calculate-procurement-plan";
import { MemoryPlanningRepository } from "./memory-planning-repository";
import { ProcurementPlanningService } from "./procurement-planning-service";

export function createDemoPlanning(clock: Clock = new DemoClock(), generateId?: () => string) {
  const initialPlan = calculateDemoProcurementPlan(demoDataset, clock, 1);
  const repository = new MemoryPlanningRepository({
    events: demoDataset.events,
    activePlan: initialPlan,
    planHistory: [initialPlan],
    recentChanges: [],
  });
  const service = new ProcurementPlanningService({
    repository,
    referenceDataset: demoDataset,
    clock,
    generateId,
  });

  return { repository, service, clock };
}
