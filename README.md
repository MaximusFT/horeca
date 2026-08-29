# HoReCa Procurement Agent

An AI-assisted procurement cockpit for a small restaurant and catering business. The deterministic core combines regular restaurant demand, future events, recipes, inventory, expiry, incoming stock, and safety targets into dated procurement batches. Supplier integration is an execution layer; the cart is not the product.

## Current milestone

Stage 8 complete: one procurement agent now orchestrates five guarded application tools for event reads, procurement reads, deterministic explanations, event-change previews, and approved mutations. The global Ask Misto drawer supports the Wedding 180→220 scenario and chicken provenance while keeping pending actions backend-side. Supplier execution from Stage 7 remains available offline.

Debug views:

- `/debug/demand` — chronological demand and provenance
- `/debug/procurement` — calculated procurement batches and their triggering needs
- `/debug/hero` — Wedding 180→200 candidate plan diff

Product routes:

- `/overview` — active 14-day procurement cockpit
- `/events` and `/events/wedding` — event list and controlled guest-change flow
- `/procurement` and `/procurement/[batchId]` — dated batches, quantity explanations, and the complete offline supplier flow

## Demo business

- Misto Kitchen, one shared kitchen and approximately 55 seats
- Planning horizon: 1–14 September 2026
- Business timezone: Europe/Kyiv
- Five confirmed events and 445 baseline guests
- Hero change: Wedding from 180 to 200 guests

## Architecture

```text
React UI
  → Application use cases
    → Deterministic procurement engine
    → Planning repository
    → Supplier gateway → Silpo MCP
```

Arithmetic, BOM expansion, chronology, FEFO, safety stock, package rounding, plan diffs, and provenance belong to deterministic code. AI is limited to language understanding, explanation, and controlled orchestration over application use cases.

## Agent modes

The default `local` mode is deterministic, offline, and incurs no API cost. It exercises the same protected application tools as the live agent for the two Stage 8 scenarios.

To opt into the OpenAI Responses API, copy `.env.example` to `.env.local`, set `AGENT_MODE=openai`, add a server-side `OPENAI_API_KEY`, and optionally select `OPENAI_MODEL`. The configured default is `gpt-5.4-mini` with low reasoning effort and a six-tool-step ceiling. The API key is never sent to the browser.

## Development

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Known limitations

The live Silpo MCP spike and adapter are implemented in later locked stages described by the project specification. Agent conversations remain client-local, while approvals, mutable planning state, supplier sessions, and the mock cart are intentionally held in server memory at this milestone. Mock products and prices are synthetic and are labeled as such in the UI.

## Implementation assumptions

Confirmed incoming demo lines do not carry explicit expiry timestamps in the specification. The projection derives their expiry from the ingredient shelf life starting at `arrivesAt`.
