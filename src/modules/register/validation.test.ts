import { describe, expect, it } from "vitest";
import type { RegisterForm } from "./types";
import {
  confirmPasswordError,
  emailError,
  fieldsToRevalidate,
  passwordError,
  type RegisterField,
} from "./validation";

const form = (over: Partial<RegisterForm> = {}): RegisterForm => ({
  email: "",
  password: "",
  confirm_password: "",
  ...over,
});

describe("emailError", () => {
  it("accepts an email with a local part and a domain", () => {
    expect(emailError("a@b")).toBeNull();
  });

  it("rejects empty, malformed and whitespace-containing emails", () => {
    expect(emailError("")).toBe("auth.invalidEmail");
    expect(emailError("foo")).toBe("auth.invalidEmail");
    expect(emailError("a b@c")).toBe("auth.invalidEmail");
  });
});

describe("passwordError", () => {
  it("rejects passwords shorter than the client minimum", () => {
    expect(passwordError("")).toBe("auth.passwordTooShort");
    expect(passwordError("ab")).toBe("auth.passwordTooShort");
  });

  it("accepts passwords up to 72 UTF-8 bytes", () => {
    expect(passwordError("abc")).toBeNull();
    expect(passwordError("a".repeat(72))).toBeNull();
    expect(passwordError("ñ".repeat(36))).toBeNull();
    expect(passwordError("😀".repeat(18))).toBeNull();
  });

  it("rejects passwords over 72 UTF-8 bytes", () => {
    expect(passwordError("a".repeat(73))).toBe("errors.passwordTooLong");
    expect(passwordError("ñ".repeat(37))).toBe("errors.passwordTooLong");
    expect(passwordError("😀".repeat(19))).toBe("errors.passwordTooLong");
  });
});

describe("confirmPasswordError", () => {
  it("accepts equal passwords", () => {
    expect(confirmPasswordError("abc", "abc")).toBeNull();
  });

  it("rejects different and empty confirmation values", () => {
    expect(confirmPasswordError("abd", "abc")).toBe("auth.passwordMismatch");
    expect(confirmPasswordError("", "abc")).toBe("auth.passwordMismatch");
  });
});

describe("fieldsToRevalidate", () => {
  it("returns nothing when nothing is live and only email changed", () => {
    expect(
      fieldsToRevalidate(
        form({ email: "a@b" }),
        form(),
        new Set<RegisterField>(),
      ),
    ).toEqual([]);
  });

  it("returns a live email that changed", () => {
    expect(
      fieldsToRevalidate(
        form({ email: "a@b" }),
        form(),
        new Set<RegisterField>(["email"]),
      ),
    ).toEqual(["email"]);
  });

  it("returns nothing when only password changed and email is live", () => {
    expect(
      fieldsToRevalidate(
        form({ password: "abc" }),
        form(),
        new Set<RegisterField>(["email"]),
      ),
    ).toEqual([]);
  });

  it("returns nothing when password changed with an empty, quiet confirm", () => {
    expect(
      fieldsToRevalidate(
        form({ password: "abc" }),
        form(),
        new Set<RegisterField>(),
      ),
    ).toEqual([]);
  });

  it("re-checks a non-empty confirm field when the password changes", () => {
    expect(
      fieldsToRevalidate(
        form({ password: "abcd", confirm_password: "x" }),
        form({ password: "abc", confirm_password: "x" }),
        new Set(),
      ),
    ).toEqual(["confirm_password"]);
  });

  it("returns a live confirm that changed", () => {
    expect(
      fieldsToRevalidate(
        form({ confirm_password: "x" }),
        form(),
        new Set<RegisterField>(["confirm_password"]),
      ),
    ).toEqual(["confirm_password"]);
  });

  it("returns a live changed password and a non-empty confirm", () => {
    expect(
      fieldsToRevalidate(
        form({ password: "abcd", confirm_password: "x" }),
        form({ password: "abc", confirm_password: "x" }),
        new Set<RegisterField>(["password"]),
      ),
    ).toEqual(["password", "confirm_password"]);
  });

  it("returns nothing when values are equal even with every field live", () => {
    expect(
      fieldsToRevalidate(
        form({ email: "a@b", password: "abc", confirm_password: "abc" }),
        form({ email: "a@b", password: "abc", confirm_password: "abc" }),
        new Set<RegisterField>(["email", "password", "confirm_password"]),
      ),
    ).toEqual([]);
  });
});
