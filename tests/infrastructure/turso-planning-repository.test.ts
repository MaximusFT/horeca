import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { demoDataset } from '@/data/demo/dataset';
import { calculateDemoProcurementPlan } from '@/engine/calculate-procurement-plan';
import { DemoClock } from '@/lib/demo-clock';
import { TursoPlanningRepository } from '@/infrastructure/turso-planning-repository';
import type { EventChangePreview, PlanningState } from '@/application/planning-repository';
import { createDemoPlanning } from '@/application/demo-planning';

describe('Turso planning repository', () => {
  it('shares applied planning state and preview status across repository instances', async () => {
    const client = createClient({ url: ':memory:' });
    const initialState = createInitialState();
    const first = new TursoPlanningRepository(client, initialState);
    const second = new TursoPlanningRepository(client, initialState);
    const nextPlan = { ...initialState.activePlan, version: 2 };
    const preview: EventChangePreview = {
      id: 'preview-1',
      eventId: 'wedding',
      beforeGuestCount: 180,
      afterGuestCount: 200,
      basePlanVersion: 1,
      candidatePlan: nextPlan,
      diff: {
        beforePlanId: initialState.activePlan.id,
        afterPlanId: nextPlan.id,
        beforeVersion: 1,
        afterVersion: 2,
        lines: [],
        ingredientDeltas: [],
      },
      createdAt: '2026-09-15T08:00:00.000Z',
      expiresAt: '2026-09-15T08:15:00.000Z',
      status: 'pending',
    };

    await first.savePreview(preview);
    await first.saveState({
      ...initialState,
      events: initialState.events.map((event) =>
        event.id === 'wedding' ? { ...event, guestCount: 200 } : event,
      ),
      activePlan: nextPlan,
      planHistory: [...initialState.planHistory, nextPlan],
    });
    await first.savePreviewStatus(preview.id, 'applied');

    const refreshedState = await second.getState();
    expect(refreshedState.events.find((event) => event.id === 'wedding')?.guestCount).toBe(200);
    expect(refreshedState.activePlan.version).toBe(2);
    await expect(second.getPreview(preview.id)).resolves.toMatchObject({ status: 'applied' });
  });

  it('previews, applies, and refreshes through separate service instances', async () => {
    const client = createClient({ url: ':memory:' });
    const clock = new DemoClock();
    const initialState = createInitialState();
    const previewRepository = new TursoPlanningRepository(client, initialState);
    const applyRepository = new TursoPlanningRepository(client, initialState);
    const refreshRepository = new TursoPlanningRepository(client, initialState);
    const previewService = createDemoPlanning(clock, idSequence(), previewRepository).service;
    const applyService = createDemoPlanning(clock, idSequence(), applyRepository).service;

    const preview = await previewService.previewEventChange('wedding', 200);
    await applyService.applyEventChange(preview.id);

    const refreshedState = await refreshRepository.getState();
    expect(refreshedState.events.find((event) => event.id === 'wedding')?.guestCount).toBe(200);
    expect(refreshedState.activePlan.version).toBe(2);
    expect(refreshedState.recentChanges[0]).toMatchObject({
      eventId: 'wedding',
      beforeGuestCount: 180,
      afterGuestCount: 200,
      planVersion: 2,
    });
  });
});

function createInitialState(): PlanningState {
  const plan = calculateDemoProcurementPlan(demoDataset, new DemoClock(), 1);
  return { events: demoDataset.events, activePlan: plan, planHistory: [plan], recentChanges: [] };
}

function idSequence(): () => string {
  let value = 0;
  return () => `test-id-${++value}`;
}