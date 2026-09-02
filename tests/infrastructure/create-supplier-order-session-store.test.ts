import { describe, expect, it } from 'vitest';
import { MemorySupplierOrderSessionStore } from '@/application/supplier-order-session-store';
import { createSupplierOrderSessionStore } from '@/infrastructure/create-supplier-order-session-store';

describe('supplier order session store factory', () => {
  it('uses memory in tests and requires encrypted Turso storage in production', () => {
    expect(createSupplierOrderSessionStore({}, 'test')).toBeInstanceOf(MemorySupplierOrderSessionStore);
    expect(() => createSupplierOrderSessionStore({}, 'production')).toThrow(/encrypted Turso storage/);
  });
});