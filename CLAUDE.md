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

## Spec-Driven Development

1. **Specs are truth:** Every change needs a SPEC.md
2. **Change types:** Changes can be `feature`, `bugfix`, or `refactor`

- `/sdd` - Show workflow status
- `/sdd I want to create a new feature` - Start a new change
- `/sdd I want to import an external spec` - Import changes from an external spec
- `/sdd I want to continue` - Resume the current workflow
