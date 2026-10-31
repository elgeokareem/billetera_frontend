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
- `pnpm verify` - API check, lint, tests and build, for CI and deploy pipelines

`api:generate` and `api:check` read `OPENAPI_PATH` when it's set, so a pipeline can point them at another checkout, an artifact, or an http(s) URL instead of the sibling `backend` directory. They run the pinned generator through `pnpm dlx`, so they need network access the first time; `pnpm build` doesn't, because the generated file is committed.

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
