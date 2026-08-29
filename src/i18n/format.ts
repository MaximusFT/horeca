import type { BaseUnit } from '@/domain/units';
import { intlTag, type Locale } from './locale';

export function formatLocalizedQuantity(quantity: number, unit: BaseUnit, locale: Locale): string {
  if (unit === 'g' && quantity >= 1_000) return `${formatNumber(quantity / 1_000, locale)} ${unitLabel('kg', locale)}`;
  if (unit === 'ml' && quantity >= 1_000) return `${formatNumber(quantity / 1_000, locale)} ${unitLabel('l', locale)}`;
  return `${formatNumber(quantity, locale)} ${unitLabel(unit, locale)}`;
}

export function formatDemoPeriod(locale: Locale): string {
  const month = new Intl.DateTimeFormat(intlTag(locale), {
    month: 'long',
    timeZone: 'Europe/Kyiv',
  }).format(new Date('2026-09-01T12:00:00+03:00'));
  return locale === 'uk' ? `1–14 ${month} 2026` : `${month} 1–14, 2026`;
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
