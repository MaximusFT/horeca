import type { Ingredient } from '@/domain/ingredient';
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
} from '@/domain/supplier';
import { localizedIngredientName } from '@/i18n/demo-names';
import { roundToPackages } from '@/engine/package-rounding';
import { mapSilpoProduct, type SilpoMappedProduct } from './silpo-supplier-mapper';
import {
  buildProductSearchArguments,
  buildReplacementBatchArguments,
  buildTimeSlotArguments,
  isCurrentTimeslotAvailable,
  parseCartContext,
  parseCartProductIds,
  parseCartReference,
  parseProductCandidateGroups,
  parseReplacementRiskSummary,
  unwrapMcpPayload,
  type SilpoReadToolCaller,
} from './silpo-stage9-workflow';

const SEARCH_WINDOW_LINES = 10;
const TARGET_ROLLOUT_LINES = 3;
const MAX_BLOCKED_ROLLOUT_LINES = 5;

export type SilpoSupplierWriteCaller = (
  name: 'silpo_add_or_update_cart_products',
  args: Record<string, unknown>,
) => Promise<unknown>;

export class SilpoSupplierGateway implements SupplierGateway {
  private readonly ingredientById: Map<string, Ingredient>;
  private readonly products = new Map<string, SilpoMappedProduct>();
  private context?: ReturnType<typeof parseCartContext>;
  private pendingPreview?: SupplierCartPreview;

  constructor(
    private readonly callRead: SilpoReadToolCaller,
    private readonly callWrite: SilpoSupplierWriteCaller,
    ingredients: Ingredient[],
  ) {
    this.ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  }

  async initializeContext(): Promise<SupplierContext> {
    const cartReference = parseCartReference(await this.callRead('silpo_get_my_shopping_cart', {}));
    if (!cartReference.exists || !cartReference.shoppingCartId) throw new Error('Silpo cart creation is required');
    const detail = await this.callRead('silpo_get_shopping_cart_by_id', {
      shoppingCartId: cartReference.shoppingCartId,
    });
    this.context = parseCartContext(detail, cartReference.shoppingCartId);
    return {
      supplierId: 'silpo',
      name: 'Сільпо',
      cartId: this.context.shoppingCartId,
      currency: 'UAH',
      mode: 'live',
    };
  }

  async searchProducts(requests: SupplierSearchRequest[]): Promise<SupplierSearchResult[]> {
    const context = this.requireContext();
    const boundedRequests = requests.slice(0, SEARCH_WINDOW_LINES);
    const queries = boundedRequests.map((request) => {
      const ingredient = this.ingredientById.get(request.ingredientId);
      if (!ingredient) throw new Error(`Unknown ingredient ${request.ingredientId}`);
      return localizedIngredientName(ingredient.id, ingredient.name, 'uk');
    });
    const groups = parseProductCandidateGroups(
      await this.callRead('silpo_find_products_batch', buildProductSearchArguments(context, queries)),
    );
    if (groups.length !== boundedRequests.length) {
      throw new Error(`Silpo product search returned ${groups.length} groups for ${boundedRequests.length} requests`);
    }
    const results = boundedRequests.map((request, index): SupplierSearchResult => {
      const mapped = (groups[index] ?? [])
        .map((candidate) => mapSilpoProduct(candidate, request.ingredientId, request.unit))
        .filter((candidate): candidate is SilpoMappedProduct => Boolean(candidate));
      const match = mapped.find((candidate) => canFulfillRequest(candidate, request));
      if (match) {
        this.products.set(match.product.id, match);
        return { request, status: 'matched', product: structuredClone(match.product) };
      }
      const unavailable = mapped[0];
      if (!unavailable) return { request, status: 'not_found' };
      this.products.set(unavailable.product.id, unavailable);
      return { request, status: 'unavailable', product: structuredClone(unavailable.product) };
    });
    const matchedResults = results.filter((result) => result.status === 'matched');
    const rolloutResults =
      matchedResults.length >= TARGET_ROLLOUT_LINES
        ? matchedResults.slice(0, TARGET_ROLLOUT_LINES)
        : results.slice(0, MAX_BLOCKED_ROLLOUT_LINES);
    const selectedCandidates = rolloutResults.flatMap((result) => {
      if (result.status !== 'matched' || !result.product) return [];
      return [this.products.get(result.product.id)!.candidate];
    });
    for (const candidates of groupReplacementCandidates(selectedCandidates)) {
      const replacementRisk = parseReplacementRiskSummary(
        await this.callRead('silpo_get_replacements', buildReplacementBatchArguments(context, candidates)),
      );
      if (replacementRisk.itemCount > 0) {
        throw new Error(
          'Silpo reported picking-risk replacement items; mapping requires a captured non-empty response shape',
        );
      }
    }
    return rolloutResults;
  }

  async getProductDetails(productId: string): Promise<SupplierProduct> {
    const product = this.products.get(productId)?.product;
    if (!product) throw new Error(`Unknown Silpo product ${productId}`);
    return structuredClone(product);
  }

  async findReplacements(_productId: string): Promise<SupplierProduct[]> {
    return [];
  }

