# HoReCa Procurement Agent — UI DIRECTION CHANGE REQUEST v1.0

**Status:** Required correction before further feature expansion  
**Date:** 2026-08-29  
**Applies to:** current public draft at https://horeca-nine-alpha.vercel.app/  
**Parent source of truth:** `HoReCa_Procurement_Agent_MASTER_SPECIFICATION_v1.0.md`  
**Implementation companion:** `HoReCa_Procurement_Agent_IMPLEMENTATION_HANDOFF_PLAN_v1.0.md`

---

# 0. Purpose of this change request

The current implementation contains much of the correct underlying product model, but the UI communicates the product from the perspective of the procurement engine rather than from the perspective of a restaurant/catering operations manager.

This is causing the central product idea to become difficult to understand.

The most important concept of the product is:

```text
REGULAR RESTAURANT OPERATIONS
+
EVENTS / CATERING
        ↓
COMBINED BUSINESS DEMAND
        ↓
PROCUREMENT PLAN
        ↓
SUPPLIER EXECUTION
```

A user should understand this relationship within approximately 10–15 seconds of opening the application.

At present, the data exists, but this hierarchy is not sufficiently visible.

This change request is a **delta to the Master Specification**, not a replacement for it.

Do not restart product ideation.

Do not rewrite the deterministic engine unless a genuine calculation defect is found.

---

# 1. Problem statement

The current draft technically contains:

- restaurant demand;
- five events;
- procurement batches;
- stock/incoming supply;
- demand split;
- exceptions;
- Wedding recalculation;
- supplier-preparation entry points.

However, the current Overview emphasizes implementation outputs such as:

```text
13 procurement batches
285 dated ingredient lines
14 restaurant operating days
Plan engine ready
Deterministic demand and procurement projection
```

These are useful technical facts, but they are not the primary business story.

The desired first impression is:

> The restaurant has its normal daily operating needs. It also has extra demand from catering and events. The system combines both, reconciles them against inventory and incoming supply, and tells the manager what must be purchased and when.

That product story must become the dominant visual structure.

---

# 2. Do not change the core product model

The following product decisions remain correct:

- one restaurant/kitchen location;
- normal restaurant demand is always active;
- events/catering add additional demand;
- both use shared inventory;
- demand is resolved to ingredients;
- procurement is chronological;
- incoming supply and safety stock participate;
- Wedding 180 → 200 is the hero business change;
- deterministic engine calculates quantities;
- AI explains/orchestrates but does not own arithmetic;
- Silpo is the supplier execution layer through MCP;
- AI is secondary to the operational dashboard.

The required change is primarily **information architecture, copy and visual hierarchy**.

---

# 3. Priority P0 — Reframe the Overview around the two demand sources

## Current problem

The first metrics currently emphasize:

- confirmed event guests;
- number of procurement batches;
- number of restaurant operating days;
- attention.

The restaurant is represented mainly by:

```text
14 operating days
Daily baseline stays active
```

This does not adequately explain what “regular restaurant demand” means.

The user must see the two demand streams as first-class product concepts.

## Required new top-level structure

Replace/rework the first KPI area so the first viewport clearly contains these four concepts:

### A. Restaurant Operations

Example:

```text
RESTAURANT OPERATIONS

14 operating days
Regular daily demand active

Next peak
Saturday · ×1.55
```

### B. Events & Catering

Baseline demo:

```text
EVENTS & CATERING

5 confirmed events
445 guests

Largest
Wedding · 180 guests
```

After hero change:

```text
5 confirmed events
465 guests

Wedding · 200 guests
+20
```

### C. Combined Procurement

Example:

```text
COMBINED PROCUREMENT

13 planned deliveries
Next: Sep 1

32 ingredients in next batch
```

If supplier enrichment exists, cost may be shown here later.

### D. Attention

Example:

```text
ATTENTION

3 issues
1 supplier action
```

Use actual current data rather than hard-coded values.

## Acceptance criterion

A viewer unfamiliar with the project should be able to answer:

1. Does the restaurant itself create demand even without catering?
2. Are catering/events a separate demand stream?
3. Does the system combine them into one procurement plan?

All three answers must be obvious from the first viewport.

---

# 4. Priority P0 — Add an explicit “two sources → one plan” visual bridge

