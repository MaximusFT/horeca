# HoReCa Procurement Agent — Project Handoff

Last updated: 2026-08-30. This file is the starting point for the next coding agent.

## Read first

The authoritative files are:

1. `HoReCa_Procurement_Agent_MASTER_SPECIFICATION_v1.0.md`
2. `HoReCa_Procurement_Agent_IMPLEMENTATION_HANDOFF_PLAN_v1.0.md`
3. `HoReCa_Procurement_Agent_UI_DIRECTION_CHANGE_REQUEST_v1.0.md`

If implementation choices conflict with the master specification, the master specification wins. Follow the locked sequence:

```text
Demand → Procurement → Explainability → Wedding Change → Product UI
→ Mock Supplier → Agent → MCP → Demo
```

## Exact continuation point

Stages 0–8 are complete. A first Stage 11-compatible mock supplier-agent vertical slice is also complete. Continue with **Stage 9 — MCP Spike** from section 15 of the implementation handoff plan.

Recommended Codex setting for Stage 9: **sol high**. The spike involves OAuth, discovery of live `tools/list` schemas, uncertain weighted-product semantics, and a carefully bounded real-cart mutation. Do not invent Silpo arguments or schemas.

Prepared in advance: `src/infrastructure/mcp-client.ts` remains a generic protocol test client. The preferred Stage 9 path uses official `@modelcontextprotocol/sdk` `Client` + `StreamableHTTPClientTransport` and a session-scoped OAuth provider in `src/infrastructure/silpo-oauth-client.ts`. A real `tools/list` capture was obtained on 2026-09-01 and committed as `silpo-tools-2026-09-01.json`: 40 unique tools, including the newer `silpo_create_shopping_cart` branch absent from the earlier 39-tool documentation.

The spike UI compiles the captured draft-07 schemas and validates arguments server-side before every call. Only allowlisted Stage 9 reads can execute through `/api/silpo/tools/call`; all seven state-changing tools remain blocked. If `silpo_get_my_shopping_cart` returns `exists=false`, do not call cart reads with a null ID: collect address/delivery/slot context and require explicit approval before `silpo_create_shopping_cart`.

Safe MCP observability is implemented at the server boundary. `/debug/mcp` shows operation name, argument keys, status, duration, and a structural result summary. It never persists token values, raw arguments, profile/address data, or cart contents. Trace uses Turso when deployment secrets are configured and process memory locally.

Because the corporate proxy blocks `*.vercel.app`, deployed MCP behavior can also be inspected through the manual GitHub Actions workflow `Inspect Silpo MCP trace`, which prints the same sanitized durable trace from Turso. The user performs OAuth and clicks from a personal browser; the coding agent inspects the server-side sequence through GitHub.

Stage 9 requires the user to complete the Silpo login/OTP flow. Durable encrypted OAuth storage is implemented through `TursoSilpoOAuthStore`: configure `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `SILPO_OAUTH_ENCRYPTION_KEY` before using OAuth across serverless instances. With no Turso env, local development intentionally falls back to process memory. If authorization or MCP connectivity is unavailable, report the concrete blocker. Do not pretend that live connectivity was proven.

Preparation already in place: `SUPPLIER_MODE=mock` remains the default. The official endpoint is fixed to `https://mcp.silpo.ua/mcp`; static token variables are legacy diagnostics only. Set `SUPPLIER_MODE=silpo` only after OAuth and live schema mapping. Until then this mode intentionally reports an implementation error rather than falling back to mock or pretending to contact Silpo.

The Stage 10 application boundary is now supplier-neutral: domain session types live in `src/domain/supplier.ts`, agent tools depend on a narrow preparer contract, UI calls `/api/suppliers/*`, and `SupplierOrderService`/`SupplierOrderFlow` are stable facades. Existing `/api/suppliers/mock/*` routes remain compatibility aliases. The live Silpo implementation should replace `SupplierGateway` without changing agent or UI contracts.

Procurement pages now show a configuration-derived supplier status without network probing: mock mode is visibly labelled as demo, while `SUPPLIER_MODE=silpo` remains “connection required” until Stage 9 proves a live session. Merely configuring legacy endpoint/token values never produces a false connected state.

## Completed implementation

### Stages 0–4 — deterministic domain and application core

