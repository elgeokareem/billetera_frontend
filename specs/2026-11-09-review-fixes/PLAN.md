---
title: "Implementation Plan: Review Fixes"
change: review-fixes-1
type: bugfix
spec: ./SPEC.md
issue: none
created: 2026-11-09
sdd_version: 7.3.0
---

# Implementation Plan: Review Fixes

**Spec:** [SPEC.md](./SPEC.md). The spec has the exact behaviour, the signatures, the translation strings and the test cases. This plan says what to do in which order and how to check it. Read the spec section a step names before writing it.

Rules for every phase:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file.
- Edit only the files a phase lists. If another file needs to change, stop and say so in the report.
- Don't touch `specs/`, `specs/INDEX.md` or `specs/ROADMAP.md`; the main session updates them.
- No new dependency. `pnpm-lock.yaml` must not change. `src/routeTree.gen.ts` must not change (running the dev server can rewrite it; revert anything you didn't mean).
- Before reporting a phase done, run `pnpm lint`, `pnpm test` and `pnpm build`, and paste the last lines of each. Report `git diff --stat` for the phase. Keep each phase under about 400 changed lines and 15 files.
- Phases are independent and can run in any order, but run them one at a time, in this order unless told otherwise.

Browser checks use the repo's fake API:
1. `pnpm fake-api` (serves `http://localhost:8099`).
2. In another terminal, `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev` (serves `http://localhost:5173`).
3. Log in as `test@example.com` / `password`. Connect with the key and secret named in the comment at the top of `scripts/fake-api.mjs` (after Phase 2, `readonly00000000` and `secret0000000000`; before it, `readonly` and any secret).
4. Change scenarios with, for example, `curl -s -X POST http://localhost:8099/__fake/state -H 'content-type: application/json' -d '{"failRoute": "GET /categories", "failStatus": 503}'`. `curl -s http://localhost:8099/__fake/state` shows the flags. `{"reset": true}` restores the start state and ends every session.

Report each browser check as pass, fail or not verified.

## Phase 1: Session and cache

Spec: Requirements 1, and the interceptor tests.

Steps:
1. In `src/modules/shared/axios-interceptors.ts`:
   - Import `sessionQuery` with `SESSION_PATH` from `./session`.
   - Add `export function onResponseError(router: AnyRouter, queryClient: QueryClient)`, returning `(error: unknown) => Promise<never>`. Read `config` and `response` through `axios.isAxiosError(error)`; a non-axios error goes straight to `Promise.reject(error)`.
   - Implement the four rows of the spec's table, in this order: not a 401 → reject; `post` + `/auth/login` → reject; `get` + `SESSION_PATH` → `removeQueries` with the predicate that keeps `["session"]`, `getMutationCache().clear()`, reject; otherwise → `queryClient.clear()`, the existing toast and navigation code (unchanged, including `PUBLIC_PATHS` and `SESSION_EXPIRED_TOAST`), reject.
   - Delete `isAuthCall`.
   - `axiosInterceptorsAndConfig` calls `axios.interceptors.response.use((response) => response, onResponseError(router, queryClient))`.
   - Update the doc comments to say which 401s do what, and why the session check doesn't navigate (the route guards do).
2. In `src/modules/login/LoginPage.tsx`, in the mutation's `onSuccess`, replace `queryClient.removeQueries({ queryKey: sessionQuery.queryKey })` with `queryClient.clear()`, with a one-line comment: "Nothing from an earlier session may show in this one." Remove `sessionQuery` from the import if it's unused.
3. Write `src/modules/shared/axios-interceptors.test.ts` with every case in the spec's Tests list. Put `vi.mock("react-toastify", ...)` at the top. Reuse the `responseError` pattern from `session.test.ts` but pass `{ url, method, headers: new AxiosHeaders() }` as `config`. Seed data with `queryClient.setQueryData(["session"], {...})` and `queryClient.setQueryData(["movements", "list"], [])`, and check with `queryClient.getQueryData(...)` (undefined means removed). Use `await expect(handler(error)).rejects.toBe(error)`.

Files:
- `src/modules/shared/axios-interceptors.ts`
- `src/modules/shared/axios-interceptors.test.ts` (new)
- `src/modules/login/LoginPage.tsx`

Checks:
- `pnpm lint`, `pnpm test` (the new file passes; the total goes up by its cases), `pnpm build`.
- `grep -n "isAuthCall\|/auth/\")" src/modules/shared/axios-interceptors.ts` finds nothing.
- Browser:
  1. Log in as `test@example.com`, open Dashboard, then Movements. Open the React Query devtools (the flower button, dev only) and note the cached queries.
  2. `curl ... -d '{"reset": true}'`. Click Assets in the nav. Expect `/login?redirect=%2Fassets` (or the encoded form the router uses), the "session expired" toast once, and an empty cache in the devtools.
  3. Click "Create account", register `b@example.com` with any valid password, log in as B. Expect `/connect` (B has no key). Connect with the test key. Expect B's Dashboard with B's empty-account states, and nothing from step 1 in Dashboard, Movements or Assets, at any moment, including while pages load.
  4. Log out. Open `/`, `/login` and `/register`: each shows, with no toast. The Network panel shows one `GET /binance/credentials` per full page load.
  5. On `/login`, submit `test@example.com` with a wrong password: the "Wrong email or password." alert, no navigation, no toast.

## Phase 2: Key form, sync errors, landing sentence

Spec: Requirements 2, 3, 7 (landing), Translations, Fake API, and the `keyFormat` and `sync` tests.

Steps:
1. Create `src/modules/binance/keyFormat.ts` with `KEY_TEXT_MIN`, `KEY_TEXT_MAX` and `isValidKeyText`, as in the spec. Build the regex from the two constants or write it out; either is fine, but both numbers must come from one place.
2. Create `src/modules/binance/keyFormat.test.ts` with the spec's cases. Build long strings with `"a".repeat(n)`.
3. In `src/modules/binance/CredentialsForm.tsx`:
   - `validate.apiKey`: `!value.trim()` → `t("binance.form.keyRequired")`; `!isValidKeyText(value)` → `t("binance.form.keyInvalid")`; else `null`. Same for `apiSecret` with `secretRequired` and `secretInvalid`.
   - `visibilityToggleButtonProps={{ "aria-label": t(showSecret ? "binance.form.hideSecret" : "binance.form.showSecret") }}`.
4. Create `src/modules/binance/sync.ts` with `syncFailure`, as in the spec, using `getApiErrorKey` from `../shared/api-errors`. Loop over the results once: remember the first rejection, and return the first rejection whose key isn't `"errors.syncInProgress"` as soon as you see it; at the end, return the first rejection (or `undefined`).
5. Create `src/modules/binance/sync.test.ts` with the spec's six cases. Build axios errors as `session.test.ts` does, with `data: { error: "..." }` and the status. A network error is `new AxiosError("Network Error", "ERR_NETWORK")`. Results are `{ status: "fulfilled", value: undefined }` or `{ status: "rejected", reason }`.
6. In `src/modules/binance/hooks.ts`, `useSyncBinanceData`'s `mutationFn` uses `syncFailure` (spec Requirements 3). Update its doc comment: "It fails when either one fails, once both are done. A real failure is reported before a sync that's already running."
7. Translations: add and change the keys in the spec's Translations table, in `src/locales/en.json` and `src/locales/es.json`, at the same place in both files (`binance.form.*` beside `showSecret`, `errors.invalidKey` in place, `landing.security.control.body` in place). Leave `movements.categoryUnknown` and `categories.unavailable` for Phase 4.
8. `scripts/fake-api.mjs`: the spec's Fake API section. Add a `KEY_TEXT = /^[A-Za-z0-9]{16,128}$/` constant beside the others, use it in the credentials body parser, change `checkCandidateKey` to prefixes, and update the header comment (lines 11-18) to list `readonly00000000`, `trading000000000`, `noread0000000000` and a secret such as `secret0000000000`.

Files:
- `src/modules/binance/keyFormat.ts` (new)
- `src/modules/binance/keyFormat.test.ts` (new)
- `src/modules/binance/CredentialsForm.tsx`
- `src/modules/binance/sync.ts` (new)
- `src/modules/binance/sync.test.ts` (new)
- `src/modules/binance/hooks.ts`
- `src/locales/en.json`
- `src/locales/es.json`
- `scripts/fake-api.mjs`

`src/modules/shared/api-errors.ts` and `SyncNow.tsx` must not change.

Checks:
- `pnpm lint`, `pnpm test` (`locales.test.ts` still passes, so both files have the same keys), `pnpm build`.
- Fake API, with the fake running and no browser: `curl -s -i -X PUT http://localhost:8099/binance/credentials -H 'content-type: application/json' -d '{"api_key":"short","api_secret":"secret0000000000"}'` answers 400 or 401. It's 401 without a session cookie; to see the 400, log in with curl first: `JAR=$(mktemp)`, `curl -s -c "$JAR" -X POST http://localhost:8099/auth/login -H 'content-type: application/json' -d '{"email":"test@example.com","password":"password"}'`, then repeat the PUT with `-b "$JAR" -H 'Origin: http://localhost:5173'`. Expect 400 `{"error":"invalid credentials"}`. With `readonly00000000` and `secret0000000000` expect 200. Then `rm "$JAR"`.
- Browser (Connect page, after `{"reset": true}` and logging in again):
  - Submit a 15-character key, a 129-character key, and `abc-def-ghi-jkl-mno`: the key's invalid message, and no `PUT` in the Network panel. Same for the secret field.
  - Blank fields: "Enter the API key" and "Enter the API secret".
  - `readonly00000000` / `secret0000000000`: saved, both syncs run, Dashboard opens.
  - `trading000000000`: "key is not read-only" message, as before. `noread0000000000`: "key cannot read" message.
  - The eye button: in the Elements panel (or the Accessibility pane), its `aria-label` is "Show secret", then "Hide secret" after a click, then "Show secret". Switch to ES: "Mostrar secreto" / "Ocultar secreto".
  - `{"syncInProgress": true}`, then Sync on the Dashboard: the blue note, as before. `{"syncInProgress": false, "failSync": true}`, then Sync: the red message, as before.
  - Landing page (log out, open `/`), "You stay in control": two sentences in English, two in Spanish.

## Phase 3: Movements search and `asset_match`

Spec: Requirements 4, 5, 7 (test example), and the `search` and `FilterChips` tests.

Steps:
1. `src/modules/movements/search.ts`:
   - `withList`: compute `const value = unique(items).join(",") || undefined`, then `const next = withFilter(search, key, value)`. When `key === "asset" && value === undefined`, `delete next.asset_match`. Return `next`. Update the doc comment.
   - `withoutKey`: when `key === "asset"`, also `delete next.asset_match`. Update the doc comment.
   - `parseMovementsSearch`: `put("asset_match", search.asset !== undefined && raw.asset_match === "any" ? "any" : undefined)`. It must run after `put("asset", ...)`, which it already does.
2. `src/modules/movements/search.test.ts`: add the spec's `asset_match` cases in the "changing the search" and "parseMovementsSearch" blocks, and change the "hasFilters with a param that isn't a filter" block to the `show_balances` example (spec Requirements 7).
3. `src/modules/movements/FilterChips.test.ts`: add the "only coin chip" case. Find the chip with `key === "asset:BTC"` and check its `without`.
4. `src/modules/movements/MovementsPage.tsx` (spec Requirements 4):
   - Add `const committedText = useRef(search.q ?? "")`.
   - In `commitText(value)`: after `window.clearTimeout(timer.current)`, set `committedText.current = withText({}, value).q ?? ""`, then navigate as today.
   - In `go(next)`: `window.clearTimeout(timer.current)`, `committedText.current = next.q ?? ""`, `setText(next.q ?? "")`, then navigate as today. `go` stays a `useCallback`; its deps are `[navigate]` (refs and the state setter are stable).
   - Add, after the existing unmount effect:
     ```ts
     // q changed from outside the page, such as Back or Forward. A search still waiting to be applied belongs to the old URL.
     useEffect(() => {
       if (urlText !== committedText.current) {
         window.clearTimeout(timer.current);
         committedText.current = urlText;
       }
     }, [urlText]);
     ```
   - Keep the render-time block that copies `urlText` into `text`.
   - Don't read or write any ref during render.

Files:
- `src/modules/movements/search.ts`
- `src/modules/movements/search.test.ts`
- `src/modules/movements/FilterChips.test.ts`
- `src/modules/movements/MovementsPage.tsx`

`chips.ts` and `MovementFilters.tsx` must not change.

Checks:
- `pnpm lint` (in particular no `react-hooks/refs` or `react-hooks/set-state-in-render` error), `pnpm test`, `pnpm build`.
- Browser, `/movements?kind=pay` at 1440 px. The 300 ms window is too short to hit by hand, so run this in the DevTools console; it types into the box and clicks Clear all in the same task:
  ```js
  (() => {
    const input = document.querySelector('input[aria-label="Search"]');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setValue.call(input, "rent");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Clear all").click();
    setTimeout(() => console.log("search:", location.search, "box:", JSON.stringify(input.value)), 600);
  })();
  ```
  Expect `search: ` with no `q` (empty, or without `q=`) and `box: ""`. On the code before this phase, the same snippet logs `?q=rent`. If you can, run it once before you start editing, to see that it reproduces the bug.
- Same snippet, but click the chip's remove button instead: replace the `.find(...)` with `document.querySelector('button[aria-label^="Remove Kind"]')`. Expect no `q`.
- Type "rent" by hand and wait: `q=rent` in the URL. Clear the box by hand and wait: `q` goes. Press Back: the box shows "rent" again and the list is filtered.
- Open `/movements?asset=BTC&asset_match=any`. Remove the "Coin: BTC" chip: the URL has neither param, no "Includes Convert" chip, and the checkbox is unchecked and disabled. Then add BTC in the coin input, tick the checkbox, and remove BTC from the input: same result.
- Open `/movements?asset_match=any`: no chip, no Clear all, the address bar loses `asset_match` after the first filter change.

## Phase 4: Category load failure

Spec: Requirements 6, Translations (`movements.categoryUnknown`, `categories.unavailable`), and the `movementText` test.

Steps:
1. Translations: add `movements.categoryUnknown` (beside `movements.noCategory`) and `categories.unavailable` (inside the `categories` block), in `en.json` and `es.json`, with the spec's strings.
2. Create `src/modules/categories/CategoriesUnavailable.tsx` as the spec describes. Use `useTranslation`.
3. `src/modules/dashboard/movementText.ts`: the new branch in `movementFiling`, placed after the "known name" branch and before the `needsLabel` branch. Add the case to `src/modules/dashboard/movementText.test.ts`, following how that file already builds a movement and a `t`.
4. `src/modules/movements/MovementCards.tsx`: the `filing` change from the spec's table.
5. `src/modules/movements/MovementsTable.tsx`: the `placeholder` change. Keep `labelNeeded` as it is.
6. `src/modules/movements/MovementDrawer.tsx`: the `placeholder` on the category `Select`.
7. `src/modules/movements/MovementsPage.tsx`: render `CategoriesUnavailable` between `<FilterChips ... />` and the list block when `categories.isError`.
8. `src/modules/dashboard/RecentMovements.tsx`: remove the `categories.isError` branch. Wrap the success and empty bodies so that, when `categories.isError`, `<CategoriesUnavailable onRetry={() => categories.refetch()} />` follows them inside a `Stack gap="sm"`.
9. `src/modules/dashboard/SpendingCard.tsx`: remove the `categories.isError` branch, change `nameOf`'s fallback to `t("movements.categoryUnknown")`, and render `CategoriesUnavailable` at the end of the body when `categories.isError`, the same way.

Files:
- `src/locales/en.json`
- `src/locales/es.json`
- `src/modules/categories/CategoriesUnavailable.tsx` (new)
- `src/modules/dashboard/movementText.ts`
- `src/modules/dashboard/movementText.test.ts`
- `src/modules/dashboard/RecentMovements.tsx`
- `src/modules/dashboard/SpendingCard.tsx`
- `src/modules/movements/MovementCards.tsx`
- `src/modules/movements/MovementsTable.tsx`
- `src/modules/movements/MovementDrawer.tsx`
- `src/modules/movements/MovementsPage.tsx`

`LabelQueue.tsx`, `CategoriesPage.tsx` and `chips.ts` must not change.

Checks:
- `pnpm lint`, `pnpm test`, `pnpm build`.
- Browser, logged in with a key, `{"account": "populated"}` (it has categorised movements), then `{"failRoute": "GET /categories", "failStatus": 503}`, then a full reload:
  - Dashboard at 1440 px: Recent movements shows its five rows; any row with a category reads "Category not loaded" (if none of the five has one, label one first with the failure off, then turn it on and reload); the notice and Try again sit under the rows. This month's spending shows the bar and the rows, categorised rows read "Category not loaded", and the notice sits under them. The label cards still show their section error.
  - `/movements` at 1440 px: the notice above the table; categorised rows' selects read "Category not loaded" and are disabled. Open a categorised movement: the drawer's select reads "Category not loaded" and is disabled.
  - `/movements` at 375 px: cards of categorised movements read "Category not loaded".
  - `{"failRoute": null}`, then Try again (any one): every placeholder becomes the real name, every notice goes, and the selects are enabled.
  - Spanish: "Categoría sin cargar" and the notice in Spanish.
- With no failure, every view looks as before (compare Dashboard and Movements with a screenshot from before the phase).

## Implementation State

All four phases are implemented (2026-11-09). Unit checks pass: `pnpm lint` (no errors), `pnpm test` (25 files, 252 tests), `pnpm build` (`tsc -b` and `vite build`). No dependency, lockfile or generated-route change. The fake API was checked with `curl`: a 10-character key answers 400 `invalid credentials`, `readonly00000000` is saved, and `trading000000000` / `noread0000000000` answer their 422s. Browser checks (all four phases) were not run. No behavioural deviation from the plan; the interceptor test adds one extra case (a non-axios error), and the fake API's header comment describes the mask in words.
