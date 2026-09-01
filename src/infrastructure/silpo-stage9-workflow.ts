import { validateCapturedSilpoToolArguments } from './silpo-live-schema';
import type { SilpoReadToolName } from './silpo-tool-policy';

export const STAGE9_PRODUCT_QUERIES = ['яйця', 'помідори', 'лосось'] as const;

export interface SilpoCartReference {
  exists: boolean;
  shoppingCartId?: string;
}

export interface SilpoCartContext {
  shoppingCartId: string;
  branchId: string;
  deliveryType: string;
  timeslotStart: string;
  timeslotEnd: string;
}

export interface SilpoSearchSummary {
  queryCount: number;
  returnedProductCount: number;
  totalFound: number;
}

export type SilpoStage9ReadReport =
  | { status: 'cart_creation_required' }
  | { status: 'timeslot_update_required'; deliveryType: string }
  | {
      status: 'complete';
      deliveryType: string;
      timeslotValidated: true;
      requestedProducts: string[];
      search: SilpoSearchSummary;
    };

export type SilpoReadToolCaller = (
  name: SilpoReadToolName,
  args: Record<string, unknown>,
) => Promise<unknown>;

export class SilpoStage9PayloadError extends Error {
  constructor(
    readonly phase: string,
    readonly expectedPaths: string[],
    readonly observedKeys: string[],
    readonly observedShape: string[],
  ) {
    super(
      `${phase} response is missing documented fields (${expectedPaths.join(', ')}); observed keys: ${observedKeys.join(', ') || 'none'}`,
    );
    this.name = 'SilpoStage9PayloadError';
  }
}

export async function runSilpoStage9ReadSequence(
  call: SilpoReadToolCaller,
): Promise<SilpoStage9ReadReport> {
  const cartReference = parseCartReference(await call('silpo_get_my_shopping_cart', {}));
  if (!cartReference.exists || !cartReference.shoppingCartId) {
    return { status: 'cart_creation_required' };
  }

  const cartContext = parseCartContext(
    await call('silpo_get_shopping_cart_by_id', { shoppingCartId: cartReference.shoppingCartId }),
    cartReference.shoppingCartId,
  );
  const slots = await call('silpo_get_time_slots', buildTimeSlotArguments(cartContext));
  if (!isCurrentTimeslotAvailable(slots, cartContext)) {
    return { status: 'timeslot_update_required', deliveryType: cartContext.deliveryType };
  }

  const search = parseProductSearchSummary(
    await call('silpo_find_products_batch', buildProductSearchArguments(cartContext)),
  );
  return {
    status: 'complete',
    deliveryType: cartContext.deliveryType,
    timeslotValidated: true,
    requestedProducts: [...STAGE9_PRODUCT_QUERIES],
    search,
  };
}

export function parseCartReference(result: unknown): SilpoCartReference {
  const payload = unwrapMcpPayload(result, 'cart reference');
  const exists = payload.exists;
  const shoppingCartId = payload.shoppingCartId;
  if (typeof exists !== 'boolean') {
    throw payloadError('cart reference', ['exists'], payload);
  }
  if (exists && typeof shoppingCartId !== 'string') {
    throw payloadError('cart reference', ['shoppingCartId'], payload);
  }
  return { exists, shoppingCartId: typeof shoppingCartId === 'string' ? shoppingCartId : undefined };
}

export function parseCartContext(result: unknown, shoppingCartId: string): SilpoCartContext {
  const payload = unwrapMcpPayload(result, 'cart detail');
  const cart = asObject(payload.cart);
  const shipments = Array.isArray(cart?.shipments) ? cart.shipments : [];
  const shipment = asObject(shipments[0]);
  const timeslot = asObject(cart?.timeslot);
  if (
    typeof shipment?.branchId !== 'string' ||
    typeof cart?.deliveryType !== 'string' ||
    typeof timeslot?.start !== 'string' ||
    typeof timeslot?.end !== 'string'
  ) {
    throw payloadError(
      'cart detail',
      ['cart.shipments[0].branchId', 'cart.deliveryType', 'cart.timeslot.start', 'cart.timeslot.end'],
      payload,
    );
  }
  return {
    shoppingCartId,
    branchId: shipment.branchId,
    deliveryType: cart.deliveryType,
    timeslotStart: timeslot.start,
    timeslotEnd: timeslot.end,
  };
}

