---
title: "Implementation Plan: Register Password Match"
change: register-password-match-1
type: bugfix
spec: ./SPEC.md
issue: none
created: 2026-11-09
updated: 2026-11-09
sdd_version: 7.3.0
---

# Implementation Plan: Register Password Match

**Spec:** [SPEC.md](./SPEC.md). Behaviour B1-B7, the test cases and the reasons are there. This plan gives the order and the exact code.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file.
- Change only the three files below. No new dependency, no new translation key, no change to `src/modules/shared/api-errors.ts` or the locale files. If something else seems to need a change, stop and say so in the report.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.

One phase, about 170 changed lines, 3 files.

## Step 1. Pure validation module

Create `src/modules/register/validation.ts` with exactly this content:

```ts
import type { RegisterForm } from "./types";

export type RegisterField = keyof RegisterForm;

export const REGISTER_FIELDS: readonly RegisterField[] = [
  "email",
  "password",
  "confirm_password",
];

/** Client-only minimum. The backend only requires a non-empty password. */
export const PASSWORD_MIN_LENGTH = 3;

/** The backend refuses passwords over 72 UTF-8 bytes (bcrypt's limit). */
export const PASSWORD_MAX_BYTES = 72;

const EMAIL_PATTERN = /^\S+@\S+$/;

/** Returns a translation key, or null when the email is valid. */
export function emailError(value: string): string | null {
  return EMAIL_PATTERN.test(value) ? null : "auth.invalidEmail";
}

/** Returns a translation key, or null when the password is valid. */
export function passwordError(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return "auth.passwordTooShort";
  }
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return "errors.passwordTooLong";
  }
  return null;
}

/** Returns a translation key, or null when both passwords are equal. */
export function confirmPasswordError(
  value: string,
  password: string,
): string | null {
  return value === password ? null : "auth.passwordMismatch";
}

/**
 * Fields to re-validate after a value change: a live field that changed, and the
 * confirm field when the password changed and the confirm field has a value.
 */
export function fieldsToRevalidate(
  values: RegisterForm,
  previous: RegisterForm,
  live: ReadonlySet<RegisterField>,
): RegisterField[] {
  const passwordChanged = values.password !== previous.password;
  return REGISTER_FIELDS.filter(
    (field) =>
      (values[field] !== previous[field] && live.has(field)) ||
      (field === "confirm_password" &&
        passwordChanged &&
        values.confirm_password !== ""),
  );
}
```

## Step 2. Unit tests

Create `src/modules/register/validation.test.ts`. Follow the style of `src/modules/binance/keyFormat.test.ts` (`import { describe, expect, it } from "vitest";`). Write one `it` per bullet in SPEC "Unit tests", with exactly those inputs and expected values. For `fieldsToRevalidate`, build values with a helper:

```ts
const form = (over: Partial<RegisterForm> = {}): RegisterForm => ({
  email: "",
  password: "",
  confirm_password: "",
  ...over,
});
```

and pass `new Set<RegisterField>([...])` as `live`. Example of one case:

```ts
it("re-checks a non-empty confirm field when the password changes", () => {
  expect(
    fieldsToRevalidate(
      form({ password: "abcd", confirm_password: "x" }),
      form({ password: "abc", confirm_password: "x" }),
      new Set(),
    ),
  ).toEqual(["confirm_password"]);
});
```

Run `pnpm test`. All tests must pass before Step 3.

## Step 3. Wire it into `src/modules/register/RegisterPage.tsx`

1. Imports. Change `import { useForm } from "@mantine/form";` to:
   ```ts
   import { useForm, type UseFormReturnType } from "@mantine/form";
   ```
   Add:
   ```ts
   import { useRef } from "react";
   import type { RegisterForm } from "./types";
   import {
     confirmPasswordError,
     emailError,
     fieldsToRevalidate,
     passwordError,
     REGISTER_FIELDS,
     type RegisterField,
   } from "./validation";
   ```
2. Above `export function RegisterPage()`, add:
   ```ts
   // Translates a validation key; null stays null (no error).
   const translate = (key: string | null) => (key ? i18n.t(key) : null);
   ```
