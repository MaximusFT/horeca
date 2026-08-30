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

This workspace is normally opened on a corporate laptop. Never execute cloud-provider CLIs or direct cloud setup calls here, including Turso, Vercel, Silpo OAuth/MCP, or similar external services. Do not install or authenticate their CLIs on this machine.

When a cloud action is required, append an exact, non-secret command or checklist item to `PERSONAL_MACHINE_ACTIONS.md`. The project owner runs it from a personal computer and reports the result. Local coding, tests, builds, Git commits, and read-only repository inspection remain allowed. Do not place tokens, passwords, OTP codes, or generated credentials in the action file.
