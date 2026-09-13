import { describe, expect, it } from 'vitest';
import type { Clock } from '@/lib/clock';
import { createDemoPlanning } from '@/application/demo-planning';

describe('Wedding event change', () => {
  it('previews 180→200 without mutating state, then applies the stored candidate as plan v2', async () => {
    const ids = idSequence();
    const { repository, service } = createDemoPlanning(undefined, ids);

    const preview = await service.previewEventChange('wedding', 200);
    const stateBeforeApproval = await repository.getState();

    expect(preview.beforeGuestCount).toBe(180);
    expect(preview.afterGuestCount).toBe(200);
    expect(preview.basePlanVersion).toBe(1);
    expect(preview.candidatePlan.version).toBe(2);
    expect(preview.diff.beforeVersion).toBe(1);
    expect(preview.diff.afterVersion).toBe(2);
    expect(preview.diff.ingredientDeltas.length).toBeGreaterThan(0);
    expect(preview.diff.ingredientDeltas.find((item) => item.ingredientId === 'chicken')?.delta).toBe(2_730);
    expect(stateBeforeApproval.events.find((event) => event.id === 'wedding')?.guestCount).toBe(180);
    expect(stateBeforeApproval.activePlan.version).toBe(1);

    const applied = await service.applyEventChange(preview.id);
    const stateAfterApproval = await repository.getState();

    expect(applied.event.guestCount).toBe(200);
    expect(applied.plan.version).toBe(2);
    expect(stateAfterApproval.events.find((event) => event.id === 'wedding')?.guestCount).toBe(200);
    expect(stateAfterApproval.activePlan.version).toBe(2);
    expect(stateAfterApproval.planHistory).toHaveLength(2);
    expect(stateAfterApproval.recentChanges[0].beforeGuestCount).toBe(180);
    expect(stateAfterApproval.recentChanges[0].afterGuestCount).toBe(200);
    expect((await repository.getPreview(preview.id))?.status).toBe('applied');
  });

  it('rejects a preview made stale by another approved change', async () => {
    const { repository, service } = createDemoPlanning(undefined, idSequence());
    const first = await service.previewEventChange('wedding', 200);
    const second = await service.previewEventChange('wedding', 220);

    await service.applyEventChange(first.id);

    await expect(service.applyEventChange(second.id)).rejects.toThrow(/stale/);
    expect((await repository.getPreview(second.id))?.status).toBe('stale');
    expect((await repository.getState()).events.find((event) => event.id === 'wedding')?.guestCount).toBe(200);
  });

  it('rejects an expired preview', async () => {
    const clock = new MutableClock('2026-09-01T08:00:00+03:00');
    const { repository, service } = createDemoPlanning(clock, idSequence());
    const preview = await service.previewEventChange('wedding', 200);

    clock.set('2026-09-01T08:16:00+03:00');

    await expect(service.applyEventChange(preview.id)).rejects.toThrow(/expired/);
    expect((await repository.getPreview(preview.id))?.status).toBe('expired');
    expect((await repository.getState()).activePlan.version).toBe(1);
  });

  it('does not allow applying the same preview twice', async () => {
    const { service } = createDemoPlanning(undefined, idSequence());
    const preview = await service.previewEventChange('wedding', 200);
    await service.applyEventChange(preview.id);

    await expect(service.applyEventChange(preview.id)).rejects.toThrow(/applied/);
  });
});

class MutableClock implements Clock {
  constructor(private value: string) {}
  now(): Date {
    return new Date(this.value);
  }
  set(value: string): void {
    this.value = value;
  }
}

function idSequence(): () => string {
  let value = 0;
  return () => `test-id-${++value}`;
}
