# HoReCa Procurement Agent — IMPLEMENTATION & AGENT HANDOFF PLAN v1.0

**Status:** Ready to start repository implementation  
**Date:** 2026-08-29  
**Read first:** `HoReCa_Procurement_Agent_MASTER_SPECIFICATION_v1.0.md`

---

# 0. Purpose

This file is the execution plan for a new implementation agent joining on another computer without the previous conversation.

The product thinking is already sufficiently complete.

The next job is **implementation**, not more ideation.

The core risk now is overbuilding.

---

# 1. Current status

Already defined:
- product thesis;
- MVP boundaries;
- demo restaurant;
- 14-day dataset;
- events;
- recipes/BOM;
- restaurant baseline;
- inventory/incoming supply;
- procurement model;
- deterministic-vs-AI boundary;
- hero scenario;
- agent responsibilities;
- Silpo supplier boundary;
- application architecture;
- UI information architecture;
- implementation priorities.

Still intentionally unresolved until live integration:
- exact Silpo MCP argument/result schemas;
- exact weighted-product quantity behavior;
- final real supplier SKU mapping;
- final demo script/submission materials.

---

# 2. Definition of Demo-Ready

The build is ready when a reviewer can:

1. open Overview;
2. see restaurant operations + five events;
3. open Wedding;
4. change guest count 180→200;
5. review deterministic procurement impact;
6. approve;
7. see a new plan version;
8. open an affected procurement batch;
9. see “Why this quantity?”;
10. prepare the next supplier order;
11. use real Silpo MCP to resolve products;
12. detect unavailable preferred salmon;
13. get a replacement;
14. approve replacement;
15. approve cart write;
16. write Silpo cart;
17. reread/validate cart;
18. continue to checkout;
19. show a visible real MCP activity trace.

---

# 3. Implementation philosophy

Wrong:

```text
pretty UI
→ AI
→ MCP
→ later invent procurement logic
```

Correct:

```text
Domain/Data
→ Demand
→ Procurement
→ Wedding change
→ Product UI
→ Mock supplier
→ Agent
→ MCP
```

The whole core must remain usable without AI and without external MCP.

---

# 4. Stack

Use:

```text
Next.js App Router
TypeScript
React
Zod
Vitest
date-fns or equivalent
Tailwind
small shadcn/ui usage
AI SDK
MCP client
```

Avoid unless a real blocker appears:
- Redux;
- Zustand;
- NestJS;
- GraphQL;
- CQRS;
- event sourcing;
- message queues;
- Redis;
- vector DB;
- microservices.

---

# 5. Repository skeleton

```text
src/
├─ app/
├─ components/
├─ domain/
├─ application/
├─ engine/
├─ data/
├─ suppliers/
├─ agent/
└─ lib/

tests/
├─ engine/
├─ application/
└─ suppliers/
```

Routes:

```text
/overview
/procurement
/procurement/[batchId]
/events
/events/[eventId]
/inventory
/api/agent
/api/suppliers/silpo/*
```

Useful dev-only routes:

```text
/debug/demand
/debug/procurement
/debug/mcp
```

---

# 6. Stage 0 — Bootstrap

## Goal
Clean deterministic project foundation.

## Tasks
- create Next.js TS app;
- configure lint/typecheck/test;
- add Zod;
- add date library;
- add Tailwind/UI primitives;
- create source directories;
- implement `Clock`;
- implement `DemoClock`;
- fix business timezone.

Demo clock:

```text
2026-09-15 08:00
Europe/Kyiv
```

Suggested files:

```text
src/lib/clock.ts
src/lib/demo-clock.ts
src/lib/system-clock.ts
src/lib/dates.ts
```

## Done
- app builds;
- lint/typecheck pass;
- one test confirms demo date.

## Do not do
- AI;
- MCP;
- DB work;
- logo/design polish.

---

# 7. Stage 1 — Domain + Seed Data

## Goal
Turn Master Specification data into validated code.

Create domain files roughly:

