# Personal Machine Actions

Run these actions only from a personal computer without corporate network restrictions. Never paste tokens, passwords, OTP codes, or generated encryption keys into chat, commits, screenshots, or issue comments.

## Required Security Cleanup

The first `horeca-procurement` Turso database and its token were created from the corporate laptop. The token appeared in a local tool log and must be treated as compromised.

```bash
turso auth login
turso db destroy horeca-procurement
```

Confirm the destructive prompt. Do not reuse that database or any token created before its deletion.

## Create Fresh OAuth Storage

From a fresh clone of this repository on the personal computer:

```bash
turso db create horeca-procurement
turso db show horeca-procurement --url
turso db tokens create horeca-procurement
openssl rand -base64 32
```

Store the three resulting values only in a local password manager or secret store:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `SILPO_OAUTH_ENCRYPTION_KEY`

Create `.env.local` on the personal computer using those values. The file is ignored by Git.

## Configure Deployment Secrets

Install and authenticate the Vercel CLI on the personal computer, link the existing project, then add the same three values for Production and Preview environments:

```bash
npm install --global vercel
vercel login
vercel link
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production
vercel env add SILPO_OAUTH_ENCRYPTION_KEY production
vercel env add TURSO_DATABASE_URL preview
vercel env add TURSO_AUTH_TOKEN preview
vercel env add SILPO_OAUTH_ENCRYPTION_KEY preview
```

Enter each value directly into the CLI prompt. Do not put values on the command line.

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
