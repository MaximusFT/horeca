import type { EventChangePreview } from "./planning-repository";

export interface EventChangePreviewDto {
  id: string;
  eventId: string;
  beforeGuestCount: number;
  afterGuestCount: number;
  basePlanVersion: number;
  candidatePlanVersion: number;
  createdAt: string;
  expiresAt: string;
  diff: EventChangePreview["diff"];
}

export function toEventChangePreviewDto(preview: EventChangePreview): EventChangePreviewDto {
  return {
    id: preview.id,
    eventId: preview.eventId,
    beforeGuestCount: preview.beforeGuestCount,
    afterGuestCount: preview.afterGuestCount,
    basePlanVersion: preview.basePlanVersion,
    candidatePlanVersion: preview.candidatePlan.version,
    createdAt: preview.createdAt,
    expiresAt: preview.expiresAt,
    diff: preview.diff,
  };
}