```text
src/domain/
  business.ts
  ingredient.ts
  recipe.ts
  menu-item.ts
  event.ts
  restaurant-demand.ts
  inventory.ts
  demand.ts
  procurement.ts
  supplier.ts
  exception.ts
  approval.ts
```

Create demo data:

```text
src/data/demo/
  business.ts
  ingredients.ts
  recipes.ts
  menu-items.ts
  events.ts
  restaurant-demand.ts
  inventory.ts
  incoming-supply.ts
```

Implement:

```text
validateDemoDataset()
```

Validate:
- IDs exist;
- recipe ingredients exist;
- bundle children exist;
- units valid;
- event menu items exist;
- quantities non-negative;
- circular composition rejected.

## Done
One test loads the full demo business successfully.

---

# 8. Stage 2 — Demand Engine

## Goal
Produce full 14-day ingredient demand with provenance.

Implement:

```text
normalizeQuantity
toBaseUnit
formatQuantity

expandMenuItem
calculateEventDemand
calculateRestaurantDemand
aggregateDemand
```

Every result carries:
- ingredient;
- quantity;
- `requiredAt`;
- source/provenance.

Recommended debug screen:

```text
/debug/demand
```

Columns:

```text
requiredAt | ingredient | quantity | source
```

Critical tests:
- Premium Croissant Box expands correctly.
- Wedding 180 portions correct.
- Wedding 200 portions correct.
- PEAK factor = 1.55.
- circular bundle fails cleanly.

## Done

```text
Restaurant + five events
→ 14-day DemandRequirement[]
```

with explainable numbers.

---

# 9. Stage 3 — Procurement Core

## Goal
Turn chronological demand into dated procurement batches.

This is the highest-risk technical stage.

Implement in this order:

1. `allocateFefo`
2. confirmed incoming supply
3. ingredient timeline projection
4. safety stock target
5. shortage detection
6. procurement delivery scheduling
7. planned-supply injection
8. batch consolidation
9. `calculateProcurementPlan`

Start with a tiny one-ingredient fixture before the full dataset.

Example:

```text
stock 10 kg
day1 demand 6 kg
safety 2 kg
day2 demand 5 kg
```

Expected shortage for day2:
```text
3 kg
```

Critical tests:
- FEFO;
- incoming before `requiredAt`;
- incoming after `requiredAt`;
- safety stock not repeatedly added;
- planned procurement prevents duplicate shortage;
- planned perishables expire correctly;
- stable goods can consolidate.

## Done
Output is a chronological `ProcurementPlan`, not one 14-day shopping list.

---

# 10. Stage 4 — Plan Versioning + Hero Recalculation

## Goal
Make Wedding 180→200 a real controlled business change.

Implement application use cases:

```text
getCurrentProcurementPlan
previewEventChange
applyEventChange
diffProcurementPlans
```

Preview flow:

```text
load current state
→ calculate before
→ clone state
→ patch Wedding
→ calculate candidate
→ diff
→ store preview
```

Apply only stored/approved preview.

Hard rule:

> Never manually change procurement lines when Wedding changes.

Only direct change:

```text
event.guestCount
```

Everything else recalculates.

## Done

Automated test:

```text
Wedding 180
→ preview 200
→ approve/apply
→ Wedding 200
→ new plan version
→ deterministic diff
```

Create repository checkpoint/tag such as:

```text
core-v1
```

---

# 11. Stage 5 — Overview

## Goal
Make the product understandable before AI exists.

Build only `/overview` first.

Required sections:
- title/period;
- metric strip;
- 14-day timeline;
- restaurant load;
- events;
- procurement markers;
- upcoming batches;
- needs attention;
- demand split;
- recent changes.

Do not block this stage on final supplier cost.

Acceptance check:
a new viewer should understand the product in ~15 seconds.

## Done
The product story is visually clear without AI.

---

# 12. Stage 6 — Hero UI

## Goal
Complete the central demo without AI or MCP.

Build:
- `/events`
- `/events/wedding`
- `/procurement`
- `/procurement/[batchId]`

Wedding:
```text
180 → 200
```

CTA:
```text
Review impact
```

