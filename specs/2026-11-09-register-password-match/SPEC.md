---
title: Register Password Match
spec_type: tech
type: bugfix
status: draft
domain: Identity
issue: none
created: 2026-11-09
updated: 2026-11-09
sdd_version: 7.3.0
---

# Register Password Match

## Problem

On `/register` (`src/modules/register/RegisterPage.tsx`) the Mantine `useForm` has rules for `email`, `password` and `confirm_password`, but they only run on submit. Typing two different passwords shows nothing until the user presses "Create account". Then the error shows and no request is sent. Users expect feedback while they fill the form.

## Backend facts (checked in `../backend/modules/auth/`)

- `structs.go` `REGISTER`: `email` is `required,email`, `password` is `required` (no minimum length), `confirm_password` is `required,eqfield=PASSWORD`.
- `controllers.go` (register): a password over `MaxPasswordBytes = 72` **bytes** (`len()` in Go, so UTF-8 bytes, not characters) gets `400 {"error":"Password must be at most 72 bytes"}`. The backend enforces it, so the client mirrors it.
- `src/modules/shared/api-errors.ts` already maps `"Password must be at most 72 bytes"` to `errors.passwordTooLong` ("That password is too long." / "Esa contraseña es demasiado larga."). The mapping stays: the server check remains the backstop.
- The client's "at least 3 characters" (`auth.passwordTooShort`) is a client-only rule. The backend only needs a non-empty password. This change keeps it as is (see Open questions).

## Behaviour

Each field is either **quiet** or **live**. Every field starts quiet.

| # | Rule |
|---|------|
| B1 | A quiet field never shows an error while the user types in it. No error on the first keystroke. |
| B2 | When a field loses focus (blur) with a **non-empty** value, it becomes live and is validated at once. Blurring an empty field does nothing, so tabbing through the empty form shows no errors. |
| B3 | While a field is live, every change to it re-validates it. Its error shows or clears on each keystroke, so the mismatch error disappears as soon as the two passwords match. |
| B4 | When `password` changes and `confirm_password` is non-empty, `confirm_password` is re-validated and becomes live, whether it was live or not. |
| B5 | A submit attempt validates every field (as today) and makes every field live. A failed submit sends no request (as today). |
| B6 | Password rule: shorter than 3 characters gives `auth.passwordTooShort` (unchanged); more than 72 UTF-8 bytes gives `errors.passwordTooLong` (new). The length check runs first. |
| B7 | Email and confirm rules are unchanged: email must match `/^\S+@\S+$/` (`auth.invalidEmail`), confirm must equal password (`auth.passwordMismatch`). |

Why blur and not "on change" for the first check: the user is still typing on the first keystrokes, and an error on "a" is nagging. Once the user has left a field with a value in it (or tried to submit), live checking is what lets the error clear the moment it's fixed. This applies the same to all three fields so the form is consistent.

Why not Mantine's `validateInputOnBlur` / `validateInputOnChange` options (both exist in `@mantine/form` 9.7.4): they are static. `validateInputOnBlur` validates empty fields too (B2), and `validateInputOnChange` validates from the first keystroke (B1). So the page tracks the live fields itself and uses these APIs that do exist in 9.7.4: `onValuesChange(values, previous)` (runs after the new values are stored and after Mantine's `clearInputErrorOnChange` has cleared the changed field's error), `form.validateField(path)`, `form.getValues()`, and the failure callback of `form.onSubmit(handleSubmit, handleValidationFailure)`.

No new translation keys. `errors.passwordTooLong` is reused for the form error.

## Design

### New file `src/modules/register/validation.ts` (pure, no React, no i18n)

```ts
import type { RegisterForm } from "./types";

export type RegisterField = keyof RegisterForm;
export const REGISTER_FIELDS: readonly RegisterField[] = ["email", "password", "confirm_password"];
export const PASSWORD_MIN_LENGTH = 3;
export const PASSWORD_MAX_BYTES = 72;

/** Each returns a translation key, or null when the value is valid. */
export function emailError(value: string): string | null;            // "auth.invalidEmail"
export function passwordError(value: string): string | null;         // "auth.passwordTooShort" | "errors.passwordTooLong"
export function confirmPasswordError(value: string, password: string): string | null; // "auth.passwordMismatch"

/** Fields to re-validate after a change, in REGISTER_FIELDS order (B3, B4). */
export function fieldsToRevalidate(
  values: RegisterForm,
  previous: RegisterForm,
  live: ReadonlySet<RegisterField>,
): RegisterField[];
```

