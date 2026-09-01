import type {
  SupplierCart,
  SupplierCartPreview,
  SupplierContext,
  SupplierDeliveryOption,
  SupplierGateway,
  SupplierOrderDraft,
  SupplierProduct,
  SupplierSearchRequest,
  SupplierSearchResult,
} from '@/domain/supplier';
import { MockSupplierGateway } from './mock-supplier-gateway';

export type SupplierMode = 'mock' | 'silpo';

export interface SilpoMcpConfiguration {
  endpoint?: string;
  accessToken?: string;
}

export interface SupplierRuntimeConfiguration {
  mode: SupplierMode;
  silpo: SilpoMcpConfiguration;
}

export interface SupplierRuntimeStatus {
  mode: SupplierMode;
  state: 'demo' | 'connection_required';
}

export class SilpoMcpConfigurationError extends Error {
  constructor() {
    super('Silpo MCP is not configured. Set SILPO_MCP_URL and SILPO_MCP_ACCESS_TOKEN after OAuth authorization.');
    this.name = 'SilpoMcpConfigurationError';
  }
}

export function readSupplierRuntimeConfiguration(
  environment: Record<string, string | undefined> = process.env,
): SupplierRuntimeConfiguration {
  const configuredMode = environment.SUPPLIER_MODE ?? 'mock';
  if (configuredMode !== 'mock' && configuredMode !== 'silpo') {
    throw new Error(`Unsupported SUPPLIER_MODE: ${configuredMode}`);
  }
  return {
    mode: configuredMode,
    silpo: {
      endpoint: environment.SILPO_MCP_URL,
      accessToken: environment.SILPO_MCP_ACCESS_TOKEN,
    },
  };
}

export function createSupplierGateway(configuration = readSupplierRuntimeConfiguration()): SupplierGateway {
  if (configuration.mode === 'mock') return new MockSupplierGateway();
  return new UnconfiguredSilpoMcpGateway(configuration.silpo);
}

export function getSupplierRuntimeStatus(configuration = readSupplierRuntimeConfiguration()): SupplierRuntimeStatus {
  return configuration.mode === 'mock'
    ? { mode: 'mock', state: 'demo' }
    : { mode: 'silpo', state: 'connection_required' };
}

class UnconfiguredSilpoMcpGateway implements SupplierGateway {
  constructor(private readonly configuration: SilpoMcpConfiguration) {}

  async initializeContext(): Promise<SupplierContext> {
    this.assertConfigured();
    throw new Error('Silpo MCP gateway is not implemented until live tools/list schemas are captured.');
  }

  async searchProducts(_requests: SupplierSearchRequest[]): Promise<SupplierSearchResult[]> {
    return this.unavailable();
  }

  async getProductDetails(_productId: string): Promise<SupplierProduct> {
    return this.unavailable();
  }

  async findReplacements(_productId: string): Promise<SupplierProduct[]> {
    return this.unavailable();
  }

  async getDeliveryOptions(_deliveryOn: string): Promise<SupplierDeliveryOption[]> {
    return this.unavailable();
  }

  async prepareCart(_draft: SupplierOrderDraft): Promise<SupplierCartPreview> {
    return this.unavailable();
  }

  async applyCart(_preview: SupplierCartPreview): Promise<SupplierCart> {
    return this.unavailable();
  }

  async getCart(): Promise<SupplierCart> {
    return this.unavailable();
  }

  private unavailable(): never {
    this.assertConfigured();
    throw new Error('Silpo MCP gateway is not implemented until live tools/list schemas are captured.');
  }

  private assertConfigured(): void {
    if (!this.configuration.endpoint || !this.configuration.accessToken) {
      throw new SilpoMcpConfigurationError();
    }
  }
}
