import { afterEach, describe, expect, it, vi } from 'vitest';
import { SilpoStage9TimeslotService } from '@/infrastructure/silpo-stage9-timeslot-service';
import { MemorySilpoTimeslotApprovalStore } from '@/infrastructure/silpo-timeslot-approval-store';
import type { SilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

const shoppingCartId = '11111111-1111-4111-8111-111111111111';
const branchId = '22222222-2222-4222-8222-222222222222';
const companyId = '33333333-3333-4333-8333-333333333333';
const currentTimeslot = { start: '2026-09-01T10:00:00Z', end: '2026-09-01T12:00:00Z' };
const nextTimeslot = { start: '2026-09-01T12:00:00Z', end: '2026-09-01T14:00:00Z' };
const sessionId = 'timeslot-test-session';

describe('Silpo Stage 9 timeslot service', () => {
  const approvals = new MemorySilpoTimeslotApprovalStore();
  const service = new SilpoStage9TimeslotService(
    approvals,
    () => '44444444-4444-4444-8444-444444444444',
    () => new Date('2026-09-01T08:00:00Z'),
  );

  afterEach(() => {
    globalThis.__mistoSilpoTimeslotApprovals = undefined;
  });

  it('creates an expiring approval containing only available slots', async () => {
    const result = await service.prepare(sessionId, createReadCaller());

    expect(result).toEqual({
      status: 'approval_required',
      approvalId: '44444444-4444-4444-8444-444444444444',
      expiresAt: '2026-09-01T08:15:00.000Z',
      deliveryType: 'DeliveryHome',
      slots: [nextTimeslot],
    });
  });

  it('reports no available slots without creating a usable approval', async () => {
    const result = await service.prepare(
      sessionId,
      createReadCaller({ silpo_get_time_slots: { structuredContent: { slots: [] } } }),
    );

    expect(result).toEqual({ status: 'no_available_slots', deliveryType: 'DeliveryHome' });
  });

  it('updates once and rereads the cart to verify the selected slot', async () => {
    const read = createReadCaller();
    const preview = await service.prepare(sessionId, read);
    if (preview.status !== 'approval_required') throw new Error('Expected approval preview');
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });

    const result = await service.apply(sessionId, preview.approvalId, nextTimeslot, read, write);

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith('silpo_update_shopping_cart', {
      shoppingCartId,
      deliveryType: 'DeliveryHome',
      timeslot: nextTimeslot,
      address: { addressType: 'delivery', latitude: '50.45', longitude: '30.52' },
      shipments: [{ companyId, branchId }],
    });
    expect(result).toEqual({
      status: 'updated',
      deliveryType: 'DeliveryHome',
      timeslot: nextTimeslot,
      validations: { total: 2, errors: 1, warnings: 1, other: 0 },
    });
    await expect(
      service.apply(sessionId, preview.approvalId, nextTimeslot, read, write),
    ).rejects.toThrow(/already used/);
    expect(write).toHaveBeenCalledOnce();
  });

  it('rejects a slot that was not displayed in the preview', async () => {
    const read = createReadCaller();
    const preview = await service.prepare(sessionId, read);
    if (preview.status !== 'approval_required') throw new Error('Expected approval preview');
    const write = vi.fn();

    await expect(
      service.apply(
        sessionId,
        preview.approvalId,
        { start: '2026-09-02T10:00:00Z', end: '2026-09-02T12:00:00Z' },
        read,
        write,
      ),
    ).rejects.toThrow(/not part of the approved preview/);
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects an expired approval before calling the mutation', async () => {
    let now = new Date('2026-09-01T08:00:00Z');
    const expiringService = new SilpoStage9TimeslotService(
      approvals,
      () => '55555555-5555-4555-8555-555555555555',
      () => now,
    );
    const read = createReadCaller();
    const preview = await expiringService.prepare(sessionId, read);
    if (preview.status !== 'approval_required') throw new Error('Expected approval preview');
    now = new Date('2026-09-01T08:16:00Z');
    const write = vi.fn();

    await expect(
      expiringService.apply(sessionId, preview.approvalId, nextTimeslot, read, write),
    ).rejects.toThrow(/expired/);
    expect(write).not.toHaveBeenCalled();
  });

  it('does not report success when the cart reread differs from the approved slot', async () => {
    const previewRead = createReadCaller();
    const preview = await service.prepare(sessionId, previewRead);
    if (preview.status !== 'approval_required') throw new Error('Expected approval preview');
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });
    const staleRead = createReadCaller({
      silpo_get_shopping_cart_by_id: cartDetail(currentTimeslot),
    });

    await expect(
      service.apply(sessionId, preview.approvalId, nextTimeslot, staleRead, write),
    ).rejects.toThrow(/did not confirm/);
    expect(write).toHaveBeenCalledOnce();
  });
});

function createReadCaller(overrides: Partial<Record<SilpoReadToolName, unknown>> = {}) {
  let cartReadCount = 0;
  return vi.fn(async (name: SilpoReadToolName): Promise<unknown> => {
    if (name in overrides) return overrides[name];
    if (name === 'silpo_get_my_shopping_cart') {
      return { structuredContent: { exists: true, shoppingCartId } };
    }
    if (name === 'silpo_get_shopping_cart_by_id') {
      cartReadCount += 1;
      const timeslot = cartReadCount > 1 ? nextTimeslot : currentTimeslot;
      return cartDetail(timeslot);
    }
    if (name === 'silpo_get_time_slots') {
      return {
        structuredContent: {
          slots: [
            { ...currentTimeslot, available: false },
            { ...nextTimeslot, available: true },
          ],
        },
      };
    }
    throw new Error(`Unexpected read ${name}`);
  });
}

function cartDetail(timeslot: { start: string; end: string }) {
  return {
    structuredContent: {
      cart: {
        address: { addressType: 'delivery', latitude: '50.45', longitude: '30.52' },
        deliveryType: 'DeliveryHome',
        timeslot,
        shipments: [{ companyId, branchId }],
        calculation: {
          validations: [{ level: 'error' }, { severity: 'warning' }],
        },
      },
    },
  };
}