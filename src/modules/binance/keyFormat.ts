/** The backend's rule for an API key and a secret (credentials.go, validKeyText): 16 to 128 ASCII letters and digits. */
export const KEY_TEXT_MIN = 16;
export const KEY_TEXT_MAX = 128;

const KEY_TEXT = new RegExp(`^[A-Za-z0-9]{${KEY_TEXT_MIN},${KEY_TEXT_MAX}}$`);

/** Trims the value, as the backend and useSaveCredentials do, then checks it against the backend's rule. */
export function isValidKeyText(value: string): boolean {
  return KEY_TEXT.test(value.trim());
}
