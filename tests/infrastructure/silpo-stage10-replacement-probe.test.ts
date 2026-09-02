import { describe, expect, it, vi } from 'vitest';
import { runSilpoReplacementProbe } from '@/infrastructure/silpo-stage10-replacement-probe';
import type { SilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

describe('Silpo Stage 10 replacement probe', () => {
  it('derives replacement arguments from live cart and product search without exposing values', async () => {
    const call = vi.fn(async (name: SilpoReadToolName): Promise<unknown> => {
      if (name === 'silpo_get_my_shopping_cart') {
        return { structuredContent: { exists: true, shoppingCartId: 'cart-id' } };
      }
      if (name === 'silpo_get_shopping_cart_by_id') {
        return {
          structuredContent: {
            cart: {
              deliveryType: 'DeliveryHome',
              timeslot: { start: '2026-09-02T10:00:00Z', end: '2026-09-02T12:00:00Z' },
              shipments: [{ branchId: 'branch-id' }],
            },
          },
        };
      }
      if (name === 'silpo_find_products_batch') {
        return {
          structuredContent: {
            queries: [
              {
                products: [
                  {
                    id: 'product-id',
                    companyId: 'company-id',
                    branchId: 'branch-id',
                    name: 'private-name',
                    displayRatio: '400 г',
                    price: 100,
                    step: 1,
                    stock: 5,
                    weighted: false,
                    available: true,
                  },
                ],
              },
            ],
          },
        };
      }
      return { structuredContent: { items: [{ replacements: [{ id: 'private-replacement-id' }] }] } };
    });

    const report = await runSilpoReplacementProbe(call);

    expect(call).toHaveBeenLastCalledWith('silpo_get_replacements', {
      branchId: 'branch-id',
      companyId: 'company-id',
      productIds: ['product-id'],
      deliveryType: 'DeliveryHome',
    });
    expect(report.resultShape).toContain('$.structuredContent.items[0].replacements[0].id:string');
    expect(report.resultShape?.join(' ')).not.toContain('private-replacement-id');
  });
});