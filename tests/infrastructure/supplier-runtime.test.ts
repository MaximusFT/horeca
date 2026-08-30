import { describe, expect, it } from 'vitest';
import {
  SilpoMcpConfigurationError,
  createSupplierGateway,
  getSupplierRuntimeStatus,
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

  it('reports configured supplier mode without claiming live connectivity', () => {
    expect(getSupplierRuntimeStatus(readSupplierRuntimeConfiguration({}))).toEqual({ mode: 'mock', state: 'demo' });
    expect(
      getSupplierRuntimeStatus(
        readSupplierRuntimeConfiguration({
          SUPPLIER_MODE: 'silpo',
          SILPO_MCP_URL: 'https://mcp.silpo.ua/mcp',
          SILPO_MCP_ACCESS_TOKEN: 'configured-but-not-probed',
        }),
      ),
    ).toEqual({ mode: 'silpo', state: 'connection_required' });
  });
});
