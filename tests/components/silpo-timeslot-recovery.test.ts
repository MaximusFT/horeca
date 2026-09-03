import { describe, expect, it } from 'vitest';
import { isSupplierSlotError } from '@/components/procurement/silpo-timeslot-recovery';

describe('Silpo timeslot recovery', () => {
  it('appears only for the actionable current-cart slot error', () => {
    expect(isSupplierSlotError('The current supplier cart delivery slot is no longer available.')).toBe(true);
    expect(isSupplierSlotError('No supplier product was found.')).toBe(false);
    expect(isSupplierSlotError(undefined)).toBe(false);
  });
});