The product concept should not rely on the user inferring the architecture from numbers.

Immediately below the top summary, or integrated into it, introduce an explicit visual relationship.

Conceptual content:

```text
Restaurant Operations
Regular daily baseline
        \
         \
          COMBINED DEMAND
         /
        /
Events & Catering
5 events · 445 guests

        ↓

Procurement Plan
What to buy · how much · when
```

Do not make this look like a technical architecture diagram.

It should look like a product summary.

Possible implementation:
- two compact side-by-side source cards;
- one combined procurement bar/card below them;
- subtle connector/visual relationship.

## Copy requirement

Prefer business language:

```text
Regular restaurant demand
Events & catering demand
Combined procurement
```

Avoid engine terminology in the primary hierarchy.

---

# 5. Priority P0 — Rebuild the 14-day timeline as three explicit lanes

## Current problem

The timeline currently contains the correct information, but restaurant load, events and procurement arrivals are visually interleaved.

The viewer has to decode which piece of text represents which concept.

## Required structure

Create three clearly labelled horizontal lanes:

```text
                     SEP 1  SEP 2  SEP 3  SEP 4 ... SEP 13

RESTAURANT
OPERATIONS           Normal Normal Normal Busy  ... Busy

EVENTS &
CATERING                     Birthday    Office ... Wedding
                             20           55        180/200

PROCUREMENT
DELIVERIES            ●       ●      ●      ●   ... ●
```

Labels must remain visible on the left.

### Restaurant Operations lane

Show:
- Quiet;
- Normal;
- Busy;
- Peak;
- factor optionally as secondary text.

Example:

```text
Busy
×1.25
```

The factor is secondary; the business state is primary.

### Events & Catering lane

Show:
- event name;
- guest count;
- clickable event.

### Procurement lane

Show:
- delivery marker;
- ingredient/item count;
- status;
- click through to batch.

## Sep 13

The Wedding day should be a visually understandable demand peak:

```text
Restaurant: BUSY
Event: Wedding · 180/200
Procurement: fresh-goods preparation nearby
```

Use subtle emphasis, not alarming red styling.

## Acceptance criterion

Without reading a paragraph, the viewer can point to:
- normal restaurant load;
- event spikes;
- procurement actions.

---

# 6. Priority P0 — Move “Restaurant vs event demand” higher and rewrite it

## Current problem

The current page already contains a valid split:

```text
Mass demand
Restaurant vs Events

Volume demand
Restaurant vs Events

Unit demand
Restaurant vs Events
```

However:
- it appears too low;
- its title is technical;
- kg/L/pcs are presented before the business meaning.

This is why the central product distinction can be missed even though the calculations are already present.

## Required rename

Change:

```text
Restaurant vs event demand
```

to:

```text
Where demand comes from
```

or:

```text
Demand sources
```

## Required hierarchy

First show:

### Restaurant Operations

```text
Regular daily operations
```

### Events & Catering

```text
5 scheduled events · 445 guests
```

Then show compatible-unit details beneath each source:

```text
Mass
Restaurant 599.4 kg
Events     219.6 kg

Volume
Restaurant 84.2 L
Events      17.9 L

Units
Restaurant 2,184 pcs
Events       487 pcs
```

Do not merge incompatible units into a fake single total.

## Optional presentation

Use grouped horizontal bars or compact unit rows.

Do not use a pie chart combining kg/L/pcs.

---

# 7. Priority P0 — Remove developer/debug language from the primary UI

The current UI contains language such as:

```text
Plan engine ready
Deterministic demand and procurement projection
285 dated ingredient lines
```

These statements are useful to the implementation team but weaken the product message.

## Required changes

### Remove from main sidebar

Remove:

```text
Plan engine ready
Deterministic demand and procurement projection
```

Replace with something useful to the operations user, for example:

```text
Silpo
Supplier connection
```

or:

```text
Plan updated
2 min ago
```

If supplier is not connected yet, the sidebar can remain minimal.

### Remove from Overview KPI

Do not feature:

```text
285 dated ingredient lines
```

on the business dashboard.

It may remain in:
- debug mode;
- technical trace;
- development page.

### Procurement page

`Lines: 285` may be retained only if it proves useful, but should not be one of the strongest visual metrics.

