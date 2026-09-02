import type { BaseUnit } from './units';

export interface SupplierContext {
  supplierId: string;
  name: string;
  cartId: string;
  currency: 'UAH';
  mode: 'mock' | 'live';
}

export interface SupplierSearchRequest {
  lineId: string;
  ingredientId: string;
  requiredQuantity: number;
  unit: BaseUnit;
  preferredProductId: string;
}

export interface IngredientSupplierProfile {
  ingredientId: string;
  searchQuery: string;
  preferredProductId: string;
}

export interface SupplierProduct {
  id: string;
  ingredientId: string;
  name: string;
  packageSize: number;
  supplierMetadata?: Record<string, string | number | boolean>;
  unit: BaseUnit;
  priceMinor: number;
  currency: 'UAH';
  available: boolean;
  description: string;
}

export interface SupplierSearchResult {
  request: SupplierSearchRequest;
  status: 'matched' | 'unavailable' | 'not_found';
  product?: SupplierProduct;
}

export interface SupplierDeliveryOption {
  id: string;
  label: string;
  deliveryAt: string;
  feeMinor: number;
  currency: 'UAH';
}

export interface SupplierOrderDraftLine {
  lineId: string;
  ingredientId: string;
  requiredQuantity: number;
  unit: BaseUnit;
  productId: string;
  packageCount: number;
  suppliedQuantity: number;
  surplusQuantity: number;
  substitutedForProductId?: string;
  productName?: string;
  packageSize?: number;
  unitPriceMinor?: number;
  supplierMetadata?: Record<string, string | number | boolean>;
}

export interface SupplierOrderDraft {
  cartId?: string;
  reference: string;
  deliveryOptionId: string;
  lines: SupplierOrderDraftLine[];
}

export interface SupplierCartLine extends SupplierOrderDraftLine {
  productName: string;
  packageSize: number;
  unitPriceMinor: number;
  totalMinor: number;
}

export interface SupplierCartPreview {
  cartId: string;
  reference: string;
  delivery: SupplierDeliveryOption;
  lines: SupplierCartLine[];
  subtotalMinor: number;
  feeMinor: number;
  totalMinor: number;
  currency: 'UAH';
}

export interface SupplierCart extends SupplierCartPreview {
  updatedAt: string;
}

export type SupplierOrderStatus =
  | 'needs_substitution'
  | 'ready_for_cart'
  | 'cart_preview'
  | 'cart_applying'
  | 'cart_applied';

export interface SupplierOrderLine {
  lineId: string;
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: BaseUnit;
  preferredProduct?: SupplierProduct;
  selectedProduct?: SupplierProduct;
  replacements: SupplierProduct[];
  packageCount?: number;
  suppliedQuantity?: number;
  surplusQuantity?: number;
  substituted: boolean;
}

export interface SupplierOrderActivity {
  id: string;
  type: 'SEARCH' | 'APPROVAL' | 'CART_PREVIEW' | 'CART_APPLY' | 'VERIFY';
  message: string;
}

export interface SupplierOrderSession {
  id: string;
  batchId: string;
  planVersion: number;
  sourceLineCount: number;
  status: SupplierOrderStatus;
  supplier: SupplierContext;
  delivery: SupplierDeliveryOption;
  lines: SupplierOrderLine[];
  activity: SupplierOrderActivity[];
  cartPreview?: SupplierCartPreview;
  cart?: SupplierCart;
  cartVerified: boolean;
}

export interface SupplierGateway {
  initializeContext(): Promise<SupplierContext>;
  searchProducts(requests: SupplierSearchRequest[]): Promise<SupplierSearchResult[]>;
  getProductDetails(productId: string): Promise<SupplierProduct>;
  findReplacements(productId: string): Promise<SupplierProduct[]>;
  getDeliveryOptions(deliveryOn: string): Promise<SupplierDeliveryOption[]>;
  prepareCart(draft: SupplierOrderDraft): Promise<SupplierCartPreview>;
  applyCart(preview: SupplierCartPreview): Promise<SupplierCart>;
  getCart(): Promise<SupplierCart>;
}
