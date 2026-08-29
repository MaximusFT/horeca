import { describe, expect, it } from 'vitest';
import {
  SilpoMcpConfigurationError,
  createSupplierGateway,
  readSupplierRuntimeConfiguration,
} from '@/infrastructure/supplier-runtime';

describe('supplier runtime', () => {
  it('uses the mock supplier by default', async () => {
    const gateway = createSupplierGateway(readSupplierRuntimeConfiguration({}));

    await expect(gateway.initializeContext()).resolves.toMatchObject({
      mode: 'mock',
      supplierId: 'misto-mock-supplier',
    });
  });

  it('rejects an unsupported supplier mode', () => {
    expect(() => readSupplierRuntimeConfiguration({ SUPPLIER_MODE: 'other' })).toThrow(
      'Unsupported SUPPLIER_MODE: other',
    );
  });

  it('does not silently fall back to mock when Silpo OAuth is unavailable', async () => {
    const gateway = createSupplierGateway(readSupplierRuntimeConfiguration({ SUPPLIER_MODE: 'silpo' }));

    await expect(gateway.initializeContext()).rejects.toBeInstanceOf(SilpoMcpConfigurationError);
  });
});
