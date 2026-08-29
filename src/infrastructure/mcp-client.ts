// Generic Model Context Protocol JSON-RPC client (transport: Streamable HTTP, non-streaming JSON response).
// This implements only the public MCP wire protocol (initialize, tools/list, tools/call envelopes).
// It intentionally does not know any Silpo-specific tool names, arguments, or result shapes.
// See https://modelcontextprotocol.io for the protocol this client speaks.

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpClientConfig {
  endpoint: string;
  accessToken: string;
  protocolVersion?: string;
}

export class McpProtocolError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'McpProtocolError';
  }
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export class McpJsonRpcClient {
  private nextId = 1;

  constructor(private readonly config: McpClientConfig) {}

  async listTools(): Promise<McpToolDefinition[]> {
    const result = await this.request<{ tools: McpToolDefinition[] }>('tools/list', {});
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.request('tools/call', { name, arguments: args });
  }

  private async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
        'mcp-protocol-version': this.config.protocolVersion ?? '2025-03-26',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new McpProtocolError(`MCP transport error (${response.status}): ${details.slice(0, 240)}`);
    }
    const payload = (await response.json()) as JsonRpcResponse<T>;
    if (payload.error) {
      throw new McpProtocolError(payload.error.message, payload.error.code, payload.error.data);
    }
    if (payload.result === undefined) {
      throw new McpProtocolError(`MCP response for ${method} had no result`);
    }
    return payload.result;
  }
}
