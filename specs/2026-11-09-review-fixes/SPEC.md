---
title: Review Fixes
spec_type: tech
type: bugfix
status: draft
domain: Platform, Identity, Portfolio
issue: none
created: 2026-11-09
updated: 2026-11-09
sdd_version: 7.3.0
---

# Review Fixes

## Overview

An audit compared the specs with the code and found six bugs, plus three small text fixes. Each is checked against the code below, with the line it was found at. This change fixes all of them. None of them needs a backend change, and no new endpoint or field is used.

Depends on [App Foundation](../2026-10-30-app-foundation/SPEC.md) (session and 401 handling), [Binance Connection](../2026-10-30-binance-connection/SPEC.md) (the key form), [Dashboard](../2026-10-30-dashboard/SPEC.md) and [Movements and Categories](../2026-10-30-movements-categories/SPEC.md).

### What the audit found (verified on 2026-11-09)

1. **Session expiry leaves cached data.** `src/modules/shared/axios-interceptors.ts:20-25` skips `queryClient.clear()` for the session check (`GET /binance/credentials`, `isSessionCheck`) and for every URL that starts with `/auth/` (`isAuthCall`). `fetchSession` (`src/modules/shared/session.ts`) turns a 401 into `null`, and the `beforeLoad` of `src/routes/_app.tsx` and `src/routes/connect.tsx` then redirect to `/login` without clearing anything. On success, `LoginPage.tsx:34` removes only the `["session"]` query. So when a session ends through the session check, the previous user's movements, snapshots and categories stay in the cache, and a different user who logs in on the same tab can see them until each query refetches. App Foundation says: "A 401 from any call except `POST /auth/login` clears the query cache and redirects to `/login`".
2. **Wrong message for a malformed Binance key.** The backend answers 400 `invalid credentials` when either value, once trimmed, isn't 16 to 128 ASCII letters and digits (`../backend/modules/binance/credentials.go:231-260`, `CheckKeyPair` and `validKeyText`; backend spec `2026-10-29-per-user-credentials` AC6). `api-errors.ts:8` maps it to `errors.invalidKey`, which reads "Enter both the API key and the secret." even when both are filled. The form (`src/modules/binance/CredentialsForm.tsx`) checks only that each value isn't blank. Also, the secret's show/hide button is always labelled "Show secret" (`CredentialsForm.tsx:55-57`), even while the secret is visible.
3. **The search debounce undoes Clear all and chip removal.** In `src/modules/movements/MovementsPage.tsx`, `onTextChange` schedules `commitText(value)` after 300 ms (`SEARCH_DEBOUNCE_MS`). The timer is cleared only by Enter, a new keystroke or unmount. `commitText` navigates with `withText(prev, value)`, so if the user clicks Clear all or removes a chip within 300 ms of typing, the timer fires afterwards and adds `q` back to the new search.
4. **A 409 can hide a real sync failure.** `useSyncBinanceData` (`src/modules/binance/hooks.ts`) runs both syncs with `Promise.allSettled` and throws the first rejection. When the balance sync answers 409 `sync already in progress` and the movements sync fails for real (say 502 `binance request failed`), `SyncNow.tsx` shows the blue "already running" note and hides the failure.
5. **Removing the last coin leaves `asset_match`.** `withList(search, "asset", [])` (`src/modules/movements/search.ts`) deletes `asset` and keeps `asset_match=any`. `chips.ts` then shows an "Includes Convert" chip that does nothing, and `MovementFilters.tsx:107-109` shows its checkbox checked and disabled (`disabled={!search.asset}`). `parseMovementsSearch` also keeps `asset_match` from a URL that has no `asset`.
6. **A failed `GET /categories` hides or mislabels loaded data.**
   - `MovementCards.tsx:28-30`: a movement with a `category_id` whose name isn't known reads "No category".
   - `MovementsTable.tsx`: the inline select is disabled while `categories` is undefined, and since its value isn't among the options, it shows the placeholder, which is "No category" for a categorised movement. `MovementDrawer.tsx` has the same select.
   - `RecentMovements.tsx:43-44` and `SpendingCard.tsx:51-52` replace the whole section with an error when categories fail, even though the movements or totals loaded.
   - `movementFiling` (`src/modules/dashboard/movementText.ts:44-56`) shows the movement's kind for a categorised movement whose name isn't known.

### Small text fixes found by the same audit

