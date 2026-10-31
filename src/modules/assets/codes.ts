const SYMBOL = /^[A-Za-z0-9]{1,32}$/;

/**
 * A coin code from the URL, read the way the API reads a symbol: 1 to 32 ASCII letters or digits, upper-cased. Anything else
 * is undefined, and the page shows Not found without asking the API. The URL's own encoding is already undone by the router.
 */
export function assetCode(raw: string): string | undefined {
  return SYMBOL.test(raw) ? raw.toUpperCase() : undefined;
}
