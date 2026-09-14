# Silpo Stage 9: Personal Computer Checklist

This file describes the complete manual walkthrough for the deployed Silpo MCP integration. Local Node.js, Vercel CLI, Turso CLI, and screenshot transfers are not required.

Production page:

```text
https://horeca-nine-alpha.vercel.app/debug/mcp
```

## Currently Verified State

As of September 1, 2026, the sanitized server trace has already confirmed that:

- OAuth works;
- `tools/list` returns 40 tools;
- `silpo_get_my_shopping_cart` completes successfully;
- the active cart and delivery context can be read;
- the approved timeslot mutation and mandatory reread are verified;
- batch search returns real results for `яйця`, `помідори`, and `лосось`.

## Required Walkthrough

Required scenarios:

- [x] A. OAuth and loading 40 tools.
- [x] B. Read without an active cart: `cart_creation_required`.
- [x] C. Manual creation of an active cart in the official Silpo interface.
- [x] D. Complete Stage 9 read sequence with a cart, an available slot, and product search.
- [x] E. Preview, approval, and verified write of one test product.
- [x] J. Final sanitized trace and short text report.

Run conditional scenarios only when the corresponding error occurs naturally:

- [ ] F. Unavailable timeslot.
- [ ] G. Lost OAuth session, HTTP 401.
- [ ] H. Unknown live response shape, HTTP 422.
- [ ] I. Silpo MCP or deployment error, HTTP 502.

Do not trigger F-I artificially.

## Safety Rules

1. Use a personal computer and one browser profile throughout the walkthrough.
2. Always open the production alias above. Do not switch to an individual Vercel deployment URL.
3. Sign in to the same Silpo account in which you create the cart.
4. Do not send a phone number, password, OTP, cookies, token, address, checkout URL, or raw cart JSON to the chat.
5. Do not place the order or proceed to payment.
6. Do not manually run tools whose names indicate that they create, update, clear, or delete data.
7. The **Run Stage 9 reads** button performs read-only operations.

## A. Verify OAuth

This scenario has already passed, but repeat it if the browser session is lost.

1. Open the production page.
2. Click **Connect Silpo**.
3. Complete sign-in and OTP in the browser.
4. Wait for the redirect back to the same `/debug/mcp` address.
5. Confirm the green `OAuth completed` status.

Success:

```text
OAuth completed
```

If an error appears, continue to G, H, or I below based on the HTTP status.

## B. Verify Live Tools

1. Click **Load live tools**.
2. Wait for the tool list.
3. Check the line above the list.

Success:

```text
40 live tools returned
```

Do not expose schemas or run individual tool runners unless the agent asks you to do so.

## C. Create an Active Cart

Create the cart manually in the official consumer-facing Silpo interface. This is an intentional user action, not a hidden MCP mutation.

1. Keep `/debug/mcp` open and open Silpo in another tab or in the official app.
2. Confirm that you are using the same Silpo account.
3. Select an available fulfillment method:
   - delivery to an address; or
   - store pickup.
4. If the interface requests an address, store, or branch, choose real values only inside Silpo. Do not send them to the agent.
5. Add exactly one inexpensive ordinary product to the cart. The specific product does not matter.
6. Open the cart and select the nearest available timeslot if Silpo offers this choice.
7. Verify inside Silpo that:
   - the cart exists;
   - one product appears in the cart;
   - a fulfillment method is selected;
   - an address or pickup branch is selected;
   - an available timeslot is selected if the interface requires one.
8. Do not click checkout, confirm purchase, or payment.
9. Leave the cart active and return to `/debug/mcp` in the same browser profile.

Silpo button labels may differ. The readiness criterion is an active but unsubmitted cart containing one product and an available fulfillment method.

## D. Run the Complete Stage 9 Read Sequence

1. On `/debug/mcp`, first click **Load live tools**.
2. Confirm that `40 live tools returned` is still displayed.
3. Click **Run Stage 9 reads** once.
4. Wait for the blue **Stage 9 read-only report** panel.
5. Do not click the button again while the first call is still running.

The expected successful report states:

```text
Cart context read
<delivery type> slot validated
searched яйця, помідори, лосось
<N> products returned across 3 queries
No cart mutation was executed
```

The number of products found may vary. Required success indicators:

