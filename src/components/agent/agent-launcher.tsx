'use client';

import { FormEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import type { AgentApprovalApplyResult } from '@/application/agent-runtime';
import type { AgentApprovalView, AgentToolTrace, AgentTurn } from '@/domain/agent';
import { demoIngredients } from '@/data/demo/ingredients';
import { formatQuantity } from '@/engine/units';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: AgentTurn['mode'];
  model?: string;
  trace?: AgentToolTrace[];
  approval?: AgentApprovalView;
}

const ingredientNames = new Map(demoIngredients.map((ingredient) => [ingredient.id, ingredient.name]));

export function AgentLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const pageContext = getPageContext(pathname);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'I can explain deterministic procurement facts or prepare protected changes for your approval.',
    },
  ]);

  async function submit(event?: FormEvent, suggestedMessage?: string) {
    event?.preventDefault();
    const message = (suggestedMessage ?? input).trim();
    if (!message || busy) return;
    setOpen(true);
    setInput('');
    setError(undefined);
    setBusy(true);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: message }]);
    try {
      const response = await fetch('/api/agent/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const result = (await response.json()) as AgentTurn | { error?: string };
      if (!response.ok || !('message' in result)) {
        throw new Error('error' in result && result.error ? result.error : 'Agent request failed');
      }
      setMessages((current) => [
        ...current,
        {
          id: result.id,
          role: 'assistant',
          text: result.message,
          mode: result.mode,
          model: result.model,
          trace: result.trace,
          approval: result.approval,
        },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Agent request failed');
    } finally {
      setBusy(false);
    }
  }

  async function applyApproval(approvalId: string) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/agent/approvals/${approvalId}/apply`, { method: 'POST' });
      const result = (await response.json()) as AgentApprovalApplyResult | { error?: string };
      if (!response.ok || !('approval' in result)) {
        throw new Error('error' in result && result.error ? result.error : 'Approval failed');
      }
      setMessages((current) => [
        ...current.map((message) =>
          message.approval?.id === approvalId ? { ...message, approval: result.approval } : message,
        ),
        { id: crypto.randomUUID(), role: 'assistant', text: result.message, trace: [result.trace] },
      ]);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Approval failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="flex h-10 items-center gap-2 rounded-xl border border-[#d9ded7] bg-white px-3.5 text-xs font-semibold text-[#26362c] shadow-[0_1px_1px_rgba(20,35,27,.03)]"
        type="button"
        onClick={() => setOpen(true)}
      >
        <SparkIcon />
        <span className="hidden sm:inline">Procurement agent</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-[#132019]/35 backdrop-blur-[2px]" role="presentation">
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="agent-title"
              className="absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-[#f5f6f3] shadow-[-20px_0_60px_rgba(20,35,27,.2)]"
            >
              <header className="border-b border-[#dfe3dc] bg-white px-5 py-5 md:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#193126] text-[#b8edca]">
                      <SparkIcon />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64806d]">
                        Single procurement agent
                      </p>
                      <h2 id="agent-title" className="mt-1 text-xl font-semibold text-[#223028]">
                        Ask Misto
                      </h2>
                      <p className="mt-1 text-xs text-[#7d8981]">
                        Context · {pageContext.label}. Tools read and preview; only you approve changes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close agent"
                    onClick={() => setOpen(false)}
                    className="grid size-9 place-items-center rounded-full border border-[#dde2dc] text-lg text-[#65736a]"
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-6 md:px-7" aria-live="polite">
                <div className="space-y-5">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={message.role === 'user' ? 'ml-auto max-w-[86%]' : 'max-w-[94%]'}
                    >
                      <div
                        className={
                          message.role === 'user'
                            ? 'rounded-2xl rounded-br-md bg-[#1d5d38] px-4 py-3 text-sm leading-6 text-white'
                            : 'rounded-2xl rounded-bl-md border border-[#dfe3dc] bg-white px-4 py-3 text-sm leading-6 text-[#415047]'
                        }
                      >
                        {message.text}
                      </div>
                      {message.mode && (
                        <p className="mt-1.5 px-1 text-[9px] font-semibold uppercase tracking-wide text-[#929b95]">
                          {message.mode === 'local' ? 'Local safe mode · no API cost' : `OpenAI · ${message.model}`}
                        </p>
                      )}
                      {message.approval && (
                        <EventApprovalCard approval={message.approval} busy={busy} onApply={applyApproval} />
                      )}
                      {message.trace && message.trace.length > 0 && <AgentTrace trace={message.trace} />}
                    </article>
                  ))}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-[#77837b]">
                      <span className="size-4 animate-spin rounded-full border-2 border-[#bdc9c0] border-t-[#3b7950]" />
                      Using protected application tools…
                    </div>
                  )}
                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-[#efc9bb] bg-[#fff4ef] px-4 py-3 text-sm text-[#9c5138]"
                    >
                      {error}
                    </div>
                  )}
                </div>
              </div>

              <footer className="border-t border-[#dfe3dc] bg-white p-4 md:px-6">
                {messages.length === 1 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pageContext.suggestions.map((suggestion) => (
                      <Suggestion key={suggestion} onClick={(value) => submit(undefined, value)}>
                        {suggestion}
                      </Suggestion>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={submit}
                  className="flex items-end gap-2 rounded-2xl border border-[#ccd4cd] bg-[#fafbf9] p-2 focus-within:border-[#72a281]"
                >
                  <textarea
                    aria-label="Message the procurement agent"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                    rows={1}
                    placeholder="Ask about events or procurement…"
                    className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#344138] outline-none placeholder:text-[#9ca49f]"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    aria-label="Send message"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1d5d38] text-white disabled:opacity-40"
                  >
                    →
                  </button>
                </form>
                <p className="mt-2 text-center text-[9px] text-[#9aa29d]">
                  The agent never calculates procurement quantities or writes state by itself.
                </p>
              </footer>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

function EventApprovalCard({
  approval,
  busy,
  onApply,
}: {
  approval: AgentApprovalView;
  busy: boolean;
  onApply: (id: string) => void;
}) {
  const preview = approval.preview;
  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-[#e2c49b] bg-white">
      <header className="bg-[#fff7e9] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#976326]">Human approval required</p>
          <span
            className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${approval.status === 'applied' ? 'bg-[#dff0e4] text-[#3e714d]' : 'bg-white text-[#976326]'}`}
          >
            {approval.status}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-[#4b4132]">
          Wedding · {preview.beforeGuestCount} → {preview.afterGuestCount} guests
        </p>
        <p className="mt-1 text-xs text-[#80715b]">
          {approval.status === 'applied'
            ? `Plan v${preview.candidatePlanVersion} is active; Plan v${preview.basePlanVersion} remains in history.`
            : `Candidate Plan v${preview.candidatePlanVersion}; active plan remains v${preview.basePlanVersion} until approval.`}
        </p>
      </header>
      <div className="divide-y divide-[#edf0ec]">
        {preview.diff.ingredientDeltas.slice(0, 5).map((delta) => (
          <div key={delta.ingredientId} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-[#59675e]">
              {ingredientNames.get(delta.ingredientId) ?? delta.ingredientId}
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#365542]">
              +{formatQuantity(delta.delta, delta.unit)}
            </span>
          </div>
        ))}
      </div>
      {preview.diff.ingredientDeltas.length > 5 && (
        <p className="border-t border-[#edf0ec] px-4 py-2 text-[10px] text-[#89938c]">
          + {preview.diff.ingredientDeltas.length - 5} more ingredient changes in the structured preview
        </p>
      )}
      <div className="border-t border-[#e4e8e3] p-3">
        {approval.status === 'pending' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply(approval.id)}
            className="w-full rounded-xl bg-[#1d5d38] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Approve and apply Plan v{preview.candidatePlanVersion}
          </button>
        ) : (
          <div className="rounded-xl bg-[#edf7f0] px-4 py-3 text-center text-xs font-semibold text-[#3b6e49]">
            ✓ Approved change applied
          </div>
        )}
      </div>
    </section>
  );
}