7. **"Not a filter" test example.** Hide Balances asks for the `hasFilters` test to use a stale `show_balances` param as its example (its D22 and Tests section). `src/modules/movements/search.test.ts:198-208` uses `other_param`.
8. **Landing security point.** The Landing Page spec's "You stay in control" point says "Disabling the key in Binance also cuts access", and the spec's facts table now lists that claim. `landing.security.control.body` in `en.json` and `es.json` has only the first sentence.
9. **Fake API keys.** `scripts/fake-api.mjs` decides by the key's value (`readonly`, `trading`, `noread`) and doesn't apply the backend's 16-to-128 rule. Once the form checks that rule (item 2), those short test keys can't be submitted any more.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| R1 | **A successful login clears the whole cache** (`queryClient.clear()`), instead of removing only `["session"]` | Whatever ended the previous session, nothing from it can show after the next login. It's the one point every new session passes through |
| R2 | **A 401 on the session check removes every query except `["session"]`**, and every cached mutation, but doesn't toast or navigate | The route guards already redirect when the check returns `null`. Keeping the session query lets that `null` be cached, so `/login`'s own check doesn't send a second request. Not navigating avoids a redirect loop, and no toast on the landing page or `/login`, where a 401 is normal |
| R3 | **Only `POST /auth/login` is excluded** from the 401 rule, as App Foundation says. A 401 from `POST /auth/register` or `POST /auth/logout` now clears and redirects like any other call | A 401 on login means a wrong password, not an ended session. The other two don't answer 401 today, and if they did, the session is gone |
| R4 | **The interceptor's error handler is exported as a function** (`onResponseError`), so it can be unit tested in Node without a browser | Tests run in Node with no component or router harness (App Foundation D6) |
| R5 | **The key form checks the backend's rule before sending**: each value, once trimmed, is 16 to 128 ASCII letters and digits. Blank keeps its current "Enter the API key" message. Anything else that breaks the rule gets a specific message for that field | The user learns what's wrong without a round trip to Binance. The rule is the backend's (`validKeyText`) and only the backend can change it |
| R6 | **`errors.invalidKey` describes the rule** instead of asking for both values. The mapping in `api-errors.ts` doesn't change | With R5, the server's 400 is rare (a pasted value the client trims differently, or a body problem), but its message must still be true. The backend's `frontendErrorTexts` list (17 texts) doesn't change, since no text is added |
| R7 | **The show/hide button's label follows the state**: "Show secret" while hidden, "Hide secret" while visible | Screen readers announce the action the button does |
| R8 | **The fake API applies the backend's key rule** and decides by the key's prefix. The test keys become `readonly00000000`, `trading000000000` and `noread0000000000` (16 characters each), with any 16-character secret such as `secret0000000000` | The fake must accept what the form sends. Prefixes keep the three answers easy to pick |
| R9 | **Every navigation that `MovementsPage` makes besides the search box itself cancels the pending search**, and syncs the box with the new `q`. A change of `q` from outside (Back, Forward) also cancels it | The pending text belongs to the search the user was typing into. Once the search is replaced, it's stale |
| R10 | **A sync failure that isn't "already in progress" wins over one that is.** When both calls fail and neither is real, the 409 still shows as the info note | The user needs to know that one sync failed. The "already running" note is only news when nothing else went wrong. The check is the error text (`errors.syncInProgress`), not the status, because `binance credentials not set` is also a 409 (`../backend/modules/binance/controllers.go:139`) |
| R11 | **`asset_match` exists only with `asset`.** Any change that leaves no coin also drops `asset_match`, and the URL parser drops `asset_match` without `asset` | The flag means "also match the counter coin of a Convert", which has no meaning without a coin |
| R12 | **A failed `GET /categories` never hides loaded movements or totals.** A categorised movement whose category name isn't known shows a neutral placeholder, "Category not loaded". A compact notice with a Try again button shows once, above the list or under the section's content | Small and honest: the data that loaded shows, the unknown name isn't guessed, and one click retries. A deleted category can't be the cause: the backend clears `category_id` when a category is deleted |
| R13 | **The label cards (`LabelQueue`) and the Categories page keep their whole-section error** when categories fail | Both are for choosing or editing categories, and can't work without them |

## Requirements

### 1. Session and cache (`src/modules/shared/axios-interceptors.ts`, `src/modules/login/LoginPage.tsx`)

