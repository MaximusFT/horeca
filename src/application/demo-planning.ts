import { demoDataset } from "@/data/demo/dataset";
import type { Clock } from "@/lib/clock";
import { DemoClock } from "@/lib/demo-clock";
import { calculateDemoProcurementPlan } from "@/engine/calculate-procurement-plan";
import { MemoryPlanningRepository } from "./memory-planning-repository";
import { ProcurementPlanningService } from "./procurement-planning-service";
import type { PlanningRepository, PlanningState } from './planning-repository';

export function createDemoPlanningState(clock: Clock = new DemoClock()): PlanningState {
  const initialPlan = calculateDemoProcurementPlan(demoDataset, clock, 1);
  return {
    events: demoDataset.events,
    activePlan: initialPlan,
    planHistory: [initialPlan],
    recentChanges: [],
  };
}

export function createDemoPlanning(
  clock: Clock = new DemoClock(),
  generateId?: () => string,
  repository: PlanningRepository = new MemoryPlanningRepository(createDemoPlanningState(clock)),
) {
  const service = new ProcurementPlanningService({
    repository,
    referenceDataset: demoDataset,
    clock,
    generateId,
  });

  return { repository, service, clock };
}
