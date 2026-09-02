import { describe, expect, it, vi } from 'vitest';
import { demoIngredients } from '@/data/demo/ingredients';
import { createDemoPlanning } from '@/application/demo-planning';
import { SupplierOrderService } from '@/application/supplier-order-service';
import { MemorySupplierOrderSessionStore } from '@/application/supplier-order-session-store';
import type { SupplierOrderDraft, SupplierProduct } from '@/domain/supplier';
import { localizedIngredientName } from '@/i18n/demo-names';
import { SilpoSupplierGateway } from '@/infrastructure/silpo-supplier-gateway';
import type { SilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

const shoppingCartId = '11111111-1111-4111-8111-111111111111';
const branchId = '22222222-2222-4222-8222-222222222222';
const companyId = '33333333-3333-4333-8333-333333333333';
const productId = '44444444-4444-4444-8444-444444444444';
const timeslot = { start: '2026-09-02T10:00:00Z', end: '2026-09-02T12:00:00Z' };

describe('Silpo supplier gateway', () => {
  it('maps a bounded live search into the supplier domain', async () => {
    const read = createReadCaller();
    const gateway = new SilpoSupplierGateway(read, vi.fn(), demoIngredients);

    await expect(gateway.initializeContext()).resolves.toMatchObject({
      supplierId: 'silpo',
      cartId: shoppingCartId,
      mode: 'live',
    });
    await expect(gateway.getDeliveryOptions('2026-09-02')).resolves.toHaveLength(1);
    await expect(
      gateway.searchProducts([
        request('eggs', 'pcs'),
        request('salmon', 'g'),
        request('tomato', 'g'),
        request('flour', 'g'),
        request('cream', 'ml'),
        request('sugar', 'g'),
      ]),
    ).resolves.toHaveLength(5);
  });

  it('previews, applies additively, and verifies expected product IDs on reread', async () => {
    const read = createReadCaller({ verifiedProductIds: [productId] });
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });
    const gateway = new SilpoSupplierGateway(read, write, demoIngredients);
    await gateway.initializeContext();
    const [result] = await gateway.searchProducts([request('eggs', 'pcs')]);
    if (!result.product) throw new Error('Expected mapped product');
    const preview = await gateway.prepareCart(draft(result.product));

    await gateway.applyCart(preview);
    await expect(gateway.getCart()).resolves.toMatchObject({ cartId: shoppingCartId });
    expect(write).toHaveBeenCalledWith('silpo_add_or_update_cart_products', {
      shoppingCartId,
      products: [{ productId, companyId, branchId, quantity: 2, addQuantity: true }],
    });
  });

  it('selects a sufficient candidate instead of the first available low-stock result', async () => {
    const gateway = new SilpoSupplierGateway(
      createReadCaller({ candidateStocks: [1, 10] }),
      vi.fn(),
      demoIngredients,
    );
    await gateway.initializeContext();
    const [result] = await gateway.searchProducts([request('eggs', 'pcs')]);
    if (!result.product) throw new Error('Expected mapped product');

    expect(result.product.id).toBe(`${productId}-1`);
    await expect(gateway.prepareCart(draft(result.product))).resolves.toBeDefined();
  });

  it('runs the bounded procurement batch through preview, one write, and verified reread', async () => {
    const productIds: string[] = [];
    const read = createReadCaller({ verifiedProductIds: productIds, dynamicRatios: true });
    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });
    const gateway = new SilpoSupplierGateway(read, write, demoIngredients);
    const planning = createDemoPlanning();
    const service = new SupplierOrderService({
      repository: planning.repository,
      gateway,
      ingredients: demoIngredients,
      preferredProductByIngredient: Object.fromEntries(
        demoIngredients.map((ingredient) => [ingredient.id, `silpo-search:${ingredient.id}`]),
      ),
    });
    const batch = planning.repository.getState().activePlan.batches[0];

    const prepared = await service.prepareBatch(batch.id);
    expect(prepared.supplier.mode).toBe('live');
    expect(prepared.lines).toHaveLength(5);
    expect(prepared.status).toBe('ready_for_cart');
    expect(write).not.toHaveBeenCalled();

    const reviewed = await service.previewCart(prepared.id);
    expect(reviewed.status).toBe('cart_preview');
    expect(write).not.toHaveBeenCalled();

    productIds.push(...reviewed.lines.map((line) => line.selectedProduct!.id));
    const applied = await service.applyCart(reviewed.id);
    expect(applied.status).toBe('cart_applied');
    expect(applied.cartVerified).toBe(true);
    expect(write).toHaveBeenCalledOnce();
  });

  it('continues prepare, preview, and apply across separate stateless gateway instances', async () => {
    const planning = createDemoPlanning();
    const sessions = new MemorySupplierOrderSessionStore();
    const productIds: string[] = [];
    const firstService = createService(
      new SilpoSupplierGateway(createReadCaller({ dynamicRatios: true }), vi.fn(), demoIngredients),
      planning,
      sessions,
    );
    const batch = planning.repository.getState().activePlan.batches[0];
    const prepared = await firstService.prepareBatch(batch.id);

    const secondService = createService(
      new SilpoSupplierGateway(createReadCaller({ dynamicRatios: true }), vi.fn(), demoIngredients),
      planning,
      sessions,
    );
    const reviewed = await secondService.previewCart(prepared.id);
    productIds.push(...reviewed.lines.map((line) => line.selectedProduct!.id));

    const write = vi.fn().mockResolvedValue({ structuredContent: { success: true } });
    const thirdService = createService(
      new SilpoSupplierGateway(
        createReadCaller({ verifiedProductIds: productIds, verifiedOnFirstCartRead: true }),
        write,
        demoIngredients,
      ),
      planning,
      sessions,
    );
    const applied = await thirdService.applyCart(reviewed.id);

    expect(applied.status).toBe('cart_applied');
    expect(applied.cartVerified).toBe(true);
    expect(write).toHaveBeenCalledOnce();
  });
});