Impact drawer uses real preview output:
- +20 guests;
- affected ingredients;
- changed procurement lines;
- top deltas;
- cost delta if available;
- added exceptions.

Actions:
```text
Cancel
Apply changes
```

After apply:
- Wedding = 200;
- active plan increments;
- Overview = 465 guests;
- recent change recorded.

Procurement:
- batch list;
- ingredient rows;
- “Why?” drawer.

Why drawer:
- restaurant/event demand;
- current stock;
- incoming;
- safety stock;
- final purchase need.

## Done
Core hero flow feels like a real product before any AI work.

If this stage is weak, fix UX/product rather than adding AI.

---

# 13. Stage 7 — Mock Supplier

## Goal
Finish the supplier journey offline before real integration.

Implement:

```text
SupplierGateway
MockSupplierGateway
```

Suggested:

```text
src/suppliers/mock/
  mock-supplier-gateway.ts
  mock-products.ts
  mock-delivery.ts
  mock-cart.ts
```

Required fixture:
- preferred salmon unavailable;
- compatible alternative available;
- package sizes;
- prices;
- delivery slots;
- cart.

Implement:
- ingredient supplier profiles;
- known mappings;
- product resolution;
- package rounding;
- cost/surplus;
- replacement preview;
- approval;
- supplier cart preview;
- mock cart write/verify.

Optional mock exceptions:
- raspberry price spike;
- existing cart items;
- delivery conflict.

## Done
The entire demo works without network access.

Keep this fallback permanently.

---

# 14. Stage 8 — Agent Foundation

## Goal
Add AI only as an interface/orchestration layer over working use cases.

First tools only:

```text
get_event
get_procurement_plan
explain_requirement
preview_event_change
apply_event_change
```

First scenario:

```text
Increase Wedding to 220 guests.
```

Expected:

```text
get_event
→ preview_event_change
→ structured preview
→ human approval
→ apply_event_change
```

Second:

```text
Why do we need so much chicken?
```

Expected:

```text
explain_requirement
→ structured provenance
→ concise explanation
```

Rules:
- no LLM arithmetic;
- no direct mutation;
- pending action stored backend-side;
- UI form and agent share application use cases.

## Done
AI can control/explain the real application safely.

---

# 15. Stage 9 — MCP Spike

## Goal
Prove real Silpo connectivity independently before integrating the whole supplier flow.

Use `/debug/mcp` or a server script.

Order:

1. OAuth;
2. `tools/list`;
3. inspect/save actual schemas;
4. read active cart;
5. read full cart/context;
6. get/validate delivery/timeslot;
7. batch-search eggs/tomatoes/salmon;
8. add **one** test item;
9. reread cart;
10. verify result;
11. test replacements if practical.

Rules:
- do not invent schemas;
- do not modify procurement engine for Silpo payload quirks;
- fix only the supplier adapter/mappers.

## Done
Real end-to-end MCP cart interaction is proven.

---

# 16. Stage 10 — Silpo Supplier Gateway

## Goal
Replace mock supplier execution behind the same internal interface.

Create:

```text
src/suppliers/silpo/
  silpo-mcp-client.ts
  silpo-supplier-gateway.ts
  auth/
  mapper/
  trace/
```

Config:

```text
SUPPLIER_MODE=mock
SUPPLIER_MODE=silpo
```

Keep mock mode.

Roll out:
- 3–5 procurement lines;
- then 10;
- then full batch.

Internal flow:

```text
cart context
→ timeslot
→ batch product search
→ product mapping
→ replacements
→ draft
→ approval
→ cart write
→ cart reread
→ reconciliation
```

## Done
A real procurement batch becomes a real verified Silpo cart.

---

# 17. Stage 11 — Supplier Agent Flow

Add application-level agent tools:

```text
initialize_supplier
search_supplier_products
get_supplier_product_details
propose_substitution
prepare_supplier_cart
apply_supplier_cart
```

Do not expose the whole raw MCP catalog to the LLM.

Hero command:

```text
Prepare the next supplier order.
```

