import type { BaseUnit } from '@/domain/units';
import { DEMO_PERIOD } from '@/lib/demo-clock';
import { intlTag, type Locale } from './locale';

export function formatLocalizedQuantity(quantity: number, unit: BaseUnit, locale: Locale): string {
  if (unit === 'g' && quantity >= 1_000) return `${formatNumber(quantity / 1_000, locale)} ${unitLabel('kg', locale)}`;
  if (unit === 'ml' && quantity >= 1_000) return `${formatNumber(quantity / 1_000, locale)} ${unitLabel('l', locale)}`;
  return `${formatNumber(quantity, locale)} ${unitLabel(unit, locale)}`;
}

export function formatDemoPeriod(locale: Locale): string {
  const startsOn = new Date(`${DEMO_PERIOD.startsOn}T12:00:00+03:00`);
  const endsOn = new Date(`${DEMO_PERIOD.endsOn}T12:00:00+03:00`);
  const month = new Intl.DateTimeFormat(intlTag(locale), {
    month: 'long',
    timeZone: 'Europe/Kyiv',
  }).format(startsOn);
  const startDay = startsOn.getDate();
  const endDay = endsOn.getDate();
  const year = startsOn.getFullYear();
  return locale === 'uk' ? `${startDay}–${endDay} ${month} ${year}` : `${month} ${startDay}–${endDay}, ${year}`;
}

export function formatMonthShort(value: string, locale: Locale): string {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00+03:00`);
  return new Intl.DateTimeFormat(intlTag(locale), {
    month: 'short',
    timeZone: 'Europe/Kyiv',
  }).format(date);
}

export function unitLabel(unit: BaseUnit | 'kg' | 'l', locale: Locale): string {
  if (locale === 'en') return { g: 'g', ml: 'ml', pcs: 'pcs', kg: 'kg', l: 'L' }[unit];
  return { g: 'г', ml: 'мл', pcs: 'шт', kg: 'кг', l: 'л' }[unit];
}

function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlTag(locale), { maximumFractionDigits: 2 }).format(value);
}