Prefer:
- planned deliveries;
- next delivery;
- open exceptions;
- estimated procurement once supplier pricing exists.

---

# 8. Priority P0 — Chat must not define the product

## Context

The project explicitly decided:

> Dashboard first. Agent second.

The product is not another shopping chatbot.

The user reports that the current visible draft has a prominent top-right **Chat** entry/button.

If that element exists in the rendered UI, change it.

## Required terminology

Do not call the global action:

```text
Chat
```

Prefer:

```text
Procurement Agent
```

or:

```text
Ask Agent
```

`Procurement Agent` is preferred if space allows.

## Required visual priority

The agent trigger must be secondary to operational content.

Do not make it the dominant CTA on Overview.

## Contextual AI entry points

AI should become more useful through contextual actions such as:

On an ingredient:
```text
Ask about this requirement
```

On an exception:
```text
Resolve with Agent
```

On Wedding impact:
```text
Explain changes
```

On a supplier batch:
```text
Prepare supplier order
```

## Acceptance criterion

A screenshot of the Overview should still make complete sense if the Agent button is visually ignored.

---

# 9. Priority P0 — Complete Wedding as a business-impact screen

## Current problem

The Wedding page currently shows:
- current guest count;
- per-guest menu ratios;
- guest-change control;
- Review impact.

The logic is correct, but the page reads more like event configuration than a procurement-impact surface.

## Required two-column composition

### Main column

Event:
```text
Wedding
Sep 13 · 16:00
Prep starts 08:00
```

Guest count:
```text
180
```

Menu lines must show both ratio and calculated quantity.

Example baseline:

```text
Salmon Croissant
0.35 / guest
63 portions
```

After 200:

```text
0.35 / guest
70 portions
+7
```

Other expected 200-guest values:

```text
Salmon Croissant      70
Cheese Croissant      70
Ham Croissant         60

Chicken Skewer       140
Caprese Skewer        60

Caesar Salad         140
Vegetarian Salad      60

Berry Dessert Cup    200
```

Use engine-calculated values rather than hard-coding them into UI logic.

### Right-side Procurement Impact

Always visible on desktop.

Example:

```text
PROCUREMENT IMPACT

37 ingredients affected

Next fresh-goods need
Sep 12 / before prep

Largest demand drivers
Chicken
Tomato
Salmon

Supplier issues
1
```

Exact quantities come from the active plan.

Include:

```text
View full procurement
```

## Guest-change interaction

Keep:

```text
Review impact
```

Do not replace it with immediate `Save`.

Preview must happen before mutation.

---

# 10. Priority P0 — Make Wedding 180 → 200 visually causal

The hero interaction must clearly demonstrate that a business change propagates through procurement.

## Required preview

When guest count changes:

```text
180 → 200
```

show:

```text
+20 guests

X ingredients affected
Y procurement lines changed
Cost delta when supplier-enriched
New/resolved exceptions
```

Then top ingredient deltas.

Example UI structure:

```text
Chicken breast       before → after     +delta
Fresh salmon         before → after     +delta
Tomato               before → after     +delta
Raspberry            before → after     +delta
Cream cheese         before → after     +delta
```

Never hard-code invented delta numbers.

Use `PlanDiff`.

## After approval

Update:
- Wedding guest count;
- active plan version;
- Overview guest total 445 → 465;
- timeline Wedding marker;
- recent changes;
- procurement impact.

The user must see that **one business change propagated through the whole system**.

---

# 11. Priority P0 — “Why?” is a core feature, not a placeholder

## Current state

Procurement rows already include a `Why?` button.

This is correct and should be prioritized.

The current table contains cases that are difficult to interpret without provenance.

For example, a row may show:
- demand;
- stock/incoming used;
- purchase amount.

A manager must be able to understand why the final purchase number differs from simple subtraction.

## Required behavior

Clicking `Why?` opens an Ingredient Requirement drawer.

Required sections:

### Demand

```text
Restaurant operations
Event A
Event B
...
Gross demand
```

### Coverage

```text
Current stock
Confirmed incoming
Safety stock target
Planned supply where relevant
Purchase requirement
```

### Timing

Explain:
- when the ingredient is required;
- why this delivery date was selected;
- relevant shelf-life reason.

### Supplier

