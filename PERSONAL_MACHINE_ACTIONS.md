# Personal Machine Actions

Run these actions from a personal computer without corporate network restrictions. Windows does not need WSL or any local cloud CLI: use the Turso, GitHub, and Vercel web dashboards. Never paste tokens, passwords, OTP codes, or generated encryption keys into chat, commits, screenshots, or issue comments.

## Required Security Cleanup

The first `horeca-procurement` Turso database and its token were created from the corporate laptop. The token appeared in a local tool log and must be treated as compromised.

1. Open the Turso web dashboard.
2. Delete the existing `horeca-procurement` database.
3. Confirm deletion in the dashboard.

Do not reuse that database or any token created before its deletion.

## Create Fresh OAuth Storage

In the Turso web dashboard:

1. Create a database named `horeca-procurement` in an EU region.
2. Copy its libSQL URL.
3. Create a new database auth token.

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

Local `.env.local` is optional. For cloud verification, add the values directly to GitHub and Vercel through their web dashboards.

## Configure GitHub Secrets and Run the Test

Open the repository on GitHub, then go to **Settings → Secrets and variables → Actions**. Add three repository secrets:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `SILPO_OAUTH_ENCRYPTION_KEY`

Open **Actions → Turso storage smoke test → Run workflow**. The workflow runs from GitHub infrastructure, not from Windows or the corporate network. It executes the real application storage adapter and:

1. creates the OAuth table if needed;
2. writes an encrypted temporary OAuth record;
3. reads and decrypts it;
4. verifies the database row does not contain the plaintext marker;
5. deletes the temporary record even if an assertion fails.

## Configure Deployment Secrets

Open the existing project in the Vercel web dashboard. Under **Settings → Environment Variables**, add the same three values for Production and Preview:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `SILPO_OAUTH_ENCRYPTION_KEY`

Trigger a redeployment from the dashboard after saving variables. No Vercel CLI is needed.

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

## Verify Durable OAuth Storage

After deployment, open `/debug/mcp` from the personal computer. Do not start Silpo OAuth before September 1. Once access opens:

1. Select `Connect Silpo`.
2. Complete login and OTP directly in the browser.
3. Return to `/debug/mcp` and select `Load live tools`.
4. Download the live schemas.
5. Run only read-only spike tools first.

If OAuth start and callback are handled by different serverless instances without losing PKCE state, durable storage is working.
