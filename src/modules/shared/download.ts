/**
 * The file name in a Content-Disposition header, such as attachment; filename="movements-20261030-073712.csv". Falls back
 * to the given name when the header has none.
 */
export function fileNameOf(header: string | null | undefined, fallback: string) {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1].trim()) : fallback;
}

/** Saves a file the page already holds, under the name the server gave it, through a normal browser download. */
export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // The download reads the blob after the click, so the URL is kept a while before it's released.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
