import { describe, expect, it, vi } from 'vitest';
import { createDemoPlanning } from '@/application/demo-planning';
import { SupplierOrderService } from '@/application/supplier-order-service';
import { demoIngredients } from '@/data/demo/ingredients';
import { preferredMockProductByIngredient } from '@/data/demo/mock-supplier-catalog';
import { MockSupplierGateway } from '@/infrastructure/mock-supplier-gateway';

describe('mock supplier order approvals', () => {
  it('does not attribute current supplier slot capacity to the procurement batch date', async () => {
    const planning = createDemoPlanning();
    const gateway = new MockSupplierGateway();
    vi.spyOn(gateway, 'getDeliveryOptions').mockResolvedValue([]);
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway,
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
    });
    const batch = planning.repository.getState().activePlan.batches[0];

    await expect(service.prepareBatch(batch.id)).rejects.toThrow(
      'The current supplier cart delivery slot is no longer available',
    );
    await expect(service.prepareBatch(batch.id)).rejects.not.toThrow(batch.deliveryOn);
  });

  it('keeps substitution and cart mutation as two explicit human approvals', async () => {
    const planning = createDemoPlanning();
    const gateway = new MockSupplierGateway();
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway,
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
      generateId: idSequence(),
    });
    const batch = planning.repository
      .getState()
      .activePlan.batches.find((candidate) => candidate.lines.some((line) => line.ingredientId === 'salmon'));
    expect(batch).toBeDefined();

    const prepared = await service.prepareBatch(batch!.id);
    const salmon = prepared.lines.find((line) => line.ingredientId === 'salmon')!;
    expect(prepared.status).toBe('needs_substitution');
    expect(salmon.selectedProduct).toBeUndefined();
    expect(salmon.replacements[0].id).toBe('mock-salmon-fillet-400');
    expect((await gateway.getCart()).lines).toHaveLength(0);
    await expect(service.previewCart(prepared.id)).rejects.toThrow(/Resolve substitutions/);

    const approved = await service.approveSubstitution(prepared.id, 'salmon', 'mock-salmon-fillet-400');
    const approvedSalmon = approved.lines.find((line) => line.ingredientId === 'salmon')!;
    expect(approved.status).toBe('ready_for_cart');
    expect(approvedSalmon.substituted).toBe(true);
    expect(approvedSalmon.suppliedQuantity).toBeGreaterThanOrEqual(approvedSalmon.requiredQuantity);
    expect((await gateway.getCart()).lines).toHaveLength(0);

    const reviewed = await service.previewCart(approved.id);
    expect(reviewed.status).toBe('cart_preview');
    expect(reviewed.cartPreview?.lines).toHaveLength(prepared.lines.length);
    expect((await gateway.getCart()).lines).toHaveLength(0);

    const applied = await service.applyCart(reviewed.id);
    expect(applied.status).toBe('cart_applied');
    expect(applied.cartVerified).toBe(true);
    expect(applied.cart?.reference).toBe(`plan-v1:${batch!.id}`);
    expect(applied.activity.map((item) => item.type)).toEqual([
      'SEARCH',
      'APPROVAL',
      'CART_PREVIEW',
      'CART_APPLY',
      'VERIFY',
    ]);
    await expect(service.applyCart(applied.id)).rejects.toThrow(/reviewed cart preview/);
  });

  it('rejects a prepared order when its source plan has changed', async () => {
    const planning = createDemoPlanning(undefined, idSequence());
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway: new MockSupplierGateway(),
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
      generateId: idSequence(),
    });
    const batch = planning.repository
      .getState()
      .activePlan.batches.find((candidate) => candidate.lines.some((line) => line.ingredientId === 'salmon'))!;
    const prepared = await service.prepareBatch(batch.id);
    const eventPreview = planning.service.previewEventChange('wedding', 200);
    planning.service.applyEventChange(eventPreview.id);

    await expect(service.approveSubstitution(prepared.id, 'salmon', 'mock-salmon-fillet-400')).rejects.toThrow(/stale/);
  });

  it('runs the backend hero path from Wedding approval to a verified Plan v2 cart', async () => {
    const ids = idSequence();
    const planning = createDemoPlanning(undefined, ids);
    const gateway = new MockSupplierGateway();
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway,
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
      generateId: ids,
    });

    const wedding = planning.service.previewEventChange('wedding', 200);
    planning.service.applyEventChange(wedding.id);
    const batch = planning.repository
      .getState()
      .activePlan.batches.find((candidate) => candidate.lines.some((line) => line.ingredientId === 'salmon'))!;
    const prepared = await service.prepareBatch(batch.id);
    const replacement = prepared.lines.find((line) => line.ingredientId === 'salmon')!.replacements[0];
    const substituted = await service.approveSubstitution(prepared.id, 'salmon', replacement.id);
    const reviewed = await service.previewCart(substituted.id);
    const applied = await service.applyCart(reviewed.id);

    expect(applied.planVersion).toBe(2);
    expect(applied.cart?.reference).toBe(`plan-v2:${batch.id}`);
    expect(applied.cartVerified).toBe(true);
    expect(applied.cart?.lines.find((line) => line.ingredientId === 'salmon')?.substitutedForProductId).toBe(
      'mock-salmon-premium-500',
    );
  });

  it('allows only one cart mutation when apply requests race', async () => {
    const planning = createDemoPlanning();
    const gateway = new MockSupplierGateway();
    const applySpy = vi.spyOn(gateway, 'applyCart');
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway,
      ingredients: demoIngredients,
      preferredProductByIngredient: preferredMockProductByIngredient,
    });
    const batch = planning.repository
      .getState()
      .activePlan.batches.find((candidate) => candidate.lines.some((line) => line.ingredientId === 'salmon'))!;
    const prepared = await service.prepareBatch(batch.id);
    const salmon = prepared.lines.find((line) => line.ingredientId === 'salmon')!;
    const substituted = await service.approveSubstitution(
      prepared.id,
      salmon.ingredientId,
      salmon.replacements[0].id,
    );
    const reviewed = await service.previewCart(substituted.id);

    const results = await Promise.allSettled([service.applyCart(reviewed.id), service.applyCart(reviewed.id)]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    expect(applySpy).toHaveBeenCalledOnce();
  });
});

function idSequence(): () => string {
  let value = 0;
  return () => `supplier-test-id-${++value}`;
}
