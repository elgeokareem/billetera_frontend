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
