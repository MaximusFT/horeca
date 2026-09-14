# Stage 9 Silpo MCP Runbook

This runbook is for verifying the deployed application from a personal computer. WSL, local Node.js, Turso CLI, and Vercel CLI are not required.

For a step-by-step walkthrough with an active cart, expected results, and a ready-to-use report template, see [PERSONAL_MACHINE_SILPO_STAGE9_CHECKLIST.md](PERSONAL_MACHINE_SILPO_STAGE9_CHECKLIST.md).

## 1. One-Time Vercel Setup

In Vercel, create an access token under **Account Settings → Tokens**. Then open the following page in GitHub:

```text
MaximusFT/horeca → Settings → Secrets and variables → Actions
```

Add the token as:

```text
VERCEL_TOKEN
```

The other GitHub secrets are already configured:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
SILPO_OAUTH_ENCRYPTION_KEY
```

Run:

```text
Actions → Sync Vercel environment → Run workflow
```

Expected result: the workflow is green. It adds the Turso secrets to Vercel Production and Preview, then performs a production deployment.

## 2. Silpo Authorization

On a personal computer, open the deployed URL with this route:

```text
/debug/mcp
```

Click **Connect Silpo** and complete sign-in in the browser. Do not send a phone number, password, OTP, cookies, access token, or refresh token to the chat or save them in a screenshot.

After the redirect back to `/debug/mcp`, expect a green OAuth status. Click **Load live tools**.

Expected result:

```text
40 live tools returned
```

The September 1 capture is already stored in `silpo-tools-2026-09-01.json`. The new fortieth tool is `silpo_create_shopping_cart`.

## 3. Automated Read-Only Verification

Click **Run Stage 9 reads**. The application performs only allowlisted reads:

```text
silpo_get_my_shopping_cart
→ silpo_get_shopping_cart_by_id
→ silpo_get_time_slots
→ silpo_find_products_batch (яйця, помідори, лосось)
```

This button does not perform any cart mutation.

### Result A: complete

Expected report:

```text
Cart context read
Delivery slot validated
Searched: яйця, помідори, лосось
3 query groups summarized
No cart mutation was executed
```

The Stage 9 read spike is complete after this result.

For the bounded write spike, click **Prepare one-product cart preview**. The application selects one new available result from the `яйця` search and shows its name, package, price, and minimum increment. An additive cart mutation runs only after you click **Approve and add this product**. The application then immediately rereads the cart and checks for the selected product and `cart.calculation.validations[]`.

Successful result:

```text
Product write verified
cart reread found the added product
0 errors
```

If **Product added with cart errors** appears, the product was written and found during the reread, but the cart contains error-level validations. Do not repeat the write. Send the agent only the counts from the panel and the sanitized trace.

### Result B: cart_creation_required

`silpo_get_my_shopping_cart` returned `exists=false`. The workflow correctly stopped before the write.

The next branch requires:

```text
silpo_find_address
→ silpo_get_available_delivery_types
→ silpo_get_time_slots
→ human approval
→ silpo_create_shopping_cart
→ silpo_get_shopping_cart_by_id
```

Do not call `silpo_create_shopping_cart` manually. Send the `cart_creation_required` status to the agent; a separate preview/approval panel must be implemented for it.

### Result C: timeslot_update_required

The current cart timeslot is missing from the available `slots[]` or has `available=false`. The workflow correctly stopped before product search.

Click **Find available slots**. If Silpo returns options, select one in the approval panel and click **Approve and update cart timeslot**. The application performs exactly one `silpo_update_shopping_cart`, immediately rereads the cart, and verifies the selected slot. Then click **Continue Stage 9 reads**.

If **No available delivery slots** appears, no mutation was performed. Silpo did not offer a safe option for this branch and delivery type; stop until a separate preview/approval flow for changing the fulfillment method is available.

## 4. Manual Schema-Driven Diagnostics

Each permitted read tool has a **Read-only spike runner** section. Enter arguments as a JSON object; they are validated against the captured JSON Schema before the MCP call.

The initial call requires no arguments:

```json
{}
```

for:

```text
silpo_get_my_shopping_cart
```

Take subsequent arguments only from the preceding response. Do not invent a UUID, slug, branchId, deliveryType, or timeslot.

## 5. What Chrome DevTools Shows

Chrome Network shows browser → Next.js requests:

```text
POST /api/silpo/oauth/start
GET  /api/silpo/oauth/callback
GET  /api/silpo/tools
POST /api/silpo/stage9/read
POST /api/silpo/tools/call
GET  /api/silpo/trace
```

Internal server → `mcp.silpo.ua` requests are not visible in Chrome. The **Safe server-side MCP trace** section on `/debug/mcp` shows them.

The trace contains only:

- operation name;
- argument-key names;
- completed/failed;
- duration;
- structural result summary.

The trace does not contain tokens, raw arguments, addresses, phone numbers, profiles, or cart contents.

## 6. Verify the Trace from the Corporate Laptop

After completing the actions on the personal computer, tell the agent that the sequence is complete. The agent runs:

```text
Actions → Inspect Silpo MCP trace
```

or the GitHub CLI workflow with the same name. This verifies the server-side MCP sequence without opening the blocked Vercel runtime.

## 7. Troubleshooting

### OAuth start: 502

Check that:

1. `Sync Vercel environment` completed successfully.
2. All three Turso environment variables exist in Vercel.
3. The deployment ran after the environment variables were added.
4. The OAuth callback URL uses the same deployed host.

### OAuth callback: invalid_callback

Possible causes:

- the callback opened in a different browser or profile;
- the HttpOnly session cookie was lost;
- OAuth started on one deployment host, but the callback arrived at another;
- the callback was opened again after completion.

Restart **Connect Silpo** in one browser profile.

### Load live tools: 401

OAuth tokens are missing for the current session cookie. Repeat **Connect Silpo**.

### Stage 9 reads: 422

The live response does not match the documented path. Send the agent only:

```text
phase
expectedPaths
observedKeys
observedShape
```

`observedShape` contains only JSON paths and types, without values. Do not send the raw response.

### Stage 9 reads: 502

Click **Refresh trace** and send the operation, status, and result summary to the agent. Also run **Inspect Silpo MCP trace**.

### GitHub Turso smoke failed

Open the failed **Run remote encrypted-storage smoke test** step. Do not copy secret values. Report only the exception type and message.

## 8. Safe Artifacts

You may send the agent:

- a status or report screenshot without personal data;
- the number of tools;
- tool names and input schemas;
- the Stage 9 report;
- the sanitized trace;
- parser diagnostics: `phase/expectedPaths/observedKeys`;
- the HTTP status and error type.

Do not send:

- OTP, password, or phone number;
- access or refresh tokens;
- cookies;
- raw profile or address responses;
- the complete cart response;
- checkout links from a personal cart.

## 9. Write Gate

The following tools remain forbidden until each has a dedicated implementation and verification:

```text
silpo_create_shopping_cart
silpo_remove_cart_products
silpo_clear_shopping_cart
silpo_add_or_update_favorite_products
silpo_add_or_update_certificates
```

`silpo_update_shopping_cart` and `silpo_add_or_update_cart_products` are permitted only through dedicated server-stored preview/approval flows. The generic read-only runner continues to block them. The product flow adds exactly one explicitly approved test product, then must reread the cart and check `validations[]`.