- the report status is `complete`;
- the delivery slot was validated;
- all three product queries ran;
- the final line says `No cart mutation was executed`.

After a successful report, click **Refresh trace** once.

Expected sequence of new trace entries:

```text
silpo_get_my_shopping_cart
silpo_get_shopping_cart_by_id
silpo_get_time_slots
silpo_find_products_batch
```

All four entries must have a green dot or `completed` status.

## E. Perform One Approved Product Write

Run this step only after scenario D finishes with status `complete`.

1. Click **Prepare one-product cart preview**.
2. Check the product name, package, price, and quantity in the amber panel.
3. If the product is suitable for the test, click **Approve and add this product** once.
4. Wait for the reread result.
5. Success: a green **Product write verified** panel with `0 errors`.
6. If **Product added with cart errors** appears, do not repeat the write. Record only the error/warning/other counts.
7. Do not remove or clear other products through MCP.

## J. Send the Final Report to the Agent

A screenshot is not required. Send the following completed text:

```text
Stage 9 personal run complete
OAuth completed: yes/no
Live tools: <number>
Report status: complete/cart_creation_required/timeslot_update_required/error
Delivery type: <type shown in report, or not shown>
Product query count: <number shown, or not shown>
Returned product count: <number shown, or not shown>
Product write: verified/added_with_cart_errors/not_run
Cart validation counts: <errors/warnings/other>
Trace operations completed: <comma-separated operation names>
HTTP status: <only if an error occurred>
Error type: <only the short error name, without raw response>
```

Do not transcribe product names, address, branch ID, shopping cart ID, or any other values from a raw response.

After receiving the report, the agent will run the **Inspect Silpo MCP trace** GitHub workflow and verify the server-side sequence from the corporate computer.

## F. If `timeslot_update_required` Appears

This is a normal safe stop. Product search and mutations did not run.

1. Click **Find available slots**.
2. If an approval panel appears, select one of the displayed slots.
3. Check the local time and click **Approve and update cart timeslot**.
4. Wait for the green **Timeslot update verified** panel. The application has already reread the cart after the mutation.
5. Click **Continue Stage 9 reads**.
6. If **No available delivery slots** appears, stop and send:

```text
Report status: timeslot_update_required
Delivery type: <type>
Available slots: 0
```

Do not change the slot manually or run `silpo_update_shopping_cart` through a separate MCP runner.

## G. If HTTP 401 Appears

Cause: the deployed application did not find OAuth tokens for the current browser session.

1. Do not clear cookies between OAuth start and callback.
2. Confirm that the production alias is open, not a deployment URL.
3. Click **Connect Silpo** and complete OAuth again in the same browser profile.
4. Click **Load live tools**.
5. After `40 live tools returned`, repeat scenario D.

If 401 occurs again, send only:

```text
HTTP status: 401
Step: Connect Silpo/Load live tools/Run Stage 9 reads
Production alias used: yes
Same browser profile used: yes
```

## H. If HTTP 422 Appears

Cause: the real Silpo response shape differs from the paths currently understood by the parser.

The error should already contain safe structural diagnostics. Send only:

```text
HTTP status: 422
phase: <value>
expectedPaths: <value>
observedKeys: <value>
observedShape: <value>
```

`observedShape` contains paths and types but no values. Do not send the raw result from a separate tool runner.

Stop after this. The agent will update the parser and create a new deployment.

## I. If HTTP 502 Appears

1. Click **Refresh trace**.
2. Find the latest red entry.
3. Send only:

```text
HTTP status: 502
Operation: <tool name>
Status: failed
Result summary: <sanitized summary shown in trace>
```

Do not repeat the request more than twice in succession. The agent will inspect the GitHub trace workflow and deployment logs.

## After Successful Verification

1. Do not submit the test order.
2. You may remove the test product manually in the official Silpo UI.
3. Do not use MCP write tools for cleanup.
4. You may close the browser tab after sending the final report.

## MCP Writes That Must Not Be Run Manually

```text
silpo_create_shopping_cart
silpo_add_or_update_cart_products
silpo_remove_cart_products
silpo_clear_shopping_cart
silpo_update_shopping_cart
silpo_add_or_update_favorite_products
silpo_add_or_update_certificates
```

Each subsequent write must be implemented separately with a preview, explicit human approval, one mutation, and a mandatory cart reread.
