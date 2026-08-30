import type { Ingredient } from '@/domain/ingredient';
import type {
  SupplierCartPreview,
  SupplierGateway,
  SupplierOrderDraftLine,
  SupplierOrderLine,
  SupplierOrderSession,
  SupplierProduct,
} from '@/domain/supplier';
import { roundToPackages } from '@/engine/package-rounding';
import type { PlanningRepository } from './planning-repository';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/locale';
import { localizedIngredientName, localizedSupplierProductName } from '@/i18n/demo-names';

interface Dependencies {
  repository: PlanningRepository;
  gateway: SupplierGateway;
  ingredients: Ingredient[];
  preferredProductByIngredient: Record<string, string>;
  generateId?: () => string;
}

export class SupplierOrderService {
  private readonly sessions = new Map<string, SupplierOrderSession>();
  private readonly ingredientById: Map<string, Ingredient>;
  private readonly generateId: () => string;

  constructor(private readonly dependencies: Dependencies) {
    this.ingredientById = new Map(dependencies.ingredients.map((ingredient) => [ingredient.id, ingredient]));
    this.generateId = dependencies.generateId ?? (() => crypto.randomUUID());
  }

  async prepareBatch(batchId: string, locale: Locale = 'uk'): Promise<SupplierOrderSession> {
    const state = this.dependencies.repository.getState();
    const batch = state.activePlan.batches.find((item) => item.id === batchId);
    if (!batch) throw new Error(`Unknown procurement batch ${batchId}`);

    const supplier = await this.dependencies.gateway.initializeContext();
    const delivery = (await this.dependencies.gateway.getDeliveryOptions(batch.deliveryOn))[0];
    if (!delivery) throw new Error(`No supplier delivery option for ${batch.deliveryOn}`);

    const requests = batch.lines.map((line) => ({
      lineId: line.id,
      ingredientId: line.ingredientId,
      requiredQuantity: line.quantity,
      unit: line.unit,
      preferredProductId: this.dependencies.preferredProductByIngredient[line.ingredientId],
    }));
    if (requests.some((request) => !request.preferredProductId)) {
      throw new Error('Supplier product mapping is incomplete');
    }

    const results = await this.dependencies.gateway.searchProducts(requests);
    const lines: SupplierOrderLine[] = [];
    for (const result of results) {
      const ingredient = this.ingredientById.get(result.request.ingredientId);
      if (!ingredient) throw new Error(`Unknown ingredient ${result.request.ingredientId}`);
      if (!result.product) throw new Error(`No supplier product found for ${ingredient.name}`);

      const replacements =
        result.status === 'unavailable' ? await this.dependencies.gateway.findReplacements(result.product.id) : [];
      const selectedProduct = result.status === 'matched' ? result.product : undefined;
      const rounded = selectedProduct
        ? roundToPackages(result.request.requiredQuantity, selectedProduct.packageSize, selectedProduct.priceMinor)
        : undefined;
      lines.push({
        lineId: result.request.lineId,
        ingredientId: ingredient.id,
        ingredientName: localizedIngredientName(ingredient.id, ingredient.name, locale),
        requiredQuantity: result.request.requiredQuantity,
        unit: result.request.unit,
        preferredProduct: localizeProduct(result.product, locale),
        selectedProduct: selectedProduct ? localizeProduct(selectedProduct, locale) : undefined,
        replacements: replacements.map((product) => localizeProduct(product, locale)),
        packageCount: rounded?.packageCount,
        suppliedQuantity: rounded?.suppliedQuantity,
        surplusQuantity: rounded?.surplusQuantity,
        substituted: false,
      });
    }

    const unavailableCount = lines.filter((line) => !line.selectedProduct).length;
    const dictionary = getDictionary(locale);
    const session: SupplierOrderSession = {
      id: this.generateId(),
      batchId,
      planVersion: state.activePlan.version,
      status: unavailableCount > 0 ? 'needs_substitution' : 'ready_for_cart',
      supplier,
      delivery,
      lines,
      activity: [
        {
          id: this.generateId(),
          type: 'SEARCH',
          message:
            unavailableCount > 0
              ? dictionary.supplierActivity.matchedPartial(
                  lines.length - unavailableCount,
                  lines.length,
                  unavailableCount,
                )
              : dictionary.supplierActivity.matchedAll(lines.length),
        },
      ],
      cartVerified: false,
    };
    this.sessions.set(session.id, structuredClone(session));
    return structuredClone(session);
  }

