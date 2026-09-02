import type { SilpoProductApprovalStore } from './silpo-product-approval-store';
import type { SilpoCartValidationSummary } from './silpo-stage9-timeslot-service';
import {
  buildProductAddArguments,
  buildProductSearchArguments,
  buildTimeSlotArguments,
  isCurrentTimeslotAvailable,
  parseCartContext,
  parseCartProductIds,
  parseCartReference,
  parseProductCandidates,
  selectTestProductCandidate,
  unwrapMcpPayload,
  type SilpoReadToolCaller,
} from './silpo-stage9-workflow';

const APPROVAL_LIFETIME_MS = 15 * 60 * 1000;
const TEST_QUERY = 'яйця';

export type SilpoProductPreview =
  | { status: 'cart_creation_required' }
  | { status: 'timeslot_update_required'; deliveryType: string }
  | { status: 'no_candidate' }
  | {
      status: 'approval_required';
      approvalId: string;
      expiresAt: string;
      product: {
        name: string;
        displayRatio: string;
        price: number;
        quantity: number;
        weighted: boolean;
      };
    };

export interface SilpoProductApplyResult {
  status: 'product_added' | 'product_added_with_validation_errors';
  product: {
    name: string;
    displayRatio: string;
    quantity: number;
  };
  validations: SilpoCartValidationSummary;
}

export type SilpoProductWriteCaller = (
  name: 'silpo_add_or_update_cart_products',
  args: Record<string, unknown>,
) => Promise<unknown>;

export class SilpoProductApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SilpoProductApprovalError';
  }
}

export class SilpoStage9ProductService {
  constructor(
    private readonly approvals: SilpoProductApprovalStore,
    private readonly generateId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async prepare(sessionId: string, callRead: SilpoReadToolCaller): Promise<SilpoProductPreview> {
    const cartReference = parseCartReference(await callRead('silpo_get_my_shopping_cart', {}));
    if (!cartReference.exists || !cartReference.shoppingCartId) return { status: 'cart_creation_required' };

    const cartResult = await callRead('silpo_get_shopping_cart_by_id', {
      shoppingCartId: cartReference.shoppingCartId,
    });
    const context = parseCartContext(cartResult, cartReference.shoppingCartId);
    const slots = await callRead('silpo_get_time_slots', buildTimeSlotArguments(context));
    if (!isCurrentTimeslotAvailable(slots, context)) {
      return { status: 'timeslot_update_required', deliveryType: context.deliveryType };
    }
    const searchResult = await callRead(
      'silpo_find_products_batch',
      buildProductSearchArguments(context, [TEST_QUERY]),
    );
    const candidate = selectTestProductCandidate(parseProductCandidates(searchResult), parseCartProductIds(cartResult));
    if (!candidate) return { status: 'no_candidate' };

    const createdAt = this.now();
    const approval = {
      id: this.generateId(),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + APPROVAL_LIFETIME_MS).toISOString(),
      shoppingCartId: context.shoppingCartId,
      candidate,
    };
    await this.approvals.save(sessionId, approval);
    return {
      status: 'approval_required',
      approvalId: approval.id,
      expiresAt: approval.expiresAt,
      product: {
        name: candidate.name,
        displayRatio: candidate.displayRatio,
        price: candidate.price,
        quantity: candidate.step,
        weighted: candidate.weighted,
      },
    };
  }

  async apply(
    sessionId: string,
    approvalId: string,
    callRead: SilpoReadToolCaller,
    callWrite: SilpoProductWriteCaller,
  ): Promise<SilpoProductApplyResult> {
    const approval = await this.approvals.claim(sessionId, approvalId, this.now().toISOString());
    if (!approval) throw new SilpoProductApprovalError('Product approval is missing, expired, or already used');
    try {
      await callWrite(
        'silpo_add_or_update_cart_products',
        buildProductAddArguments(approval.shoppingCartId, approval.candidate),
      );
      const verification = await callRead('silpo_get_shopping_cart_by_id', {
        shoppingCartId: approval.shoppingCartId,
      });
      if (!parseCartProductIds(verification).includes(approval.candidate.id)) {
        throw new SilpoProductApprovalError('Silpo cart reread did not contain the approved product');
      }
      const validations = summarizeRequiredValidations(verification);
      const result: SilpoProductApplyResult = {
        status: validations.errors > 0 ? 'product_added_with_validation_errors' : 'product_added',
        product: {
          name: approval.candidate.name,
          displayRatio: approval.candidate.displayRatio,
          quantity: approval.candidate.step,
        },
        validations,
      };
      await this.approvals.finish(sessionId, approvalId, 'applied');
      return result;
    } catch (error) {
      await this.approvals.finish(sessionId, approvalId, 'failed');
      throw error;
    }
  }
}

function summarizeRequiredValidations(result: unknown): SilpoCartValidationSummary {
  const payload = unwrapMcpPayload(result, 'product cart verification');
  const cart = asObject(payload.cart);
  const calculation = asObject(cart?.calculation);
  if (!Array.isArray(calculation?.validations)) {
    throw new SilpoProductApprovalError('Silpo cart reread did not include calculation validations');
  }
  let errors = 0;
  let warnings = 0;
  for (const value of calculation.validations) {
    const validation = asObject(value);
    const level = [validation?.level, validation?.severity, validation?.type]
      .find((candidate): candidate is string => typeof candidate === 'string')
      ?.toLowerCase();
    if (level?.includes('error')) errors += 1;
    else if (level?.includes('warn')) warnings += 1;
  }
  return {
    total: calculation.validations.length,
    errors,
    warnings,
    other: calculation.validations.length - errors - warnings,
  };
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}