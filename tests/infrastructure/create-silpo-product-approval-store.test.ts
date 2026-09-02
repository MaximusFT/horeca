import { describe, expect, it } from 'vitest';
import { createSilpoProductApprovalStore } from '@/infrastructure/create-silpo-product-approval-store';
import { MemorySilpoProductApprovalStore } from '@/infrastructure/silpo-product-approval-store';

describe('Silpo product approval store factory', () => {
  it('allows memory in tests and requires encrypted storage in production', () => {
    expect(createSilpoProductApprovalStore({}, 'test')).toBeInstanceOf(MemorySilpoProductApprovalStore);
    expect(() => createSilpoProductApprovalStore({}, 'production')).toThrow(/encrypted Turso storage/);
  });
});