  getSession(sessionId: string): SupplierOrderSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown supplier order session ${sessionId}`);
    return structuredClone(session);
  }

  async approveSubstitution(
    sessionId: string,
    ingredientId: string,
    productId: string,
    locale: Locale = 'uk',
  ): Promise<SupplierOrderSession> {
    const session = this.getSession(sessionId);
    this.assertCurrentPlan(session);
    if (session.status !== 'needs_substitution') throw new Error('Supplier order does not need a substitution');
    const line = session.lines.find((item) => item.ingredientId === ingredientId && !item.selectedProduct);
    if (!line) throw new Error(`No unresolved supplier line for ${ingredientId}`);
    const replacement = line.replacements.find((item) => item.id === productId);
    if (!replacement?.available) throw new Error('Replacement is not an approved available candidate');

    const rounded = roundToPackages(line.requiredQuantity, replacement.packageSize, replacement.priceMinor);
    line.selectedProduct = replacement;
    line.packageCount = rounded.packageCount;
    line.suppliedQuantity = rounded.suppliedQuantity;
    line.surplusQuantity = rounded.surplusQuantity;
    line.substituted = true;
    const dictionary = getDictionary(locale);
    session.activity.push({
      id: this.generateId(),
      type: 'APPROVAL',
      message: dictionary.supplierActivity.approvedSubstitution(replacement.name, line.ingredientName),
    });
    if (session.lines.every((item) => item.selectedProduct)) session.status = 'ready_for_cart';
    return this.save(session);
  }

  async previewCart(sessionId: string, locale: Locale = 'uk'): Promise<SupplierOrderSession> {
    const session = this.getSession(sessionId);
    this.assertCurrentPlan(session);
    if (session.status !== 'ready_for_cart') throw new Error('Resolve substitutions before reviewing the cart');
    const preview = await this.dependencies.gateway.prepareCart({
      reference: `plan-v${session.planVersion}:${session.batchId}`,
      deliveryOptionId: session.delivery.id,
      lines: session.lines.map(
        (line): SupplierOrderDraftLine => ({
          lineId: line.lineId,
          ingredientId: line.ingredientId,
          requiredQuantity: line.requiredQuantity,
          unit: line.unit,
          productId: line.selectedProduct!.id,
          packageCount: line.packageCount!,
          suppliedQuantity: line.suppliedQuantity!,
          surplusQuantity: line.surplusQuantity!,
          substitutedForProductId: line.substituted ? line.preferredProduct.id : undefined,
        }),
      ),
    });
    session.cartPreview = localizeCartPreview(preview, locale);
    session.status = 'cart_preview';
    const dictionary = getDictionary(locale);
    session.activity.push({
      id: this.generateId(),
      type: 'CART_PREVIEW',
      message: dictionary.supplierActivity.cartPreviewPrepared,
    });
    return this.save(session);
  }

  async applyCart(sessionId: string, locale: Locale = 'uk'): Promise<SupplierOrderSession> {
    const session = this.getSession(sessionId);
    this.assertCurrentPlan(session);
    if (session.status !== 'cart_preview' || !session.cartPreview) {
      throw new Error('A reviewed cart preview is required before cart apply');
    }
    const dictionary = getDictionary(locale);
    session.activity.push({
      id: this.generateId(),
      type: 'CART_APPLY',
      message: dictionary.supplierActivity.cartApplyApproved,
    });
    await this.dependencies.gateway.applyCart(session.cartPreview);
    const cart = await this.dependencies.gateway.getCart();
    const verified =
      cart.reference === session.cartPreview.reference &&
      cart.lines.length >= session.cartPreview.lines.length &&
      session.cartPreview.lines.every((expected) =>
        cart.lines.some(
          (actual) => actual.productId === expected.productId && actual.packageCount === expected.packageCount,
        ),
      );
    if (!verified) throw new Error('Supplier cart verification failed after apply');
    session.cart = localizeCartPreview(cart, locale);
    session.cartVerified = true;
    session.status = 'cart_applied';
    session.activity.push({ id: this.generateId(), type: 'VERIFY', message: dictionary.supplierActivity.cartVerified });
    return this.save(session);
  }

  private assertCurrentPlan(session: SupplierOrderSession): void {
    if (this.dependencies.repository.getState().activePlan.version !== session.planVersion) {
      throw new Error('Supplier order session is stale because the procurement plan changed');
    }
  }

  private save(session: SupplierOrderSession): SupplierOrderSession {
    this.sessions.set(session.id, structuredClone(session));
    return structuredClone(session);
  }
}

function localizeProduct(product: SupplierProduct, locale: Locale): SupplierProduct {
  return { ...product, name: localizedSupplierProductName(product, locale) };
}

function localizeCartPreview<T extends SupplierCartPreview>(preview: T, locale: Locale): T {
  return {
    ...preview,
    lines: preview.lines.map((line) => ({
      ...line,
      productName: localizedSupplierProductName(
        { id: line.productId, ingredientId: line.ingredientId, name: line.productName },
        locale,
      ),
    })),
  };
}
