'use client';

import { useState } from 'react';
import type { SilpoOAuthStartResult, SilpoToolDefinition } from '@/infrastructure/silpo-oauth-client';
import { isSilpoReadToolName } from '@/infrastructure/silpo-tool-policy';
import type { SilpoMcpTraceEntry } from '@/infrastructure/silpo-mcp-trace';
import type { SilpoStage9ReadReport } from '@/infrastructure/silpo-stage9-workflow';
import type { SilpoTimeslotApplyResult, SilpoTimeslotPreview } from '@/infrastructure/silpo-stage9-timeslot-service';
import type { SilpoProductApplyResult, SilpoProductPreview } from '@/infrastructure/silpo-stage9-product-service';
import type { SilpoReplacementProbeReport } from '@/infrastructure/silpo-stage10-replacement-probe';

export function SilpoOAuthPanel({ oauthStatus, detail }: { oauthStatus?: string; detail?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [tools, setTools] = useState<SilpoToolDefinition[]>();
  const [trace, setTrace] = useState<Array<Omit<SilpoMcpTraceEntry, 'sessionId'>>>([]);
  const [stage9Report, setStage9Report] = useState<SilpoStage9ReadReport>();
  const [timeslotPreview, setTimeslotPreview] = useState<SilpoTimeslotPreview>();
  const [selectedTimeslot, setSelectedTimeslot] = useState<string>();
  const [timeslotResult, setTimeslotResult] = useState<SilpoTimeslotApplyResult>();
  const [productPreview, setProductPreview] = useState<SilpoProductPreview>();
  const [productResult, setProductResult] = useState<SilpoProductApplyResult>();
  const [replacementReport, setReplacementReport] = useState<SilpoReplacementProbeReport>();

  async function connect() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/silpo/oauth/start', { method: 'POST' });
      const result = (await response.json()) as SilpoOAuthStartResult | { error?: string };
      if (!response.ok || !('status' in result)) {
        throw new Error('error' in result && result.error ? result.error : 'Unable to start Silpo OAuth');
      }
      if (result.status === 'authorization_required') {
        window.location.assign(result.authorizationUrl);
        return;
      }
      await loadTools();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start Silpo OAuth');
    } finally {
      setBusy(false);
    }
  }

  async function loadTools() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/silpo/tools');
      const result = (await response.json()) as { tools?: SilpoToolDefinition[]; error?: string };
      if (!response.ok || !result.tools) throw new Error(result.error ?? 'Unable to list Silpo MCP tools');
      setTools(result.tools);
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to list Silpo MCP tools');
    } finally {
      setBusy(false);
    }
  }

  async function loadTrace() {
    const response = await fetch('/api/silpo/trace');
    const result = (await response.json()) as {
      entries?: Array<Omit<SilpoMcpTraceEntry, 'sessionId'>>;
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Silpo MCP trace');
    setTrace(result.entries ?? []);
  }

  async function runStage9Reads() {
    setBusy(true);
    setError(undefined);
    setStage9Report(undefined);
    setTimeslotPreview(undefined);
    setSelectedTimeslot(undefined);
    setTimeslotResult(undefined);
    setProductPreview(undefined);
    setProductResult(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/read', { method: 'POST' });
      const result = (await response.json()) as {
        report?: SilpoStage9ReadReport;
        error?: string;
        diagnostic?: {
          phase: string;
          expectedPaths: string[];
          observedKeys: string[];
          observedShape: string[];
        };
      };
      if (!response.ok || !result.report) {
        const diagnostic = result.diagnostic
          ? ` (${result.diagnostic.phase}; expected ${result.diagnostic.expectedPaths.join(', ')}; shape ${result.diagnostic.observedShape.join(', ') || 'none'})`
          : '';
        throw new Error(`${result.error ?? 'Stage 9 read sequence failed'}${diagnostic}`);
      }
      setStage9Report(result.report);
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Stage 9 read sequence failed');
    } finally {
      setBusy(false);
    }
  }

  async function prepareTimeslotUpdate() {
    setBusy(true);
    setError(undefined);
    setTimeslotPreview(undefined);
    setSelectedTimeslot(undefined);
    setTimeslotResult(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/timeslot/preview', { method: 'POST' });
      const payload = (await response.json()) as { preview?: SilpoTimeslotPreview; error?: string };
      if (!response.ok || !payload.preview) throw new Error(payload.error ?? 'Unable to prepare timeslot update');
      setTimeslotPreview(payload.preview);
      if (payload.preview.status === 'approval_required' && payload.preview.slots[0]) {
        setSelectedTimeslot(timeslotKey(payload.preview.slots[0]));
      }
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to prepare timeslot update');
    } finally {
      setBusy(false);
    }
  }

  async function applyTimeslotUpdate() {
    if (timeslotPreview?.status !== 'approval_required' || !selectedTimeslot) return;
    const timeslot = timeslotPreview.slots.find((slot) => timeslotKey(slot) === selectedTimeslot);
    if (!timeslot) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/timeslot/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approvalId: timeslotPreview.approvalId, timeslot }),
      });
      const payload = (await response.json()) as { result?: SilpoTimeslotApplyResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error ?? 'Unable to apply timeslot update');
      setTimeslotResult(payload.result);
      setTimeslotPreview(undefined);
      setSelectedTimeslot(undefined);
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to apply timeslot update');
    } finally {
      setBusy(false);
    }
  }

  async function prepareProductWrite() {
    setBusy(true);
    setError(undefined);
    setProductPreview(undefined);
    setProductResult(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/product/preview', { method: 'POST' });
      const payload = (await response.json()) as { preview?: SilpoProductPreview; error?: string };
      if (!response.ok || !payload.preview) throw new Error(payload.error ?? 'Unable to prepare product write');
      setProductPreview(payload.preview);
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to prepare product write');
    } finally {
      setBusy(false);
    }
  }

  async function applyProductWrite() {
    if (productPreview?.status !== 'approval_required') return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/silpo/stage9/product/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approvalId: productPreview.approvalId }),
      });
      const payload = (await response.json()) as { result?: SilpoProductApplyResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error ?? 'Unable to add product');
      setProductResult(payload.result);
      setProductPreview(undefined);
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add product');
    } finally {
      setBusy(false);
    }
  }

  async function inspectReplacements() {
    setBusy(true);
    setError(undefined);
    setReplacementReport(undefined);
    try {
      const response = await fetch('/api/silpo/stage10/replacements/read', { method: 'POST' });
      const payload = (await response.json()) as { report?: SilpoReplacementProbeReport; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error ?? 'Unable to inspect replacements');
      setReplacementReport(payload.report);
      await loadTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to inspect replacements');
    } finally {
      setBusy(false);
    }
  }

  function downloadSchemas() {
    if (!tools) return;
    const blob = new Blob([JSON.stringify({ capturedAt: new Date().toISOString(), tools }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `silpo-tools-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Official OAuth 2.1 connection</h2>
      <p className="mt-1 text-sm text-slate-600">
        Uses the official MCP SDK, Dynamic Client Registration, PKCE and Streamable HTTP at{' '}
        <code className="rounded bg-slate-100 px-1">https://mcp.silpo.ua/mcp</code>.
      </p>

      {oauthStatus === 'connected' && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          OAuth completed. {detail ? `${detail} tools were returned.` : 'Load tools to verify the session.'}
        </p>
      )}
      {oauthStatus === 'error' && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          OAuth failed: {detail ?? 'unknown error'}
        </p>
      )}
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={connect}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Connecting…' : 'Connect Silpo'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={loadTools}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Load live tools
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadTrace()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Refresh trace
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={runStage9Reads}
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Run Stage 9 reads
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={inspectReplacements}
          className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50"
        >
          Inspect live replacements
        </button>
      </div>

      {stage9Report && (
        <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <h3 className="font-semibold">Stage 9 read-only report</h3>
          {stage9Report.status === 'cart_creation_required' && (
            <p className="mt-2">
              No active cart exists. The workflow stopped before the approved cart-creation branch.
            </p>
          )}
          {stage9Report.status === 'timeslot_update_required' && (
            <div className="mt-2">
              <p>
                The current {stage9Report.deliveryType} slot is unavailable. The workflow stopped before product search.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={prepareTimeslotUpdate}
                className="mt-3 rounded bg-blue-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Find available slots
              </button>
            </div>
          )}
          {stage9Report.status === 'complete' && (
            <div className="mt-2">
              <p>
                Cart context read · {stage9Report.deliveryType} slot validated · searched{' '}
                {stage9Report.requestedProducts.join(', ')} · {stage9Report.search.returnedProductCount} products
                returned across {stage9Report.search.queryCount} queries ({stage9Report.search.totalFound} total
                matches).
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={prepareProductWrite}
                className="mt-3 rounded bg-blue-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Prepare one-product cart preview
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-blue-800">No cart mutation was executed.</p>
        </section>
      )}

      {timeslotPreview?.status === 'no_available_slots' && (
        <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-semibold">No available delivery slots</h3>
          <p className="mt-2">
            Silpo returned no available slots for {timeslotPreview.deliveryType}. No approval or cart mutation was
            created.
          </p>
        </section>
      )}

      {timeslotPreview?.status === 'cart_creation_required' && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No active cart exists. Timeslot update was not prepared.
        </p>
      )}

      {timeslotPreview?.status === 'approval_required' && (
        <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-semibold">Approve delivery slot update</h3>
          <p className="mt-1 text-xs text-amber-800">
            Select one Silpo slot. Approval expires at {formatTimeslotDate(timeslotPreview.expiresAt)}. Applying it will
            update delivery settings and immediately reread the cart.
          </p>
          <div className="mt-3 space-y-2">
            {timeslotPreview.slots.map((slot) => {
              const key = timeslotKey(slot);
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded border border-amber-200 bg-white p-3"
                >
                  <input
                    type="radio"
                    name="silpo-timeslot"
                    value={key}
                    checked={selectedTimeslot === key}
                    onChange={() => setSelectedTimeslot(key)}
                  />
                  <span>{formatTimeslotRange(slot.start, slot.end)}</span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            disabled={busy || !selectedTimeslot}
            onClick={applyTimeslotUpdate}
            className="mt-3 rounded bg-amber-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Approve and update cart timeslot
          </button>
        </section>
      )}

      {timeslotResult && (
        <section className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950">
          <h3 className="font-semibold">Timeslot update verified</h3>
          <p className="mt-2">
            {formatTimeslotRange(timeslotResult.timeslot.start, timeslotResult.timeslot.end)} · cart reread completed ·{' '}
            {timeslotResult.validations.errors} errors · {timeslotResult.validations.warnings} warnings.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={runStage9Reads}
            className="mt-3 rounded bg-green-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Continue Stage 9 reads
          </button>
        </section>
      )}

      {productPreview?.status === 'approval_required' && (
        <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-semibold">Approve one test product</h3>
          <p className="mt-2 font-semibold">{productPreview.product.name}</p>
          <p className="mt-1 text-xs text-amber-800">
            {productPreview.product.displayRatio} · quantity {productPreview.product.quantity} ·{' '}
            {formatPrice(productPreview.product.price)}. This approval expires at{' '}
            {formatTimeslotDate(productPreview.expiresAt)}.
          </p>
          <p className="mt-2 text-xs text-amber-800">
            Only this click mutates the Silpo cart. Existing cart products are preserved, and the cart is reread
            immediately after the write.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={applyProductWrite}
            className="mt-3 rounded bg-amber-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Approve and add this product
          </button>
        </section>
      )}

      {productPreview?.status === 'no_candidate' && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No new in-stock egg product was available for this bounded test. No cart mutation was created.
        </p>
      )}

      {productPreview?.status === 'cart_creation_required' && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No active cart exists. Product write was not prepared.
        </p>
      )}

      {productPreview?.status === 'timeslot_update_required' && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          The current {productPreview.deliveryType} slot is unavailable. Product write was not prepared.
        </p>
      )}

      {productResult && (
        <section
          className={`mt-5 rounded-lg border p-4 text-sm ${productResult.status === 'product_added' ? 'border-green-200 bg-green-50 text-green-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}
        >
          <h3 className="font-semibold">
            {productResult.status === 'product_added' ? 'Product write verified' : 'Product added with cart errors'}
          </h3>
          <p className="mt-2">
            {productResult.product.name} · {productResult.product.displayRatio} · cart reread found the added product.
          </p>
          <p className="mt-1 text-xs">
            Cart validations: {productResult.validations.errors} errors · {productResult.validations.warnings} warnings ·{' '}
            {productResult.validations.other} other.
          </p>
        </section>
      )}

      {replacementReport && (
        <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <h3 className="font-semibold">Replacement read-only report</h3>
          <p className="mt-2">Status: {replacementReport.status}. No cart mutation was executed.</p>
          {replacementReport.resultShape && (
            <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
              {replacementReport.resultShape.join('\n')}
            </pre>
          )}
        </section>
      )}

      {trace.length > 0 && (
        <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Safe server-side MCP trace</h3>
          <p className="mt-1 text-xs text-slate-600">
            Tool names, argument keys, status and duration only. No raw values or tokens.
          </p>
          <div className="mt-3 space-y-2">
            {trace.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-xs">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${entry.status === 'completed' ? 'bg-green-600' : 'bg-red-600'}`}
                />
                <div>
                  <p className="font-mono font-semibold text-slate-800">
                    {entry.operation} · {entry.durationMs} ms
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    {entry.requestKeys.length > 0 ? `keys: ${entry.requestKeys.join(', ')} · ` : ''}
                    {entry.resultSummary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tools && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">{tools.length} live tools returned</p>
            <button
              type="button"
              onClick={downloadSchemas}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Download schemas
            </button>
          </div>
          {tools.map((tool) => (
            <details key={tool.name} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer font-mono text-xs font-semibold text-slate-800">{tool.name}</summary>
              {tool.description && <p className="mt-2 text-xs text-slate-600">{tool.description}</p>}
              <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
              {isSilpoReadToolName(tool.name) && <ReadToolRunner tool={tool} onComplete={loadTrace} />}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function timeslotKey(slot: { start: string; end: string }): string {
  return `${slot.start}|${slot.end}`;
}

function formatTimeslotDate(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(value));
}

function formatTimeslotRange(start: string, end: string): string {
  const date = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(start));
  const time = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });
  return `${date}, ${time.format(new Date(start))}–${time.format(new Date(end))}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(price);
}

function ReadToolRunner({ tool, onComplete }: { tool: SilpoToolDefinition; onComplete: () => Promise<void> }) {
  const [argumentsText, setArgumentsText] = useState('{}');
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const args = JSON.parse(argumentsText) as unknown;
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be a JSON object');
      const response = await fetch('/api/silpo/tools/call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: tool.name, arguments: args }),
      });
      const payload = (await response.json()) as { result?: unknown; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Silpo MCP tool call failed');
      setResult(payload.result);
      await onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Silpo MCP tool call failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="text-xs font-semibold text-blue-900">Read-only spike runner</p>
      <textarea
        aria-label={`${tool.name} JSON arguments`}
        value={argumentsText}
        onChange={(event) => setArgumentsText(event.target.value)}
        rows={4}
        spellCheck={false}
        className="mt-2 w-full rounded border border-blue-200 bg-white p-2 font-mono text-xs text-slate-800"
      />
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="mt-2 rounded bg-blue-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Running…' : 'Run read-only tool'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {result !== undefined && (
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
