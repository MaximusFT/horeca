import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createDemoPlanning } from '@/application/demo-planning';
import { SupplierOrderService } from '@/application/supplier-order-service';
import { demoIngredients } from '@/data/demo/ingredients';
import { preferredMockProductByIngredient } from '@/data/demo/mock-supplier-catalog';
import { MockSupplierGateway } from '@/infrastructure/mock-supplier-gateway';
import { TursoSupplierOrderSessionStore } from '@/infrastructure/turso-supplier-order-session-store';

describe('Turso supplier order session store', () => {
  const client = createClient({ url: ':memory:' });
  const store = new TursoSupplierOrderSessionStore(client, Buffer.alloc(32, 4).toString('base64'));

  afterEach(async () => {
    await client.execute('DELETE FROM supplier_order_sessions');
  });

  it('encrypts sessions and isolates them by OAuth scope', async () => {
    const planning = createDemoPlanning();
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway: new MockSupplierGateway(),
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
    });
    const session = await service.prepareBatch(planning.repository.getState().activePlan.batches[0].id);

    await store.set('oauth-a', session);

    const raw = await client.execute('SELECT encrypted_session FROM supplier_order_sessions');
    expect(String(raw.rows[0]?.encrypted_session)).not.toContain(session.id);
    await expect(store.get('oauth-a', session.id)).resolves.toEqual(session);
    await expect(store.get('oauth-b', session.id)).resolves.toBeUndefined();
  });

  it('atomically permits only one cart apply claim', async () => {
    const planning = createDemoPlanning();
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway: new MockSupplierGateway(),
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
    });
    const session = await service.prepareBatch(planning.repository.getState().activePlan.batches[0].id);
    const cartPreviewSession = { ...session, status: 'cart_preview' as const };
    await store.set('oauth-a', cartPreviewSession);

    const claims = await Promise.all([
      store.claimCartApply('oauth-a', session.id),
      store.claimCartApply('oauth-a', session.id),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.status).toBe('cart_applying');
  });

  it('clears only the requested OAuth scope', async () => {
    const planning = createDemoPlanning();
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway: new MockSupplierGateway(),
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
    });
    const session = await service.prepareBatch(planning.repository.getState().activePlan.batches[0].id);
    await store.set('oauth-a', session);
    await store.set('oauth-b', session);

    await store.clearScope('oauth-a');

    await expect(store.get('oauth-a', session.id)).resolves.toBeUndefined();
    await expect(store.get('oauth-b', session.id)).resolves.toEqual(session);
  });
});