Once enriched:
- SKU;
- package size;
- package count;
- actual purchase quantity;
- expected surplus;
- price.

## Important

The structured explanation is produced by deterministic data.

AI can verbalize it, but the drawer must work without AI.

## Acceptance criterion

For any surprising row, the answer to:

> Why are we buying this amount?

is available in one click.

---

# 12. Priority P0 — Audit the current 13-batch / 13-day procurement schedule

## Observation

The current draft creates procurement delivery batches for almost every day from Sep 1 through Sep 13, often with approximately 20–30 ingredient lines.

This may be correct, but it needs a deliberate sanity check.

The intended product is not simply:

> generate a grocery list every day.

It should consolidate purchases when doing so is safe and operationally sensible.

## Required engineering review

Before redesigning this output, inspect the scheduler using actual provenance.

For representative ingredients answer:

### Chicken
- Why is it ordered on these specific dates?
- Is each batch caused by shelf life, safety stock or lack of future coverage?

### Salmon
- Are early purchases prevented from covering late Wedding demand because of expiry?
- Good if yes.

### Stable goods
Examples:
- flour;
- sugar;
- mustard;
- oil.

Question:
- Are they being unnecessarily reordered daily?
- Can requirements with overlapping delivery windows be consolidated?

### Fresh produce
Question:
- Does consolidation stop at reasonable freshness windows?

## Expected outcome

One of two conclusions must be documented:

### A. 13 batches are justified

If the engine can explain the schedule and it is consistent with shelf life/requiredAt, retain it but improve UI communication.

### B. Consolidation is too weak

If stable/fresh requirements are fragmented without operational reason, correct:

```text
delivery windows
consolidation
planned supply injection
```

Do **not** hide an engine problem through UI.

---

# 13. Priority P1 — Rewrite Procurement page around operations rather than engine counts

## Current page

Current emphasis includes:

```text
Batches 13
Lines 285
```

## Desired summary

Prefer:

```text
PROCUREMENT PLAN
Sep 1–14

13 planned deliveries
Next delivery: Sep 1
3 issues require attention
Supplier matching pending / connected
```

When supplier enrichment exists:

```text
Estimated purchasing
₴...
```

`285 ingredient lines` can be secondary or technical-only.

## Batch cards/list

Show business context:

```text
SEP 4

Restaurant + Office Lunch
20 ingredients

Fresh / protein / produce
Status
Issues
```

Do not display only:

```text
Delivery batch · 20 ingredients
```

Where possible show what the batch supports.

---

# 14. Priority P1 — Use business language before engine language

Replace primary copy patterns such as:

```text
required by active demand timeline
dated purchase batches generated from demand...
chronological needs
```

with simpler business wording.

Examples:

Instead of:
```text
32 ingredients · required by active demand timeline
```

Prefer:
```text
32 ingredients
Covers restaurant operations + upcoming events
```

Instead of:
```text
7 chronological needs
```

Prefer in primary table:
```text
7 upcoming requirements
```

Keep exact technical terminology in detail/debug views.

---

# 15. Priority P1 — Recent Changes should reinforce causality

Recent Changes should become a visible operational audit trail.

Baseline:

```text
Plan v1 active
Wedding planned for 180
```

After hero change:

```text
2 min ago

Wedding guest count changed
180 → 200

Procurement plan recalculated
Plan v17 → v18

14 procurement lines changed
```

Use actual diff values.

This section is useful both to users and in the demo.

---

# 16. Priority P1 — Exceptions should be actionable

Current Overview contains useful exception concepts:
- raspberry expiry risk;
- confirmed supply already counted;
- supplier matching ready.

Refine the hierarchy.

## Exceptions should answer

```text
What is wrong?
Why does it matter?
What should I do?
```

Examples:

### Raspberry expiry risk

```text
0.9 kg may expire before later demand

[View inventory]
```

### Supplier matching required

```text
Next procurement batch is calculated
32 ingredients need supplier products

[Prepare supplier order]
```

### Replacement later

```text
Preferred salmon unavailable

Replacement found

[Review replacement]
```

`Confirmed supply is already counted` may be better as an informational insight rather than an “attention” issue unless the user needs an action.

---

# 17. Priority P1 — Preserve the four-section navigation

