import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { OAuthClientProvider, OAuthDiscoveryState, UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { type SilpoOAuthRecord, type SilpoOAuthStore } from './silpo-oauth-store';
import { isSilpoReadToolName, type SilpoReadToolName } from './silpo-tool-policy';
import { getSilpoOAuthStore } from './create-silpo-oauth-store';
import { validateCapturedSilpoToolArguments } from './silpo-live-schema';
import { getSilpoMcpTraceStore } from './create-silpo-mcp-trace-store';
import type { SilpoMcpTraceStore } from './silpo-mcp-trace';

export const SILPO_MCP_ENDPOINT = 'https://mcp.silpo.ua/mcp';

export type SilpoOAuthStartResult =
  | { status: 'authorization_required'; authorizationUrl: string }
  | { status: 'connected'; toolCount: number };

export interface SilpoToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export class SilpoOAuthClientProvider implements OAuthClientProvider {
  readonly clientMetadata: OAuthClientMetadata;

  constructor(
    private readonly sessionId: string,
    readonly redirectUrl: URL,
    private readonly store: SilpoOAuthStore,
  ) {
    this.clientMetadata = {
      client_name: 'Misto Kitchen Procurement',
      redirect_uris: [redirectUrl.toString()],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  state(): string {
    return this.sessionId;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    return (await this.record()).clientInformation;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    await this.patch({ clientInformation });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return (await this.record()).tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.patch({ tokens, authorizationUrl: undefined });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await this.patch({ authorizationUrl: authorizationUrl.toString() });
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.patch({ codeVerifier });
  }

  async codeVerifier(): Promise<string> {
    const verifier = (await this.record()).codeVerifier;
    if (!verifier) throw new Error('Silpo OAuth PKCE verifier is missing');
    return verifier;
  }

  async saveDiscoveryState(discoveryState: OAuthDiscoveryState): Promise<void> {
    await this.patch({ discoveryState });
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return (await this.record()).discoveryState;
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): Promise<void> {
    if (scope === 'all') {
      await this.store.delete(this.sessionId);
      return;
    }
    const record = await this.record();
    if (scope === 'client') record.clientInformation = undefined;
    if (scope === 'tokens') record.tokens = undefined;
    if (scope === 'verifier') record.codeVerifier = undefined;
    if (scope === 'discovery') record.discoveryState = undefined;
    await this.store.set(this.sessionId, record);
  }

  private async record(): Promise<SilpoOAuthRecord> {
    return (await this.store.get(this.sessionId)) ?? {};
  }

  private async patch(values: Partial<SilpoOAuthRecord>): Promise<void> {
    await this.store.set(this.sessionId, { ...(await this.record()), ...values });
  }
}

export class SilpoOAuthCoordinator {
  constructor(
    private readonly store: SilpoOAuthStore = getSilpoOAuthStore(),
    private readonly endpoint = SILPO_MCP_ENDPOINT,
    private readonly traceStore: SilpoMcpTraceStore = getSilpoMcpTraceStore(),
  ) {}

  async start(sessionId: string, redirectUrl: URL): Promise<SilpoOAuthStartResult> {
    const provider = new SilpoOAuthClientProvider(sessionId, redirectUrl, this.store);
    const connection = this.connection(provider);
    try {
      await connection.client.connect(connection.transport);
      const startedAt = performance.now();
      const { tools } = await connection.client.listTools();
      await this.recordTrace(sessionId, 'tools/list', [], 'completed', startedAt, `${tools.length} tools`);
      return { status: 'connected', toolCount: tools.length };
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
      const authorizationUrl = (await this.store.get(sessionId))?.authorizationUrl;
      if (!authorizationUrl) throw new Error('Silpo OAuth did not provide an authorization URL');
      return { status: 'authorization_required', authorizationUrl };
    } finally {
      await connection.transport.close();
    }
  }

  async finish(sessionId: string, redirectUrl: URL, authorizationCode: string): Promise<SilpoToolDefinition[]> {
    const provider = new SilpoOAuthClientProvider(sessionId, redirectUrl, this.store);
    const connection = this.connection(provider);
    try {
      await connection.transport.finishAuth(authorizationCode);
      await connection.client.connect(connection.transport);
      const startedAt = performance.now();
      const { tools } = await connection.client.listTools();
      await this.recordTrace(sessionId, 'tools/list', [], 'completed', startedAt, `${tools.length} tools`);
      return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    } finally {
      await connection.transport.close();
    }
  }

  async listTools(sessionId: string, redirectUrl: URL): Promise<SilpoToolDefinition[] | undefined> {
    if (!(await this.store.get(sessionId))?.tokens) return undefined;
    const provider = new SilpoOAuthClientProvider(sessionId, redirectUrl, this.store);
    const connection = this.connection(provider);
    try {
      await connection.client.connect(connection.transport);
      const startedAt = performance.now();
      const { tools } = await connection.client.listTools();
      await this.recordTrace(sessionId, 'tools/list', [], 'completed', startedAt, `${tools.length} tools`);
      return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    } finally {
      await connection.transport.close();
    }
  }

  async callReadTool(
    sessionId: string,
    redirectUrl: URL,
    name: SilpoReadToolName,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (!isSilpoReadToolName(name)) throw new Error(`Silpo tool ${name} is not allowed in read-only spike mode`);
    const validatedArguments = validateCapturedSilpoToolArguments(name, args);
    if (!(await this.store.get(sessionId))?.tokens)
      throw new UnauthorizedError('Silpo OAuth authorization is required');
    const provider = new SilpoOAuthClientProvider(sessionId, redirectUrl, this.store);
    const connection = this.connection(provider);
    const startedAt = performance.now();
    try {
      await connection.client.connect(connection.transport);
      const result = await connection.client.callTool({ name, arguments: validatedArguments });
      await this.recordTrace(
        sessionId,
        name,
        Object.keys(validatedArguments).sort(),
        'completed',
        startedAt,
        summarizeToolResult(result),
      );
      return result;
    } catch (error) {
      await this.recordTrace(
        sessionId,
        name,
        Object.keys(validatedArguments).sort(),
        'failed',
        startedAt,
        error instanceof Error ? error.name : 'Unknown error',
      );
      throw error;
    } finally {
      await connection.transport.close();
    }
  }

  private async recordTrace(
    sessionId: string,
    operation: string,
    requestKeys: string[],
    status: 'completed' | 'failed',
    startedAt: number,
    resultSummary: string,
  ): Promise<void> {
    try {
      await this.traceStore.append({
        id: crypto.randomUUID(),
        sessionId,
        operation,
        status,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        requestKeys,
        resultSummary,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Observability must never break the supplier operation.
    }
  }

  private connection(provider: OAuthClientProvider) {
    return {
      client: new Client({ name: 'misto-kitchen-procurement', version: '0.1.0' }, { capabilities: {} }),
      transport: new StreamableHTTPClientTransport(new URL(this.endpoint), { authProvider: provider }),
    };
  }
}

function summarizeToolResult(result: unknown): string {
  if (!result || typeof result !== 'object') return typeof result;
  const value = result as { isError?: unknown; content?: unknown; structuredContent?: unknown };
  const contentCount = Array.isArray(value.content) ? value.content.length : 0;
  return [
    value.isError === true ? 'MCP error result' : 'MCP result',
    `${contentCount} content items`,
    value.structuredContent !== undefined ? 'structured content' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}