`axios-interceptors.ts` exports a new function and uses it:

```ts
export function onResponseError(router: AnyRouter, queryClient: QueryClient): (error: unknown) => Promise<never>
```

`axiosInterceptorsAndConfig` keeps setting `baseURL` and `withCredentials`, and calls `axios.interceptors.response.use((response) => response, onResponseError(router, queryClient))`.

The returned handler, for an error with `config.url`, `config.method` (axios lower-cases it) and `response.status`:

| Case | Cache | Toast and navigation |
|------|-------|----------------------|
| Not a 401 (any status, or no response) | unchanged | none |
| 401 on `POST /auth/login` (`method === "post" && url === "/auth/login"`) | unchanged | none |
| 401 on `GET /binance/credentials` (`SESSION_PATH`) | `queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionQuery.queryKey[0] })` and `queryClient.getMutationCache().clear()` | none |
| Any other 401, `/auth/register` and `/auth/logout` included | `queryClient.clear()` | as today: when the current pathname isn't in `PUBLIC_PATHS`, the `auth.sessionExpired` info toast (same `toastId`) and `router.navigate({ to: "/login", search: { redirect: href } })` |

In every case it returns `Promise.reject(error)`, the same error object. The `isAuthCall` check is removed. `sessionQuery` is imported from `./session` beside `SESSION_PATH` (`session.ts` doesn't import the interceptor, so there's no cycle).

`LoginPage.tsx`, the login mutation's `onSuccess`: `queryClient.removeQueries({ queryKey: sessionQuery.queryKey })` becomes `queryClient.clear()`. The toast and `router.history.push(safeRedirect(redirectTo))` stay, in that order after the clear. The `sessionQuery` import is removed if nothing else uses it.

No redirect loop: `/login`, `/register` and `/` stay public, the session-check 401 never navigates, and a 401 on `POST /auth/login` is ignored.

### 2. Binance key form (`src/modules/binance/`)

New pure module `src/modules/binance/keyFormat.ts`:

```ts
/** The backend's rule for an API key and a secret (credentials.go, validKeyText): 16 to 128 ASCII letters and digits. */
export const KEY_TEXT_MIN = 16;
export const KEY_TEXT_MAX = 128;
export function isValidKeyText(value: string): boolean
```

`isValidKeyText` trims the value, as the backend and `useSaveCredentials` do, then tests it against `/^[A-Za-z0-9]{16,128}$/`. No other characters, no Unicode letters or digits.

`CredentialsForm.tsx`:
- Validation, for each field: blank after trimming gives the existing `binance.form.keyRequired` / `secretRequired`. Otherwise, a value that fails `isValidKeyText` gives the new `binance.form.keyInvalid` / `secretInvalid`.
- The `PasswordInput`'s toggle `aria-label` is `t(showSecret ? "binance.form.hideSecret" : "binance.form.showSecret")`.
- Nothing else changes: the secret is still cleared on submit, and the server's error still shows in the alert.

### 3. Sync errors (`src/modules/binance/`)

New pure module `src/modules/binance/sync.ts`:

```ts
/** The error a pair of syncs reports: the first failure that isn't "already in progress", else the first failure, else undefined. */
export function syncFailure(results: readonly PromiseSettledResult<unknown>[]): unknown
```

"Already in progress" means `getApiErrorKey(reason) === "errors.syncInProgress"`. `useSyncBinanceData`'s `mutationFn` becomes:

```ts
const failure = syncFailure(await Promise.allSettled([...]));
if (failure !== undefined) throw failure;
```

`onSettled`, `onError` and `SyncNow.tsx` don't change. A rejection reason is never `undefined` in practice (axios rejects with an error object); the helper's doc says so.

### 4. Movements search box (`src/modules/movements/MovementsPage.tsx`)

