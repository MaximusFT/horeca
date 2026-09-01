import {
  buildTimeSlotArguments,
  buildTimeslotUpdateArguments,
  parseAvailableTimeslots,
  parseCartContext,
  parseCartReference,
  parseCartUpdateSource,
  unwrapMcpPayload,
  type SilpoReadToolCaller,
  type SilpoTimeslot,
} from './silpo-stage9-workflow';
import type {
  SilpoTimeslotApproval,
  SilpoTimeslotApprovalStore,
} from './silpo-timeslot-approval-store';

const APPROVAL_LIFETIME_MS = 15 * 60 * 1000;

export type SilpoTimeslotPreview =
  | { status: 'cart_creation_required' }
  | { status: 'no_available_slots'; deliveryType: string }
  | {
      status: 'approval_required';
      approvalId: string;
      expiresAt: string;
      deliveryType: string;
      slots: SilpoTimeslot[];
    };

export interface SilpoCartValidationSummary {
  total: number;
  errors: number;
  warnings: number;
  other: number;
}

export interface SilpoTimeslotApplyResult {
  status: 'updated';
  deliveryType: string;
  timeslot: SilpoTimeslot;
  validations: SilpoCartValidationSummary;
}

export type SilpoTimeslotWriteCaller = (
  name: 'silpo_update_shopping_cart',
  args: Record<string, unknown>,
) => Promise<unknown>;

export class SilpoTimeslotApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SilpoTimeslotApprovalError';
  }
}

export class SilpoStage9TimeslotService {
  constructor(
    private readonly approvals: SilpoTimeslotApprovalStore,
    private readonly generateId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async prepare(sessionId: string, callRead: SilpoReadToolCaller): Promise<SilpoTimeslotPreview> {
    const cartReference = parseCartReference(await callRead('silpo_get_my_shopping_cart', {}));
    if (!cartReference.exists || !cartReference.shoppingCartId) {
      return { status: 'cart_creation_required' };
    }
    const source = parseCartUpdateSource(
      await callRead('silpo_get_shopping_cart_by_id', { shoppingCartId: cartReference.shoppingCartId }),
      cartReference.shoppingCartId,
    );
    const slots = parseAvailableTimeslots(
      await callRead('silpo_get_time_slots', buildTimeSlotArguments(source)),
    );
    if (slots.length === 0) return { status: 'no_available_slots', deliveryType: source.deliveryType };

    const createdAt = this.now();
    const approval: SilpoTimeslotApproval = {
      id: this.generateId(),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + APPROVAL_LIFETIME_MS).toISOString(),
      source,
      slots,
    };
    await this.approvals.save(sessionId, approval);
    return {
      status: 'approval_required',
      approvalId: approval.id,
      expiresAt: approval.expiresAt,
      deliveryType: source.deliveryType,
      slots,
    };
  }

  async apply(
    sessionId: string,
    approvalId: string,
    selectedTimeslot: SilpoTimeslot,
    callRead: SilpoReadToolCaller,
    callWrite: SilpoTimeslotWriteCaller,
  ): Promise<SilpoTimeslotApplyResult> {
    const approval = await this.approvals.claim(sessionId, approvalId, this.now().toISOString());
    if (!approval) {
      throw new SilpoTimeslotApprovalError('Timeslot approval is missing, expired, or already used');
    }
    try {
      const timeslot = approval.slots.find(
        (slot) => slot.start === selectedTimeslot.start && slot.end === selectedTimeslot.end,
      );
      if (!timeslot) throw new SilpoTimeslotApprovalError('Selected timeslot was not part of the approved preview');

      await callWrite(
        'silpo_update_shopping_cart',
        buildTimeslotUpdateArguments(approval.source, timeslot),
      );
      const verification = await callRead('silpo_get_shopping_cart_by_id', {
        shoppingCartId: approval.source.shoppingCartId,
      });
      const context = parseCartContext(verification, approval.source.shoppingCartId);
      if (
        context.deliveryType !== approval.source.deliveryType ||
        context.timeslotStart !== timeslot.start ||
        context.timeslotEnd !== timeslot.end
      ) {
        throw new SilpoTimeslotApprovalError('Silpo cart reread did not confirm the approved timeslot');
      }
      const result: SilpoTimeslotApplyResult = {
        status: 'updated',
        deliveryType: context.deliveryType,
        timeslot,
        validations: summarizeValidations(verification),
      };
      await this.approvals.finish(sessionId, approvalId, 'applied');
      return result;
    } catch (error) {
      await this.approvals.finish(sessionId, approvalId, 'failed');
      throw error;
    }
  }
}

function summarizeValidations(result: unknown): SilpoCartValidationSummary {
  const payload = unwrapMcpPayload(result, 'cart verification');
  const cart = asObject(payload.cart);
  const calculation = asObject(cart?.calculation);
  const values = Array.isArray(calculation?.validations) ? calculation.validations : [];
  let errors = 0;
  let warnings = 0;
  for (const value of values) {
    const validation = asObject(value);
    const level = [validation?.level, validation?.severity, validation?.type]
      .find((candidate): candidate is string => typeof candidate === 'string')
      ?.toLowerCase();
    if (level?.includes('error')) errors += 1;
    else if (level?.includes('warn')) warnings += 1;
  }
  return { total: values.length, errors, warnings, other: values.length - errors - warnings };
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}