Do not expand the primary navigation now.

Keep:

```text
Overview
Procurement
Events
Inventory
```

Do not add:
- Recipes;
- Suppliers;
- Analytics;
- Agent;
- Menu;
- Settings as primary sections.

The supplier and AI capabilities are workflows layered over procurement.

---

# 18. Priority P1 — Keep Inventory supporting, not central

Inventory should prove that procurement is not a simple shopping list.

Important statuses:

```text
Good
Low
Covered
Expiry risk
```

Especially valuable:

```text
Low current stock
but confirmed incoming covers future demand
→ Covered
```

This demonstrates real planning.

Do not turn Inventory into a warehouse-management product.

---

# 19. Priority P1 — Make agent context-sensitive

When the agent opens, it should know current page context.

Examples:

Wedding:
```text
Why did procurement increase?
Increase guests to 220
Which ingredients changed most?
```

Ingredient drawer:
```text
Explain this requirement
Can this purchase be delayed?
Which events use this ingredient?
```

Procurement batch:
```text
Prepare supplier order
Show unresolved issues
```

Do not make a generic empty “How can I help?” chat experience the main presentation.

---

# 20. Priority P2 — Technical/demo trace

Keep technical proof of the deterministic engine and MCP, but move it to a deliberate technical layer.

Example:

```text
Activity

✓ Procurement recalculated
✓ Supplier context initialized
✓ Silpo MCP batch product search
! Preferred salmon unavailable
✓ Replacements requested
✓ Cart updated
✓ Cart verified
```

Technical expansion may show tool names.

This is the correct place for technical language.

---

# 21. Page-by-page target state

## `/overview`

Must communicate:

```text
Restaurant Operations
+
Events & Catering
→ Combined Procurement
```

Required:
- four business summary blocks;
- explicit source relationship;
- three-lane timeline;
- next procurement;
- actionable exceptions;
- demand-source section moved upward;
- recent changes;
- no developer KPIs dominating the page.

## `/events`

Current event list structure is acceptable.

Improve only if needed:
- clearly label these as catering/event demand;
- retain guests/status/prep;
- Wedding marked as hero/currently changed when applicable.

## `/events/wedding`

Must add:
- calculated portions;
- persistent procurement-impact sidebar;
- real impact preview;
- visible 180 → 200 causality.

## `/procurement`

Must become operational:
- delivery context;
- what demand the batch covers;
- exceptions;
- supplier state;
- less emphasis on engine-line count.

## `/procurement/[batchId]`

Must prioritize:
- explainability;
- required vs purchase;
- stock/incoming/safety;
- timing;
- supplier matching;
- working `Why?`.

## `/inventory`

Supporting page only.
No major redesign required before P0 work.

---

# 22. Copy direction

## Preferred language

```text
Restaurant Operations
Events & Catering
Combined Procurement
Demand Sources
Upcoming Procurement
Needs Attention
Procurement Impact
Purchase Requirement
Confirmed Incoming
Safety Stock
Supplier Order
Procurement Agent
```

## Avoid as primary user-facing vocabulary

```text
engine ready
deterministic projection
dated ingredient lines
chronological projection
internal demand graph
tool calls
MCP methods
```

These remain valid technical terms in debug/demo trace.

---

# 23. Visual hierarchy rule

Every screen must answer one business question.

## Overview

> What is happening and what do I need to worry about?

## Procurement

> What do I need to buy and when?

## Event

> How does this event change demand?

## Inventory

> What do I already have and what is actually available for future demand?

## Agent

> Help me understand or execute an action already represented in the product.

Do not allow engine implementation details to become the visual hierarchy.

---

# 24. Recommended implementation order for this correction

Apply changes in this order.

## CR-01 — Overview framing

Implement:
- Restaurant Operations;
- Events & Catering;
- Combined Procurement;
- Attention.

Remove/secondary:
- 285 dated ingredient lines;
- engine-ready copy.

## CR-02 — Timeline lanes

Refactor into explicit:
- Restaurant;
- Events;
- Procurement.

## CR-03 — Demand Sources

Move higher and change business hierarchy.

## CR-04 — Agent naming/priority

If current UI has `Chat`:
- rename to Procurement Agent / Ask Agent;
- reduce prominence.

## CR-05 — Wedding impact

