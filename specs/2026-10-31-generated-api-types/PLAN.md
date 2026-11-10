---
title: Generated API Types
spec_type: plan
status: built
created: 2026-10-31
updated: 2026-10-31
sdd_version: 7.3.0
---

# Plan

## Phase 1 — Backend totals rows

- [x] Replace `TotalRow` with `AssetTotalRow`, `FeeTotalRow` and `CounterTotalRow`.
- [x] Build the internal `totalRow` once, then convert to the response type of each list.
- [x] Add `enums:"pending,completed,failed"` to `TotalsResponse.Status`.
- [x] Add `enums:"category"` to `TotalsResponse.GroupBy`.
- [x] Update the totals tests for the three row types, including the JSON round trips.
- [x] Add OpenAPI tests for the two enums and the three row schema references.
- [x] Regenerate `docs/openapi/openapi.json`.
- [x] Run `make test`.

## Phase 2 — Frontend generated types

- [x] Generate `src/modules/shared/api-schema.d.ts`.
- [x] Add `src/modules/shared/api-types.ts` with the `Schemas` and `Operations` aliases.
- [x] Derive the movements, snapshots, categories and credentials types from the schema.
- [x] Derive `MovementsQuery`, `TotalsQuery` and `SnapshotHistoryQuery` from `operations`.
- [x] Use the generated envelopes in the API functions that have one.
- [x] Ignore the generated file in ESLint.

## Phase 3 — Generation check

- [x] Add `scripts/api-schema.mjs`, with `OPENAPI_PATH` support and a clear missing-file error.
- [x] Add `api:generate`, `api:check` and `verify` to `package.json`.
- [x] Document the commands in `CLAUDE.md`.
- [x] Run `pnpm verify`.

## Verification

- Backend: `make test` passed, including `openapi-check`, the seed check and the contract tests.
- Frontend: `pnpm verify` passed; 19 test files and 183 tests. *(As of 2026-11-09, after later changes, `pnpm test` passes 227 tests in 22 files.)*
- A compile-time comparison against the old hand-written API types passed for movements, totals, snapshots, categories and credentials.
