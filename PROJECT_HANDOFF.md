# HoReCa Procurement Agent — Project Handoff

Last updated: 2026-08-29. This file is the starting point for the next coding agent.

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

Stages 0–8 are complete. Continue with **Stage 9 — MCP Spike** from section 15 of the implementation handoff plan.

Recommended Codex setting for Stage 9: **sol high**. The spike involves OAuth, discovery of live `tools/list` schemas, uncertain weighted-product semantics, and a carefully bounded real-cart mutation. Do not invent Silpo arguments or schemas.

Stage 9 requires real Silpo MCP/OAuth access. If credentials or the MCP connection are unavailable, perform safe read-only diagnostics and report the concrete blocker. Do not pretend that live connectivity was proven.

Preparation already in place: `SUPPLIER_MODE=mock` remains the default. Set `SUPPLIER_MODE=silpo` only after OAuth, together with `SILPO_MCP_URL` and `SILPO_MCP_ACCESS_TOKEN`. Until the live `tools/list` schemas are captured, this mode intentionally reports a configuration/implementation error rather than falling back to mock or pretending to contact Silpo.

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
2. Call `tools/list` and save the actual live schemas.
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
- `src/application/mock-supplier-order-service.ts` — supplier approval workflow.
- `src/application/agent-tools.ts` — protected Stage 8 tools.
- `src/application/agent-runtime.ts` — single-agent orchestration and approval apply.
- `src/infrastructure/openai-responses-agent-model.ts` — optional live Responses adapter.
- `src/components/agent/agent-launcher.tsx` — Ask Misto UI.
- `src/application/demo-runtime.ts` — shared in-memory demo composition root.

## Verification baseline

At handoff, all checks pass:

```text
npm test          → 41 tests passed in 13 files
npm run typecheck → passed
npm run lint      → passed
npm run build     → passed
npm audit         → previously reported 0 vulnerabilities; rerun after dependency changes
```

Browser QA completed:

- Wedding 180→200 form flow and Plan v2 refresh.
- Procurement explanation drawer.
- Mock salmon substitution → cart preview → cart approval → reread/verify.
- Ask Misto Wedding 180→220 → protected preview → explicit approval → Plan v2 and 485 total guests.
- Ask Misto chicken explanation through `explain_requirement`.

## Working-tree and Git notes

- The repository was initialized on branch `main` and had no commits before the handoff commit containing this file.
- The handoff commit intentionally captures the complete project baseline, specifications, source, tests, and configuration.
- No dependency or dev server process should be running after the handoff.
