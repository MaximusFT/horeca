export const SILPO_READ_TOOL_NAMES = [
  'silpo_get_my_shopping_cart',
  'silpo_get_shopping_cart_by_id',
  'silpo_get_time_slots',
  'silpo_find_products_batch',
  'silpo_get_product_details',
  'silpo_get_replacements',
] as const;

export type SilpoReadToolName = (typeof SILPO_READ_TOOL_NAMES)[number];

export function isSilpoReadToolName(value: string): value is SilpoReadToolName {
  return SILPO_READ_TOOL_NAMES.includes(value as SilpoReadToolName);
}
