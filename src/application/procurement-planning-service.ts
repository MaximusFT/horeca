import { randomUUID } from "node:crypto";
import { addMinutes } from "date-fns";
import type { DemoDataset } from "@/data/demo/dataset";
import type { Clock } from "@/lib/clock";
import { calculateDemandPlan } from "@/engine/calculate-demand-plan";
import { calculateProcurementPlan } from "@/engine/calculate-procurement-plan";
import { diffProcurementPlans } from "./plan-diff";
import type { EventChangePreview, PlanningRepository } from "./planning-repository";

export interface ProcurementPlanningServiceDependencies {
  repository: PlanningRepository;
  referenceDataset: DemoDataset;
  clock: Clock;
  generateId?: () => string;
}

export class ProcurementPlanningService {
  private readonly generateId: () => string;

  constructor(private readonly dependencies: ProcurementPlanningServiceDependencies) {
    this.generateId = dependencies.generateId ?? randomUUID;
  }

  getCurrentProcurementPlan() {
    return this.dependencies.repository.getState().activePlan;
  }

  previewEventChange(eventId: string, guestCount: number): EventChangePreview {
    if (!Number.isInteger(guestCount) || guestCount < 0) {
      throw new Error("Guest count must be a non-negative integer");
    }

    const state = this.dependencies.repository.getState();
    const event = state.events.find((item) => item.id === eventId);
    if (!event) throw new Error(`Unknown event ${eventId}`);
    if (event.guestCount === guestCount) throw new Error(`Event ${eventId} already has ${guestCount} guests`);

    const candidateEvents = state.events.map((item) =>
      item.id === eventId ? { ...item, guestCount } : item,
    );
    const candidateDataset: DemoDataset = {
      ...this.dependencies.referenceDataset,
      events: candidateEvents,
    };
    const nextVersion = state.activePlan.version + 1;
    const candidatePlan = calculateProcurementPlan({
      ingredients: candidateDataset.ingredients,
      inventoryLots: candidateDataset.inventoryLots,
      incomingSupply: candidateDataset.incomingSupply,
      demandPlan: calculateDemandPlan(candidateDataset),
      clock: this.dependencies.clock,
      version: nextVersion,
    });
    const now = this.dependencies.clock.now();
    const preview: EventChangePreview = {
      id: this.generateId(),
      eventId,
      beforeGuestCount: event.guestCount,
      afterGuestCount: guestCount,
      basePlanVersion: state.activePlan.version,
      candidatePlan,
      diff: diffProcurementPlans(state.activePlan, candidatePlan),
      createdAt: now.toISOString(),
      expiresAt: addMinutes(now, 15).toISOString(),
      status: "pending",
    };

    this.dependencies.repository.savePreview(preview);
    return preview;
  }

  applyEventChange(previewId: string) {
    const preview = this.dependencies.repository.getPreview(previewId);
    if (!preview) throw new Error(`Unknown event change preview ${previewId}`);
    if (preview.status !== "pending") throw new Error(`Preview ${previewId} is ${preview.status}`);

    const now = this.dependencies.clock.now();
    if (now.getTime() > new Date(preview.expiresAt).getTime()) {
      this.dependencies.repository.savePreviewStatus(previewId, "expired");
      throw new Error(`Preview ${previewId} has expired`);
    }

    const state = this.dependencies.repository.getState();
    const currentEvent = state.events.find((event) => event.id === preview.eventId);
    if (
      state.activePlan.version !== preview.basePlanVersion
      || !currentEvent
      || currentEvent.guestCount !== preview.beforeGuestCount
    ) {
      this.dependencies.repository.savePreviewStatus(previewId, "stale");
      throw new Error(`Preview ${previewId} is stale`);
    }

    const events = state.events.map((event) =>
      event.id === preview.eventId ? { ...event, guestCount: preview.afterGuestCount } : event,
    );
    const change = {
      id: this.generateId(),
      type: "EVENT_CHANGED" as const,
      eventId: preview.eventId,
      beforeGuestCount: preview.beforeGuestCount,
      afterGuestCount: preview.afterGuestCount,
      createdAt: now.toISOString(),
      planVersion: preview.candidatePlan.version,
    };

    this.dependencies.repository.saveState({
      events,
      activePlan: preview.candidatePlan,
      planHistory: [...state.planHistory, preview.candidatePlan],
      recentChanges: [change, ...state.recentChanges],
    });
    this.dependencies.repository.savePreviewStatus(previewId, "applied");

    return {
      event: events.find((event) => event.id === preview.eventId)!,
      plan: preview.candidatePlan,
      diff: preview.diff,
      change,
    };
  }
}