Add:
- calculated portions;
- impact sidebar;
- PlanDiff preview.

## CR-06 — Why drawer

Make `Why?` fully functional.

## CR-07 — Procurement scheduler sanity review

Validate why 13 daily-ish batches exist.

Fix engine only if the schedule is not justified.

## CR-08 — Procurement copy/context

Show what each batch covers.

## CR-09 — Exceptions/actionability

Turn informational engine messages into useful operational actions.

Do not begin new AI or MCP feature expansion before CR-01 through CR-06 are credible.

---

# 25. Regression rules

The correction must not break:

- existing deterministic calculations;
- 445 baseline guest total;
- 465 post-Wedding total;
- event routes;
- procurement plan calculation;
- Plan versioning;
- demo reset;
- future supplier abstraction;
- future MCP integration.

Do not replace correct engine data with manually hard-coded UI numbers just to match screenshots.

All displayed business values must come from application/domain state.

---

# 26. UX acceptance test after correction

Give the Overview to a person who has not read the specification.

After 15 seconds ask:

### Question 1
What is this product?

Expected understanding:
> Procurement/planning system for a restaurant/HoReCa business.

### Question 2
Where does demand come from?

Expected:
> Normal restaurant operations plus catering/events.

### Question 3
What does the application do with those demands?

Expected:
> Combines them with stock/incoming supply and creates dated procurement.

### Question 4
What big event is coming?

Expected:
> Wedding.

### Question 5
What needs attention?

Expected:
> An inventory/supplier/procurement issue visible on the screen.

If the user cannot answer these without explanation, the Overview is still wrong.

---

# 27. Hero-flow acceptance test

Start from reset baseline.

## Step 1

Overview:
```text
5 events
445 guests
Wedding 180
```

## Step 2

Open Wedding.

Menu displays calculated 180-guest portions.

## Step 3

Change:
```text
180 → 200
```

## Step 4

Review Impact displays real PlanDiff.

## Step 5

Approve.

## Step 6

Verify:
- Wedding = 200;
- total guests = 465;
- Wedding portions update;
- procurement plan changes;
- recent changes updates;
- relevant exception appears where appropriate.

## Step 7

Open affected ingredient.

`Why?` explains the requirement.

This flow must work before further product expansion.

---

# 28. Engineering sanity test for procurement schedule

Before considering the procurement UI “done”, choose at least:

```text
Fresh salmon
Chicken breast
Flour
Sugar
Tomato
```

For each, document:

```text
Demand dates
Existing stock
Incoming supply
Safety stock
Planned purchase dates
Shelf-life constraint
Consolidation result
```

If a purchase date cannot be explained from this data, investigate the engine.

This review is specifically required because the current draft generates 13 delivery batches across 13 days.

---

# 29. What NOT to do in response to this change request

Do not:
- redesign the entire application;
- rewrite the engine because the UI is unclear;
- create a second dashboard;
- add more navigation;
- add a prominent generic AI chat;
- add recipe CRUD;
- add supplier management;
- add analytics dashboards;
- add more demo events;
- add multi-location;
- add multi-agent architecture;
- optimize decorative polish before the business hierarchy is fixed.

The problem is currently **clarity**, not lack of features.

---

# 30. Final target product message

After this correction, the application should communicate this without explanation:

> **Misto Kitchen has normal daily restaurant demand and additional demand from catering/events. The system continuously combines both with available stock and incoming supply, calculates what must be purchased and when, explains every requirement, and then helps execute the purchase with a connected supplier.**

That is the product.

The interface should make this statement visible before the user ever opens the Procurement Agent.

---

# 31. Instruction to the coding agent

Read in this order:

1. `HoReCa_Procurement_Agent_MASTER_SPECIFICATION_v1.0.md`
2. `HoReCa_Procurement_Agent_IMPLEMENTATION_HANDOFF_PLAN_v1.0.md`
3. **this Change Request**

Then inspect the current deployed application.

Treat this document as the highest-priority UI/product-direction delta.

Do not reopen broad product ideation.

First deliver:

```text
CR-01 through CR-06
```

Then provide:
- screenshots or deployed result;
- short summary of changed files;
- any calculation/scheduler anomaly found;
- confirmation that no business values were hard-coded merely for presentation.

