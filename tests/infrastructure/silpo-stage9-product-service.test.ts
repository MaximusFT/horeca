import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemorySilpoProductApprovalStore } from '@/infrastructure/silpo-product-approval-store';
import { SilpoStage9ProductService } from '@/infrastructure/silpo-stage9-product-service';
import type { SilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

const sessionId = 'product-test-session';
const shoppingCartId = '11111111-1111-4111-8111-111111111111';
const branchId = '22222222-2222-4222-8222-222222222222';
const companyId = '33333333-3333-4333-8333-333333333333';
const productId = '44444444-4444-4444-8444-444444444444';
const timeslot = { start: '2026-09-02T10:00:00Z', end: '2026-09-02T12:00:00Z' };

describe('Silpo Stage 9 product service', () => {
  const approvals = new MemorySilpoProductApprovalStore();
  const service = new SilpoStage9ProductService(
    approvals,
    () => 'approval-product-1',
    () => new Date('2026-09-02T08:00:00Z'),
  );

  afterEach(() => {
    globalThis.__mistoSilpoProductApprovals = undefined;
  });

  it('prepares one new in-stock product without mutating the cart', async () => {
    const read = createReadCaller();

    await expect(service.prepare(sessionId, read)).resolves.toEqual({
      status: 'approval_required',
      approvalId: 'approval-product-1',
      expiresAt: '2026-09-02T08:15:00.000Z',
      product: {
        name: 'Яйця курячі',
        displayRatio: '10 шт',
        price: 89.99,
        quantity: 1,
        weighted: false,
      },
    });
    expect(read.mock.calls.map(([name]) => name)).toEqual([
      'silpo_get_my_shopping_cart',
      'silpo_get_shopping_cart_by_id',
      'silpo_get_time_slots',
      'silpo_find_products_batch',
    ]);
  });

  it('applies once and verifies the product through an immediate cart reread', async () => {
    const previewRead = createReadCaller();
    const preview = await service.prepare(sessionId, previewRead);
    if (preview.status !== 'approval_required') throw new Error('Expected product approval');
    const verificationRead = createReadCaller({ cartProductIds: [productId] });
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });

    await expect(service.apply(sessionId, preview.approvalId, verificationRead, write)).resolves.toEqual({
      status: 'product_added',
      product: { name: 'Яйця курячі', displayRatio: '10 шт', quantity: 1 },
      validations: { total: 0, errors: 0, warnings: 0, other: 0 },
    });
    expect(write).toHaveBeenCalledWith('silpo_add_or_update_cart_products', {
      shoppingCartId,
      products: [{ productId, companyId, branchId, quantity: 1, addQuantity: true }],
    });
    await expect(service.apply(sessionId, preview.approvalId, verificationRead, write)).rejects.toThrow(
      /already used/,
    );
    expect(write).toHaveBeenCalledOnce();
  });

  it('does not report success when reread does not contain the approved product', async () => {
    const preview = await service.prepare(sessionId, createReadCaller());
    if (preview.status !== 'approval_required') throw new Error('Expected product approval');
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });

    await expect(service.apply(sessionId, preview.approvalId, createReadCaller(), write)).rejects.toThrow(
      /did not contain/,
    );
  });

  it('reports a non-success status when cart reread contains validation errors', async () => {
    const preview = await service.prepare(sessionId, createReadCaller());
    if (preview.status !== 'approval_required') throw new Error('Expected product approval');
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });

    await expect(
      service.apply(
        sessionId,
        preview.approvalId,
        createReadCaller({ cartProductIds: [productId], validations: [{ level: 'error' }] }),
        write,
      ),
    ).resolves.toMatchObject({
      status: 'product_added_with_validation_errors',
      validations: { total: 1, errors: 1 },
    });
  });

  it('rejects an expired approval before calling the cart mutation', async () => {
    let now = new Date('2026-09-02T08:00:00Z');
    const expiringService = new SilpoStage9ProductService(approvals, () => 'approval-expiring', () => now);
    const preview = await expiringService.prepare(sessionId, createReadCaller());
    if (preview.status !== 'approval_required') throw new Error('Expected product approval');
    now = new Date('2026-09-02T08:16:00Z');
    const write = vi.fn();

    await expect(
      expiringService.apply(sessionId, preview.approvalId, createReadCaller(), write),
    ).rejects.toThrow(/expired/);
    expect(write).not.toHaveBeenCalled();
  });
});

function createReadCaller({
  cartProductIds = [],
  validations = [],
}: { cartProductIds?: string[]; validations?: Array<Record<string, unknown>> } = {}) {
  return vi.fn(async (name: SilpoReadToolName): Promise<unknown> => {
    if (name === 'silpo_get_my_shopping_cart') {
      return { structuredContent: { exists: true, shoppingCartId } };
    }
    if (name === 'silpo_get_shopping_cart_by_id') {
      return {
        structuredContent: {
          cart: {
            deliveryType: 'DeliveryHome',
            timeslot,
            shipments: [{ branchId, products: cartProductIds.map((id) => ({ productId: id })) }],
            calculation: { validations },
          },
        },
      };
    }
    if (name === 'silpo_get_time_slots') {
      return { structuredContent: { slots: [{ ...timeslot, available: true }] } };
    }
    if (name === 'silpo_find_products_batch') {
      return {
        structuredContent: {
          queries: [
            {
              totalFound: 1,
              products: [
                {
                  id: productId,
                  companyId,
                  branchId,
                  name: 'Яйця курячі',
                  displayRatio: '10 шт',
                  price: 89.99,
                  step: 1,
                  stock: 8,
                  weighted: false,
                  available: true,
                },
              ],
            },
          ],
        },
      };
    }
    throw new Error(`Unexpected read ${name}`);
  });
}