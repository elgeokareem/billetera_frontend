import axios from "axios";

// Backend error text, which is English, mapped to translation keys.
const KNOWN_ERRORS: Record<string, string> = {
  "Invalid credentials": "errors.invalidLogin",
  "client already registered": "errors.alreadyRegistered",
  "Password must be at most 72 bytes": "errors.passwordTooLong",
  "invalid credentials": "errors.invalidKey",
  "binance rejected the key": "errors.keyRejected",
  "key is not read-only": "errors.keyNotReadOnly",
  "key cannot read": "errors.keyCannotRead",
  "binance request failed": "errors.binanceFailed",
  "binance credentials not set": "errors.keyNotSet",
  "credentials not found": "errors.keyNotSet",
  "sync already in progress": "errors.syncInProgress",
  "category already exists": "errors.categoryExists",
  "category not found": "errors.categoryNotFound",
  "invalid name": "errors.invalidCategoryName",
  "movement not found": "errors.movementNotFound",
  "snapshot not found": "errors.snapshotNotFound",
  "too many rows, narrow the filters": "errors.tooManyRows",
  "invalid tag": "errors.invalidTag",
  "too many tags": "errors.tooManyTags",
};

/** Returns the translation key for a failed API call. Raw backend text is never shown. */
export function getApiErrorKey(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "errors.generic";
  }
  if (!error.response) {
    return "errors.network";
  }
  const data = error.response.data as
    | { error?: unknown; message?: unknown }
    | undefined;
  const text = data?.error ?? data?.message;
  return (typeof text === "string" && KNOWN_ERRORS[text]) || "errors.generic";
}