- `go(next)` (used by the filter panel, the chips, Clear all and the empty state's Clear all) first cancels the pending search (`window.clearTimeout(timer.current)`) and sets the box to `next.q ?? ""`, then navigates as today.
- A ref `committedText` holds the `q` this page last asked for: it starts as `search.q ?? ""`, and `commitText` sets it to the value `withText` keeps (`withText({}, value).q ?? ""`) before navigating.
- A `useEffect` on `urlText` (`search.q ?? ""`) cancels the pending search when `urlText !== committedText.current`, which means `q` changed from outside the page (Back or Forward). It doesn't touch refs during render: `eslint-plugin-react-hooks` 7 flags that.
- The existing render-time block that copies `urlText` into the box stays as it is.
- Typing, Enter, and the debounce itself behave as today.

### 5. `asset_match` (`src/modules/movements/search.ts`)

- `withList(search, "asset", items)`: when the resulting list is empty, the result has neither `asset` nor `asset_match`. With other keys, and with a non-empty list, it behaves as today.
- `withoutKey(search, "asset")` also removes `asset_match`. (No caller uses it for `asset` today. This keeps the rule in one place.)
- `parseMovementsSearch` keeps `asset_match` only when `asset` survived parsing.
- `chips.ts` and `MovementFilters.tsx` need no change: removing the last coin chip uses `withList`, and so does the coin input.

### 6. Category load failure

New component `src/modules/categories/CategoriesUnavailable.tsx`:

```tsx
/** Says the category names didn't load, with a retry. Shown beside data that did load. */
export function CategoriesUnavailable({ onRetry }: { onRetry: () => void })
```

A `Group gap="sm" wrap="wrap"` with `Text size="sm" c="dimmed"` showing `categories.unavailable`, and a `Button variant="default" radius="xl" mih={44}` with `common.retry` that calls `onRetry`. It has `role="status"`.

The placeholder `movements.categoryUnknown` ("Category not loaded") is used for a movement whose `category_id` isn't null and whose name isn't in the loaded list, wherever a name would show:

| Place | Change |
|-------|--------|
| `src/modules/dashboard/movementText.ts`, `movementFiling` | When `category_id !== null` and `categoryName === undefined`, return `{ text: t("movements.categoryUnknown"), needsLabel: false }`. The other cases are unchanged |
| `MovementCards.tsx` | `filing` is the name; else `movements.categoryUnknown` when `category_id !== null`; else "Needs a label" or "No category" as today |
| `MovementsTable.tsx` | The inline select's `placeholder` is `movements.categoryUnknown` when `movement.category_id !== null`; otherwise as today. The select stays disabled while `categories` is undefined |
| `MovementDrawer.tsx` | The category select gets `placeholder={t("movements.categoryUnknown")}`. It only shows when the value isn't among the options. Still disabled while `categories` is undefined |
| `MovementsPage.tsx` | When `categories.isError`, `<CategoriesUnavailable onRetry={() => categories.refetch()} />` renders between `FilterChips` and the list |
| `RecentMovements.tsx` | The `categories.isError` branch goes. The skeleton still waits for both queries; `recent.isError` still shows `SectionError`. With rows, they render with the placeholder via `movementFiling`. When `categories.isError`, `CategoriesUnavailable` renders under the rows, or under the empty text |
| `SpendingCard.tsx` | The `categories.isError` branch goes. `nameOf` uses `movements.categoryUnknown` instead of `"—"` for an unknown name. When `categories.isError`, `CategoriesUnavailable` renders at the end of the body, under the breakdown or the empty text |

`LabelQueue.tsx` and `CategoriesPage.tsx` don't change (R13). The chips' existing `"…"` for an unknown category name stays.

### 7. Text fixes

- `src/modules/movements/search.test.ts`, the "hasFilters with a param that isn't a filter" block: the example becomes `{ show_balances: "true" }`, with the comment "A stale show_balances param from an old URL (Hide Balances D21) isn't a filter." Both assertions stay.
- `landing.security.control.body` gains a second sentence (see Translations).

### Translations

New and changed keys, in both files (`locales.test.ts` checks that the key sets match):

| Key | English | Spanish |
|-----|---------|---------|
| `binance.form.hideSecret` (new) | Hide secret | Ocultar secreto |
| `binance.form.keyInvalid` (new) | The API key is 16 to 128 letters and numbers, with no spaces or symbols. | La clave de API tiene de 16 a 128 letras y números, sin espacios ni símbolos. |
| `binance.form.secretInvalid` (new) | The secret is 16 to 128 letters and numbers, with no spaces or symbols. | El secreto tiene de 16 a 128 letras y números, sin espacios ni símbolos. |
| `errors.invalidKey` (changed) | The API key and the secret must each be 16 to 128 letters and numbers. Copy them again from Binance. | La clave de API y el secreto deben tener cada uno de 16 a 128 letras y números. Cópialos de nuevo desde Binance. |
| `movements.categoryUnknown` (new) | Category not loaded | Categoría sin cargar |
| `categories.unavailable` (new) | Category names couldn't load. | No se pudieron cargar los nombres de las categorías. |
| `landing.security.control.body` (changed) | Remove the key at any time, and syncing stops. Disabling the key in Binance also cuts access. | Quita la clave cuando quieras, y la sincronización se detiene. Si desactivas la clave en Binance, también se corta el acceso. |

### Fake API (`scripts/fake-api.mjs`)

- `PUT /binance/credentials`: the body parser that trims `api_key` and `api_secret` (around line 268-280, it returns `null` for a 400 `invalid credentials`) also returns `null` when either trimmed value isn't 16 to 128 ASCII letters and digits (`/^[A-Za-z0-9]{16,128}$/`). So it's 400 before `checkCandidateKey`, as `CheckKeyPair` is in the backend.
- `checkCandidateKey` decides by prefix: `startsWith("readonly")` is accepted, `startsWith("trading")` is 422 `key is not read-only` (with the same `permissions`), `startsWith("noread")` is 422 `key cannot read`, anything else is 422 `binance rejected the key`.
- The header comment lists the new test keys (R8) and drops the sentence that says the backend's rules aren't applied. The masking note ("a key under 16 characters shows only …") goes, since such a key can't be saved now. `MASK_MIN_LENGTH` and the masking code stay.

### Tests (unit, Vitest)

- `src/modules/shared/axios-interceptors.test.ts` (new). Mock `react-toastify` (`vi.mock("react-toastify", () => ({ toast: { info: vi.fn() } }))`). Build errors as `session.test.ts` does (`new AxiosError(..., config, null, response)`), with `config` carrying `url` and `method`. A fake router is `{ state: { location: { pathname, href } }, navigate: vi.fn() }`, cast to `AnyRouter`. Each case seeds a `QueryClient` with `["session"]` and `["movements", "list"]` data:
  - 401 on `get /movements` at `/dashboard`: both queries gone, `toast.info` called once, `navigate` called with `{ to: "/login", search: { redirect: "/dashboard" } }`.
  - 401 on `get /movements` at `/login`: cache cleared, no toast, no navigation.
  - 401 on `get /binance/credentials`: `["session"]` kept, `["movements", "list"]` gone, no toast, no navigation.
  - 401 on `post /auth/login`: both kept, no toast, no navigation.
  - 401 on `post /auth/logout` at `/settings`: cache cleared and navigation, as for any call.
  - 500 on `get /movements`, and a network error with no response: both kept, nothing called.
  - The returned promise rejects with the same error object.
- `src/modules/binance/keyFormat.test.ts` (new): 15 characters false; 16 and 128 true; 129 false; `"  " + 16 valid + "  "` true; an inner space, `-`, `_`, `ñ`, and a full-width digit `"０"` each make it false; `""` false.
- `src/modules/binance/sync.test.ts` (new), with axios errors whose `response.data` is `{ error: "sync already in progress" }` (409) and `{ error: "binance request failed" }` (502):
  - both fulfilled: `undefined`
  - first 409, second 502: the 502
  - first 502, second 409: the 502
  - both 409: the first 409
  - first 409 `binance credentials not set`, second fulfilled: that error (a 409 that isn't "in progress" counts as real)
  - a network error (no response) and a 409: the network error
- `src/modules/movements/search.test.ts`:
  - `withList({ asset: "BTC", asset_match: "any", kind: "pay" }, "asset", [])` is `{ kind: "pay" }`.
  - `withList` with one coin left keeps `asset_match`.
  - `withoutKey(..., "asset")` drops `asset_match`.
  - `parseMovementsSearch({ asset_match: "any" })` is `{}`; with `asset: "!!"` (dropped) it's `{}` too; with `asset: "btc"` it's `{ asset: "BTC", asset_match: "any" }`.
  - The `show_balances` example (item 7).
- `src/modules/movements/FilterChips.test.ts`: removing the only coin chip of `{ asset: "BTC", asset_match: "any" }` gives a `without` with neither key.
- `src/modules/dashboard/movementText.test.ts`: `movementFiling` of a movement with `category_id: 7` and no name gives "Category not loaded" (English) and `needsLabel: false`.

## Acceptance Criteria

Browser checks run against the fake API (`pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`, log in as `test@example.com` / `password`). Scenarios are set with `POST http://localhost:8099/__fake/state`, as listed at the top of `scripts/fake-api.mjs`.

**Session**
- **Given** user A is logged in and has opened the Dashboard and Movements, **when** the session ends (`{"reset": true}` drops every session) and A clicks a nav link, **then** they land on `/login?redirect=...` with the "session expired" toast, and the React Query devtools (dev build) show an empty cache.
- **Given** that `/login` page, **when** a different user B registers and logs in on the same tab, **then** B's Connect page and, after connecting, B's Dashboard and Movements show only B's data (B's account is empty), with no movement, category or balance of A at any point.
- **Given** an expired session, **when** the visitor opens `/`, `/login` or `/register`, **then** the page shows, there's no toast, and the session check is sent once.
- **Given** a wrong password, **when** the user submits the login form, **then** the "Wrong email or password." alert shows and nothing navigates.
- **Given** `pnpm test`, **then** every interceptor case listed in Tests passes.

**Key form**
- **Given** the Connect page, **when** the user submits a 15-character key, a 129-character key, or a key with `-`, **then** the key field shows "The API key is 16 to 128 letters and numbers, with no spaces or symbols." and no request is sent. The same holds for the secret, with the secret's message. Blank fields still show "Enter the API key" / "Enter the API secret".
- **Given** the key `readonly00000000` and the secret `secret0000000000`, **when** submitted, **then** the key is saved, as before.
- **Given** a server 400 `invalid credentials`, **then** the alert says the API key and secret must each be 16 to 128 letters and numbers (checked by `curl` against the fake: `PUT /binance/credentials` with a 10-character key is 400 `invalid credentials`).
- **Given** the secret field, **when** the user clicks the eye, **then** the button's accessible name changes from "Show secret" to "Hide secret", and back. Same in Spanish.

**Sync**
- **Given** one sync answers 409 `sync already in progress` and the other fails, **then** Sync shows the failure's message in red, not the blue note. Covered by `sync.test.ts`; the fake can't fail one call and not the other.
- **Given** `{"syncInProgress": true}`, **when** the user clicks Sync, **then** the blue "already running" note shows, as before.

**Movements**
- **Given** `/movements?kind=pay`, **when** the user types into the search box and clicks Clear all within 300 ms, **then** after 600 ms the URL has no `q` and the box is empty. Same for removing the Kind chip: the URL keeps no `q`. (Steps in the plan.)
- **Given** the user types "rent" and waits, **then** `q=rent` is in the URL, as before. Back restores the previous `q` and the box shows it.
- **Given** `/movements?asset=BTC&asset_match=any`, **when** the user removes the BTC chip, **then** the URL has neither `asset` nor `asset_match`, there's no "Includes Convert" chip, and the checkbox is unchecked and disabled.
- **Given** `/movements?asset_match=any`, **then** no chip shows and the URL is treated as having no filter.

**Categories**
- **Given** `{"failRoute": "GET /categories", "failStatus": 503}`, **when** the user opens the Dashboard, **then** Recent movements and This month's spending show their rows, categorised rows read "Category not loaded", and each section shows "Category names couldn't load." with Try again. The label cards keep their section error.
- **Given** the same failure on `/movements`, **then** the list shows, the notice with Try again sits above it, cards (375 px) and table rows (1440 px) of categorised movements read "Category not loaded", and the inline select is disabled.
- **Given** the failure is cleared (`{"failRoute": null}`), **when** the user clicks Try again, **then** the real names replace the placeholder everywhere and the notices go.

**Text**
- **Given** the landing page, **then** "You stay in control" has both sentences, in English and Spanish.
- **Given** `pnpm test`, **then** the `hasFilters` example is `show_balances`.

## Out of Scope

- A way to retry categories from the label cards or the Categories page (R13).
- Changing the backend's key rule, its error texts, or `frontendErrorTexts` in `../backend/routes/openapi_spec_test.go`.
- A fake API switch that fails one sync call but not the other.
- Session expiry warnings before the 24-hour cookie runs out.

## Open Questions

1. **Spanish wording.** The new Spanish strings follow the existing tone (`tú`). The user may want to adjust "Categoría sin cargar" and the two key messages.
2. **Clearing the hide-balances choice on login.** R1 clears the query cache only. The Hide Balances choice is in `localStorage` and survives logout by design (Hide Balances spec). If two people share a browser, B inherits A's choice. **Recommendation:** keep it, since it's a display preference, not data.
