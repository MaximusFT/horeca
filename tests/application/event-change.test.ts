import { describe, expect, it } from 'vitest';
import type { Clock } from '@/lib/clock';
import { createDemoPlanning } from '@/application/demo-planning';

describe('Wedding event change', () => {
  it('previews 180→200 without mutating state, then applies the stored candidate as plan v2', () => {
    const ids = idSequence();
    const { repository, service } = createDemoPlanning(undefined, ids);

    const preview = service.previewEventChange('wedding', 200);
    const stateBeforeApproval = repository.getState();

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

    const applied = service.applyEventChange(preview.id);
    const stateAfterApproval = repository.getState();

    expect(applied.event.guestCount).toBe(200);
    expect(applied.plan.version).toBe(2);
    expect(stateAfterApproval.events.find((event) => event.id === 'wedding')?.guestCount).toBe(200);
    expect(stateAfterApproval.activePlan.version).toBe(2);
    expect(stateAfterApproval.planHistory).toHaveLength(2);
    expect(stateAfterApproval.recentChanges[0].beforeGuestCount).toBe(180);
    expect(stateAfterApproval.recentChanges[0].afterGuestCount).toBe(200);
    expect(repository.getPreview(preview.id)?.status).toBe('applied');
  });

  it('rejects a preview made stale by another approved change', () => {
    const { repository, service } = createDemoPlanning(undefined, idSequence());
    const first = service.previewEventChange('wedding', 200);
    const second = service.previewEventChange('wedding', 220);

    service.applyEventChange(first.id);

    expect(() => service.applyEventChange(second.id)).toThrow(/stale/);
    expect(repository.getPreview(second.id)?.status).toBe('stale');
    expect(repository.getState().events.find((event) => event.id === 'wedding')?.guestCount).toBe(200);
  });

  it('rejects an expired preview', () => {
    const clock = new MutableClock('2026-09-01T08:00:00+03:00');
    const { repository, service } = createDemoPlanning(clock, idSequence());
    const preview = service.previewEventChange('wedding', 200);

    clock.set('2026-09-01T08:16:00+03:00');

    expect(() => service.applyEventChange(preview.id)).toThrow(/expired/);
    expect(repository.getPreview(preview.id)?.status).toBe('expired');
    expect(repository.getState().activePlan.version).toBe(1);
  });

  it('does not allow applying the same preview twice', () => {
    const { service } = createDemoPlanning(undefined, idSequence());
    const preview = service.previewEventChange('wedding', 200);
    service.applyEventChange(preview.id);

    expect(() => service.applyEventChange(preview.id)).toThrow(/applied/);
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
