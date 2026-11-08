# Project: frontend

Frontend of the billetera project.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Routing:** TanStack Router (file-based, `src/routes/`; `src/routeTree.gen.ts` is generated)
- **Data fetching:** TanStack Query, axios
- **State:** Zustand
- **UI:** Mantine
- **Package manager:** pnpm

## Key Paths

| Path | Purpose |
|------|---------|
| `src/routes/` | Route definitions |
| `src/modules/` | Feature modules (dashboard, login, register, shared) |
| `specs/INDEX.md` | Spec registry |
| `sdd/sdd-settings.yaml` | SDD project settings |

## Commands

- `pnpm dev` - Start the dev server
- `pnpm build` - Type-check and build
- `pnpm lint` - Run ESLint
- `pnpm api:generate` - Regenerate `src/modules/shared/api-schema.d.ts` from `../backend/docs/openapi/openapi.json`
- `pnpm api:check` - Fail when the committed API types are stale
- `pnpm verify` - API check, lint, tests and build, for CI

`api:generate` and `api:check` read `OPENAPI_PATH` when it's set, so a pipeline can point them at another checkout, an artifact, or an http(s) URL instead of the sibling `backend` directory. They run the pinned generator through `pnpm dlx`, so they need network access the first time; `pnpm build` doesn't, because the generated file is committed.

## Deploy

The frontend is hosted on Netlify at `https://billetera.william-vegas.com`.

- Netlify builds and publishes `main` using `netlify.toml` (`pnpm build`, publish `dist`, SPA rewrite to `/index.html`).
- `VITE_BACKEND_ENDPOINT=https://api-billetera.william-vegas.com` is set in Netlify's environment variables. Without it the build fails on Netlify (`vite.config.ts` checks this).
- The site and the API must be on the same site (both under `william-vegas.com`), because of the session cookie and the backend's origin check. The backend's `CORS_ALLOWED_ORIGINS` must include `https://billetera.william-vegas.com`.
- `.github/workflows/ci.yml` runs the API type check, lint, tests and build on pushes and PRs to `main`.

HTTPS uses a custom Let's Encrypt certificate, issued on the VPS with certbot DNS-01 and uploaded to Netlify by hand. It expires on 2027-02-05, so renew it by hand before then:

1. On the VPS, `touch /root/billetera-cert/ARMED`, then run `certbot certonly --manual --preferred-challenges dns --manual-auth-hook /root/billetera-cert/dns-hook.sh --cert-name billetera.william-vegas.com -d billetera.william-vegas.com --key-type rsa --non-interactive`. It waits up to 40 minutes for the TXT record and prints nothing while it waits.
2. In a second SSH session, `cat /root/billetera-cert/challenge.txt` and add that value as a TXT record with host `_acme-challenge.billetera` in Namecheap. certbot continues on its own once the record is visible.
3. When certbot says the certificate was received, `rm /root/billetera-cert/ARMED`, so the automatic certbot timer skips this certificate instead of waiting for a record.
4. Paste `cert.pem` (Certificate), `privkey.pem` (Private key) and `chain.pem` (Intermediate chain, which holds two certificate blocks; paste both) from `/etc/letsencrypt/live/billetera.william-vegas.com/` into Netlify's custom certificate settings.
5. Delete the TXT record.

## Spec-Driven Development

1. **Specs are truth:** Every change needs a SPEC.md
2. **Change types:** Changes can be `feature`, `bugfix`, or `refactor`

- `/sdd` - Show workflow status
- `/sdd I want to create a new feature` - Start a new change
- `/sdd I want to import an external spec` - Import changes from an external spec
- `/sdd I want to continue` - Resume the current workflow

## Conventions

- Each change's `SPEC.md` and `PLAN.md` go in a flat `specs/YYYY-MM-DD-<name>/` folder. Never create the plugin's `changes/` tree, and don't run its `spec index` command. `specs/INDEX.md` and `specs/ROADMAP.md` are edited by hand.
- Never commit, including SDD checkpoint commits. Leave changes uncommitted for review; commit only when asked.
- Planning (specs, plans) goes to the `planner` agent, everything else (implementation, fixes, searches) to the `implementer` agent. Both are in `.claude/agents/`.
- The backend API contract is `../backend/README.md`.
