#!/usr/bin/env node
// Generates src/modules/shared/api-schema.d.ts from the backend's OpenAPI file. Run it as
// `pnpm api:generate`, or `pnpm api:check` to fail when the committed file is stale.
//
// The spec is ../backend/docs/openapi/openapi.json by default. Set OPENAPI_PATH to point at another
// checkout, an artifact, or an http(s) URL when the frontend pipeline doesn't have the backend beside it.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const check = process.argv.includes("--check");
const configured = process.env.OPENAPI_PATH;
const isURL = configured ? /^https?:\/\//i.test(configured) : false;
const input = configured
  ? isURL
    ? configured
    : resolve(process.cwd(), configured)
  : resolve(process.cwd(), "../backend/docs/openapi/openapi.json");
const output = resolve(process.cwd(), "src/modules/shared/api-schema.d.ts");

if (!isURL && !existsSync(input)) {
  console.error(`OpenAPI file not found: ${input}`);
  console.error(
    "Set OPENAPI_PATH to the backend's docs/openapi/openapi.json, or check out the backend next to this repo.",
  );
  process.exit(1);
}

const args = [
  "dlx",
  "--package=openapi-typescript@7.13.0",
  "--package=typescript@5",
  "openapi-typescript",
  input,
  "-o",
  output,
  ...(check ? ["--check"] : []),
];

const result = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(`Could not run pnpm: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