  async getDeliveryOptions(_deliveryOn: string): Promise<SupplierDeliveryOption[]> {
    const context = this.requireContext();
    const slots = await this.callRead('silpo_get_time_slots', buildTimeSlotArguments(context));
    if (!isCurrentTimeslotAvailable(slots, context)) return [];
    return [
      {
        id: `${context.timeslotStart}|${context.timeslotEnd}`,
        label: `Сільпо · ${context.timeslotStart}`,
        deliveryAt: context.timeslotStart,
        feeMinor: 0,
        currency: 'UAH',
      },
    ];
  }

  async prepareCart(draft: SupplierOrderDraft): Promise<SupplierCartPreview> {
    const lines: SupplierCartLine[] = draft.lines.map((line) => {
      const metadata = parseSupplierMetadata(line.supplierMetadata);
      if (!line.productName || !line.packageSize || line.unitPriceMinor === undefined) {
        throw new Error(`Silpo product ${line.productId} preview metadata is incomplete`);
      }
      const supplierQuantity = line.packageCount * metadata.quantityStep;
      if (supplierQuantity > metadata.stock) throw new Error(`Silpo product ${line.productId} exceeds live stock`);
      return {
        ...line,
        productName: line.productName,
        packageSize: line.packageSize,
        unitPriceMinor: line.unitPriceMinor,
        totalMinor: line.unitPriceMinor * line.packageCount,
      };
    });
    const subtotalMinor = lines.reduce((total, line) => total + line.totalMinor, 0);
    const preview: SupplierCartPreview = {
      cartId: draft.cartId ?? this.requireContext().shoppingCartId,
      reference: draft.reference,
      delivery: {
        id: draft.deliveryOptionId,
        label: 'Сільпо · поточна доставка',
        deliveryAt: draft.deliveryOptionId.split('|')[0],
        feeMinor: 0,
        currency: 'UAH',
      },
      lines,
      subtotalMinor,
      feeMinor: 0,
      totalMinor: subtotalMinor,
      currency: 'UAH',
    };
    this.pendingPreview = structuredClone(preview);
    return preview;
  }

  async applyCart(preview: SupplierCartPreview): Promise<SupplierCart> {
    const products = preview.lines.map((line) => {
      const metadata = parseSupplierMetadata(line.supplierMetadata);
      return {
        productId: line.productId,
        companyId: metadata.companyId,
        branchId: metadata.branchId,
        quantity: line.packageCount * metadata.quantityStep,
        addQuantity: true,
      };
    });
    await this.callWrite('silpo_add_or_update_cart_products', {
      shoppingCartId: preview.cartId,
      products,
    });
    this.pendingPreview = structuredClone(preview);
    return this.getCart();
  }

  async getCart(): Promise<SupplierCart> {
    const preview = this.pendingPreview;
    if (!preview) throw new Error('Silpo cart preview is missing');
    const result = await this.callRead('silpo_get_shopping_cart_by_id', {
      shoppingCartId: preview.cartId,
    });
    const productIds = new Set(parseCartProductIds(result));
    if (!preview.lines.every((line) => productIds.has(line.productId))) {
      throw new Error('Silpo cart reread did not contain all approved products');
    }
    if (cartValidationErrorCount(result) > 0) throw new Error('Silpo cart reread contains error-level validations');
    return { ...structuredClone(preview), updatedAt: new Date().toISOString() };
  }

  private requireContext() {
    if (!this.context) throw new Error('Silpo supplier context is not initialized');
    return this.context;
  }
}

function groupReplacementCandidates(candidates: SilpoMappedProduct['candidate'][]): SilpoMappedProduct['candidate'][][] {
  const groups = new Map<string, SilpoMappedProduct['candidate'][]>();
  for (const candidate of candidates) {
    const key = `${candidate.companyId}:${candidate.branchId}`;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function canFulfillRequest(candidate: SilpoMappedProduct, request: SupplierSearchRequest): boolean {
  if (!candidate.product.available) return false;
  const packageCount = roundToPackages(
    request.requiredQuantity,
    candidate.product.packageSize,
    candidate.product.priceMinor,
  ).packageCount;
  const metadata = parseSupplierMetadata(candidate.product.supplierMetadata);
  return packageCount * metadata.quantityStep <= metadata.stock;
}

function parseSupplierMetadata(value: SupplierCartLine['supplierMetadata']) {
  const companyId = value?.companyId;
  const branchId = value?.branchId;
  const quantityStep = value?.quantityStep;
  const stock = value?.stock;
  if (
    typeof companyId !== 'string' ||
    typeof branchId !== 'string' ||
    typeof quantityStep !== 'number' ||
    typeof stock !== 'number'
  ) {
    throw new Error('Silpo product execution metadata is incomplete');
  }
  return { companyId, branchId, quantityStep, stock };
}

function cartValidationErrorCount(result: unknown): number {
  const payload = unwrapMcpPayload(result, 'supplier cart verification');
  const cart = asObject(payload.cart);
  const calculation = asObject(cart?.calculation);
  if (!Array.isArray(calculation?.validations)) {
    throw new Error('Silpo cart reread did not include calculation validations');
  }
  return calculation.validations.filter((value) => {
    const validation = asObject(value);
    const level = [validation?.level, validation?.severity, validation?.type]
      .find((candidate): candidate is string => typeof candidate === 'string')
      ?.toLowerCase();
    return level?.includes('error');
  }).length;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}