function AgentTrace({ trace }: { trace: AgentToolTrace[] }) {
  return (
    <details className="mt-2 rounded-xl border border-[#dfe3dc] bg-white">
      <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#748178]">
        Activity trace · {trace.length} {trace.length === 1 ? 'tool' : 'tools'}
      </summary>
      <div className="border-t border-[#edf0ec] px-3 py-2">
        {trace.map((item) => (
          <div key={item.id} className="flex gap-2 py-1.5">
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.status === 'completed' ? 'bg-[#4e9265]' : 'bg-[#c17658]'}`}
            />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#718078]">
                {item.group} · {item.name} · {item.durationMs} ms
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-[#7b867f]">{item.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function Suggestion({ children, onClick }: { children: string; onClick: (value: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(children)}
      className="rounded-full border border-[#d9dfd9] bg-[#f8faf7] px-3 py-1.5 text-[10px] font-semibold text-[#50705a]"
    >
      {children}
    </button>
  );
}

function getPageContext(pathname: string): { label: string; suggestions: string[] } {
  if (pathname === '/events/wedding') {
    return { label: 'Wedding', suggestions: ['Increase Wedding to 220 guests', 'Why do we need so much chicken?'] };
  }
  if (pathname.startsWith('/events')) {
    return {
      label: 'Events & catering',
      suggestions: ['Increase Wedding to 220 guests', 'Read the active procurement plan'],
    };
  }
  if (pathname.startsWith('/procurement')) {
    return {
      label: 'Procurement',
      suggestions: ['Why do we need so much chicken?', 'Read the active procurement plan'],
    };
  }
  if (pathname.startsWith('/inventory')) {
    return {
      label: 'Inventory coverage',
      suggestions: ['Why do we need so much chicken?', 'Read the active procurement plan'],
    };
  }
  return { label: 'Overview', suggestions: ['Increase Wedding to 220 guests', 'Why do we need so much chicken?'] };
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] fill-none stroke-current stroke-[1.8] text-[#317c50]"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8z" />
      <path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
    </svg>
  );
}