3. Replace the whole `const form = useForm({ ... });` block with:
   ```ts
   // Fields that re-validate on every change: blurred with a value, or after a submit attempt.
   const live = useRef(new Set<RegisterField>());

   const form: UseFormReturnType<RegisterForm> = useForm<RegisterForm>({
     initialValues: { email: "", password: "", confirm_password: "" },
     validate: {
       email: (value) => translate(emailError(value)),
       password: (value) => translate(passwordError(value)),
       confirm_password: (value, values) =>
         translate(confirmPasswordError(value, values.password)),
     },
     onValuesChange: (values, previous) => {
       for (const field of fieldsToRevalidate(values, previous, live.current)) {
         live.current.add(field);
         form.validateField(field);
       }
     },
   });

   // Blurring a field with a value makes it live and checks it. Empty fields stay quiet.
   const validateOnBlur = (field: RegisterField) => () => {
     if (form.getValues()[field] === "") {
       return;
     }
     live.current.add(field);
     form.validateField(field);
   };
   ```
   The explicit `UseFormReturnType<RegisterForm>` annotation is required: without it TypeScript reports `form` as referenced in its own initializer.
4. Change `<form onSubmit={form.onSubmit(onSubmit)}>` to:
   ```tsx
   <form
     onSubmit={form.onSubmit(onSubmit, () => {
       REGISTER_FIELDS.forEach((field) => live.current.add(field));
     })}
   >
   ```
5. On each of the three inputs, add an `onBlur` prop **after** the `{...form.getInputProps(...)}` spread so it overrides Mantine's:
   - email `TextInput`: `onBlur={validateOnBlur("email")}`
   - password `PasswordInput`: `onBlur={validateOnBlur("password")}`
   - confirm `PasswordInput`: `onBlur={validateOnBlur("confirm_password")}`
6. Leave everything else (`onSubmit`, `mutation`, the `Alert`, the layout) unchanged.

## Checks

Run, and paste the last lines of each:

```sh
pnpm lint
pnpm test
pnpm build
git diff --stat
git status --short
```

`git status --short` must list only `src/modules/register/RegisterPage.tsx` (modified), `src/modules/register/validation.ts` and `src/modules/register/validation.test.ts` (new), plus the spec folder. If `pnpm-lock.yaml` or `src/routeTree.gen.ts` changed, revert that file with `git checkout -- <file>`.

## Browser check

1. `pnpm fake-api` (fake API on `http://localhost:8099`).
2. In another terminal, `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`, then open `http://localhost:5173/register` (log out first if a session is open).
3. Walk through every Given/When/Then in SPEC "Acceptance criteria", in order, reloading the page between cases. For the 73-character case paste `"a".repeat(73)` from the DevTools console (`copy("a".repeat(73))`).
4. In DevTools Network, confirm that no `POST /auth/register` is sent while any error shows, and that the valid submit sends exactly one and lands on `/login`.
5. Switch to ES with the language toggle and repeat the mismatch case.

Report: the outputs above, `git diff --stat`, and which acceptance criteria passed in the browser.

## Implementation State

Implemented on 2026-11-09, uncommitted. `validation.ts`, `validation.test.ts` and the `RegisterPage.tsx` wiring follow the plan; no dependency, translation, API-error or locale change.

- Deviation: the plan's `live = useRef(new Set<RegisterField>())` fails `pnpm lint` under the `react-hooks/refs` rule ("Cannot access refs during render") because the ref is read inside `onValuesChange`, `validateOnBlur` and the submit-failure callback. Replaced with `const [live] = useState(() => new Set<RegisterField>())`, which gives the same stable container without a ref read during render; behaviour is unchanged.
- Checks: `pnpm lint` passes (no errors), `pnpm test` passes (26 files, 295 tests, including 15 new validation tests), `pnpm build` passes (`tsc -b` and `vite build`). `git status --short` lists only `RegisterPage.tsx` (modified), `validation.ts` and `validation.test.ts` (new), plus the spec folder and the pre-existing `specs/INDEX.md` edit.
- The manual browser checks were not run; they are left for the main session.
