import { describe, expect, it } from 'vitest';
import { mapSilpoProduct, parseDisplayRatio } from '@/infrastructure/silpo-supplier-mapper';
import type { SilpoProductCandidate } from '@/infrastructure/silpo-stage9-workflow';

describe('Silpo supplier mapper', () => {
  it.each([
    ['400 г', { quantity: 400, unit: 'g' }],
    ['1 кг', { quantity: 1_000, unit: 'g' }],
    ['0,5 л', { quantity: 500, unit: 'ml' }],
    ['900 мл', { quantity: 900, unit: 'ml' }],
    ['10 шт', { quantity: 10, unit: 'pcs' }],
  ])('parses %s into base units', (displayRatio, expected) => {
    expect(parseDisplayRatio(displayRatio)).toEqual(expected);
  });

  it('maps a discrete package price and size', () => {
    expect(mapSilpoProduct(candidate(), 'eggs', 'pcs')?.product).toMatchObject({
      id: 'product-1',
      ingredientId: 'eggs',
      packageSize: 10,
      supplierMetadata: expect.objectContaining({ quantityStep: 1, stock: 10 }),
      unit: 'pcs',
      priceMinor: 8999,
    });
  });

  it('maps weighted quantity and price to one purchasable step', () => {
    expect(
      mapSilpoProduct(
        candidate({ displayRatio: '1 кг', price: 420, step: 0.1, stock: 2, weighted: true }),
        'salmon',
        'g',
      )?.product,
    ).toMatchObject({
      packageSize: 100,
      supplierMetadata: expect.objectContaining({ quantityStep: 0.1, stock: 2 }),
      unit: 'g',
      priceMinor: 4200,
    });
  });

  it('rejects unit mismatches and insufficient stock', () => {
    expect(mapSilpoProduct(candidate(), 'eggs', 'g')).toBeUndefined();
    expect(mapSilpoProduct(candidate({ stock: 0 }), 'eggs', 'pcs')).toBeUndefined();
  });
});

function candidate(overrides: Partial<SilpoProductCandidate> = {}): SilpoProductCandidate {
  return {
    id: 'product-1',
    companyId: 'company-1',
    branchId: 'branch-1',
    name: 'Яйця перепелині',
    displayRatio: '10 шт',
    price: 89.99,
    step: 1,
    stock: 10,
    weighted: false,
    available: true,
    ...overrides,
  };
}