import type { Locale } from './locale';

// Client-safe: display-name overlay for demo dataset entities (ingredients, menu
// items, events, mock supplier products). The domain objects keep their English
// `name` field as the canonical/matching value; these maps only affect rendering.

const ingredientNamesUk: Record<string, string> = {
  croissant: 'Міні-круасан',
  tortilla: 'Тортилья',
  baguette: 'Міні-багет',
  'sandwich-roll': 'Булочка для сендвіча',
  chicken: 'Куряче філе',
  ham: 'Шинка',
  turkey: 'Індиче філе',
  bacon: 'Бекон',
  salmon: 'Свіжий лосось',
  'cream-cheese': 'Вершковий сир',
  cheddar: 'Чеддер',
  mozzarella: 'Моцарела',
  parmesan: 'Пармезан',
  butter: 'Вершкове масло',
  cream: 'Вершки',
  tomato: 'Помідор',
  cucumber: 'Огірок',
  lettuce: 'Салат латук',
  'bell-pepper': 'Болгарський перець',
  'red-onion': 'Червона цибуля',
  avocado: 'Авокадо',
  dill: 'Кріп',
  parsley: 'Петрушка',
  apple: 'Яблуко',
  banana: 'Банан',
  grapes: 'Виноград',
  strawberry: 'Полуниця',
  raspberry: 'Малина',
  blueberry: 'Чорниця',
  orange: 'Апельсин',
  flour: 'Борошно',
  sugar: 'Цукор',
  'olive-oil': 'Оливкова олія',
  eggs: 'Яйця',
  mayonnaise: 'Майонез',
  mustard: 'Гірчиця',
  coffee: 'Кава в зернах',
  'orange-juice': 'Апельсиновий сік',
};

const menuItemNamesUk: Record<string, string> = {
  'ham-croissant': 'Круасан з шинкою',
  'cheese-croissant': 'Круасан із сиром',
  'salmon-croissant': 'Круасан з лососем',
  'chicken-wrap': 'Ролл з куркою',
  'vegetarian-wrap': 'Вегетаріанський ролл',
  'turkey-sandwich': 'Сендвіч з індичкою',
  'caesar-salad': 'Салат Цезар',
  'vegetarian-salad': 'Вегетаріанський салат',
  'chicken-skewer': 'Курячий шашлик-канапе',
  'caprese-skewer': 'Капрезе-канапе',
  'mini-cheesecake': 'Міні-чізкейк',
  'chocolate-brownie': 'Шоколадний брауні',
  'berry-dessert-cup': 'Ягідний десерт у стаканчику',
  'fruit-cup': 'Фруктовий стаканчик',
  'orange-juice-portion': 'Порція апельсинового соку',
  'cheese-board': 'Сирна тарілка',
  'fruit-box': 'Фруктовий бокс',
  'mini-croissant-box': 'Бокс міні-круасанів — 18 шт',
  'premium-croissant-box': 'Преміум-бокс круасанів — 18 шт',
  'sandwich-selection-box': 'Бокс сендвічів асорті — 12 шт',
  'breakfast-box': 'Сніданковий бокс — на 10 гостей',
  'chicken-lunch-set': 'Обідній набір з куркою',
  'vegetarian-lunch-set': 'Вегетаріанський обідній набір',
};

const eventNamesUk: Record<string, string> = {
  'birthday-breakfast': 'Святковий сніданок',
  'office-lunch': 'Офісний обід',
  'private-anniversary': 'Приватна річниця',
  'tech-conference': 'Технологічна конференція',
  wedding: 'Весілля',
};

const supplierProductNamesUk: Record<string, string> = {
  'mock-salmon-premium-500': 'Преміум філе лосося Мок Місто',
  'mock-salmon-fillet-400': 'Альтернативне філе лосося Мок Місто',
};

export function localizedIngredientName(id: string, fallback: string, locale: Locale): string {
  if (locale === 'en') return fallback;
  return ingredientNamesUk[id] ?? fallback;
}

export function localizedMenuItemName(id: string, fallback: string, locale: Locale): string {
  if (locale === 'en') return fallback;
  return menuItemNamesUk[id] ?? fallback;
}

export function localizedEventName(id: string, fallback: string, locale: Locale): string {
  if (locale === 'en') return fallback;
  return eventNamesUk[id] ?? fallback;
}

export function localizedSupplierProductName(
  product: { id: string; ingredientId: string; name: string },
  locale: Locale,
): string {
  if (locale === 'en') return product.name;
  const special = supplierProductNamesUk[product.id];
  if (special) return special;
  const ingredientNameUk = ingredientNamesUk[product.ingredientId];
  return ingredientNameUk ? `Мок Місто ${ingredientNameUk}` : product.name;
}
