export const SILPO_READ_TOOL_NAMES = [
  'silpo_find_address',
  'silpo_get_available_delivery_types',
  'silpo_list_branches',
  'silpo_get_my_shopping_cart',
  'silpo_get_shopping_cart_by_id',
  'silpo_get_time_slots',
  'silpo_find_products_batch',
  'silpo_get_product_details',
  'silpo_get_replacements',
] as const;

export const SILPO_WRITE_TOOL_NAMES = [
  'silpo_create_shopping_cart',
  'silpo_add_or_update_cart_products',
  'silpo_remove_cart_products',
  'silpo_clear_shopping_cart',
  'silpo_update_shopping_cart',
  'silpo_add_or_update_favorite_products',
  'silpo_add_or_update_certificates',
] as const;

export type SilpoReadToolName = (typeof SILPO_READ_TOOL_NAMES)[number];

export function isSilpoReadToolName(value: string): value is SilpoReadToolName {
  return SILPO_READ_TOOL_NAMES.includes(value as SilpoReadToolName);
}
