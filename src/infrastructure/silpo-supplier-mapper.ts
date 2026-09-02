import type { BaseUnit } from '@/domain/units';
import type { SupplierProduct } from '@/domain/supplier';
import type { SilpoProductCandidate } from './silpo-stage9-workflow';

export interface SilpoMappedProduct {
  product: SupplierProduct;
  companyId: string;
  branchId: string;
  stock: number;
  candidate: SilpoProductCandidate;
}

export function mapSilpoProduct(
  candidate: SilpoProductCandidate,
  ingredientId: string,
  requiredUnit: BaseUnit,
): SilpoMappedProduct | undefined {
  const ratio = parseDisplayRatio(candidate.displayRatio);
  if (!ratio || ratio.unit !== requiredUnit || candidate.step <= 0 || candidate.stock < candidate.step) return undefined;
  const packageSize = candidate.weighted ? ratio.quantity * candidate.step : ratio.quantity;
  const priceMinor = Math.round(candidate.price * 100 * (candidate.weighted ? candidate.step : 1));
  return {
    product: {
      id: candidate.id,
      ingredientId,
      name: candidate.name,
      packageSize,
      supplierMetadata: {
        companyId: candidate.companyId,
        branchId: candidate.branchId,
        quantityStep: candidate.step,
        stock: candidate.stock,
      },
      unit: ratio.unit,
      priceMinor,
      currency: 'UAH',
      available: candidate.available,
      description: candidate.displayRatio,
    },
    companyId: candidate.companyId,
    branchId: candidate.branchId,
    stock: candidate.stock,
    candidate,
  };
}

export function parseDisplayRatio(value: string): { quantity: number; unit: BaseUnit } | undefined {
  const normalized = value.trim().toLowerCase().replace(',', '.');
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*(кг|г|л|мл|шт)/u);
  if (!match) return undefined;
  const quantity = Number(match[1]);
  if (!Number.isFinite(quantity) || quantity <= 0) return undefined;
  switch (match[2]) {
    case 'кг':
      return { quantity: quantity * 1_000, unit: 'g' };
    case 'г':
      return { quantity, unit: 'g' };
    case 'л':
      return { quantity: quantity * 1_000, unit: 'ml' };
    case 'мл':
      return { quantity, unit: 'ml' };
    case 'шт':
      return { quantity, unit: 'pcs' };
  }
}