function createService(
  gateway: SilpoSupplierGateway,
  planning: ReturnType<typeof createDemoPlanning>,
  sessionStore: MemorySupplierOrderSessionStore,
) {
  return new SupplierOrderService({
    repository: planning.repository,
    gateway,
    ingredients: demoIngredients,
    preferredProductByIngredient: Object.fromEntries(
      demoIngredients.map((ingredient) => [ingredient.id, `silpo-search:${ingredient.id}`]),
    ),
    sessionStore,
    sessionScope: 'oauth-session-1',
  });
}

function request(ingredientId: string, unit: 'g' | 'ml' | 'pcs') {
  return {
    lineId: `line-${ingredientId}`,
    ingredientId,
    requiredQuantity: unit === 'pcs' ? 20 : 1_000,
    unit,
    preferredProductId: `ignored-${ingredientId}`,
  };
}

function draft(selectedProduct: SupplierProduct): SupplierOrderDraft {
  return {
    cartId: shoppingCartId,
    reference: 'plan-v1:batch-1',
    deliveryOptionId: `${timeslot.start}|${timeslot.end}`,
    lines: [
      {
        lineId: 'line-eggs',
        ingredientId: 'eggs',
        requiredQuantity: 20,
        unit: 'pcs',
        productId: selectedProduct.id,
        packageCount: 2,
        suppliedQuantity: 20,
        surplusQuantity: 0,
        productName: selectedProduct.name,
        packageSize: selectedProduct.packageSize,
        unitPriceMinor: selectedProduct.priceMinor,
        supplierMetadata: selectedProduct.supplierMetadata,
      },
    ],
  };
}

function createReadCaller({
  verifiedProductIds = [],
  stock = 10,
  dynamicRatios = false,
  verifiedOnFirstCartRead = false,
  candidateStocks,
}: {
  verifiedProductIds?: string[];
  stock?: number;
  dynamicRatios?: boolean;
  verifiedOnFirstCartRead?: boolean;
  candidateStocks?: number[];
} = {}) {
  let cartReads = 0;
  return vi.fn(async (name: SilpoReadToolName, args: Record<string, unknown>): Promise<unknown> => {
    if (name === 'silpo_get_my_shopping_cart') {
      return { structuredContent: { exists: true, shoppingCartId } };
    }
    if (name === 'silpo_get_shopping_cart_by_id') {
      cartReads += 1;
      return {
        structuredContent: {
          cart: {
            deliveryType: 'DeliveryHome',
            timeslot,
            shipments: [
              {
                branchId,
                products:
                  verifiedOnFirstCartRead || cartReads > 1
                    ? verifiedProductIds.map((id) => ({ productId: id }))
                    : [],
              },
            ],
            calculation: { validations: [] },
          },
        },
      };
    }
    if (name === 'silpo_get_time_slots') {
      return { structuredContent: { slots: [{ ...timeslot, available: true }] } };
    }
    if (name === 'silpo_find_products_batch') {
      const products = args.products as string[];
      return {
        structuredContent: {
          queries: products.map((query, index) => ({
            totalFound: 1,
            products: (candidateStocks ?? [dynamicRatios ? 1_000_000 : stock]).map((candidateStock, candidateIndex) =>
              candidate(
                candidateStocks
                  ? `${index === 0 ? productId : `product-${index}`}-${candidateIndex}`
                  : index === 0
                    ? productId
                    : `product-${index}`,
                query,
                candidateStock,
                index,
                dynamicRatios,
              ),
            ),
          })),
        },
      };
    }
    throw new Error(`Unexpected read ${name}`);
  });
}

function candidate(id: string, query: string, stock: number, index = 0, dynamicRatio = false) {
  const ingredient = demoIngredients.find(
    (item) => localizedIngredientName(item.id, item.name, 'uk') === query,
  );
  const unit = dynamicRatio
    ? ingredient?.unit === 'pcs'
      ? '10 шт'
      : ingredient?.unit === 'ml'
        ? '1 л'
        : '1 кг'
    : (['10 шт', '1 кг', '1 кг', '1 кг', '1 л'][index] ?? '1 кг');
  return {
    id,
    companyId,
    branchId,
    name: query,
    displayRatio: unit,
    price: 100,
    step: 1,
    stock,
    weighted: false,
    available: true,
  };
}