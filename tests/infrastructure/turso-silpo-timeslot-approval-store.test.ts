import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { TursoSilpoTimeslotApprovalStore } from '@/infrastructure/turso-silpo-timeslot-approval-store';

describe('Turso Silpo timeslot approval store', () => {
  const client = createClient({ url: ':memory:' });
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');
  const store = new TursoSilpoTimeslotApprovalStore(client, encryptionKey);

  afterEach(async () => {
    await client.execute('DELETE FROM silpo_timeslot_approvals');
  });

  it('encrypts approval payload and atomically allows only one claim', async () => {
    const approval = {
      id: 'approval-1',
      createdAt: '2026-09-01T08:00:00.000Z',
      expiresAt: '2026-09-01T08:15:00.000Z',
      source: {
        shoppingCartId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        deliveryType: 'DeliveryHome',
        timeslotStart: '2026-09-01T10:00:00Z',
        timeslotEnd: '2026-09-01T12:00:00Z',
        address: { street: 'private-address-marker' },
        shipments: [
          {
            companyId: '33333333-3333-4333-8333-333333333333',
            branchId: '22222222-2222-4222-8222-222222222222',
          },
        ],
      },
      slots: [{ start: '2026-09-01T12:00:00Z', end: '2026-09-01T14:00:00Z' }],
    };

    await store.save('session-1', approval);

    const raw = await client.execute(
      'SELECT encrypted_payload, status FROM silpo_timeslot_approvals WHERE approval_id = ?',
      ['approval-1'],
    );
    expect(String(raw.rows[0]?.encrypted_payload)).not.toContain('private-address-marker');
    expect(raw.rows[0]?.status).toBe('pending');

    await expect(
      Promise.all([
        store.claim('session-1', 'approval-1', '2026-09-01T08:01:00.000Z'),
        store.claim('session-1', 'approval-1', '2026-09-01T08:01:00.000Z'),
      ]),
    ).resolves.toSatisfy((claims: Array<typeof approval | undefined>) => {
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect(claims.find(Boolean)).toEqual(approval);
      return true;
    });
  });

  it('does not claim an expired approval', async () => {
    await store.save('session-1', {
      id: 'approval-expired',
      createdAt: '2026-09-01T08:00:00.000Z',
      expiresAt: '2026-09-01T08:15:00.000Z',
      source: {
        shoppingCartId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        deliveryType: 'DeliveryHome',
        timeslotStart: '2026-09-01T10:00:00Z',
        timeslotEnd: '2026-09-01T12:00:00Z',
        address: {},
        shipments: [
          {
            companyId: '33333333-3333-4333-8333-333333333333',
            branchId: '22222222-2222-4222-8222-222222222222',
          },
        ],
      },
      slots: [{ start: '2026-09-01T12:00:00Z', end: '2026-09-01T14:00:00Z' }],
    });

    await expect(store.claim('session-1', 'approval-expired', '2026-09-01T08:16:00.000Z')).resolves.toBeUndefined();
  });
});
