import {
  SilpoMcpConfigurationError,
  createSupplierGateway,
  readSupplierRuntimeConfiguration,
} from '@/infrastructure/supplier-runtime';
import { McpJsonRpcClient, McpProtocolError, type McpToolDefinition } from '@/infrastructure/mcp-client';

export default async function McpDebugPage() {
  const configuration = readSupplierRuntimeConfiguration();
  const gateway = createSupplierGateway(configuration);

  let status: 'ready' | 'blocked' | 'error';
  let detail: string;
  try {
    const context = await gateway.initializeContext();
    status = 'ready';
    detail = `Connected as ${context.name} (mode: ${context.mode}).`;
  } catch (error) {
    status = error instanceof SilpoMcpConfigurationError ? 'blocked' : 'error';
    detail = error instanceof Error ? error.message : 'Unknown supplier gateway error';
  }

  let tools: McpToolDefinition[] | undefined;
  let toolsError: string | undefined;
  if (configuration.silpo.endpoint && configuration.silpo.accessToken) {
    try {
      const client = new McpJsonRpcClient({
        endpoint: configuration.silpo.endpoint,
        accessToken: configuration.silpo.accessToken,
      });
      tools = await client.listTools();
    } catch (error) {
      toolsError =
        error instanceof McpProtocolError || error instanceof Error ? error.message : 'Unknown tools/list error';
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Debug</p>
      <h1 className="mt-2 text-3xl font-semibold">Silpo MCP connectivity</h1>
      <p className="mt-2 text-slate-600">
        This page never invents live MCP schemas or responses. It only reports the configured supplier mode and whether
        Stage 9 OAuth setup is present.
      </p>

      <dl className="mt-8 space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <Row label="SUPPLIER_MODE" value={configuration.mode} />
        <Row label="SILPO_MCP_URL" value={configuration.silpo.endpoint ? 'configured' : 'missing'} />
        <Row label="SILPO_MCP_ACCESS_TOKEN" value={configuration.silpo.accessToken ? 'configured' : 'missing'} />
        <Row label="Status" value={status} />
      </dl>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{detail}</p>

      {status === 'blocked' && (
        <p className="mt-4 text-sm text-amber-700">
          Stage 9 cannot proceed until Silpo OAuth access is granted. Set{' '}
          <code className="rounded bg-amber-100 px-1">SUPPLIER_MODE=silpo</code>,{' '}
          <code className="rounded bg-amber-100 px-1">SILPO_MCP_URL</code>, and{' '}
          <code className="rounded bg-amber-100 px-1">SILPO_MCP_ACCESS_TOKEN</code> once available, then call live{' '}
          <code className="rounded bg-amber-100 px-1">tools/list</code> before implementing the real gateway.
        </p>
      )}

      {configuration.silpo.endpoint && configuration.silpo.accessToken && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Live tools/list</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fetched directly from <code className="rounded bg-slate-100 px-1">SILPO_MCP_URL</code> using the generic MCP
            JSON-RPC client. This is the real schema — nothing here is invented.
          </p>

          {toolsError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{toolsError}</p>
          )}

          {tools && (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-semibold text-slate-800">{tools.length} tools returned</p>
              {tools.map((tool) => (
                <details key={tool.name} className="rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer font-mono text-sm font-semibold text-slate-800">
                    {tool.name}
                  </summary>
                  {tool.description && <p className="mt-2 text-sm text-slate-600">{tool.description}</p>}
                  {tool.inputSchema !== undefined && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  )}
                </details>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-mono text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