- Next.js 16.3.3, React 19, TypeScript, Tailwind, Zod, Vitest.
- Fixed demo clock: 2026-09-01 08:00 Europe/Kyiv.
- Complete Misto Kitchen demo dataset.
- Recursive BOM expansion and separate restaurant/event demand provenance.
- Chronological procurement projection with FEFO, expiry, confirmed incoming timing, safety targets, dated batches, and planned-supply injection.
- Stable same-day consolidation without duplicate ingredient lines.
- Wedding preview/apply flow with Plan vNext, stored candidate plans, expiry, stale detection, and double-apply protection.

### Stages 5–6 — product UI and explainability

- Dynamic Overview, Events, Wedding, Procurement, Inventory, and batch pages.
- UI direction correction CR-01–CR-06 is complete: Overview leads with Restaurant Operations + Events & Catering → Combined Procurement; the timeline has three explicit lanes; demand sources are prominent.
- Procurement batch cards show the actual restaurant/event demand context derived from provenance.
- Wedding shows calculated portions, a persistent procurement-impact summary, and before/after purchase deltas.
- Wedding 180→200 structured preview and approval flow.
- Deterministic “Why this quantity?” drawer with demand, coverage, timing, shelf-life rationale, and supplier-enrichment state.
- Active plan, guest totals, recent changes, and procurement pages update after approval.
- The global trigger is secondary and named Procurement Agent; its initial suggestions follow the current page and expose only supported Stage 8 commands.
- Visible Reset demo control rebuilds the in-memory runtime to Wedding 180 / Plan v1.

### Procurement schedule audit

- CR-07 concluded that the 13-batch cadence is justified for the current deterministic heuristic; no engine change was retained.
- Every dated batch contains at least one ingredient with shelf life ≤7 days and active daily restaurant demand.
- Flour and sugar consolidate to one purchase each.
- Wedding salmon and chicken arrive Sep 12; tomato arrives Sep 11; all covered requirements remain within planned-lot expiry.
- `tests/engine/procurement-schedule-audit.test.ts` protects these conclusions.

### Stage 7 — mock supplier

- Typed `SupplierGateway` abstraction.
- Synthetic mock catalog covering all 38 ingredients, with profiles, queries, known product mappings, package sizes, and prices.
- Preferred salmon SKU intentionally unavailable; compatible 400 g alternative available.
- Deterministic package rounding, surplus, and cost.
- Separate human approvals for substitution and cart mutation.
- Mock delivery slot, cart preview, write, reread, and reconciliation.
- Existing unrelated cart lines are preserved.
- Supplier sessions are rejected if their source plan version becomes stale.
- Full supplier drawer is connected to Procurement batch pages.

### Stage 8 — single agent foundation

- Exactly one procurement agent with five application-level tools:
  - `get_event`
  - `get_procurement_plan`
  - `explain_requirement`
  - `preview_event_change`
  - `apply_event_change`
- Strict tool schemas; the model does not perform procurement arithmetic.
- Pending event actions are stored server-side.
- `apply_event_change` is blocked until the corresponding backend approval is explicitly approved by a human.
- Global Ask Misto drawer supports:
  - “Increase Wedding to 220 guests” → read → preview → approval → Plan v2.
  - “Why do we need so much chicken?” → deterministic provenance → concise explanation.
- Activity trace shows tool group, tool name, status, summary, and duration.
- UI forms and agent tools call the same `ProcurementPlanningService`.

### Supplier-agent groundwork

- `prepare_supplier_order` is the sixth guarded application tool and uses the same supplier-neutral `SupplierOrderService` contract as the batch UI.
- “Prepare the next supplier order” runs `get_procurement_plan → prepare_supplier_order`, returns a structured supplier session, and does not mutate the cart.
- Ask Misto renders the unavailable salmon replacement, explicit substitution approval, cart preview, explicit cart-write approval, and supplier activity trace.
- The full agent-started mock path is regression-tested through cart reread/verification; replacing the gateway with Silpo should preserve this application flow.

## Agent runtime modes and cost control

Default mode is deterministic and free:

```env
AGENT_MODE=local
```

Live OpenAI Responses API mode is explicit opt-in only:

```env
AGENT_MODE=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
```

Merely having an ambient `OPENAI_API_KEY` does not activate paid calls. Live mode uses low reasoning effort, strict custom function tools, sequential tool calls, and a maximum of six tool steps. No real OpenAI request has been executed in this workspace because no API key was configured; the Responses function-call protocol is covered with a mocked HTTP test.

Never commit `.env.local`, OAuth tokens, MCP tokens, cart identifiers containing user data, or other secrets.

## Architectural invariants

