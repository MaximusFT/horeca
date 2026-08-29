import type { BaseUnit } from "./units";

export interface SupplierContext {
  supplierId: string;
  name: string;
  cartId: string;
  currency: "UAH";
  mode: "mock" | "live";
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
  unit: BaseUnit;
  priceMinor: number;
  currency: "UAH";
  available: boolean;
  description: string;
}

export interface SupplierSearchResult {
  request: SupplierSearchRequest;
  status: "matched" | "unavailable" | "not_found";
  product?: SupplierProduct;
}

export interface SupplierDeliveryOption {
  id: string;
  label: string;
  deliveryAt: string;
  feeMinor: number;
  currency: "UAH";
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
}

export interface SupplierOrderDraft {
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
  currency: "UAH";
}

export interface SupplierCart extends SupplierCartPreview {
  updatedAt: string;
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
