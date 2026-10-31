/**
 * The router's search params, read and written as the text the URL has. TanStack's default reader turns a value that
 * looks like a number or JSON into that type, so q=1.50 would come back as 1.5, and q=null as null. Here every value
 * stays a string. The commas of a list such as kind=p2p,pay and the colons of a time are left unescaped, because the
 * URL allows them and the API reads them the same way.
 */
export function parseSearch(search: string): Record<string, string> {
  const text = search.startsWith("?") ? search.slice(1) : search;
  return Object.fromEntries(new URLSearchParams(text));
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  // "+" in a value is already escaped as %2B, so the offset of a time survives the round trip.
  const text = params.toString().replace(/%2C/gi, ",").replace(/%3A/gi, ":");
  return text ? `?${text}` : "";
}
