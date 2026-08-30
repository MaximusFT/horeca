# HoReCa Procurement Agent

An AI-assisted procurement cockpit for a small restaurant and catering business. The deterministic core combines regular restaurant demand, future events, recipes, inventory, expiry, incoming stock, and safety targets into dated procurement batches. Supplier integration is an execution layer; the cart is not the product.

## Current milestone

Stage 8 is complete and the first Stage 11 vertical slice is working: one procurement agent now orchestrates six guarded application tools, including `prepare_supplier_order`. Ask Misto supports Wedding 180→220, chicken provenance, and preparation of the next supplier order. The supplier action returns a structured order card, exposes unavailable salmon, keeps substitution and cart write behind separate human clicks, and rereads/verifies the cart after mutation.

Stage 9 OAuth groundwork uses the official `@modelcontextprotocol/sdk` with Streamable HTTP, Dynamic Client Registration, PKCE, refresh-token support, and the fixed official endpoint `https://mcp.silpo.ua/mcp`. `/debug/mcp` starts OAuth only after an explicit click and can display the live `tools/list` schemas after authorization. Live Silpo connectivity has not yet been claimed or tested.

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

## Supplier modes

`SUPPLIER_MODE=mock` is the default and keeps the complete supplier flow offline. Start official Silpo OAuth explicitly from `/debug/mcp`; the MCP endpoint is fixed and tokens remain server-side. Before the Stage 9 live schema spike and gateway mapping are complete, `SUPPLIER_MODE=silpo` intentionally fails explicitly; it never falls back to mock or impersonates live MCP connectivity. OAuth storage uses process memory for local development and switches to the encrypted Turso adapter only when all required deployment secrets are configured.

When `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and a base64-encoded 32-byte `SILPO_OAUTH_ENCRYPTION_KEY` are configured, OAuth DCR information, PKCE state, discovery metadata, access tokens, and refresh tokens are stored in Turso using AES-256-GCM. With none of these variables configured, local development uses process memory. Partial durable configuration fails explicitly rather than silently storing secrets in memory.

Cloud-provider setup and CLI commands are never run from the corporate development machine. `PERSONAL_MACHINE_ACTIONS.md` is the authoritative queue for database creation, token rotation, deployment secrets, and publishing actions that the project owner executes from a personal computer.

The manual GitHub Actions workflow `.github/workflows/turso-storage-smoke.yml` verifies the real encrypted Turso adapter outside the corporate network. It requires the three repository secrets above, writes a unique temporary OAuth record, validates encrypted persistence, and removes the record in `finally`. This provides the same `Node.js → Turso` check that corporate TLS interception prevents locally, without requiring Windows WSL or a personal server.

The manual `.github/workflows/sync-vercel-environment.yml` workflow uses a browser-created `VERCEL_TOKEN` to copy those Turso secrets into the linked Vercel Production/Preview environments and deploy from a GitHub-hosted runner. This avoids both the blocked corporate Vercel endpoint and any Windows/WSL setup.

## Silpo MCP contract knowledge before authorization

The public documentation and unauthenticated well-known metadata establish:

- protected resource: `https://mcp.silpo.ua`;
- Streamable HTTP endpoint: `https://mcp.silpo.ua/mcp`;
- OAuth endpoints: `/authorize`, `/token`, `/register`;
- authorization-code + refresh-token grants, Dynamic Client Registration, PKCE S256, bearer header;
- required workflow: `silpo_get_my_shopping_cart` → `silpo_get_shopping_cart_by_id` → `silpo_get_time_slots` → `silpo_find_products_batch`;
- known workflow fields: `cartId`, `branchId`, `deliveryType`, `timeslot`, and search result identifiers `productId`, `companyId`, `branchId`;
- cart verification reads `validations[]`, totals, loyalty state, `checkoutWebLink`, and `checkoutMobileLink`;
- cart writes require a separate `silpo_add_or_update_cart_products` call and a subsequent full cart reread.

Exact input and output JSON Schemas are deliberately not copied or inferred here: the official documentation states that the current schemas are returned by authenticated `tools/list`. `/debug/mcp` captures and downloads those live schemas, and its spike runner permits only server-allowlisted read tools before the separate approved write stage.

## Development

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Hackathon requirement coverage

- **Concrete business problem:** a small HoReCa operator must reconcile restaurant consumption, catering demand, stock, incoming supply, shelf life and supplier execution.
- **Agentic workflow:** Ask Misto selects guarded application tools and performs multi-step reads, deterministic explanations, previews and supplier preparation; it is not a text-only FAQ assistant.
- **Official Silpo MCP:** the official SDK/OAuth integration and read-only spike runner are prepared. Final compliance remains pending until a live tool returned by `tools/list` is called and shown in the trace.
- **Working prototype:** the complete deterministic and mock-supplier hero path is available offline. Mock state is always labelled and is never represented as live Silpo data.
- **Integration potential:** the internal `SupplierGateway` keeps planning independent from Silpo and allows future HoReCa supplier adapters without changing procurement arithmetic.
- **Value validation:** use the interview plan below and report only observed feedback; no synthetic validation metrics should be submitted.

## Validation plan

Show the reset baseline and Wedding 180→200 flow to 3–5 restaurant, catering or kitchen managers. After a 10-minute walkthrough, capture:

1. Can the participant explain where procurement demand comes from after 15 seconds on Overview?
2. Can they find why one surprising purchase quantity exists without assistance?
3. Would the dated plan replace or reduce a spreadsheet/manual checklist step they perform today?
4. Do they trust preview-before-apply for event and supplier changes?
5. Which supplier exception would still require a phone call or manual judgment?

Record role, business type, observed task completion, direct quotes and requested changes. Do not record names or contact details in the public repository.

## AI usage disclosure

GitHub Copilot and generative AI were used for product exploration, specification drafting, implementation assistance, test generation and copy/localization support. The project owner selected the product direction, reviewed outputs, exercised the working flows and retained final editorial and engineering control. Procurement quantities, scheduling, FEFO, package rounding and plan diffs are produced by deterministic application code, not generated by an LLM. Live OpenAI mode is optional and disabled by default.

## Third-party libraries and licenses

The primary installed libraries are MIT-licensed: Next.js 16.3.3, React/React DOM 19.2.8, Zod 4.5.2, date-fns 4.4.0, date-fns-tz 3.2.0, `@modelcontextprotocol/sdk` 1.30.0, Tailwind CSS 4.3.3 and Vitest 3.2.7. Exact transitive versions are recorded in `package-lock.json`; their package metadata and license files remain authoritative.

## Known limitations

The live Silpo MCP spike and adapter are implemented in later locked stages described by the project specification. Agent conversations remain client-local, while approvals, mutable planning state, supplier sessions, and the mock cart are intentionally held in server memory at this milestone. Mock products and prices are synthetic and are labeled as such in the UI.

## Implementation assumptions

Confirmed incoming demo lines do not carry explicit expiry timestamps in the specification. The projection derives their expiry from the ingredient shelf life starting at `arrivesAt`.
