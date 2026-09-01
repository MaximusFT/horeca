import { describe, expect, it } from 'vitest';
import { createSilpoTimeslotApprovalStore } from '@/infrastructure/create-silpo-timeslot-approval-store';
import { MemorySilpoTimeslotApprovalStore } from '@/infrastructure/silpo-timeslot-approval-store';

describe('Silpo timeslot approval store factory', () => {
  it('uses memory only outside production when no Turso configuration exists', () => {
    expect(createSilpoTimeslotApprovalStore({}, 'test')).toBeInstanceOf(MemorySilpoTimeslotApprovalStore);
    expect(() => createSilpoTimeslotApprovalStore({}, 'production')).toThrow(/encrypted Turso storage/);
  });

  it('rejects partial Turso configuration', () => {
    expect(() =>
      createSilpoTimeslotApprovalStore({ url: 'libsql://database.example' }, 'test'),
    ).toThrow(/requires TURSO_DATABASE_URL/);
  });
});