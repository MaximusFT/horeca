import {
  buildProductSearchArguments,
  buildReplacementArguments,
  describeJsonShape,
  parseCartContext,
  parseCartReference,
  parseProductCandidates,
  type SilpoReadToolCaller,
} from './silpo-stage9-workflow';

export interface SilpoReplacementProbeReport {
  status: 'complete' | 'cart_creation_required' | 'no_candidate';
  resultShape?: string[];
}

export async function runSilpoReplacementProbe(
  call: SilpoReadToolCaller,
): Promise<SilpoReplacementProbeReport> {
  const cartReference = parseCartReference(await call('silpo_get_my_shopping_cart', {}));
  if (!cartReference.exists || !cartReference.shoppingCartId) return { status: 'cart_creation_required' };
  const cartContext = parseCartContext(
    await call('silpo_get_shopping_cart_by_id', { shoppingCartId: cartReference.shoppingCartId }),
    cartReference.shoppingCartId,
  );
  const candidates = parseProductCandidates(
    await call('silpo_find_products_batch', buildProductSearchArguments(cartContext, ['лосось'])),
  );
  const candidate = candidates.find((product) => product.available) ?? candidates[0];
  if (!candidate) return { status: 'no_candidate' };
  const result = await call('silpo_get_replacements', buildReplacementArguments(cartContext, candidate));
  return { status: 'complete', resultShape: describeJsonShape(result, 8) };
}