import {
  SilpoMcpConfigurationError,
  createSupplierGateway,
  readSupplierRuntimeConfiguration,
} from '@/infrastructure/supplier-runtime';

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
