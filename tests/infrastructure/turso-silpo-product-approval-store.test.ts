import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { TursoSilpoProductApprovalStore } from '@/infrastructure/turso-silpo-product-approval-store';

describe('Turso Silpo product approval store', () => {
  const client = createClient({ url: ':memory:' });
  const store = new TursoSilpoProductApprovalStore(client, Buffer.alloc(32, 9).toString('base64'));

  afterEach(async () => {
    await client.execute('DELETE FROM silpo_product_approvals');
  });

  it('encrypts product details and atomically permits one claim', async () => {
    const approval = {
      id: 'approval-1',
      createdAt: '2026-09-02T08:00:00.000Z',
      expiresAt: '2026-09-02T08:15:00.000Z',
      shoppingCartId: '11111111-1111-4111-8111-111111111111',
      candidate: {
        id: '44444444-4444-4444-8444-444444444444',
        companyId: '33333333-3333-4333-8333-333333333333',
        branchId: '22222222-2222-4222-8222-222222222222',
        name: 'private-product-marker',
        displayRatio: '10 шт',
        price: 89.99,
        step: 1,
        stock: 8,
        weighted: false,
        available: true,
      },
    };
    await store.save('session-1', approval);

    const raw = await client.execute('SELECT encrypted_payload FROM silpo_product_approvals');
    expect(String(raw.rows[0]?.encrypted_payload)).not.toContain('private-product-marker');
    const claims = await Promise.all([
      store.claim('session-1', approval.id, '2026-09-02T08:01:00.000Z'),
      store.claim('session-1', approval.id, '2026-09-02T08:01:00.000Z'),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)).toEqual(approval);
  });
});