Expected:
```text
read plan
→ pick next batch
→ initialize supplier
→ search products
→ known mappings
→ salmon unavailable
→ replacement
→ approval
→ prepare cart
→ approval
→ apply cart
→ reread/verify
→ checkout continuation
```

## Done
Activity trace shows the full application + MCP path.

---

# 18. Stage 12 — Demo Reliability

Implement:

```text
Reset Hero Scenario
```

Reset:
- Wedding = 180;
- mutable demo state;
- plan baseline;
- previews/approvals;
- traces;
- mock supplier state.

Hidden controls may include:
- Wedding 180;
- Wedding 200;
- trigger salmon unavailable;
- trigger raspberry spike;
- clear trace.

If MCP fails:
- procurement still works;
- supplier actions show connection unavailable;
- application stays alive.

## Done
Demo can be repeated several times without hand-editing state.

---

# 19. Stage 13 — Polish

Only after M4.

Polish:
- timeline;
- typography;
- delta transitions;
- status states;
- supplier progress;
- agent/MCP activity trace;
- loading/error states;
- limited responsive fixes.

Do not waste time on:
- decorative landing page;
- food photography;
- perfect mobile;
- elaborate animations.

---

# 20. Milestones

## M1 — Calculator lives

```text
Restaurant + Events → ProcurementPlan
```

Do not start serious AI work before this.

## M2 — Product lives

```text
Wedding 180→200
→ Preview
→ Approval
→ Plan vNext
→ UI update
```

## M3 — Agent lives

```text
Natural language
→ existing application use case
→ controlled action
```

## M4 — Hackathon lives

```text
ProcurementPlan
→ real Silpo MCP
→ product resolution
→ approved cart write
→ verified cart
```

After M4, prioritize demo quality.

---

# 21. Suggested commit sequence

1. `bootstrap + domain skeleton + demo clock`
2. `demo data + validation`
3. `BOM + event + restaurant demand`
4. `FEFO + procurement chronology`
5. `procurement plan + tests`
6. `Wedding preview + plan diff`
7. `Overview`
8. `Wedding hero UI`
9. `Procurement + Why drawer`
10. `Mock supplier + replacement + cart`
11. `Agent core tools`
12. `Silpo MCP spike`
13. `Silpo adapter + real cart`
14. `trace + demo reset + polish`

---

# 22. First work session

Do **not** start with sidebar/logo.

## First ~2 hours
- repository;
- Next.js;
- tests/lint/typecheck;
- Clock/DemoClock;
- domain skeleton;
- seed structure;
- first Zod validators.

End:
```text
demo dataset validation passes
```

## Next ~2–3 hours
- recipes;
- menu items;
- events;
- recursive BOM.

End:
```text
Wedding 180 → raw ingredient demand
```

## Next ~2–3 hours
- restaurant demand;
- aggregation.

End:
```text
14-day DemandPlan
```

A successful first day ends with working demand logic, not UI polish.

---

# 23. Second work block

Focus only:

```text
demand chronology
+ inventory
+ confirmed incoming
+ safety stock
→ shortage
```

Then:
- scheduling;
- planned-supply injection;
- batches.

Only then build product UI.

---

# 24. Designer parallel track

While engine work happens, a designer can prepare only the highest-value screens:

1. Overview.
2. Wedding before change.
3. Procurement impact preview.
4. Procurement batch.
5. Salmon replacement.
6. Supplier cart ready.

Plus a small component sheet:
- metric strip;
- buttons;
- badges;
- rows;
- exception states;
- agent cards.

Do not block implementation waiting for final Figma.

---

# 25. Priority cut line

If schedule becomes tight, cut in this order:

1. Past Events.
2. Deep Inventory UX.
3. Price spike UI.
4. Expiry-risk UI.
5. Delivery-conflict UI.
6. Promotions.
7. Silpo order history.
8. Broad free-form AI.
9. Tablet/mobile polish.
10. sophisticated persistence.

Never cut:
- restaurant baseline;
- event demand;
- procurement engine;
- Wedding change;
- plan diff;
- Why/provenance;
- real MCP;
- supplier cart;
- demo video.

---

# 26. Debugging rules

