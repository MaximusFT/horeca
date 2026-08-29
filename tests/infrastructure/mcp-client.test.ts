import { afterEach, describe, expect, it, vi } from "vitest";
import { McpJsonRpcClient, McpProtocolError } from "@/infrastructure/mcp-client";

describe("McpJsonRpcClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a tools/list JSON-RPC request and returns the tool definitions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result: { tools: [{ name: "silpo_get_my_shopping_cart", description: "Read the current cart" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new McpJsonRpcClient({ endpoint: "https://mcp.example/rpc", accessToken: "token-123" });
    const tools = await client.listTools();

    expect(tools).toEqual([{ name: "silpo_get_my_shopping_cart", description: "Read the current cart" }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://mcp.example/rpc");
    expect(init.headers.authorization).toBe("Bearer token-123");
    expect(JSON.parse(init.body)).toMatchObject({ jsonrpc: "2.0", method: "tools/list" });
  });

  it("sends a tools/call request with the tool name and arguments", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result: { content: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new McpJsonRpcClient({ endpoint: "https://mcp.example/rpc", accessToken: "token-123" });
    await client.callTool("silpo_get_time_slots", { deliveryOn: "2026-09-01" });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      method: "tools/call",
      params: { name: "silpo_get_time_slots", arguments: { deliveryOn: "2026-09-01" } },
    });
  });

  it("surfaces a JSON-RPC error as McpProtocolError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "Method not found" } }),
    }));

    const client = new McpJsonRpcClient({ endpoint: "https://mcp.example/rpc", accessToken: "token-123" });
    await expect(client.listTools()).rejects.toThrow(McpProtocolError);
    await expect(client.listTools()).rejects.toThrow("Method not found");
  });

  it("surfaces a transport-level HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("invalid token"),
    }));

    const client = new McpJsonRpcClient({ endpoint: "https://mcp.example/rpc", accessToken: "expired" });
    await expect(client.listTools()).rejects.toThrow(/401/);
  });
});
