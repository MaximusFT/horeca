'use client';

import { useState } from 'react';
import type { SilpoOAuthStartResult, SilpoToolDefinition } from '@/infrastructure/silpo-oauth-client';
import { isSilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

export function SilpoOAuthPanel({ oauthStatus, detail }: { oauthStatus?: string; detail?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [tools, setTools] = useState<SilpoToolDefinition[]>();

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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to list Silpo MCP tools');
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

      <div className="mt-4 flex gap-3">
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
      </div>

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
              {isSilpoReadToolName(tool.name) && <ReadToolRunner tool={tool} />}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function ReadToolRunner({ tool }: { tool: SilpoToolDefinition }) {
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
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {result !== undefined && (
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