## Procurement bug
Debug tests or `/debug/demand` / `/debug/procurement`, not the React screen first.

## MCP bug
Fix `SilpoMcpSupplierGateway` or mapper. Do not contaminate domain/engine with raw Silpo details.

## Agent bug
If the model calculates quantities itself, improve tool/system constraints. Do not dump the whole business state into the prompt.

---

# 27. Test plan

## Engine
- units;
- recursive BOM;
- circular guard;
- event demand;
- restaurant demand;
- FEFO;
- incoming timing;
- safety target;
- chronological scheduling;
- planned supply;
- package rounding;
- plan diff;
- Wedding 180→200.

## Application
- preview event change;
- apply event change;
- stale/expired preview rejection;
- explain requirement.

## Supplier mock
- product search;
- unavailable preferred product;
- replacement;
- package calculation;
- cart draft;
- cart application.

## End-to-end backend hero test

```text
reset
→ Plan @ Wedding 180
→ preview 200
→ approve/apply
→ Plan vNext
→ next supplier batch
→ salmon unavailable
→ replacement
→ approve
→ cart ready
```

Create this before final polish.

---

# 28. Persistence

Keep simple.

Reference data stays code:
- ingredients;
- recipes;
- menu items;
- restaurant demand.

Mutable:
- events;
- plan snapshots;
- approvals;
- accepted supplier mappings;
- traces;
- optional inventory adjustments.

Start in memory if it accelerates M1/M2.

Before live judging, add minimal persistence if necessary.

Possible:
```text
SQLite/libSQL + Drizzle
```

Do not let DB work block the central loop.

---

# 29. README during implementation

Maintain continuously.

Sections:

```text
Problem
Solution
How it works
Demo business
Architecture
Deterministic vs AI responsibilities
Silpo MCP integration
Hero demo
Setup
Environment variables
Testing
AI usage disclosure
Libraries/licenses
Known limitations
Future vision
```

---

# 30. MCP rules

1. Server-side only.
2. Token never reaches browser.
3. Run `tools/list`.
4. Use live schemas.
5. Test weighted-product quantity behavior.
6. Do not expose all MCP tools to the LLM.
7. Use supplier adapter.
8. Log summaries/durations, not secrets.
9. Reread cart after writes.
10. Keep mock mode.

Official resources:
- https://ai-factory.silpo.ua/
- https://ai-factory.silpo.ua/docs/mcp

---

# 31. Agent rules

1. One agent.
2. Tools are thin wrappers around application use cases.
3. Agent does not own arithmetic.
4. Preview before protected mutation.
5. Approval stored backend-side.
6. Page context passed to the agent.
7. Prefer structured action cards over chat prose.
8. Explain engine provenance.
9. Supplier facts come only from supplier tools.
10. Keep hero commands narrow first.

---

# 32. Remaining specification phases

Do **not** delay coding to complete these now.

After M1/M2, finish:

## Phase 10 — Demo & Submission
- exact 3–5 minute video;
- voice-over;
- demo sequence;
- judging-criteria mapping;
- architecture visual;
- MCP evidence;
- AI disclosure;
- submission checklist.

## Validation
If practical, show M2/M3 to 3–5 people familiar with HoReCa/catering and collect actual feedback.

## Eligibility
Confirm team/residency eligibility directly with organizers.

---

# 33. Immediate instruction to the next agent

If the repository is empty:

> **Start Stage 0 and Stage 1 now.**

If bootstrap already exists:

> **Implement validated domain seed data and the recursive demand engine.**

First concrete target:

```text
Wedding 180
→ correct raw ingredient demand

+

Restaurant Sep 15–28
→ regular demand

=

complete 14-day DemandPlan
```

Then move to procurement chronology.

Do not reopen product ideation unless implementation exposes a genuine contradiction.

---

# 34. Final handoff summary

The difficult conceptual work is done.

Protect this sequence:

```text
Demand
→ Procurement
→ Explainability
→ Wedding Change
→ Product UI
→ Mock Supplier
→ Agent
→ MCP
→ Demo
```

The project now needs code, not more architecture.