- `passwordError`: `value.length < PASSWORD_MIN_LENGTH` gives `"auth.passwordTooShort"`; else `new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES` gives `"errors.passwordTooLong"`; else `null`.
- `fieldsToRevalidate` returns each field `f` of `REGISTER_FIELDS` where (`values[f] !== previous[f]` and `live.has(f)`), or where `f === "confirm_password"` and `values.password !== previous.password` and `values.confirm_password !== ""`.

### `src/modules/register/RegisterPage.tsx`

- `live = useRef(new Set<RegisterField>())`.
- `form` gets an explicit type, `const form: UseFormReturnType<RegisterForm> = useForm<RegisterForm>({...})`, because `onValuesChange` refers to `form` (without the annotation TypeScript reports the variable as referenced in its own initializer).
- `validate` rules call the pure functions and translate the key with `i18n.t` (a `null` key stays `null`).
- `onValuesChange`: for each field from `fieldsToRevalidate(values, previous, live.current)`: add it to `live.current`, then `form.validateField(field)`.
- Each input gets `onBlur` after `{...form.getInputProps(field)}`: if `form.getValues()[field] !== ""`, add the field to `live.current` and `form.validateField(field)` (B2).
- `form.onSubmit(onSubmit, () => REGISTER_FIELDS.forEach((f) => live.current.add(f)))` (B5).

Out of scope: the login form, the email regex vs the backend's `email` validator, and the 3-character minimum.

## Acceptance criteria

- **Given** an empty register form, **when** the user tabs through all three fields without typing, **then** no error shows.
- **Given** password "secret1", **when** the user types "s" in confirm, **then** no error shows yet.
- **Given** password "secret1" and confirm "secret2", **when** confirm loses focus, **then** "The passwords don't match" shows under confirm.
- **Given** that error, **when** the user edits confirm to "secret1", **then** the error clears on the keystroke that makes them match, without leaving the field.
- **Given** password "secret1" and a matching confirm, **when** the user changes password to "secret12", **then** the mismatch error shows under confirm at once.
- **Given** password "secret1" and an empty confirm, **when** the user edits password, **then** confirm shows no error.
- **Given** password "ab", **when** password loses focus, **then** "Use at least 3 characters" shows; **when** the user types "c", **then** it clears.
- **Given** a password of 73 ASCII characters (or 37 "ñ", 74 bytes), **when** password loses focus, **then** "That password is too long." shows. 72 ASCII characters (or 36 "ñ") show no error.
- **Given** email "foo", **when** email loses focus, **then** "Enter a valid email" shows; **when** the user types "@x", **then** it clears.
- **Given** an untouched form, **when** the user presses "Create account", **then** all failing fields show their errors, no request is sent, and from then on each field re-validates as the user types.
- **Given** a valid form, **when** the user submits, **then** `POST /auth/register` is sent and the app goes to `/login` as today.
- In Spanish (EN/ES toggle) the same errors show in Spanish.

## Unit tests (`src/modules/register/validation.test.ts`, vitest)

- `emailError`: `"a@b"` gives null; `""`, `"foo"`, `"a b@c"` give `"auth.invalidEmail"`.
- `passwordError`: `""`, `"ab"` give `"auth.passwordTooShort"`; `"abc"`, `"a".repeat(72)`, `"ñ".repeat(36)`, `"😀".repeat(18)` give null; `"a".repeat(73)`, `"ñ".repeat(37)`, `"😀".repeat(19)` give `"errors.passwordTooLong"`.
- `confirmPasswordError`: equal gives null; different, and `""` against `"abc"`, give `"auth.passwordMismatch"`.
- `fieldsToRevalidate`:
  - nothing live, email changed: `[]`.
  - email live, email changed: `["email"]`.
  - email live, only password changed: `[]`.
  - password changed, confirm `""` and not live: `[]`.
  - password changed, confirm `"x"` and not live: `["confirm_password"]`.
  - confirm live, confirm changed: `["confirm_password"]`.
  - password live and changed, confirm `"x"`: `["password", "confirm_password"]`.
  - values equal, all live: `[]`.

## Open questions

1. The client requires at least 3 characters, but the backend accepts any non-empty password. Keep 3, raise it (for example to 8, and ask the backend to enforce the same), or drop it? This change keeps 3.
2. The client email regex (`/^\S+@\S+$/`) is looser than the backend's `email` validator, so "a@b" passes the client and gets a 400 with generic error text. Worth a separate fix?
