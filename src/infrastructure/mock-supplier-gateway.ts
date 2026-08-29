import type {
  SupplierCart,
  SupplierCartLine,
  SupplierCartPreview,
  SupplierContext,
  SupplierDeliveryOption,
  SupplierGateway,
  SupplierOrderDraft,
  SupplierProduct,
  SupplierSearchRequest,
  SupplierSearchResult,
} from "@/domain/supplier";
import { mockSupplierCatalog } from "@/data/demo/mock-supplier-catalog";

export class MockSupplierGateway implements SupplierGateway {
  private readonly products = new Map(mockSupplierCatalog.map((product) => [product.id, product]));
  private cart: SupplierCart = emptyCart();

  async initializeContext(): Promise<SupplierContext> {
    return {
      supplierId: "misto-mock-supplier",
      name: "Misto Mock Supplier",
      cartId: "mock-cart",
      currency: "UAH",
      mode: "mock",
    };
  }

  async searchProducts(requests: SupplierSearchRequest[]): Promise<SupplierSearchResult[]> {
    return requests.map((request) => {
      const product = this.products.get(request.preferredProductId);
      if (!product || product.ingredientId !== request.ingredientId || product.unit !== request.unit) {
        return { request, status: "not_found" };
      }
      return {
        request,
        status: product.available ? "matched" : "unavailable",
        product: structuredClone(product),
      };
    });
  }

  async getProductDetails(productId: string): Promise<SupplierProduct> {
    const product = this.products.get(productId);
    if (!product) throw new Error(`Unknown mock supplier product ${productId}`);
    return structuredClone(product);
  }

  async findReplacements(productId: string): Promise<SupplierProduct[]> {
    const original = await this.getProductDetails(productId);
    return [...this.products.values()]
      .filter((product) => product.ingredientId === original.ingredientId && product.id !== productId && product.available)
      .map((product) => structuredClone(product));
  }

  async getDeliveryOptions(deliveryOn: string): Promise<SupplierDeliveryOption[]> {
    return [{
      id: `mock-delivery-${deliveryOn}`,
      label: `Mock delivery · ${deliveryOn} 08:00`,
      deliveryAt: `${deliveryOn}T08:00:00+03:00`,
      feeMinor: 9_900,
      currency: "UAH",
    }];
  }

  async prepareCart(draft: SupplierOrderDraft): Promise<SupplierCartPreview> {
    const deliveryOn = draft.deliveryOptionId.replace("mock-delivery-", "");
    const delivery = (await this.getDeliveryOptions(deliveryOn)).find((item) => item.id === draft.deliveryOptionId);
    if (!delivery) throw new Error(`Unknown mock delivery option ${draft.deliveryOptionId}`);

    const lines: SupplierCartLine[] = draft.lines.map((line) => {
      const product = this.products.get(line.productId);
      if (!product) throw new Error(`Unknown mock supplier product ${line.productId}`);
      if (!product.available) throw new Error(`Mock supplier product ${line.productId} is unavailable`);
      if (product.ingredientId !== line.ingredientId || product.unit !== line.unit) {
        throw new Error(`Mock supplier product ${line.productId} does not match ${line.ingredientId}`);
      }
      return {
        ...line,
        productName: product.name,
        packageSize: product.packageSize,
        unitPriceMinor: product.priceMinor,
        totalMinor: product.priceMinor * line.packageCount,
      };
    });
    const subtotalMinor = lines.reduce((total, line) => total + line.totalMinor, 0);
    return {
      cartId: "mock-cart",
      reference: draft.reference,
      delivery,
      lines,
      subtotalMinor,
      feeMinor: delivery.feeMinor,
      totalMinor: subtotalMinor + delivery.feeMinor,
      currency: "UAH",
    };
  }

  async applyCart(preview: SupplierCartPreview): Promise<SupplierCart> {
    const merged = new Map(this.cart.lines.map((line) => [line.productId, line]));
    for (const line of preview.lines) merged.set(line.productId, structuredClone(line));
    const lines = [...merged.values()];
    const subtotalMinor = lines.reduce((total, line) => total + line.totalMinor, 0);
    this.cart = {
      ...structuredClone(preview),
      lines,
      subtotalMinor,
      totalMinor: subtotalMinor + preview.feeMinor,
      updatedAt: new Date().toISOString(),
    };
    return structuredClone(this.cart);
  }

  async getCart(): Promise<SupplierCart> {
    return structuredClone(this.cart);
  }
}

function emptyCart(): SupplierCart {
  return {
    cartId: "mock-cart",
    reference: "",
    delivery: {
      id: "unselected",
      label: "No delivery selected",
      deliveryAt: "1970-01-01T00:00:00.000Z",
      feeMinor: 0,
      currency: "UAH",
    },
    lines: [],
    subtotalMinor: 0,
    feeMinor: 0,
    totalMinor: 0,
    currency: "UAH",
    updatedAt: "1970-01-01T00:00:00.000Z",
  };
}
