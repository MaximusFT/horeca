import { describe, expect, it } from 'vitest';
import {
  buildProductSearchArguments,
  buildTimeSlotArguments,
  buildTimeslotUpdateArguments,
  describeJsonShape,
  isCurrentTimeslotAvailable,
  parseAvailableTimeslots,
  parseCartContext,
  parseCartReference,
  parseCartUpdateSource,
  parseProductSearchSummary,
  runSilpoStage9ReadSequence,
} from '@/infrastructure/silpo-stage9-workflow';
import type { SilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

const cartContext = {
  shoppingCartId: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  deliveryType: 'DeliveryHome',
  timeslotStart: '2026-09-01T10:00:00Z',
  timeslotEnd: '2026-09-01T12:00:00Z',
};

describe('Silpo Stage 9 read workflow', () => {
  it('parses existing and missing cart references from MCP structured content', () => {
    expect(
      parseCartReference({
        structuredContent: { exists: true, shoppingCartId: cartContext.shoppingCartId },
      }),
    ).toEqual({ exists: true, shoppingCartId: cartContext.shoppingCartId });
    expect(parseCartReference({ structuredContent: { exists: false } })).toEqual({
      exists: false,
      shoppingCartId: undefined,
    });
  });

  it('parses documented cart paths from JSON text MCP content', () => {
    const result = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            cart: {
              deliveryType: cartContext.deliveryType,
              timeslot: { start: cartContext.timeslotStart, end: cartContext.timeslotEnd },
              shipments: [{ branchId: cartContext.branchId }],
            },
          }),
        },
      ],
    };

    expect(parseCartContext(result, cartContext.shoppingCartId)).toEqual(cartContext);
  });

  it('builds schema-valid slot and product-search calls and normalizes express delivery', () => {
    expect(buildTimeSlotArguments(cartContext)).toEqual({
      branchId: cartContext.branchId,
      deliveryTypes: ['DeliveryHome'],
      limit: 10,
    });
    expect(
      buildProductSearchArguments({ ...cartContext, deliveryType: 'DeliveryExpressByPromise' }),
    ).toEqual({
      branchId: cartContext.branchId,
      deliveryType: 'DeliveryHome',
      timeslotStart: cartContext.timeslotStart,
      timeslotEnd: cartContext.timeslotEnd,
      products: ['яйця', 'помідори', 'лосось'],
      limit: 10,
    });
  });

  it('requires the current cart slot to be returned as available', () => {
    expect(
      isCurrentTimeslotAvailable(
        {
          structuredContent: {
            slots: [
              { start: cartContext.timeslotStart, end: cartContext.timeslotEnd, available: true },
            ],
          },
        },
        cartContext,
      ),
    ).toBe(true);
    expect(
      isCurrentTimeslotAvailable(
        {
          structuredContent: {
            slots: [
              { start: cartContext.timeslotStart, end: cartContext.timeslotEnd, available: false },
            ],
          },
        },
        cartContext,
      ),
    ).toBe(false);
  });

  it('builds a schema-valid update from cart-owned address and shipment data', () => {
    const source = parseCartUpdateSource(
      {
        structuredContent: {
          cart: {
            address: { addressType: 'delivery', latitude: '50.45', longitude: '30.52' },
            deliveryType: cartContext.deliveryType,
            timeslot: { start: cartContext.timeslotStart, end: cartContext.timeslotEnd },
            shipments: [
              {
                companyId: '33333333-3333-4333-8333-333333333333',
                branchId: cartContext.branchId,
              },
            ],
          },
        },
      },
      cartContext.shoppingCartId,
    );
    const slots = parseAvailableTimeslots({
      structuredContent: {
        slots: [
          { start: '2026-09-01T12:00:00Z', end: '2026-09-01T14:00:00Z', available: true },
          { start: '2026-09-01T14:00:00Z', end: '2026-09-01T16:00:00Z', available: false },
        ],
      },
    });

    expect(slots).toEqual([{ start: '2026-09-01T12:00:00Z', end: '2026-09-01T14:00:00Z' }]);
    expect(buildTimeslotUpdateArguments(source, slots[0])).toEqual({
      shoppingCartId: cartContext.shoppingCartId,
      deliveryType: cartContext.deliveryType,
      timeslot: slots[0],
      address: { addressType: 'delivery', latitude: '50.45', longitude: '30.52' },
      shipments: [
        {
          companyId: '33333333-3333-4333-8333-333333333333',
          branchId: cartContext.branchId,
        },
      ],
    });
  });

  it('summarizes documented batch-search query counts without exposing products', () => {
    expect(
      parseProductSearchSummary({
        structuredContent: {
          queries: [
            { totalFound: 3, products: [{ id: 'egg-1' }, { id: 'egg-2' }] },
            { totalFound: 2, products: [{ id: 'tomato-1' }] },
            { totalFound: 1, products: [{ id: 'salmon-1' }] },
          ],
        },
      }),
    ).toEqual({ queryCount: 3, returnedProductCount: 4, totalFound: 6 });
  });

  it('reports only expected paths and observed key names for parser mismatches', () => {
    expect(() => parseCartReference({ structuredContent: { unexpected: 'private-value' } })).toThrowError(
      expect.objectContaining({
        phase: 'cart reference',
        expectedPaths: ['exists'],
        observedKeys: ['unexpected'],
        observedShape: ['$:object', '$.unexpected:string'],
      }),
    );
    try {
      parseCartReference({ structuredContent: { unexpected: 'private-value' } });
    } catch (error) {
      expect(String(error)).not.toContain('private-value');
    }
    expect(describeJsonShape({ cart: { shipments: [{ branchId: 'private-branch-id' }] } })).toEqual([
      '$:object',
      '$.cart:object',
      '$.cart.shipments:array',
      '$.cart.shipments[0]:object',
      '$.cart.shipments[0].branchId:string',
    ]);
    expect(describeJsonShape({ token: 'secret-token' }).join(' ')).not.toContain('secret-token');
  });

  it('runs the four documented reads in order and returns a sanitized report', async () => {
    const calls: SilpoReadToolName[] = [];
    const results: Record<SilpoReadToolName, unknown> = {
      silpo_find_address: {},
      silpo_get_available_delivery_types: {},
      silpo_list_branches: {},
      silpo_get_my_shopping_cart: {
        structuredContent: { exists: true, shoppingCartId: cartContext.shoppingCartId },
      },
      silpo_get_shopping_cart_by_id: {
        structuredContent: {
          cart: {
            deliveryType: cartContext.deliveryType,
            timeslot: { start: cartContext.timeslotStart, end: cartContext.timeslotEnd },
            shipments: [{ branchId: cartContext.branchId }],
          },
        },
      },
      silpo_get_time_slots: {
        structuredContent: {
          slots: [{ start: cartContext.timeslotStart, end: cartContext.timeslotEnd, available: true }],
        },
      },
      silpo_find_products_batch: {
        structuredContent: {
          queries: [
            { totalFound: 2, products: [{ id: 'egg' }] },
            { totalFound: 1, products: [{ id: 'tomato' }] },
            { totalFound: 1, products: [{ id: 'salmon' }] },
          ],
        },
      },
      silpo_get_product_details: {},
      silpo_get_replacements: {},
    };

    const report = await runSilpoStage9ReadSequence(async (name) => {
      calls.push(name);
      return results[name];
    });

    expect(calls).toEqual([
      'silpo_get_my_shopping_cart',
      'silpo_get_shopping_cart_by_id',
      'silpo_get_time_slots',
      'silpo_find_products_batch',
    ]);
    expect(report).toEqual({
      status: 'complete',
      deliveryType: 'DeliveryHome',
      timeslotValidated: true,
      requestedProducts: ['яйця', 'помідори', 'лосось'],
      search: { queryCount: 3, returnedProductCount: 3, totalFound: 4 },
    });
  });

  it('stops before writes when no cart exists', async () => {
    const calls: SilpoReadToolName[] = [];
    const report = await runSilpoStage9ReadSequence(async (name) => {
      calls.push(name);
      return { structuredContent: { exists: false } };
    });

    expect(report).toEqual({ status: 'cart_creation_required' });
    expect(calls).toEqual(['silpo_get_my_shopping_cart']);
  });

  it('stops before search when the current slot is unavailable', async () => {
    const calls: SilpoReadToolName[] = [];
    const report = await runSilpoStage9ReadSequence(async (name) => {
      calls.push(name);
      if (name === 'silpo_get_my_shopping_cart') {
        return { structuredContent: { exists: true, shoppingCartId: cartContext.shoppingCartId } };
      }
      if (name === 'silpo_get_shopping_cart_by_id') {
        return {
          structuredContent: {
            cart: {
              deliveryType: cartContext.deliveryType,
              timeslot: { start: cartContext.timeslotStart, end: cartContext.timeslotEnd },
              shipments: [{ branchId: cartContext.branchId }],
            },
          },
        };
      }
      return { structuredContent: { slots: [] } };
    });

    expect(report).toEqual({ status: 'timeslot_update_required', deliveryType: 'DeliveryHome' });
    expect(calls).toEqual([
      'silpo_get_my_shopping_cart',
      'silpo_get_shopping_cart_by_id',
      'silpo_get_time_slots',
    ]);
  });
});
