import type { Event } from "@/domain/event";
import type { ChronologicalProcurementPlan } from "@/domain/procurement";
import type { ProcurementPlanDiff } from "./plan-diff";

export interface PlanningState {
  events: Event[];
  activePlan: ChronologicalProcurementPlan;
  planHistory: ChronologicalProcurementPlan[];
  recentChanges: PlanningChange[];
}

export interface PlanningChange {
  id: string;
  type: "EVENT_CHANGED";
  eventId: string;
  beforeGuestCount: number;
  afterGuestCount: number;
  createdAt: string;
  planVersion: number;
}

export interface EventChangePreview {
  id: string;
  eventId: string;
  beforeGuestCount: number;
  afterGuestCount: number;
  basePlanVersion: number;
  candidatePlan: ChronologicalProcurementPlan;
  diff: ProcurementPlanDiff;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "applied" | "rejected" | "expired" | "stale";
}

export interface PlanningRepository {
  getState(): PlanningState;
  saveState(state: PlanningState): void;
  savePreview(preview: EventChangePreview): void;
  getPreview(id: string): EventChangePreview | undefined;
  savePreviewStatus(id: string, status: EventChangePreview["status"]): void;
}
