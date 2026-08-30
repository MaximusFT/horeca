# Personal Machine Actions

This file contains only actions that require access to blocked runtime endpoints from a personal computer. Turso control-plane setup, GitHub, Vercel configuration, and Railway control-plane operations are allowed on the corporate laptop. Never paste tokens, passwords, OTP codes, or generated encryption keys into chat, commits, screenshots, issue comments, or tool output.

## Turso Token Rotation

The `horeca-procurement` database is retained. It was empty, and no credential was committed to GitHub. An initial database token appeared only in a local Copilot tool log. Turso invalidates tokens at the shared `default` group level, which would also break `mft-agents-dev`, `mft-agents-prod`, and `todo-tg`; do not run group-wide invalidation. The project owner accepts the low residual risk of leaving that initial token valid.

Current outcome:

1. Keep the existing `horeca-procurement` database.
2. Keep the shared group keys unchanged so neighboring projects continue working.
3. A fresh database token has been created for the HoReCa GitHub smoke test.

Generate a 32-byte encryption key without WSL. In Windows PowerShell:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Store the three resulting values only in a local password manager or secret store:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `SILPO_OAUTH_ENCRYPTION_KEY`

Do not store the fresh token in `.env.local` on the corporate laptop. Pipe values directly from CLI output into GitHub/Vercel secret commands without printing them.

## Configure GitHub Secrets and Run the Test

Open the repository on GitHub, then go to **Settings → Secrets and variables → Actions**. Add three repository secrets:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `SILPO_OAUTH_ENCRYPTION_KEY`

Status: all three GitHub Actions secrets are configured by the agent through the allowed Turso/GitHub control planes; values were piped through stdin and not written to project files.

Open **Actions → Turso storage smoke test → Run workflow**. The workflow runs from GitHub infrastructure, not from Windows or the corporate network. It executes the real application storage adapter and:

1. creates the OAuth table if needed;
2. writes an encrypted temporary OAuth record;
3. reads and decrypts it;
4. verifies the database row does not contain the plaintext marker;
5. deletes the temporary record even if an assertion fails.

Status: the workflow completed successfully on GitHub. Node.js connected to Turso, performed the encrypted round trip, and removed the temporary record.

## Configure Deployment Secrets

Local `vercel login` currently fails with `fetch failed` on the corporate network. Use the GitHub-hosted workflow instead:

1. In the Vercel web dashboard, open **Account Settings → Tokens** and create a token scoped to the `maximusfts-projects` team.
2. In GitHub, open **Settings → Secrets and variables → Actions** and add it as `VERCEL_TOKEN`.
3. Open **Actions → Sync Vercel environment → Run workflow**.

The workflow links `maximusfts-projects/horeca`, copies the existing Turso secrets into Vercel Production and Preview environments, and creates a production deployment. Do not open or fetch the deployed `*.vercel.app` URL from the corporate laptop.

## Git Publishing

Normal GitHub operations are allowed from the corporate machine. Publish committed work normally:

```bash
git push origin main
```

Do not use Vercel CLI/API from the corporate machine. The existing GitHub integration may deploy the pushed commit automatically.

An offline backup bundle may still be transferred to the personal computer if GitHub is temporarily unavailable:

```bash
git fetch /path/to/horeca-personal.bundle main:refs/remotes/personal-handoff/main
git cherry-pick origin/main..personal-handoff/main
git push origin main
```

If `origin/main` advanced before this action, run `git fetch origin`, rebase or cherry-pick onto the current base, execute the full quality gate, then push.

## Personal-Computer Runtime Verification

After deployment, open the blocked Vercel runtime URL from a personal computer. Do not start Silpo OAuth before September 1. Once access opens:

1. Select `Connect Silpo`.
2. Complete login and OTP directly in the browser.
3. Return to `/debug/mcp` and select `Load live tools`.
4. Download the live schemas.
5. Run only read-only spike tools first.

If OAuth start and callback are handled by different serverless instances without losing PKCE state, durable storage is working.