- Procurement arithmetic stays deterministic; the LLM never calculates quantities.
- The engine does not know AI, supplier products, Silpo, or raw MCP payloads.
- UI does not call MCP directly.
- The agent sees application-level tools, not the raw MCP catalog.
- Use one agent, not a multi-agent design.
- Every state-changing action requires a preview and explicit human approval.
- Supplier mutation is separate from supplier cart preview.
- Reread and reconcile cart state after every write.
- Never automatically clear an existing cart.
- Keep the mock supplier permanently as the offline fallback.
- Mutable demo state is intentionally in server memory at the current milestone.

## Stage 9 execution order

Follow the implementation handoff plan exactly:

1. Establish OAuth/connectivity.
2. `tools/list` is captured; verify the deployed connection still returns 40 unique tools.
3. Read active cart context.
4. Read the full cart/context and delivery options.
5. Batch-search eggs, tomatoes, and salmon.
6. Add only one explicitly approved test item.
7. Reread and verify the cart.
8. Test replacements if practical.

Use a dedicated `/debug/mcp` route or server-side script. The first spike should remain isolated from the deterministic engine and the production supplier adapter. Do not start Stage 10 until the real MCP interaction is proven.

## Important files

- `src/engine/calculate-procurement-plan.ts` — chronological engine.
- `src/application/procurement-planning-service.ts` — Wedding preview/apply use cases.
- `src/application/explain-procurement.ts` — deterministic provenance.
- `src/domain/supplier.ts` — supplier boundary.
- `src/infrastructure/mock-supplier-gateway.ts` — permanent offline supplier.
- `src/application/supplier-order-service.ts` — supplier-neutral approval workflow facade over `SupplierGateway`.
- `src/components/procurement/supplier-order-flow.tsx` — supplier-neutral batch execution UI facade.
- `src/application/agent-tools.ts` — protected Stage 8 tools.
- `src/application/agent-runtime.ts` — single-agent orchestration and approval apply.
- `src/infrastructure/openai-responses-agent-model.ts` — optional live Responses adapter.
- `src/infrastructure/silpo-oauth-client.ts` — official SDK OAuth coordinator and live MCP client.
- `src/infrastructure/turso-silpo-oauth-store.ts` — AES-256-GCM encrypted durable OAuth store.
- `PERSONAL_MACHINE_ACTIONS.md` — authoritative queue for all external cloud/CLI actions.
- `src/infrastructure/silpo-tool-policy.ts` — server-enforced Stage 9 read-only allowlist.
- `src/infrastructure/silpo-live-schema.ts` — Ajv validation against the captured live schemas.
- `src/infrastructure/silpo-mcp-trace.ts` — sanitized session-scoped MCP trace contract.
- `src/components/debug/silpo-oauth-panel.tsx` — OAuth, schema capture, and read-only spike UI.
- `src/components/agent/agent-launcher.tsx` — Ask Misto UI.
- `src/application/demo-runtime.ts` — shared in-memory demo composition root.

## Verification baseline

At handoff, all checks pass:

```text
npm test          → 59 tests passed in 19 files, plus 1 remote smoke test skipped locally without secrets
npm run typecheck → passed
npm run lint      → passed
npm run build     → passed
npm audit         → 0 vulnerabilities after installing `@modelcontextprotocol/sdk`
```

GitHub-hosted `Turso storage smoke test` completed successfully: Node.js connected through `@libsql/client`, created the OAuth table, performed encrypted write/read verification, confirmed no plaintext marker in storage, and removed the temporary record. The remote smoke test is intentionally skipped in local runs without secrets.

Browser QA completed:

- Wedding 180→200 form flow and Plan v2 refresh.
- Procurement explanation drawer.
- Mock salmon substitution → cart preview → cart approval → reread/verify.
- Ask Misto Wedding 180→220 → protected preview → explicit approval → Plan v2 and 485 total guests.
- Ask Misto chicken explanation through `explain_requirement`.
- Ask Misto supplier preparation → salmon replacement approval → cart preview → explicit cart apply → reread/verify.
- Tablet/mobile navigation at 850 px and 390 px; all four primary sections and Reset remain available with no page-level horizontal overflow.
- Procurement batch search (`лосось`) and expiry-risk filter; localized quantities (`кг`, `г`, `л`, `шт`).

## Working-tree and Git notes

- The repository was initialized on branch `main` and had no commits before the handoff commit containing this file.
- The handoff commit intentionally captures the complete project baseline, specifications, source, tests, and configuration.
- No dependency or dev server process should be running after the handoff.
