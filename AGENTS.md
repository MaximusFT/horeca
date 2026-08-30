<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HoReCa project handoff

Before changing this repository, read these files in order:

1. `PROJECT_HANDOFF.md` — current implementation state and exact continuation point.
2. `HoReCa_Procurement_Agent_MASTER_SPECIFICATION_v1.0.md` — authoritative product decisions.
3. `HoReCa_Procurement_Agent_IMPLEMENTATION_HANDOFF_PLAN_v1.0.md` — locked implementation sequence.

Continue from the first unfinished stage recorded in `PROJECT_HANDOFF.md`. Preserve the deterministic engine, supplier abstraction, single-agent design, backend-stored approvals, and human confirmation before every mutation.

## Corporate machine safety

This workspace is normally opened on a corporate laptop. Apply restrictions by traffic type, not by treating every cloud service as forbidden:

- Git and GitHub are allowed, including fetch, commit, push, PRs, Actions, and repository secrets.
- Turso control-plane CLI is allowed: install/auth, database lifecycle, token rotation, and configuration. Do not run local application/libSQL data-plane requests or migrations against Turso from this laptop; corporate TLS interception breaks Node/libSQL certificate validation. Use GitHub Actions for data-plane checks.
- Vercel control-plane configuration is permitted, but local `vercel login` currently fails with `fetch failed` on the corporate network. Use the `Sync Vercel environment` GitHub Actions workflow or the web dashboard instead. Do not open, fetch, or smoke-test `*.vercel.app` runtime endpoints from this laptop because they are blocked by the corporate proxy.
- Railway control-plane operations are allowed, including logs, variables, and deployments.
- Direct runtime calls to Telegram (`api.telegram.org`) and OpenAI (`api.openai.com`) are forbidden. Do not locally start workloads that call them.
- Silpo OAuth/MCP is allowed when hackathon access opens. Login/OTP must be entered by the user directly in the browser; never route credentials through the model.

Normal GitHub-triggered deployments remain part of the repository workflow. If an action truly cannot run from this laptop, append a non-secret checklist item to `PERSONAL_MACHINE_ACTIONS.md`. Never place tokens, passwords, OTP codes, or generated credentials in that file or tool output.