export function buildTimeSlotArguments(context: SilpoCartContext): Record<string, unknown> {
  return validateCapturedSilpoToolArguments('silpo_get_time_slots', {
    branchId: context.branchId,
    deliveryTypes: [searchDeliveryType(context.deliveryType)],
    limit: 10,
  });
}

export function isCurrentTimeslotAvailable(result: unknown, context: SilpoCartContext): boolean {
  const payload = unwrapMcpPayload(result, 'time slots');
  if (!Array.isArray(payload.slots)) throw payloadError('time slots', ['slots[]'], payload);
  return payload.slots.some((candidate) => {
    const slot = asObject(candidate);
    return (
      slot?.available === true &&
      slot.start === context.timeslotStart &&
      slot.end === context.timeslotEnd
    );
  });
}

export function buildProductSearchArguments(
  context: SilpoCartContext,
  products: readonly string[] = STAGE9_PRODUCT_QUERIES,
): Record<string, unknown> {
  return validateCapturedSilpoToolArguments('silpo_find_products_batch', {
    branchId: context.branchId,
    deliveryType: searchDeliveryType(context.deliveryType),
    timeslotStart: context.timeslotStart,
    timeslotEnd: context.timeslotEnd,
    products: [...products],
    limit: 10,
  });
}

export function parseProductSearchSummary(result: unknown): SilpoSearchSummary {
  const payload = unwrapMcpPayload(result, 'product search');
  if (!Array.isArray(payload.queries)) throw payloadError('product search', ['queries[]'], payload);
  let returnedProductCount = 0;
  let totalFound = 0;
  for (const candidate of payload.queries) {
    const query = asObject(candidate);
    if (!query || !Array.isArray(query.products) || typeof query.totalFound !== 'number') {
      throw payloadError('product search', ['queries[].products', 'queries[].totalFound'], payload);
    }
    returnedProductCount += query.products.length;
    totalFound += query.totalFound;
  }
  return { queryCount: payload.queries.length, returnedProductCount, totalFound };
}

export function unwrapMcpPayload(result: unknown, phase: string): Record<string, unknown> {
  const envelope = asObject(result);
  if (!envelope) throw new SilpoStage9PayloadError(phase, ['object payload'], [], describeJsonShape(result));
  const structuredContent = asObject(envelope.structuredContent);
  if (structuredContent) return structuredContent;
  if (Array.isArray(envelope.content)) {
    for (const candidate of envelope.content) {
      const item = asObject(candidate);
      if (item?.type !== 'text' || typeof item.text !== 'string') continue;
      try {
        const parsed = JSON.parse(item.text) as unknown;
        const object = asObject(parsed);
        if (object) return object;
      } catch {
        continue;
      }
    }
  }
  return envelope;
}

function searchDeliveryType(deliveryType: string): string {
  return deliveryType === 'DeliveryExpressByPromise' ? 'DeliveryHome' : deliveryType;
}

function payloadError(
  phase: string,
  expectedPaths: string[],
  payload: Record<string, unknown>,
): SilpoStage9PayloadError {
  return new SilpoStage9PayloadError(
    phase,
    expectedPaths,
    Object.keys(payload).sort(),
    describeJsonShape(payload),
  );
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function describeJsonShape(value: unknown, maxDepth = 4): string[] {
  const paths: string[] = [];
  visitShape(value, '$', 0, maxDepth, paths);
  return paths;
}

function visitShape(value: unknown, path: string, depth: number, maxDepth: number, paths: string[]): void {
  const type = jsonType(value);
  paths.push(`${path}:${type}`);
  if (depth >= maxDepth) return;
  if (Array.isArray(value)) {
    if (value.length > 0) visitShape(value[0], `${path}[0]`, depth + 1, maxDepth, paths);
    return;
  }
  const object = asObject(value);
  if (!object) return;
  for (const key of Object.keys(object).sort()) {
    visitShape(object[key], `${path}.${key}`, depth + 1, maxDepth, paths);
  }
}

function jsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
