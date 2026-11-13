// Fake billetera API for frontend work. Dependency-free Node, in memory only: a restart clears everything.
//
//   pnpm fake-api                                   serves http://localhost:8099
//   VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev
//
// It answers the routes of ../backend/README.md that the frontend calls, with the status codes, shapes and error
// texts of the Go handlers. It isn't the backend: there's no JWT, no database and no call to Binance.
//
// Login: test@example.com / password. A user who registers gets an empty account.
//
// Binance keys. PUT /binance/credentials decides by the trimmed api_key. Both the key and the secret must be 16 to 128
// ASCII letters and digits, as the backend's CheckKeyPair requires; otherwise the answer is 400 invalid credentials. The
// secret is never stored, logged or echoed back. The key's prefix picks the answer:
//   readonly00000000   saved, state active
//   trading000000000   422 key is not read-only
//   noread0000000000   422 key cannot read
//   anything else      422 binance rejected the key
// A secret can be anything that follows the same rule, such as secret0000000000. A saved key is masked the way the
// backend masks it: the first and last four characters around "…".
//
// Accounts. Each user has movements, categories and balance snapshots, as the backend has them, with money as exact decimal
// strings. The account of test@example.com is "populated" at start and after reset. Its dates are relative to the moment
// the account was built, so the current month, last month and older history are always there. Prices are fixed: USDT and
// USDC are 1, BTC 93500, BNB 620, ETH 3400. Movement sync and balance sync add a snapshot or counts only.
// Holdings: BTC has a locked and a frozen part, so free, locked and freeze differ in the snapshots. ADA was held from 5 to 14
// days ago and isn't now, so its history has a value, then zeros; with unpriced on, a stretch of it has no price.
//
// Tags. A movement carries 0 to 10 lower-case names, and a name is 1 to 32 code points with no control character and no
// comma. PATCH /movements/:id takes the whole list under "tags"; GET /movements, /movements/totals and
// /movements/export take tag, a comma list of up to 20 names, and tag_match=any|all. The seed tags the Travel movements
// trip-2026, some Food ones shared, and one movement with five tags so the table shows "+2".
//
// Detection. A movement from the detector has source "detector", review_status suspected, confirmed or dismissed, and a
// detection object; a Binance row has both null. The kinds are deposit, withdrawal, pay, p2p, convert, card_spend,
// copy_trading and transfer. GET /movements, /movements/totals and /movements/export take review, a comma list of none
// (Binance rows), suspected, confirmed and dismissed. Without it, dismissed rows are left out. PATCH /movements/:id
// takes kind (card_spend, copy_trading or transfer, which confirms) and review (confirmed, dismissed or suspected, which
// restores the suggestion), and either one on a Binance row is 422 movement is not detected. The CSV ends with
// review_status, window_start, window_end and wallet, empty for a Binance row.
//
// Splits. A movement can be split into 1 to 20 parts, each with a category, a USD amount and optional tags. Every movement
// answers splits, split_status (none, applied, exceeds or unpriced) and split_rest_usd, the value left in its own category
// (null when there are no parts or they don't apply). PATCH /movements/:id takes the whole list under "splits" ([] removes
// them): each usd_amount is a string above 0 with at most 2 decimals and the parts may add up to at most the movement's
// value rounded to cents. A non-empty list on an unpriced movement is 422 movement is not priced, and parts above the value
// are 422 splits exceed movement value. Filters category_id and tag, and totals with group_by=category, work per portion (a
// part, or the rest). The CSV ends with split_status, split_rest_usd and splits (JSON).
//
// A tag has an id and a color, one of 12 palette names. GET /tags lists every tag of the user, used or not, with its
// movement count (0 included), sorted by name. POST /tags creates one, with a random palette color unless the body gives
// one; PATCH /tags/:id renames and/or recolors it; DELETE /tags/:id removes it from every movement. The seed registers
// every name its movements use with a deterministic color, plus one unused tag so the 0-count case shows.
//
// Scenarios and problems, with POST /__fake/state (JSON body, any mix of these fields):
//   {"reset": true}                 back to the start: no key, no sessions, the populated account, flags off
//   {"account": "populated"}        rebuilds the account of test@example.com. One of:
//                                     populated        the design's numbers: two unlabelled spending movements this month
//                                                      (a P2P sale and a Pay transfer), a Convert with no category, one
//                                                      unpriced spending movement and last month's unlabelled movements
//                                     all-labelled     populated, with this month's unlabelled spending labelled
//                                     many-unlabelled  populated, with five more unlabelled withdrawals this month
//                                     quiet-month      populated, with no spending this month
//                                     single-snapshot  populated, with one balance snapshot only
//                                     long-history     populated, with 110 older movements from four to seven months back,
//                                                      so the list pages (50 a page)
//                                     card-spends      populated, plus this month's detected balance changes: card spends,
//                                                      a copy pair, an unexplained gain, a dismissed one and a conflict
//                                     splits           populated, plus Supermarket and Transport and this month's split
//                                                      movements: applied with a rest, fully split, an uncategorized rest,
//                                                      exceeds, unpriced and a sub-cent rest
//                                     empty            no movements, categories or snapshots
//   {"unpriced": false}             prices every movement and coin. true (the default) leaves a few unpriced
//   {"moreCategories": true}        adds Health, Shopping, Transfer and Utilities, so the label card shows a select, and a
//                                   sixth coin, SOL, so Holdings shows five of six
//   {"gapWindow": true}             no snapshot from 24 to 48 hours ago, so the balance comparison is hidden
//   {"syncInProgress": true}        both sync calls answer 409 sync already in progress
//   {"failRoute": "GET /movements/totals", "failStatus": 503}
//                                   that call answers failStatus with a generic error, until failRoute is null. The route is
//                                   the method and the path with its ID shown as :id, :asset, or the path itself. A 422 on
//                                   GET /movements/export answers the backend's "too many rows, narrow the filters".
//   {"failSync": true}              POST /binance/sync and POST /binance/movements/sync answer 502 until set to false
//   {"rejectKey": true}             the saved key is marked rejected, as Binance would after refusing it. false makes it active
//                                   again. 409 when no key is saved
//   {"ipRestricted": true}          keys saved from now on report ip_restricted: true
//   {"delayMs": 1500}               API calls wait this long first, to see the loading states
// GET /__fake/state shows the flags, the masked keys and the counts of each account. It never shows a key or a secret.
//
// Sessions. The access_token cookie is HttpOnly, as in the backend, and it's a random opaque value, not a JWT. The
// frontend never reads it. As in the backend, a cookie-authenticated call that isn't GET, HEAD or OPTIONS must come from
// http://localhost:5173, and so must an /auth call that sends an Origin or Referer. The Authorization header isn't
// supported.

import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_API_PORT) || 8099;
const APP_ORIGIN = "http://localhost:5173";
const COOKIE_NAME = "access_token";
const SESSION_SECONDS = 24 * 60 * 60;
const MAX_PASSWORD_BYTES = 72;
const MAX_CREDENTIALS_BODY = 4 << 10;
const MAX_BODY = 64 << 10;
const MAX_UPDATE_BODY = 16 << 10;
const MASK_MIN_LENGTH = 16;
const KEY_TEXT = /^[A-Za-z0-9]{16,128}$/;
const MAX_DELAY_MS = 60_000;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ACCOUNT_KINDS = ["populated", "all-labelled", "many-unlabelled", "quiet-month", "single-snapshot", "long-history", "card-spends", "splits", "empty"];
const FLAG_BOOLEANS = ["failSync", "ipRestricted", "rejectKey", "reset", "syncInProgress", "unpriced", "moreCategories", "gapWindow"];
const FLAG_FIELDS = [...FLAG_BOOLEANS, "delayMs", "account", "failRoute", "failStatus"];
const FAIL_ROUTES = [
  "GET /movements",
  "GET /movements/totals",
  "GET /movements/export",
  "GET /movements/:id",
  "PATCH /movements/:id",
  "GET /tags",
  "POST /tags",
  "PATCH /tags/:id",
  "DELETE /tags/:id",
  "GET /categories",
  "POST /categories",
  "PATCH /categories/:id",
  "DELETE /categories/:id",
  "GET /snapshots",
  "GET /snapshots/latest",
  "GET /snapshots/assets/:asset",
  "GET /snapshots/:id",
  "POST /binance/sync",
  "POST /binance/movements/sync",
];
const LIST_PARAMS = ["limit", "cursor", "kind", "direction", "status", "asset", "asset_match", "category_id", "tag", "tag_match", "review", "from", "to", "has_reason", "q"];
const TOTALS_PARAMS = ["kind", "direction", "status", "asset", "asset_match", "category_id", "tag", "tag_match", "review", "from", "to", "has_reason", "q", "period", "group_by", "tz"];
const EXPORT_PARAMS = ["kind", "direction", "status", "asset", "asset_match", "category_id", "tag", "tag_match", "review", "from", "to", "has_reason", "q"];
const HISTORY_PARAMS = ["from", "to", "bucket", "tz"];
const MOVEMENT_KINDS = ["deposit", "withdrawal", "pay", "p2p", "convert", "card_spend", "copy_trading", "transfer"];
const DETECTION_KINDS = ["card_spend", "copy_trading", "transfer"];
const REVIEW_ITEMS = ["none", "suspected", "confirmed", "dismissed"];
const REVIEW_DECISIONS = ["confirmed", "dismissed", "suspected"];
const MOVEMENT_STATUSES = ["pending", "completed", "failed"];
const MAX_FILTER_ITEMS = 20;
const MAX_SEARCH_RUNES = 100;
const MAX_PAGE_LIMIT = 200;
const DEFAULT_PAGE_LIMIT = 50;
const MAX_CATEGORY_RUNES = 64;
const MAX_TAG_BODY = 4 << 10;
const MAX_REASON_RUNES = 500;
const MAX_TAG_LENGTH = 32;
const MAX_TAGS = 10;
const MAX_SPLITS = 20;
const MAX_HISTORY_POINTS = 2000;
const EXPORT_MAX_ROWS = 100_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const HISTORY_DEFAULT_SPAN = 30 * DAY;

const CATEGORY_NAMES = ["Food", "Income", "Rent", "Travel"];
const SPLIT_CATEGORY_NAMES = ["Supermarket", "Transport"];
const EXTRA_CATEGORY_NAMES = ["Health", "Shopping", "Transfer", "Utilities"];
const SPENDING_KINDS = ["withdrawal", "p2p", "pay", "card_spend"];
const TAG_COLORS = ["red", "pink", "grape", "violet", "indigo", "blue", "cyan", "teal", "green", "lime", "yellow", "orange"];

const randomTagColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

function freshState() {
  const users = [{ id: 1, email: "test@example.com", password: "password" }];
  const now = new Date();
  const flags = {
    failSync: false,
    ipRestricted: false,
    delayMs: 0,
    syncInProgress: false,
    unpriced: true,
    moreCategories: false,
    gapWindow: false,
    account: "populated",
    failRoute: null,
    failStatus: 500,
  };
  return {
    users,
    sessions: new Map(), // session token -> user id
    keys: new Map(), // user id -> { mask, ipRestricted, validatedAt, updatedAt, rejectedAt }
    accounts: new Map([[1, buildAccount(flags.account, flags, now)]]), // user id -> account
    history: { snapshots: 0, movementSyncs: 0 }, // never cleared by DELETE /binance/credentials
    flags,
    nextUserId: 2,
  };
}

// Set at the end of the file, once the seed data's constants exist. freshState() reads them.
let state;

// Go's time.RFC3339 as the backend writes it: UTC, no milliseconds.
const rfc3339 = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

// The backend's Mask: the first and last 4 characters around "…", or only "…" under 16 characters.
function maskKey(key) {
  const chars = [...key];
  if (chars.length < MASK_MIN_LENGTH) {
    return "…";
  }
  return `${chars.slice(0, 4).join("")}…${chars.slice(-4).join("")}`;
}

const normalizeEmail = (email) => email.trim().toLowerCase();
const isEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+$/.test(value);

function parseObject(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY) {
        chunks.push(chunk);
      }
    });
    req.on("end", () =>
      resolve(size <= MAX_BODY ? Buffer.concat(chunks).toString("utf8") : null),
    );
    req.on("error", () => resolve(null));
  });
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return rest.join("=");
    }
  }
  return "";
}

function sessionCookie(token, maxAge) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}

// The origin the backend checks: the Origin header, else the scheme and host of Referer, else "".
function requestOrigin(req) {
  if (req.headers.origin) {
    return req.headers.origin;
  }
  try {
    const referer = new URL(req.headers.referer ?? "");
    return referer.protocol && referer.host
      ? `${referer.protocol}//${referer.host}`
      : "";
  } catch {
    return "";
  }
}

const sameHost = (origin, host) =>
  origin === `http://${host}` || origin === `https://${host}`;

const fieldError = (field, tag) =>
  `Key: 'REGISTER.${field}' Error:Field validation for '${field}' failed on the '${tag}' tag`;

// The first failing rule of REGISTER, worded as gin's validator words it.
function registerBindingError(body) {
  if (!isEmail(body.email)) {
    return fieldError("EMAIL", body.email === undefined || body.email === "" ? "required" : "email");
  }
  if (typeof body.password !== "string" || body.password === "") {
    return fieldError("PASSWORD", "required");
  }
  if (typeof body.confirm_password !== "string" || body.confirm_password === "") {
    return fieldError("CONFIRM_PASSWORD", "required");
  }
  if (body.confirm_password !== body.password) {
    return fieldError("CONFIRM_PASSWORD", "eqfield");
  }
  return null;
}

// What the fake Binance says about a candidate key, by its prefix. Only a readonly key is accepted.
function checkCandidateKey(apiKey) {
  if (apiKey.startsWith("readonly")) {
    return null;
  }
  if (apiKey.startsWith("trading")) {
    return {
      status: 422,
      body: { error: "key is not read-only", permissions: ["enableSpotAndMarginTrading"] },
    };
  }
  if (apiKey.startsWith("noread")) {
    return { status: 422, body: { error: "key cannot read" } };
  }
  return {
    status: 422,
    body: { error: "binance rejected the key", binance_code: -2015 },
  };
}

// The body of PUT /binance/credentials. Both fields must be 16 to 128 ASCII letters and digits once trimmed, as the
// backend's CheckKeyPair requires. The secret is checked and then dropped: only the trimmed key comes back.
function parseCredentials(raw) {
  if (raw === null || Buffer.byteLength(raw) > MAX_CREDENTIALS_BODY) {
    return null;
  }
  const body = parseObject(raw);
  if (!body || typeof body.api_key !== "string" || typeof body.api_secret !== "string") {
    return null;
  }
  const apiKey = body.api_key.trim();
  const apiSecret = body.api_secret.trim();
  if (!KEY_TEXT.test(apiKey) || !KEY_TEXT.test(apiSecret)) {
    return null;
  }
  return apiKey;
}

function credentialsBody(key) {
  return {
    credentials: {
      configured: true,
      api_key_masked: key.mask,
      state: key.rejectedAt ? "rejected" : "active",
      read_only: true,
      ip_restricted: key.ipRestricted,
      validated_at: rfc3339(key.validatedAt),
      rejected_at: key.rejectedAt ? rfc3339(key.rejectedAt) : null,
      updated_at: rfc3339(key.updatedAt),
    },
  };
}

// The answer when a sync can't reach Binance: a rejected key is refused by Binance, and failSync fails every call.
function syncFailure(key) {
  if (key.rejectedAt) {
    return { status: 502, body: { error: "binance request failed", binance_code: -2015 } };
  }
  if (state.flags.failSync) {
    return { status: 502, body: { error: "binance request failed" } };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Exact decimals. A decimal is a string, as the backend sends it. Sums and products are exact, and a result is written
// the way shopspring/decimal writes it: no trailing zeros, and no decimal point for a whole number.
// ---------------------------------------------------------------------------------------------------------------------

function parseDec(text) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    throw new Error(`not a decimal: ${text}`);
  }
  const fraction = match[3] ?? "";
  const value = BigInt(match[2] + fraction);
  return { v: match[1] ? -value : value, s: fraction.length };
}

function fmtDec(value, scale) {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function addDec(...values) {
  const parsed = values.map(parseDec);
  const scale = Math.max(0, ...parsed.map((p) => p.s));
  const total = parsed.reduce((sum, p) => sum + p.v * 10n ** BigInt(scale - p.s), 0n);
  return fmtDec(total, scale);
}

function mulDec(a, b) {
  const x = parseDec(a);
  const y = parseDec(b);
  return fmtDec(x.v * y.v, x.s + y.s);
}

// a / b, rounded down to scale decimals.
function divDec(a, b, scale) {
  const x = parseDec(a);
  const y = parseDec(b);
  const numerator = x.v * 10n ** BigInt(y.s + scale);
  const denominator = y.v * 10n ** BigInt(x.s);
  return fmtDec(numerator / denominator, scale);
}

// a - b, exact.
function subDec(a, b) {
  const x = parseDec(a);
  const y = parseDec(b);
  const scale = Math.max(x.s, y.s);
  return fmtDec(
    x.v * 10n ** BigInt(scale - x.s) - y.v * 10n ** BigInt(scale - y.s),
    scale,
  );
}

// A decimal rounded half away from zero to scale decimals, as the backend's round and decimal.Round do.
function roundDec(text, scale) {
  const { v, s } = parseDec(text);
  if (s <= scale) {
    return fmtDec(v, s);
  }
  const factor = 10n ** BigInt(s - scale);
  const negative = v < 0n;
  const magnitude = negative ? -v : v;
  const quotient = (magnitude + factor / 2n) / factor;
  return fmtDec(negative ? -quotient : quotient, scale);
}

// a / b, rounded half away from zero to scale decimals, for the portions' coin amounts.
function divRoundDec(a, b, scale) {
  const x = parseDec(a);
  const y = parseDec(b);
  const numerator = x.v * 10n ** BigInt(y.s + scale);
  const denominator = y.v * 10n ** BigInt(x.s);
  const negative = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  let quotient = n / d;
  if ((n % d) * 2n >= d) {
    quotient += 1n;
  }
  return fmtDec(negative ? -quotient : quotient, scale);
}

function cmpDec(a, b) {
  const x = parseDec(a);
  const y = parseDec(b);
  const scale = Math.max(x.s, y.s);
  const left = x.v * 10n ** BigInt(scale - x.s);
  const right = y.v * 10n ** BigInt(scale - y.s);
  return left < right ? -1 : left > right ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// Time zones. Postgres buckets in a zone, so these do the same with Intl: the wall clock of an instant, and the instant
// of a wall clock.
// ---------------------------------------------------------------------------------------------------------------------

const zoneFormatters = new Map();

function zoneFormatter(tz) {
  let formatter = zoneFormatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    zoneFormatters.set(tz, formatter);
  }
  return formatter;
}

function isKnownZone(tz) {
  try {
    zoneFormatter(tz);
    return true;
  } catch {
    return false;
  }
}

// The wall clock of an instant in tz, as the milliseconds of that wall clock read as UTC.
function wallClock(ms, tz) {
  const parts = {};
  for (const part of zoneFormatter(tz).formatToParts(new Date(ms))) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

// The instant whose wall clock in tz reads localMs.
function instantOfWallClock(localMs, tz) {
  const offset = (ms) => wallClock(ms, tz) - ms;
  const guess = localMs - offset(localMs);
  return localMs - offset(guess);
}

// date_trunc in a wall clock: the start of the hour, day, week (Monday) or month of localMs.
function truncateWallClock(localMs, unit) {
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  switch (unit) {
    case "hour":
      return Date.UTC(y, m, day, d.getUTCHours());
    case "day":
      return Date.UTC(y, m, day);
    case "week": {
      const sinceMonday = (d.getUTCDay() + 6) % 7;
      return Date.UTC(y, m, day - sinceMonday);
    }
    case "month":
      return Date.UTC(y, m, 1);
    default:
      throw new Error(`unknown unit ${unit}`);
  }
}

// The start of the period that holds ms, in tz, as a UTC instant.
function periodStart(ms, tz, unit) {
  return instantOfWallClock(truncateWallClock(wallClock(ms, tz), unit), tz);
}

// ---------------------------------------------------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------------------------------------------------

// The price of a coin, as the fake knows it. unpriced decides whether the coins that the seed leaves unpriced have a price.
function priceOf(asset, options, pricing = "auto") {
  if (pricing === "pending" && options.unpriced) {
    return { price: null, checked: false };
  }
  switch (asset) {
    case "USDT":
    case "USDC":
      return { price: "1", checked: true };
    case "BTC":
      return { price: "93500", checked: true };
    case "BNB":
      return { price: "620", checked: true };
    case "ETH":
      return { price: "3400", checked: true };
    case "SHIB":
      return options.unpriced ? { price: null, checked: true } : { price: "0.00001", checked: true };
    case "DOGE":
      return options.unpriced ? { price: null, checked: true } : { price: "0.1", checked: true };
    default:
      return { price: null, checked: true };
  }
}

// The first day of the current month at noon UTC. Noon keeps the day the same in every zone from UTC-11 to UTC+12.
function monthStartNoon(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12));
}

// An instant `hours` before now, kept inside the current month: never before monthStartNoon.
function thisMonthAgo(now, hours) {
  return new Date(Math.max(now.getTime() - hours * HOUR, monthStartNoon(now).getTime()));
}

// A day of last month at noon UTC.
function lastMonthOn(now, dayOfMonth) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, dayOfMonth, 12));
}

// A day two months ago or earlier, at noon UTC.
function olderOn(now, monthsAgo, dayOfMonth) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, dayOfMonth, 12));
}

function emptyAccount() {
  return {
    categories: [],
    movements: [],
    snapshots: [],
    tags: [],
    nextCategoryId: 1,
    nextMovementId: 1,
    nextSnapshotId: 1,
    nextTagId: 1001,
  };
}

function addCategory(account, name, now) {
  const category = {
    id: account.nextCategoryId++,
    name,
    createdAt: new Date(now.getTime() - 120 * DAY),
    updatedAt: new Date(now.getTime() - 120 * DAY),
  };
  account.categories.push(category);
  return category;
}

function categoryIdNamed(account, name) {
  return account.categories.find((category) => category.name === name)?.id ?? null;
}

// The backend's tags.NormalizeName: trim, the Unicode simple lowercase of each code point, 1 to 32 code points, no
// control character and no comma. Null when a rule fails.
function normalizeTagName(text) {
  const name = Array.from(text.trim(), (char) => (char === "İ" ? "i" : char.toLowerCase())).join("");
  const length = [...name].length;
  if (length < 1 || length > MAX_TAG_LENGTH || /\p{Cc}/u.test(name) || name.includes(",")) {
    return null;
  }
  return name;
}

// The names of a list, normalised, each once, sorted as the backend stores them.
function normalizeTags(items) {
  const tags = [];
  for (const item of items) {
    const name = normalizeTagName(item);
    if (name !== null && !tags.includes(name)) {
      tags.push(name);
    }
  }
  return tags.sort();
}

// A tag row. The seed starts its IDs at 1001, like the backend seed's sequence.
function addTag(account, name, color) {
  const tag = { id: account.nextTagId++, name, color, createdAt: new Date() };
  account.tags.push(tag);
  return tag;
}

// The seed registers every name its movements use, including a part's tags, in name order, with a deterministic color (as
// the backend backfill does), then one tag no movement has, so GET /tags shows the 0-count case.
function registerSeedTags(account) {
  const names = new Set();
  for (const movement of account.movements) {
    for (const name of movement.tags) {
      names.add(name);
    }
    for (const part of movement.splits) {
      for (const name of part.tags) {
        names.add(name);
      }
    }
  }
  for (const name of [...names].sort()) {
    addTag(account, name, TAG_COLORS[account.nextTagId % 12]);
  }
  addTag(account, "old-trip", TAG_COLORS[account.nextTagId % 12]);
}

// New names a movement PATCH names are created here, keeping the color of every tag that already exists.
function registerMovementTags(account, names) {
  for (const name of names) {
    if (!account.tags.some((tag) => tag.name === name)) {
      addTag(account, name, randomTagColor());
    }
  }
}

// A movement's USD value: amount times price, or null when it has no price.
function movementValue(movement) {
  return movement.usdPrice === null ? null : mulDec(movement.amount, movement.usdPrice);
}

// The exact sum of a list of parts.
function sumParts(parts) {
  return parts.reduce((sum, part) => addDec(sum, part.usdAmount), "0");
}

// The backend's FR3 status and rest. none and unpriced have no rest; applied and exceeds have the rest after the clamp
// and the sub-cent rule, "0" included.
function splitStateOf(movement) {
  if (movement.splits.length === 0) {
    return { status: "none", rest: null };
  }
  const value = movementValue(movement);
  if (value === null || cmpDec(value, "0") <= 0) {
    return { status: "unpriced", rest: null };
  }
  const status = cmpDec(sumParts(movement.splits), roundDec(value, 2)) > 0 ? "exceeds" : "applied";
  let capped = "0";
  for (const part of movement.splits) {
    capped = addDec(capped, part.usdAmount);
    if (cmpDec(capped, value) > 0) {
      capped = value;
    }
  }
  let rest = subDec(value, capped);
  if (cmpDec(rest, "0") > 0 && cmpDec(rest, "0.005") < 0) {
    rest = "0";
  }
  return { status, rest };
}

// The names in any of the lists, each once, sorted as the backend stores a movement's tags.
function unionTags(...lists) {
  return [...new Set(lists.flat())].sort();
}

// Every tag a movement's whole portion carries: its own tags, plus those of its parts when the parts don't apply.
function wholeTags(movement) {
  return unionTags(movement.tags, ...movement.splits.map((part) => part.tags));
}

// The portions totals sum and filters match, as FR3 and FR4: a part with an effective amount above 0, then the rest above
// 0, or the whole movement when its parts don't apply. Coin amounts use the cumulative rounding, so they add up exactly.
function portionsOf(movement) {
  const value = movementValue(movement);
  if (movement.splits.length === 0 || value === null || cmpDec(value, "0") <= 0) {
    return [{
      categoryId: movement.categoryId,
      amount: movement.amount,
      usd: value,
      tags: wholeTags(movement),
    }];
  }

  const caps = [];
  let cumulative = "0";
  for (const part of movement.splits) {
    cumulative = addDec(cumulative, part.usdAmount);
    caps.push(cmpDec(cumulative, value) > 0 ? value : cumulative);
  }
  let rest = subDec(value, caps[caps.length - 1]);
  if (cmpDec(rest, "0") > 0 && cmpDec(rest, "0.005") < 0) {
    caps[caps.length - 1] = value;
    rest = "0";
  }

  const portions = [];
  let previousCap = "0";
  let previousCoin = "0";
  movement.splits.forEach((part, index) => {
    const effective = subDec(caps[index], previousCap);
    const coinShare = divRoundDec(mulDec(movement.amount, caps[index]), value, 18);
    if (cmpDec(effective, "0") > 0) {
      portions.push({
        categoryId: part.categoryId,
        amount: subDec(coinShare, previousCoin),
        usd: effective,
        tags: unionTags(movement.tags, part.tags),
      });
    }
    previousCap = caps[index];
    previousCoin = coinShare;
  });
  if (cmpDec(rest, "0") > 0) {
    portions.push({
      categoryId: movement.categoryId,
      amount: subDec(movement.amount, previousCoin),
      usd: rest,
      tags: [...movement.tags],
    });
  }
  return portions;
}

// One movement of the seed. Its price comes from priceOf, and its category is named, so the seed reads like the design.
function addMovement(account, options, spec) {
  const price = priceOf(spec.asset, options, spec.priceState);
  const id = account.nextMovementId++;
  const movement = {
    id,
    source: spec.source ?? "binance",
    kind: spec.kind,
    externalId: spec.externalId ?? `${spec.kind}-${id}`,
    direction: spec.direction,
    status: spec.status ?? "completed",
    sourceStatus: spec.sourceStatus ?? null,
    asset: spec.asset,
    amount: spec.amount,
    feeAsset: spec.feeAsset ?? null,
    feeAmount: spec.feeAmount ?? null,
    counterAsset: spec.counterAsset ?? null,
    counterAmount: spec.counterAmount ?? null,
    unitPrice: spec.unitPrice ?? null,
    counterparty: spec.counterparty ?? null,
    occurredAt: spec.at,
    reason: spec.reason ?? null,
    reasonUpdatedAt: spec.reason ? spec.at : null,
    categoryId: spec.category ? categoryIdNamed(account, spec.category) : null,
    tags: normalizeTags(spec.tags ?? []),
    splits: (spec.splits ?? []).map((part) => ({
      categoryId: part.category === undefined ? (part.categoryId ?? null) : categoryIdNamed(account, part.category),
      usdAmount: part.usdAmount,
      tags: normalizeTags(part.tags ?? []),
    })),
    usdPrice: price.price,
    usdPriceSource: price.price ? "binance-1m" : null,
    usdPriceChecked: price.checked,
    reviewStatus: spec.reviewStatus ?? null,
    detection: spec.detection ?? null,
  };
  account.movements.push(movement);
  return movement;
}

// One movement the detector created. Its occurred_at is the end of its window, and the seed records its evidence as the
// backend would. The pair link is filled in by the caller once both rows exist.
function addDetectedMovement(account, options, spec) {
  const windowEnd = spec.at;
  const windowStart = spec.windowStart ?? new Date(windowEnd.getTime() - 2 * 60 * 1000);
  return addMovement(account, options, {
    ...spec,
    source: "detector",
    reviewStatus: spec.reviewStatus ?? "suspected",
    detection: {
      suggestedKind: spec.suggestedKind ?? spec.kind,
      rule: spec.rule,
      confidence: spec.confidence,
      wallet: spec.wallet ?? "spot",
      windowStart,
      windowEnd,
      spotChange: spec.spotChange ?? "0",
      fundingChange: spec.fundingChange ?? "0",
      explainedChange: spec.explainedChange ?? "0",
      pairedMovementId: null,
      conflict: spec.conflict ?? false,
    },
  });
}

const BTC_ADDRESS = "bc1qexampleforbtc0000000000000000000000";
const TRON_ADDRESS = "TQ7fWx1nhG8m4eVbZs5pR2nJc9aYdLkH3u";
const TRON_ADDRESS_2 = "TMq2Rz8dLpVb3nKwYe6hJ1sG9uXc4tAf7D";

// The seed's movements. `now` anchors every date, and the current month and last month are kept whole.
function addSeedMovements(account, options, now) {
  const thisMonth = (hours) => thisMonthAgo(now, hours);
  const specs = [
    // Current month. Two are unlabelled spending: the design's P2P sale and Pay transfer.
    {
      at: thisMonth(24), kind: "p2p", direction: "out", asset: "USDT", amount: "54", feeAsset: "USDT", feeAmount: "0.05",
      counterAsset: "ARS", counterAmount: "74520", unitPrice: "1380", counterparty: "Ana M.", sourceStatus: "COMPLETED",
    },
    {
      at: thisMonth(48), kind: "pay", direction: "out", asset: "USDT", amount: "42.5", counterparty: "Carlos R.",
      reason: "Gift for Carlos",
    },
    {
      at: thisMonth(72), kind: "withdrawal", direction: "out", asset: "USDT", amount: "275", feeAsset: "USDT", feeAmount: "1",
      counterparty: TRON_ADDRESS, sourceStatus: "6", category: "Food",
      tags: ["shared", "food", "groceries", "weekly", "card"],
    },
    {
      at: thisMonth(120), kind: "pay", direction: "out", asset: "USDT", amount: "185", counterparty: "Aerolíneas Demo",
      category: "Travel", tags: ["trip-2026"],
    },
    {
      at: thisMonth(96), kind: "deposit", direction: "in", asset: "USDT", amount: "1800", reason: "Salary", category: "Income",
      sourceStatus: "1",
    },
    {
      at: thisMonth(144), kind: "withdrawal", direction: "out", asset: "BTC", amount: "0.0004", feeAsset: "BTC", feeAmount: "0.00001",
      counterparty: BTC_ADDRESS, sourceStatus: "6", category: "Food", tags: ["shared"],
    },
    {
      at: thisMonth(192), kind: "withdrawal", direction: "out", asset: "USDT", amount: "640", feeAsset: "USDT", feeAmount: "1",
      counterparty: TRON_ADDRESS_2, sourceStatus: "6", category: "Rent",
    },
    {
      at: thisMonth(170), kind: "withdrawal", direction: "out", asset: "SHIB", amount: "1200000", counterparty: TRON_ADDRESS,
      sourceStatus: "6", category: "Travel", tags: ["trip-2026", "shared"],
    },
    {
      at: thisMonth(19), kind: "convert", direction: "out", asset: "BNB", amount: "0.5", counterAsset: "USDT", counterAmount: "305.2",
      unitPrice: "610.4",
    },
    { at: thisMonth(240), kind: "deposit", direction: "in", asset: "USDT", amount: "500", sourceStatus: "1" },
    {
      at: thisMonth(288), kind: "withdrawal", direction: "out", asset: "USDT", amount: "15", status: "failed", counterparty: TRON_ADDRESS,
      sourceStatus: "3",
    },
    {
      at: thisMonth(2.4), kind: "withdrawal", direction: "out", asset: "USDT", amount: "9", status: "pending", priceState: "pending",
      counterparty: TRON_ADDRESS_2, sourceStatus: "4",
    },
    {
      at: thisMonth(300), kind: "p2p", direction: "in", asset: "USDT", amount: "100", counterAsset: "ARS", counterAmount: "138000",
      unitPrice: "1380", counterparty: "Luis P.",
    },
    // Last month: unlabelled spending for the "See older" case, a labelled one, a deposit and a Convert.
    {
      at: lastMonthOn(now, 12), kind: "p2p", direction: "out", asset: "USDT", amount: "120", counterAsset: "ARS",
      counterAmount: "165600", unitPrice: "1380", counterparty: "Luis P.", sourceStatus: "COMPLETED",
    },
    { at: lastMonthOn(now, 3), kind: "withdrawal", direction: "out", asset: "USDT", amount: "60", counterparty: TRON_ADDRESS, sourceStatus: "6" },
    {
      at: lastMonthOn(now, 18), kind: "withdrawal", direction: "out", asset: "USDT", amount: "100", counterparty: TRON_ADDRESS_2,
      sourceStatus: "6", category: "Food", tags: ["shared"],
    },
    { at: lastMonthOn(now, 1), kind: "deposit", direction: "in", asset: "USDT", amount: "2000", sourceStatus: "1" },
    {
      at: lastMonthOn(now, 22), kind: "convert", direction: "out", asset: "USDT", amount: "250", counterAsset: "BTC",
      counterAmount: "0.00267", unitPrice: "0.0000107",
    },
  ];
  for (const spec of specs) {
    addMovement(account, options, spec);
  }

  // Older history, two and three months back, for paging and filters.
  const kinds = ["withdrawal", "pay", "p2p", "deposit", "convert"];
  for (let i = 0; i < 18; i++) {
    const kind = kinds[i % kinds.length];
    const monthsAgo = i < 9 ? 2 : 3;
    const day = 2 + ((i * 3) % 24);
    const at = olderOn(now, monthsAgo, day);
    const category = i % 4 === 0 ? "Food" : i % 4 === 1 ? "Rent" : i % 4 === 2 ? "Travel" : null;
    if (kind === "convert") {
      addMovement(account, options, {
        at, kind, direction: "out", asset: "USDT", amount: String(20 + i * 7), counterAsset: "BNB",
        counterAmount: divDec(String(20 + i * 7), "600", 8), unitPrice: "0.0016", category,
      });
    } else if (kind === "deposit") {
      addMovement(account, options, { at, kind, direction: "in", asset: "USDT", amount: String(100 + i * 11), category, sourceStatus: "1" });
    } else if (kind === "p2p") {
      addMovement(account, options, {
        at, kind, direction: i % 2 ? "in" : "out", asset: "USDT", amount: String(30 + i * 4), counterAsset: "ARS",
        counterAmount: String((30 + i * 4) * 1380), unitPrice: "1380", counterparty: "Mari G.", category,
        reason: i % 5 === 0 ? "Concert tickets" : null,
      });
    } else {
      addMovement(account, options, {
        at, kind, direction: "out", asset: "USDT", amount: String(10 + i * 5), feeAsset: "USDT", feeAmount: "1",
        counterparty: kind === "pay" ? "Pedro S." : TRON_ADDRESS, category, reason: i % 6 === 0 ? "Groceries" : null,
        sourceStatus: kind === "pay" ? null : "6",
      });
    }
  }
}

// The card-spends account: the populated seed plus this month's detected balance changes, as the backend's detector
// stores them. The three real card spends, a pending-price one, a copy pair, an unexplained gain, a dismissed card spend
// and a confirmed one with a conflict. It exercises every review state, badge and action.
function addCardSpends(account, options, now) {
  const thisMonth = (hours) => thisMonthAgo(now, hours);
  const cardSpend = (hours, amount, extra = {}) => {
    const at = thisMonth(hours);
    return addDetectedMovement(account, options, {
      at,
      kind: "card_spend",
      suggestedKind: "card_spend",
      direction: "out",
      asset: "USDT",
      amount,
      rule: "unexplained_drop",
      confidence: "medium",
      wallet: "spot",
      spotChange: `-${amount}`,
      ...extra,
    });
  };

  cardSpend(18, "4.0427944");
  cardSpend(30, "5.06605855", { fundingChange: "50", explainedChange: "50" });
  cardSpend(42, "20.25533879");
  cardSpend(90, "6.5", { priceState: "pending" });

  // A copy-trading investment and its close, two days apart. Both rows link to each other.
  const copyDrop = addDetectedMovement(account, options, {
    at: thisMonth(66),
    kind: "copy_trading",
    suggestedKind: "copy_trading",
    direction: "out",
    asset: "USDT",
    amount: "200",
    rule: "copy_pair",
    confidence: "high",
    wallet: "spot",
    spotChange: "-200",
  });
  const copyGain = addDetectedMovement(account, options, {
    at: thisMonth(18),
    kind: "copy_trading",
    suggestedKind: "copy_trading",
    direction: "in",
    asset: "USDT",
    amount: "186.47",
    rule: "copy_pair",
    confidence: "high",
    wallet: "spot",
    spotChange: "186.47",
  });
  copyDrop.detection.pairedMovementId = copyGain.id;
  copyGain.detection.pairedMovementId = copyDrop.id;

  addDetectedMovement(account, options, {
    at: thisMonth(54),
    kind: "transfer",
    suggestedKind: "transfer",
    direction: "in",
    asset: "USDT",
    amount: "12.5",
    rule: "unexplained_gain",
    confidence: "low",
    wallet: "spot",
    spotChange: "12.5",
  });

  cardSpend(72, "3", { reviewStatus: "dismissed" });

  cardSpend(96, "7.77", {
    reviewStatus: "confirmed",
    category: "Food",
    conflict: true,
  });
}

// The splits account: the populated seed plus Supermarket and Transport and this month's movements that show every state:
// applied with a rest, a fully split movement out of the label queue, an uncategorized rest that's in it, exceeds, unpriced
// and the sub-cent rest that joins the last part.
function addSplits(account, options, now) {
  const thisMonth = (hours) => thisMonthAgo(now, hours);

  addMovement(account, options, {
    at: thisMonth(36), kind: "p2p", direction: "out", asset: "USDT", amount: "100",
    counterAsset: "ARS", counterAmount: "138000", unitPrice: "1380", counterparty: "Ana M.", category: "Food",
    splits: [
      { category: "Supermarket", usdAmount: "20", tags: ["groceries"] },
      { category: "Transport", usdAmount: "30" },
    ],
  });
  addMovement(account, options, {
    at: thisMonth(60), kind: "pay", direction: "out", asset: "USDT", amount: "60", counterparty: "Carlos R.",
    splits: [
      { category: "Supermarket", usdAmount: "35" },
      { category: "Transport", usdAmount: "25" },
    ],
  });
  addMovement(account, options, {
    at: thisMonth(84), kind: "withdrawal", direction: "out", asset: "USDT", amount: "45",
    counterparty: TRON_ADDRESS, sourceStatus: "6",
    splits: [{ category: "Supermarket", usdAmount: "15" }],
  });
  addMovement(account, options, {
    at: thisMonth(108), kind: "pay", direction: "out", asset: "USDT", amount: "100", counterparty: "Pedro S.",
    splits: [
      { category: "Transport", usdAmount: "60" },
      { category: "Transport", usdAmount: "50" },
    ],
  });
  addMovement(account, options, {
    at: thisMonth(132), kind: "withdrawal", direction: "out", asset: "SHIB", amount: "1200000",
    counterparty: TRON_ADDRESS, sourceStatus: "6",
    splits: [{ category: "Transport", usdAmount: "15" }],
  });
  addMovement(account, options, {
    at: thisMonth(156), kind: "withdrawal", direction: "out", asset: "USDT", amount: "100.004",
    counterparty: TRON_ADDRESS_2, sourceStatus: "6",
    splits: [{ category: "Transport", usdAmount: "100" }],
  });
}


// Snapshots: hourly for the last 72 hours, then every 6 hours for 30 days. Totals are in cents, so they stay exact.
const SNAPSHOT_HOURS = [
  ...Array.from({ length: 73 }, (_, hours) => hours),
  ...Array.from({ length: 105 }, (_, i) => 78 + i * 6).filter((hours) => hours <= 720),
];

// The priced total in cents, hours before now. From 24 to 48 hours back it's flat, so the comparison with the balance a
// day ago doesn't depend on when the page is opened. The last day rises to the current total, and older history wanders.
function targetTotalCents(hoursAgo) {
  if (hoursAgo === 0) {
    return 1254678n;
  }
  if (hoursAgo < 24) {
    return 1224086n + BigInt(Math.round((30592 * (24 - hoursAgo)) / 24));
  }
  if (hoursAgo <= 48) {
    return 1224086n;
  }
  return 1224086n - BigInt(Math.round(1500 + 1500 * Math.sin(hoursAgo / 60)));
}

// ADA is held from 5 to 14 days ago and sold since, so the Assets pages have a coin that is no longer held, with its history.
// With unpriced on, its price is missing from 8 to 10 days ago, so that history has a gap in the middle of the line.
const adaHeldAt = (hoursAgo) => hoursAgo >= 120 && hoursAgo < 336;
const adaUnpricedAt = (hoursAgo) => hoursAgo >= 200 && hoursAgo < 240;

// The holdings at one time. Bitcoin takes the difference, so the priced rows add up to the target total. ADA's value moves
// out of Bitcoin when it's priced, so the total is the same whether ADA is held or not.
function holdingsAt(hoursAgo, options) {
  const dogePriced = options.unpriced ? null : 15000n;
  // With moreCategories there's a sixth coin, so Holdings has to cut its list to five.
  const solUsd = options.moreCategories ? 4140n : 0n;
  const adaHeld = adaHeldAt(hoursAgo);
  const adaUsd = adaHeld && !(options.unpriced && adaUnpricedAt(hoursAgo)) ? 4500n : null;
  const others = 120418n + 200000n + 168890n + 124140n + (dogePriced ?? 0n) + solUsd + (adaUsd ?? 0n);
  const btcFunding = 191230n;
  const btcTotal = targetTotalCents(hoursAgo) - others;
  const btcSpot = btcTotal - btcFunding;
  const rows = [
    // Some of Bitcoin is locked in the spot wallet, and some is frozen in the funding wallet, so the split has values.
    { wallet: "spot", asset: "BTC", usd: btcSpot, price: "93500", locked: "0.00100000" },
    { wallet: "funding", asset: "BTC", usd: btcFunding, price: "93500", freeze: "0.00000001" },
    { wallet: "spot", asset: "USDT", usd: 120418n, price: "1" },
    { wallet: "funding", asset: "USDT", usd: 200000n, price: "1" },
    { wallet: "spot", asset: "ETH", usd: 168890n, price: "3400" },
    { wallet: "spot", asset: "BNB", usd: 124140n, price: "620" },
    { wallet: "spot", asset: "DOGE", usd: dogePriced, price: "0.1", amount: "1500" },
    ...(options.moreCategories ? [{ wallet: "spot", asset: "SOL", usd: solUsd, price: "150" }] : []),
    ...(adaHeld ? [{ wallet: "spot", asset: "ADA", usd: adaUsd, price: "0.45", amount: "100" }] : []),
  ];
  return rows.map((row) => {
    const priced = row.usd !== null;
    const usdText = priced ? fmtDec(row.usd, 2) : null;
    const amount = row.amount ?? (priced ? divDec(usdText, row.price, 8) : "1500");
    return {
      walletType: row.wallet,
      asset: row.asset,
      amount,
      locked: row.locked ?? "0",
      freeze: row.freeze ?? "0",
      usdValue: usdText,
      btcValuation: priced ? divDec(usdText, "93500", 8) : "0",
      priced,
    };
  });
}

function snapshotFromHoldings(id, capturedAt, hoursAgo, options) {
  const rows = holdingsAt(hoursAgo, options);
  const pricedRows = rows.filter((row) => row.priced);
  // The USD values have at most two decimals, so each one is an exact number of cents.
  const centsOf = (text) => {
    const parsed = parseDec(text);
    return parsed.v * 10n ** BigInt(2 - parsed.s);
  };
  const sumCents = (list) => list.reduce((total, row) => total + centsOf(row.usdValue), 0n);
  const toText = (cents) => fmtDec(cents, 2);
  return {
    id,
    capturedAt,
    btcUsdPrice: "93500",
    totalUsd: toText(sumCents(pricedRows)),
    spotTotalUsd: toText(sumCents(pricedRows.filter((row) => row.walletType === "spot"))),
    fundingTotalUsd: toText(sumCents(pricedRows.filter((row) => row.walletType === "funding"))),
    unpricedCount: rows.length - pricedRows.length,
    assets: rows,
  };
}

// The newest seeded snapshot is dated two minutes before the build, as a real sync is: a query that ends now still sees it.
function addSeedSnapshots(account, options, now, count) {
  const hours = count === "latest" ? [0] : SNAPSHOT_HOURS;
  for (const hoursAgo of hours) {
    const offset = hoursAgo === 0 ? 2 * 60 * 1000 : 0;
    const capturedAt = new Date(now.getTime() - hoursAgo * HOUR - offset);
    account.snapshots.push(snapshotFromHoldings(account.nextSnapshotId++, capturedAt, hoursAgo, options));
  }
}

// Builds an account by kind. Options are the flags that change data: unpriced and moreCategories.
function buildAccount(kind, flags, now) {
  const account = emptyAccount();
  if (kind === "empty") {
    return account;
  }
  const options = { unpriced: flags.unpriced, moreCategories: flags.moreCategories };
  const names = [
    ...CATEGORY_NAMES,
    ...(kind === "splits" ? SPLIT_CATEGORY_NAMES : []),
    ...(options.moreCategories ? EXTRA_CATEGORY_NAMES : []),
  ];
  for (const name of names) {
    addCategory(account, name, now);
  }
  addSeedMovements(account, options, now);
  if (kind === "card-spends") {
    addCardSpends(account, options, now);
  }
  if (kind === "splits") {
    addSplits(account, options, now);
  }

  const monthFloor = monthStartNoon(now).getTime();
  const isThisMonthSpending = (movement) =>
    SPENDING_KINDS.includes(movement.kind) && movement.direction === "out" && movement.status === "completed" &&
    movement.occurredAt.getTime() >= monthFloor;
  if (kind === "all-labelled") {
    for (const movement of account.movements) {
      if (isThisMonthSpending(movement) && movement.categoryId === null) {
        movement.categoryId = categoryIdNamed(account, "Food");
      }
    }
  }
  if (kind === "many-unlabelled") {
    [12, 36, 60, 84, 108].forEach((hours, i) => {
      addMovement(account, options, {
        at: thisMonthAgo(now, hours), kind: "withdrawal", direction: "out", asset: "USDT", amount: String(10 + i * 10),
        counterparty: TRON_ADDRESS, sourceStatus: "6",
      });
    });
  }
  if (kind === "quiet-month") {
    account.movements = account.movements.filter((movement) => !isThisMonthSpending(movement));
  }
  if (kind === "long-history") {
    // The populated account has 35 movements, so the list (50 a page) never pages. These 110 older ones, from four to seven
    // months back, make Load more and the filters' paging visible. Spending is three movements in four, most of it out.
    for (let i = 0; i < 110; i++) {
      const spending = i % 4 !== 3;
      addMovement(account, options, {
        at: olderOn(now, 4 + (i % 4), 1 + ((i * 7) % 27)),
        kind: spending ? (i % 2 ? "withdrawal" : "pay") : "deposit",
        direction: spending ? "out" : "in",
        asset: "USDT",
        amount: String(5 + (i % 40)),
        counterparty: spending ? TRON_ADDRESS_2 : null,
        sourceStatus: spending ? "6" : "1",
        category: i % 3 === 0 ? "Food" : i % 3 === 1 ? "Rent" : null,
        reason: i % 5 === 0 ? "Bulk note" : null,
      });
    }
  }
  if (options.moreCategories) {
    // Spending this month in the extra categories, so the label card's top five by use differ from the name order.
    const extra = [
      ["Shopping", 3, 15], ["Health", 2, 25], ["Transfer", 1, 30],
    ];
    let hours = 30;
    for (const [category, times, amount] of extra) {
      for (let i = 0; i < times; i++) {
        addMovement(account, options, {
          at: thisMonthAgo(now, hours), kind: "withdrawal", direction: "out", asset: "USDT", amount: String(amount + i),
          counterparty: TRON_ADDRESS, sourceStatus: "6", category,
        });
        hours += 9;
      }
    }
  }
  if (kind !== "single-snapshot") {
    addSeedSnapshots(account, options, now, "series");
  } else {
    addSeedSnapshots(account, options, now, "latest");
  }
  registerSeedTags(account);
  return account;
}

// ---------------------------------------------------------------------------------------------------------------------
// The wire shapes, as the Go structs write them
// ---------------------------------------------------------------------------------------------------------------------

function movementJson(movement) {
  const priced = movement.usdPrice !== null;
  const splitState = splitStateOf(movement);
  return {
    id: movement.id,
    source: movement.source,
    kind: movement.kind,
    external_id: movement.externalId,
    direction: movement.direction,
    status: movement.status,
    source_status: movement.sourceStatus,
    asset: movement.asset,
    amount: movement.amount,
    fee_asset: movement.feeAsset,
    fee_amount: movement.feeAmount,
    counter_asset: movement.counterAsset,
    counter_amount: movement.counterAmount,
    unit_price: movement.unitPrice,
    counterparty: movement.counterparty,
    occurred_at: rfc3339(movement.occurredAt),
    reason: movement.reason,
    reason_updated_at: movement.reasonUpdatedAt ? rfc3339(movement.reasonUpdatedAt) : null,
    category_id: movement.categoryId,
    tags: movement.tags,
    usd_price: movement.usdPrice,
    usd_price_source: priced ? movement.usdPriceSource : null,
    usd_price_status: priced ? "priced" : movement.usdPriceChecked ? "unavailable" : "pending",
    usd_value: priced ? mulDec(movement.amount, movement.usdPrice) : null,
    fee_usd_value:
      priced && movement.feeAmount !== null && movement.feeAsset === movement.asset
        ? mulDec(movement.feeAmount, movement.usdPrice)
        : null,
    review_status: movement.reviewStatus,
    detection: movement.detection ? detectionJson(movement.detection) : null,
    splits: movement.splits.map((part) => ({
      category_id: part.categoryId,
      usd_amount: part.usdAmount,
      tags: part.tags,
    })),
    split_status: splitState.status,
    split_rest_usd: splitState.rest,
  };
}

function detectionJson(detection) {
  return {
    suggested_kind: detection.suggestedKind,
    rule: detection.rule,
    confidence: detection.confidence,
    wallet: detection.wallet,
    window_start: rfc3339(detection.windowStart),
    window_end: rfc3339(detection.windowEnd),
    spot_change: detection.spotChange,
    funding_change: detection.fundingChange,
    explained_change: detection.explainedChange,
    paired_movement_id: detection.pairedMovementId,
    conflict: detection.conflict,
  };
}

function categoryJson(category) {
  return {
    id: category.id,
    name: category.name,
    created_at: rfc3339(category.createdAt),
    updated_at: rfc3339(category.updatedAt),
  };
}

// A snapshot, as GET /snapshots/latest and GET /snapshots/:id answer it. Assets come in the backend's order: the largest
// USD value first, unpriced assets last, then by wallet and asset.
function snapshotJson(snapshot) {
  const assets = [...snapshot.assets].sort((a, b) => {
    if (a.usdValue === null || b.usdValue === null) {
      if (a.usdValue === b.usdValue) {
        return a.walletType.localeCompare(b.walletType) || a.asset.localeCompare(b.asset);
      }
      return a.usdValue === null ? 1 : -1;
    }
    return cmpDec(b.usdValue, a.usdValue) || a.walletType.localeCompare(b.walletType) || a.asset.localeCompare(b.asset);
  });
  return {
    id: snapshot.id,
    captured_at: rfc3339(snapshot.capturedAt),
    price_symbol: "BTCUSDC",
    btc_usd_price: snapshot.btcUsdPrice,
    total_usd: snapshot.totalUsd,
    spot_total_usd: snapshot.spotTotalUsd,
    funding_total_usd: snapshot.fundingTotalUsd,
    unpriced_count: snapshot.unpricedCount,
    assets: assets.map((row) => ({
      wallet_type: row.walletType,
      asset: row.asset,
      // The amount is free, locked and frozen together, so free is what's left once the other two are taken out.
      free: addDec(row.amount, `-${row.locked}`, `-${row.freeze}`),
      locked: row.locked,
      freeze: row.freeze,
      btc_valuation: row.btcValuation,
      usd_value: row.usdValue,
      priced: row.priced,
    })),
  };
}

function historyPointJson(snapshot, bucketStart) {
  return {
    bucket_start: rfc3339(bucketStart),
    snapshot_id: snapshot.id,
    captured_at: rfc3339(snapshot.capturedAt),
    total_usd: snapshot.totalUsd,
    spot_total_usd: snapshot.spotTotalUsd,
    funding_total_usd: snapshot.fundingTotalUsd,
    unpriced_count: snapshot.unpricedCount,
  };
}

function describeState() {
  const counts = Object.fromEntries(
    state.users.map((user) => {
      const account = state.accounts.get(user.id);
      return [
        user.email,
        account
          ? { movements: account.movements.length, categories: account.categories.length, snapshots: account.snapshots.length }
          : { movements: 0, categories: 0, snapshots: 0 },
      ];
    }),
  );
  return {
    users: state.users.map((user) => user.email),
    flags: { ...state.flags },
    keys: Object.fromEntries(
      state.users.map((user) => {
        const key = state.keys.get(user.id);
        return [
          user.email,
          key
            ? {
                configured: true,
                api_key_masked: key.mask,
                state: key.rejectedAt ? "rejected" : "active",
                ip_restricted: key.ipRestricted,
              }
            : { configured: false },
        ];
      }),
    ),
    accounts: counts,
    history: { ...state.history },
    sessions: state.sessions.size,
  };
}

// Rebuilds the account of the seeded user from the flags. Other users keep theirs.
function rebuildSeededAccount() {
  state.accounts.set(1, buildAccount(state.flags.account, state.flags, new Date()));
}

// POST /__fake/state. Every field is checked before any of them is applied.
function applyFakeState(raw) {
  const body = parseObject(raw);
  if (!body) {
    return { status: 400, body: { error: "expected a JSON object" } };
  }
  const unknown = Object.keys(body).find((name) => !FLAG_FIELDS.includes(name));
  if (unknown !== undefined) {
    return { status: 400, body: { error: `unknown field: ${unknown}` } };
  }
  for (const name of FLAG_BOOLEANS) {
    if (body[name] !== undefined && typeof body[name] !== "boolean") {
      return { status: 400, body: { error: `${name} must be true or false` } };
    }
  }
  if (
    body.delayMs !== undefined &&
    !(Number.isInteger(body.delayMs) && body.delayMs >= 0 && body.delayMs <= MAX_DELAY_MS)
  ) {
    return { status: 400, body: { error: `delayMs must be 0 to ${MAX_DELAY_MS}` } };
  }
  if (body.account !== undefined && !ACCOUNT_KINDS.includes(body.account)) {
    return { status: 400, body: { error: `account must be one of ${ACCOUNT_KINDS.join(", ")}` } };
  }
  if (body.failRoute !== undefined && body.failRoute !== null && !FAIL_ROUTES.includes(body.failRoute)) {
    return { status: 400, body: { error: `failRoute must be null or one of ${FAIL_ROUTES.join(", ")}` } };
  }
  if (body.failStatus !== undefined && !(Number.isInteger(body.failStatus) && body.failStatus >= 400 && body.failStatus <= 599)) {
    return { status: 400, body: { error: "failStatus must be 400 to 599" } };
  }
  if (body.rejectKey !== undefined && state.keys.size === 0 && body.reset !== true) {
    return { status: 409, body: { error: "binance credentials not set" } };
  }

  if (body.reset === true) {
    state = freshState();
  }
  if (body.failSync !== undefined) {
    state.flags.failSync = body.failSync;
  }
  if (body.ipRestricted !== undefined) {
    state.flags.ipRestricted = body.ipRestricted;
  }
  if (body.delayMs !== undefined) {
    state.flags.delayMs = body.delayMs;
  }
  if (body.syncInProgress !== undefined) {
    state.flags.syncInProgress = body.syncInProgress;
  }
  if (body.failRoute !== undefined) {
    state.flags.failRoute = body.failRoute;
  }
  if (body.failStatus !== undefined) {
    state.flags.failStatus = body.failStatus;
  }
  if (body.rejectKey !== undefined) {
    const rejectedAt = body.rejectKey ? new Date() : null;
    for (const key of state.keys.values()) {
      key.rejectedAt = rejectedAt;
    }
  }
  let rebuild = body.reset === true;
  for (const name of ["account", "unpriced", "moreCategories", "gapWindow"]) {
    if (body[name] !== undefined) {
      state.flags[name] = body[name];
      rebuild = rebuild || name !== "gapWindow";
    }
  }
  if (rebuild) {
    rebuildSeededAccount();
  }
  return { status: 200, body: describeState() };
}

// Mirrors the backend's AuthMiddleware: the cookie decides, then the origin check for unsafe methods.
// It returns the user id, or null after it has answered the request.
function authenticate(req, reply) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) {
    reply(401, { error: "No token was found" });
    return null;
  }
  const userId = state.sessions.get(token);
  if (userId === undefined) {
    reply(401, { error: "Couldn't handle this token" });
    return null;
  }
  if (UNSAFE_METHODS.has(req.method) && requestOrigin(req) !== APP_ORIGIN) {
    reply(403, { error: "Origin not allowed" });
    return null;
  }
  return userId;
}

function login(raw, reply) {
  const body = parseObject(raw);
  if (
    !body ||
    !isEmail(body.email) ||
    typeof body.password !== "string" ||
    body.password === ""
  ) {
    return reply(400, { message: "Invalid values" });
  }
  if (Buffer.byteLength(body.password) > MAX_PASSWORD_BYTES) {
    return reply(401, { message: "Invalid credentials" });
  }
  const user = state.users.find((candidate) => candidate.email === normalizeEmail(body.email));
  if (!user || user.password !== body.password) {
    return reply(401, { message: "Invalid credentials" });
  }
  const token = randomBytes(24).toString("base64url");
  state.sessions.set(token, user.id);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  return reply(
    200,
    { status: "client logged in successfully", expires_at: rfc3339(expiresAt) },
    { "Set-Cookie": sessionCookie(token, SESSION_SECONDS) },
  );
}

function register(raw, reply) {
  const body = parseObject(raw);
  if (!body) {
    return reply(400, { message: "invalid JSON body" });
  }
  const bindingError = registerBindingError(body);
  if (bindingError) {
    return reply(400, { message: bindingError });
  }
  if (Buffer.byteLength(body.password) > MAX_PASSWORD_BYTES) {
    return reply(400, { error: "Password must be at most 72 bytes" });
  }
  const email = normalizeEmail(body.email);
  if (state.users.some((user) => user.email === email)) {
    return reply(409, { message: "client already registered" });
  }
  const id = state.nextUserId++;
  state.users.push({ id, email, password: body.password });
  state.accounts.set(id, emptyAccount());
  return reply(201, { message: "client registered successfully" });
}

// Like the backend, logout only clears the cookie. The token itself isn't revoked.
function logout(reply) {
  return reply(200, { status: "logged out" }, { "Set-Cookie": sessionCookie("", 0) });
}

function getCredentials(req, reply) {
  const userId = authenticate(req, reply);
  if (userId === null) {
    return;
  }
  const key = state.keys.get(userId);
  return reply(200, key ? credentialsBody(key) : { credentials: { configured: false } });
}

function putCredentials(req, raw, reply) {
  const userId = authenticate(req, reply);
  if (userId === null) {
    return;
  }
  const apiKey = parseCredentials(raw);
  if (apiKey === null) {
    return reply(400, { error: "invalid credentials" });
  }
  const refusal = checkCandidateKey(apiKey);
  if (refusal) {
    return reply(refusal.status, refusal.body);
  }
  const existed = state.keys.has(userId);
  const now = new Date();
  state.keys.set(userId, {
    mask: maskKey(apiKey),
    ipRestricted: state.flags.ipRestricted,
    validatedAt: now,
    updatedAt: now,
    rejectedAt: null,
  });
  return reply(existed ? 200 : 201, credentialsBody(state.keys.get(userId)));
}

function deleteCredentials(req, reply) {
  const userId = authenticate(req, reply);
  if (userId === null) {
    return;
  }
  if (!state.keys.delete(userId)) {
    return reply(404, { error: "credentials not found" });
  }
  return reply(204);
}

// POST /binance/sync. The fake Binance holds the same balances every time, so a sync adds a snapshot of them, dated now.
function syncBalances(req, reply) {
  const userId = authenticate(req, reply);
  if (userId === null) {
    return;
  }
  const key = state.keys.get(userId);
  if (!key) {
    return reply(409, { error: "binance credentials not set" });
  }
  if (state.flags.syncInProgress) {
    return reply(409, { error: "sync already in progress" });
  }
  const failure = syncFailure(key);
  if (failure) {
    return reply(failure.status, failure.body);
  }
  state.history.snapshots += 1;
  const account = state.accounts.get(userId);
  const options = { unpriced: state.flags.unpriced, moreCategories: state.flags.moreCategories };
  const snapshot = snapshotFromHoldings(account.nextSnapshotId++, new Date(), 0, options);
  account.snapshots.push(snapshot);
  return reply(201, { snapshot: snapshotJson(snapshot) });
}

// POST /binance/movements/sync. Nothing new is fetched: the counts describe the account as it is.
function syncMovements(req, reply) {
  const userId = authenticate(req, reply);
  if (userId === null) {
    return;
  }
  const key = state.keys.get(userId);
  if (!key) {
    return reply(409, { error: "binance credentials not set" });
  }
  if (state.flags.syncInProgress) {
    return reply(409, { error: "sync already in progress" });
  }
  const failure = syncFailure(key);
  if (failure) {
    return reply(failure.status, failure.body);
  }
  state.history.movementSyncs += 1;
  const account = state.accounts.get(userId);
  const priced = account.movements.filter((movement) => movement.usdPrice !== null).length;
  const unavailable = account.movements.filter((movement) => movement.usdPrice === null && movement.usdPriceChecked).length;
  const pending = account.movements.filter((movement) => movement.usdPrice === null && !movement.usdPriceChecked).length;
  return reply(200, {
    kinds: [
      { kind: "deposit", status: "ok", fetched: 0, inserted: 0, updated: 0 },
      { kind: "withdrawal", status: "ok", fetched: 0, inserted: 0, updated: 0 },
      { kind: "pay", status: "ok", fetched: 0, inserted: 0, updated: 0 },
      { kind: "p2p", status: "ok", fetched: 0, inserted: 0, updated: 0 },
      { kind: "convert", status: "ok", fetched: 0, inserted: 0, updated: 0 },
    ],
    valuation: { status: "ok", priced, unavailable, pending },
    detection: { status: "ok", windows: 0, created: 0, updated: 0, retracted: 0, conflicts: 0 },
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Query strings, read as the backend reads them: a broken escape or a semicolon makes a listed parameter unreadable, a
// repeated or empty one is invalid, and a + is a space.
// ---------------------------------------------------------------------------------------------------------------------

function parseQuery(rawQuery) {
  let unreadable = null;
  for (const pair of rawQuery.split("&")) {
    if (pair === "") {
      continue;
    }
    const cut = pair.indexOf("=");
    const name = cut === -1 ? pair : pair.slice(0, cut);
    const value = cut === -1 ? "" : pair.slice(cut + 1);
    const broken = /%(?![0-9A-Fa-f]{2})/.test(name) || /%(?![0-9A-Fa-f]{2})/.test(value) || pair.includes(";");
    if (broken) {
      const key = name.replace(/\+/g, " ").replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      unreadable ??= key;
    }
  }
  return { unreadable, params: new URLSearchParams(rawQuery) };
}

// The first listed parameter that is unreadable, or null.
function unreadableParam(parsed, names) {
  return parsed.unreadable && names.includes(parsed.unreadable) ? parsed.unreadable : null;
}

// A parameter that may appear once. ok is false when it's empty or repeated; present is false when it's missing.
function single(params, name) {
  const values = params.getAll(name);
  if (values.length === 0) {
    return { present: false, ok: true, value: "" };
  }
  if (values.length !== 1 || values[0] === "") {
    return { present: true, ok: false, value: "" };
  }
  return { present: true, ok: true, value: values[0] };
}

// A comma list parameter. It returns the items, or null when it's empty, repeated, too long, or an item isn't allowed.
function list(params, name, allowed) {
  const read = single(params, name);
  if (!read.present) {
    return { present: false, items: [] };
  }
  if (!read.ok) {
    return { present: true, items: null };
  }
  const items = read.value.split(",");
  if (items.length > MAX_FILTER_ITEMS || items.some((item) => item === "" || !allowed(item))) {
    return { present: true, items: null };
  }
  return { present: true, items };
}

const isAssetSymbol = (text) => /^[A-Za-z0-9]{1,32}$/.test(text);
const categoryItemAllowed = (item) => item === "none" || /^[1-9]\d{0,18}$/.test(item) && BigInt(item) <= 9223372036854775807n;

// An RFC 3339 instant with an offset, which may have fractional seconds. A bare + has already become a space, so it fails.
function instantOf(text) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(text)) {
    return null;
  }
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : new Date(ms);
}

// from and to, as the backend reads them. Each is an instant, from is included and to is excluded.
function timeRange(params) {
  const from = single(params, "from");
  const to = single(params, "to");
  if (from.present && !from.ok) {
    return { error: "invalid from" };
  }
  if (to.present && !to.ok) {
    return { error: "invalid to" };
  }
  const fromDate = from.present ? instantOf(from.value) : null;
  if (from.present && !fromDate) {
    return { error: "invalid from" };
  }
  const toDate = to.present ? instantOf(to.value) : null;
  if (to.present && !toDate) {
    return { error: "invalid to" };
  }
  if (fromDate && toDate && fromDate.getTime() >= toDate.getTime()) {
    return { error: "invalid range" };
  }
  return { from: fromDate, to: toDate };
}

// The filter of GET /movements, GET /movements/totals and GET /movements/export. The first bad parameter is the error.
function parseMovementFilter(params) {
  const kinds = list(params, "kind", (item) => MOVEMENT_KINDS.includes(item));
  if (kinds.items === null) return { error: "invalid kind" };
  const statuses = list(params, "status", (item) => MOVEMENT_STATUSES.includes(item));
  if (statuses.items === null) return { error: "invalid status" };
  const reviews = list(params, "review", (item) => REVIEW_ITEMS.includes(item));
  if (reviews.items === null) return { error: "invalid review" };
  const assets = list(params, "asset", isAssetSymbol);
  if (assets.items === null) return { error: "invalid asset" };
  const assetMatch = single(params, "asset_match");
  if (assetMatch.present && (!assetMatch.ok || (assetMatch.value !== "asset" && assetMatch.value !== "any"))) {
    return { error: "invalid asset_match" };
  }
  const search = single(params, "q");
  let text = "";
  if (search.present) {
    text = search.ok ? search.value.trim() : "";
    const runes = [...text].length;
    if (!search.ok || runes < 1 || runes > MAX_SEARCH_RUNES || text.includes("\u0000")) {
      return { error: "invalid q" };
    }
  }
  const categories = list(params, "category_id", categoryItemAllowed);
  if (categories.items === null) return { error: "invalid category_id" };
  const tags = list(params, "tag", (item) => normalizeTagName(item) !== null);
  if (tags.items === null) return { error: "invalid tag" };
  const tagMatch = single(params, "tag_match");
  if (tagMatch.present && (!tagMatch.ok || (tagMatch.value !== "any" && tagMatch.value !== "all"))) {
    return { error: "invalid tag_match" };
  }
  const direction = single(params, "direction");
  if (direction.present && (!direction.ok || (direction.value !== "in" && direction.value !== "out"))) {
    return { error: "invalid direction" };
  }
  const hasReason = single(params, "has_reason");
  if (hasReason.present && (!hasReason.ok || (hasReason.value !== "true" && hasReason.value !== "false"))) {
    return { error: "invalid has_reason" };
  }
  const range = timeRange(params);
  if (range.error) return { error: range.error };
  return {
    filter: {
      kinds: kinds.items,
      statuses: statuses.items,
      reviewed: reviews.items.length > 0,
      reviewStatuses: reviews.items.filter((item) => item !== "none"),
      reviewFromBinance: reviews.items.includes("none"),
      assets: assets.items.map((asset) => asset.toUpperCase()),
      assetMatchAny: assetMatch.present && assetMatch.value === "any",
      search: text,
      categoryIDs: categories.items.filter((item) => item !== "none").map((item) => Number(item)),
      uncategorized: categories.items.includes("none"),
      tags: [...new Set(tags.items.map((item) => normalizeTagName(item)))],
      tagMatchAll: tagMatch.present && tagMatch.value === "all",
      direction: direction.present ? direction.value : "",
      hasReason: hasReason.present ? hasReason.value === "true" : null,
      from: range.from,
      to: range.to,
    },
  };
}

// The filters that are on the movement itself: kind, direction, status, review, asset, search, dates and reason. The
// category and tag filters are per portion, so they're in matchesFilter and in totalsOf.
function matchesMovementFilter(movement, filter) {
  if (filter.kinds.length && !filter.kinds.includes(movement.kind)) return false;
  if (filter.direction && movement.direction !== filter.direction) return false;
  if (filter.statuses.length && !filter.statuses.includes(movement.status)) return false;
  if (filter.reviewed) {
    const fromBinance = movement.reviewStatus === null;
    if (fromBinance ? !filter.reviewFromBinance : !filter.reviewStatuses.includes(movement.reviewStatus)) return false;
  } else if (movement.reviewStatus === "dismissed") {
    return false;
  }
  if (filter.assets.length) {
    const assetHit = filter.assets.includes(movement.asset);
    const counterHit = filter.assetMatchAny && movement.counterAsset !== null && filter.assets.includes(movement.counterAsset);
    if (!assetHit && !counterHit) return false;
  }
  if (filter.search) {
    const needle = filter.search.toLowerCase();
    const reason = movement.reason?.toLowerCase().includes(needle) ?? false;
    const counterparty = movement.counterparty?.toLowerCase().includes(needle) ?? false;
    if (!reason && !counterparty) return false;
  }
  if (filter.from && movement.occurredAt.getTime() < filter.from.getTime()) return false;
  if (filter.to && movement.occurredAt.getTime() >= filter.to.getTime()) return false;
  if (filter.hasReason !== null && (movement.reason !== null) !== filter.hasReason) return false;
  return true;
}

// One portion's category against the category filter. No category filter means every category matches.
function portionCategoryHit(categoryId, filter) {
  if (!filter.categoryIDs.length && !filter.uncategorized) return true;
  if (categoryId !== null && filter.categoryIDs.includes(categoryId)) return true;
  return filter.uncategorized && categoryId === null;
}

// One portion's tags against the tag filter. A part inherits the movement's tags (FR4).
function portionTagsHit(tags, filter) {
  if (!filter.tags.length) return true;
  return filter.tagMatchAll
    ? filter.tags.every((tag) => tags.includes(tag))
    : filter.tags.some((tag) => tags.includes(tag));
}

// A movement matches when at least one portion satisfies both the category and tag filters together (FR4).
function matchesFilter(movement, filter) {
  if (!matchesMovementFilter(movement, filter)) return false;
  if (!filter.categoryIDs.length && !filter.uncategorized && !filter.tags.length) return true;
  return portionsOf(movement).some(
    (portion) => portionCategoryHit(portion.categoryId, filter) && portionTagsHit(portion.tags, filter),
  );
}

// Newest first, with the ID as the tie-break, as the backend orders the list.
const newestFirst = (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id - a.id;

function encodeCursor(movement) {
  return Buffer.from(JSON.stringify({ t: rfc3339(movement.occurredAt), i: movement.id })).toString("base64url");
}

function decodeCursor(text) {
  try {
    const value = JSON.parse(Buffer.from(text, "base64url").toString("utf8"));
    const at = typeof value.t === "string" ? new Date(value.t) : null;
    if (!at || Number.isNaN(at.getTime()) || !Number.isInteger(value.i) || value.i < 1) {
      return null;
    }
    return { at, id: value.i };
  } catch {
    return null;
  }
}

function listMovements(account, parsed, reply) {
  const unreadable = unreadableParam(parsed, LIST_PARAMS);
  if (unreadable) return reply(400, { error: `invalid ${unreadable}` });
  const { params } = parsed;
  const limitRead = single(params, "limit");
  let limit = DEFAULT_PAGE_LIMIT;
  if (limitRead.present) {
    if (!limitRead.ok || !/^\d+$/.test(limitRead.value) || Number(limitRead.value) < 1 || Number(limitRead.value) > MAX_PAGE_LIMIT) {
      return reply(400, { error: "invalid limit" });
    }
    limit = Number(limitRead.value);
  }
  const cursorRead = single(params, "cursor");
  let cursor = null;
  if (cursorRead.present) {
    cursor = cursorRead.ok ? decodeCursor(cursorRead.value) : null;
    if (!cursor) return reply(400, { error: "invalid cursor" });
  }
  const parsedFilter = parseMovementFilter(params);
  if (parsedFilter.error) return reply(400, { error: parsedFilter.error });
  const { filter } = parsedFilter;

  let rows = account.movements.filter((movement) => matchesFilter(movement, filter)).sort(newestFirst);
  if (cursor) {
    rows = rows.filter((movement) => {
      const t = movement.occurredAt.getTime();
      return t < cursor.at.getTime() || (t === cursor.at.getTime() && movement.id < cursor.id);
    });
  }
  const page = rows.slice(0, limit);
  const next = rows.length > limit ? encodeCursor(page[limit - 1]) : null;
  return reply(200, { movements: page.map(movementJson), next_cursor: next });
}

// ---------------------------------------------------------------------------------------------------------------------
// Totals. Rows are grouped as the backend groups them: assets by asset and direction, fees by fee asset, and counter by
// counter asset and the opposite of the movement's direction. A row is per period and per category when asked.
// ---------------------------------------------------------------------------------------------------------------------

function totalsOf(account, filter, period, groupBy, tz) {
  const statuses = filter.statuses.length ? filter.statuses : ["completed"];
  const scoped = { ...filter, statuses };
  const byCategory = groupBy === "category";
  const unit = period || null;
  const keyPrefix = (movement, categoryId) => {
    const parts = [];
    if (unit) parts.push(String(periodStart(movement.occurredAt.getTime(), tz, unit)));
    if (byCategory) parts.push(categoryId === null ? "null" : String(categoryId));
    return parts;
  };
  const rowFields = (movement, categoryId) => {
    const fields = {};
    if (unit) fields.period_start = rfc3339(new Date(periodStart(movement.occurredAt.getTime(), tz, unit)));
    if (byCategory) fields.category_id = categoryId;
    return fields;
  };
  const assetRows = new Map();
  const feeRows = new Map();
  const counterRows = new Map();
  const bump = (map, key, seed) => {
    if (!map.has(key)) {
      map.set(key, {
        ...seed,
        count: 0,
        amount: "0",
        usd: false,
        usdTotal: "0",
        unpriced: 0,
        ids: new Set(),
        unpricedIds: new Set(),
      });
    }
    return map.get(key);
  };

  for (const movement of account.movements) {
    if (!matchesMovementFilter(movement, scoped)) continue;
    // Assets group over portions (FR4). Without a category or tag filter every portion matches, and the fast path's
    // numbers are the same. A split movement counts once per row it reaches: the rows keep a set of movement IDs.
    const hasPortionFilter = scoped.categoryIDs.length || scoped.uncategorized || scoped.tags.length;
    for (const portion of portionsOf(movement)) {
      if (
        hasPortionFilter &&
        !(portionCategoryHit(portion.categoryId, scoped) && portionTagsHit(portion.tags, scoped))
      ) {
        continue;
      }
      const prefix = keyPrefix(movement, portion.categoryId);
      const assetKey = [...prefix, movement.asset, movement.direction].join("|");
      const assetRow = bump(assetRows, assetKey, {
        ...rowFields(movement, portion.categoryId),
        asset: movement.asset,
        direction: movement.direction,
      });
      assetRow.ids.add(movement.id);
      assetRow.amount = addDec(assetRow.amount, portion.amount);
      if (portion.usd !== null) {
        assetRow.usdTotal = addDec(assetRow.usdTotal, portion.usd);
        assetRow.usd = true;
      } else {
        assetRow.unpricedIds.add(movement.id);
      }
    }

    // Fees and the counter side aren't split: their category is the movement's own, and their tag condition matches the
    // movement's own tags or any part's (FR4).
    const ownCategoryHit = portionCategoryHit(movement.categoryId, scoped);
    const tagsHit = portionTagsHit(wholeTags(movement), scoped);
    if (!ownCategoryHit || !tagsHit) continue;
    const prefix = keyPrefix(movement, movement.categoryId);

    if (movement.feeAsset !== null && movement.feeAmount !== null && parseDec(movement.feeAmount).v > 0n) {
      const feeRow = bump(feeRows, [...prefix, movement.feeAsset].join("|"), {
        ...rowFields(movement, movement.categoryId),
        asset: movement.feeAsset,
      });
      feeRow.count += 1;
      feeRow.amount = addDec(feeRow.amount, movement.feeAmount);
      const qualifies = movement.feeAsset === movement.asset && movement.usdPrice !== null;
      if (qualifies) {
        feeRow.usdTotal = addDec(feeRow.usdTotal, mulDec(movement.feeAmount, movement.usdPrice));
        feeRow.usd = true;
      } else {
        feeRow.unpriced += 1;
      }
    }

    if (movement.counterAsset !== null) {
      const flow = movement.direction === "in" ? "out" : "in";
      const counterRow = bump(counterRows, [...prefix, movement.counterAsset, flow].join("|"), {
        ...rowFields(movement, movement.categoryId),
        asset: movement.counterAsset,
        direction: flow,
      });
      counterRow.count += 1;
      counterRow.amount = addDec(counterRow.amount, movement.counterAmount ?? "0");
    }
  }

  const sortRows = (rows) =>
    rows.sort((a, b) => {
      if (unit && a.period_start !== b.period_start) return a.period_start < b.period_start ? -1 : 1;
      if (byCategory && a.category_id !== b.category_id) {
        if (a.category_id === null) return 1;
        if (b.category_id === null) return -1;
        return a.category_id - b.category_id;
      }
      return a.asset < b.asset ? -1 : a.asset > b.asset ? 1 : (a.direction ?? "") < (b.direction ?? "") ? -1 : (a.direction ?? "") > (b.direction ?? "") ? 1 : 0;
    });

  const assets = sortRows(
    [...assetRows.values()].map((row) => ({
      ...row.period_start !== undefined ? { period_start: row.period_start } : {},
      ...byCategory ? { category_id: row.category_id } : {},
      asset: row.asset,
      direction: row.direction,
      count: row.ids.size,
      amount: row.amount,
      usd_value: row.usd ? row.usdTotal : null,
      unpriced_count: row.unpricedIds.size,
    })),
  );
  const fees = sortRows(
    [...feeRows.values()].map((row) => ({
      ...row.period_start !== undefined ? { period_start: row.period_start } : {},
      ...byCategory ? { category_id: row.category_id } : {},
      asset: row.asset,
      count: row.count,
      amount: row.amount,
      usd_value: row.usd ? row.usdTotal : null,
      unpriced_count: row.unpriced,
    })),
  );
  const counter = sortRows(
    [...counterRows.values()].map((row) => ({
      ...row.period_start !== undefined ? { period_start: row.period_start } : {},
      ...byCategory ? { category_id: row.category_id } : {},
      asset: row.asset,
      direction: row.direction,
      count: row.count,
      amount: row.amount,
    })),
  );
  return {
    status: statuses,
    period: unit,
    group_by: byCategory ? "category" : null,
    tz,
    assets,
    fees,
    counter,
  };
}

function totalsRoute(account, parsed, reply) {
  const unreadable = unreadableParam(parsed, TOTALS_PARAMS);
  if (unreadable) return reply(400, { error: `invalid ${unreadable}` });
  const { params } = parsed;
  const parsedFilter = parseMovementFilter(params);
  if (parsedFilter.error) return reply(400, { error: parsedFilter.error });
  const period = single(params, "period");
  if (period.present && (!period.ok || !["day", "week", "month"].includes(period.value))) {
    return reply(400, { error: "invalid period" });
  }
  const groupBy = single(params, "group_by");
  if (groupBy.present && (!groupBy.ok || groupBy.value !== "category")) {
    return reply(400, { error: "invalid group_by" });
  }
  const zone = single(params, "tz");
  let tz = "UTC";
  if (zone.present) {
    if (!zone.ok || !/^[A-Za-z0-9/_+-]{1,64}$/.test(zone.value) || !isKnownZone(zone.value)) {
      return reply(400, { error: "invalid tz" });
    }
    tz = zone.value;
  }
  return reply(200, totalsOf(account, parsedFilter.filter, period.present ? period.value : "", groupBy.present ? "category" : "", tz));
}

// ---------------------------------------------------------------------------------------------------------------------
// Movements: detail and update
// ---------------------------------------------------------------------------------------------------------------------

const isPositiveId = (text) => /^\d+$/.test(text) && Number(text) >= 1;

function findMovement(account, text) {
  if (!isPositiveId(text)) return null;
  return account.movements.find((movement) => movement.id === Number(text)) ?? null;
}

// A part's usd_amount: a string of 1 to 13 digits, an optional point and 1 or 2 decimals, above zero.
const SPLIT_AMOUNT_PATTERN = /^[0-9]{1,13}(\.[0-9]{1,2})?$/;

// The splits value of a PATCH, in the backend's order: an invalid item or amount is invalid split, a bad tag is invalid
// tag, then more than 20 parts is too many splits. Unknown keys in an item are ignored. The result is never null.
function parseSplitsValue(raw) {
  if (raw === null || !Array.isArray(raw)) return { error: "invalid split" };
  const parts = [];
  for (const item of raw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return { error: "invalid split" };
    }
    const category = item.category_id;
    if (!Number.isSafeInteger(category) || category < 1) {
      return { error: "invalid split" };
    }
    const amount = item.usd_amount;
    if (typeof amount !== "string" || !SPLIT_AMOUNT_PATTERN.test(amount) || cmpDec(amount, "0") <= 0) {
      return { error: "invalid split" };
    }
    let tags = [];
    if (item.tags !== undefined) {
      if (!Array.isArray(item.tags)) return { error: "invalid tag" };
      for (const value of item.tags) {
        if (typeof value !== "string") return { error: "invalid tag" };
        const name = normalizeTagName(value);
        if (name === null) return { error: "invalid tag" };
        if (!tags.includes(name)) tags.push(name);
      }
      if (tags.length > MAX_TAGS) return { error: "too many tags" };
      tags.sort();
    }
    const parsed = parseDec(amount);
    parts.push({ categoryId: category, usdAmount: fmtDec(parsed.v, parsed.s), tags });
  }
  if (parts.length > MAX_SPLITS) return { error: "too many splits" };
  return { splits: parts };
}

// The body of PATCH /movements/:id. Each key is missing, null or a value. null clears the field.
function parsePatch(raw) {
  if (raw === null || Buffer.byteLength(raw) > MAX_UPDATE_BODY) return { error: "invalid body" };
  const body = parseObject(raw);
  if (
    !body ||
    (body.reason === undefined &&
      body.category_id === undefined &&
      body.tags === undefined &&
      body.kind === undefined &&
      body.review === undefined &&
      body.splits === undefined)
  ) {
    return { error: "invalid body" };
  }
  const patch = {};
  if (body.kind !== undefined) {
    if (typeof body.kind !== "string" || !DETECTION_KINDS.includes(body.kind)) {
      return { error: "invalid kind" };
    }
    patch.kind = body.kind;
  }
  if (body.review !== undefined) {
    if (typeof body.review !== "string" || !REVIEW_DECISIONS.includes(body.review)) {
      return { error: "invalid review" };
    }
    patch.review = body.review;
  }
  if (patch.kind !== undefined && patch.review === "suspected") {
    return { error: "invalid review" };
  }
  if (body.reason !== undefined) {
    if (body.reason === null) {
      patch.reason = { set: true, value: null };
    } else if (typeof body.reason !== "string") {
      return { error: "invalid reason" };
    } else {
      const text = body.reason.trim();
      if (text.includes("\u0000") || [...text].length > MAX_REASON_RUNES) return { error: "invalid reason" };
      patch.reason = { set: true, value: text === "" ? null : text };
    }
  }
  if (body.category_id !== undefined) {
    if (body.category_id === null) {
      patch.categoryId = { set: true, value: null };
    } else if (Number.isInteger(body.category_id) && body.category_id >= 1 && body.category_id <= Number.MAX_SAFE_INTEGER) {
      patch.categoryId = { set: true, value: body.category_id };
    } else {
      return { error: "invalid category_id" };
    }
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return { error: "invalid tag" };
    const names = [];
    for (const item of body.tags) {
      if (typeof item !== "string") return { error: "invalid tag" };
      const name = normalizeTagName(item);
      if (name === null) return { error: "invalid tag" };
      if (!names.includes(name)) names.push(name);
    }
    if (names.length > MAX_TAGS) return { error: "too many tags" };
    patch.tags = { set: true, value: names.sort() };
  }
  if (body.splits !== undefined) {
    const parsed = parseSplitsValue(body.splits);
    if (parsed.error) return { error: parsed.error };
    patch.splits = { set: true, value: parsed.splits };
  }
  return { patch };
}

// PATCH /movements/:id. Every check runs before anything changes, so a refused key changes nothing.
function patchMovement(account, text, raw, reply) {
  const parsed = parsePatch(raw);
  if (parsed.error) return reply(400, { error: parsed.error });
  const movement = findMovement(account, text);
  if (!movement) return reply(404, { error: "movement not found" });

  // The movement's category and every part's are checked together, before any write (FR2 step 3).
  const categoryIDs = [];
  if (parsed.patch.categoryId?.value !== undefined && parsed.patch.categoryId.value !== null) {
    categoryIDs.push(parsed.patch.categoryId.value);
  }
  for (const part of parsed.patch.splits?.value ?? []) {
    categoryIDs.push(part.categoryId);
  }
  for (const id of categoryIDs) {
    if (!account.categories.some((category) => category.id === id)) {
      return reply(404, { error: "category not found" });
    }
  }

  // The review keys only mean something for a row the detector made. A Binance row refuses the whole call.
  if ((parsed.patch.kind !== undefined || parsed.patch.review !== undefined) && movement.source !== "detector") {
    return reply(422, { error: "movement is not detected" });
  }

  // Parts need a priced movement with a value above zero, and may not pass the value rounded to cents (FR2 step 5).
  const splits = parsed.patch.splits?.value;
  if (splits !== undefined && splits.length > 0) {
    const value = movementValue(movement);
    if (value === null || cmpDec(value, "0") <= 0) {
      return reply(422, { error: "movement is not priced" });
    }
    if (cmpDec(sumParts(splits), roundDec(value, 2)) > 0) {
      return reply(422, { error: "splits exceed movement value" });
    }
  }

  const now = new Date();
  if (parsed.patch.reason?.set) {
    movement.reason = parsed.patch.reason.value;
    movement.reasonUpdatedAt = now;
  }
  if (parsed.patch.categoryId?.set) {
    movement.categoryId = parsed.patch.categoryId.value;
  }
  if (parsed.patch.tags?.set) {
    registerMovementTags(account, parsed.patch.tags.value);
    movement.tags = parsed.patch.tags.value;
  }
  if (parsed.patch.splits?.set) {
    for (const part of parsed.patch.splits.value) {
      registerMovementTags(account, part.tags);
    }
    movement.splits = parsed.patch.splits.value;
  }
  if (parsed.patch.kind !== undefined) {
    movement.kind = parsed.patch.kind;
    movement.reviewStatus = "confirmed";
    movement.detection.conflict = false;
  }
  if (parsed.patch.review !== undefined) {
    movement.reviewStatus = parsed.patch.review;
    if (parsed.patch.review === "suspected") {
      movement.kind = movement.detection.suggestedKind;
    } else {
      movement.detection.conflict = false;
    }
  }
  return reply(200, { movement: movementJson(movement) });
}

// ---------------------------------------------------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------------------------------------------------

// One tag, with how many of the account's movements, in any status, have it on the movement or on a part.
function tagJson(account, tag) {
  let movement_count = 0;
  for (const movement of account.movements) {
    if (
      movement.tags.includes(tag.name) ||
      movement.splits.some((part) => part.tags.includes(tag.name))
    ) {
      movement_count++;
    }
  }
  return { id: tag.id, name: tag.name, color: tag.color, movement_count };
}

// GET /tags. Every tag of the user, used or not, sorted by name then ID, with its movement count.
function listTags(account, reply) {
  const tags = [...account.tags]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id - b.id))
    .map((tag) => tagJson(account, tag));
  return reply(200, { tags });
}

// The body of POST /tags: an object, a valid name and an optional palette color, checked in the backend's order.
function parseTagCreate(raw) {
  if (raw === null || Buffer.byteLength(raw) > MAX_TAG_BODY) return { error: "invalid body" };
  const body = parseObject(raw);
  if (!body) return { error: "invalid body" };
  if (typeof body.name !== "string") return { error: "invalid tag" };
  const name = normalizeTagName(body.name);
  if (name === null) return { error: "invalid tag" };
  let color;
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !TAG_COLORS.includes(body.color)) return { error: "invalid color" };
    color = body.color;
  }
  return { name, color };
}

// The body of PATCH /tags/:id: at least one of name and color, each checked as in create.
function parseTagUpdate(raw) {
  if (raw === null || Buffer.byteLength(raw) > MAX_TAG_BODY) return { error: "invalid body" };
  const body = parseObject(raw);
  if (!body || (body.name === undefined && body.color === undefined)) return { error: "invalid body" };
  let name;
  if (body.name !== undefined) {
    if (typeof body.name !== "string") return { error: "invalid tag" };
    name = normalizeTagName(body.name);
    if (name === null) return { error: "invalid tag" };
  }
  let color;
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !TAG_COLORS.includes(body.color)) return { error: "invalid color" };
    color = body.color;
  }
  return { name, color };
}

function createTag(account, raw, reply) {
  const parsed = parseTagCreate(raw);
  if (parsed.error) return reply(400, { error: parsed.error });
  if (account.tags.some((tag) => tag.name === parsed.name)) {
    return reply(409, { error: "tag already exists" });
  }
  const tag = addTag(account, parsed.name, parsed.color ?? randomTagColor());
  return reply(201, { tag: tagJson(account, tag) });
}

// PATCH /tags/:id. A bad ID is a 404 before the body is read. A rename rewrites the name in every movement; a color
// change touches no movement.
function updateTagRoute(account, text, raw, reply) {
  if (!isPositiveId(text)) return reply(404, { error: "tag not found" });
  const parsed = parseTagUpdate(raw);
  if (parsed.error) return reply(400, { error: parsed.error });
  const tag = account.tags.find((candidate) => candidate.id === Number(text));
  if (!tag) return reply(404, { error: "tag not found" });
  if (parsed.name !== undefined && account.tags.some((other) => other.id !== tag.id && other.name === parsed.name)) {
    return reply(409, { error: "tag already exists" });
  }
  if (parsed.name !== undefined && parsed.name !== tag.name) {
    const previous = tag.name;
    tag.name = parsed.name;
    for (const movement of account.movements) {
      if (movement.tags.includes(previous)) {
        movement.tags = movement.tags.map((name) => (name === previous ? parsed.name : name)).sort();
      }
      for (const part of movement.splits) {
        if (part.tags.includes(previous)) {
          part.tags = part.tags.map((name) => (name === previous ? parsed.name : name)).sort();
        }
      }
    }
  }
  if (parsed.color !== undefined) {
    tag.color = parsed.color;
  }
  return reply(200, { tag: tagJson(account, tag) });
}

// DELETE /tags/:id. The links go with it; every movement keeps its reason, category and other tags.
function deleteTag(account, text, reply) {
  if (!isPositiveId(text)) return reply(404, { error: "tag not found" });
  const index = account.tags.findIndex((tag) => tag.id === Number(text));
  if (index === -1) return reply(404, { error: "tag not found" });
  const [tag] = account.tags.splice(index, 1);
  for (const movement of account.movements) {
    if (movement.tags.includes(tag.name)) {
      movement.tags = movement.tags.filter((name) => name !== tag.name);
    }
    for (const part of movement.splits) {
      if (part.tags.includes(tag.name)) {
        part.tags = part.tags.filter((name) => name !== tag.name);
      }
    }
  }
  return reply(204);
}

// ---------------------------------------------------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------------------------------------------------

// The name of a POST or PATCH body: trimmed, 1 to 64 characters, and no control characters. Null when it isn't valid.
function parseName(raw) {
  if (raw === null || Buffer.byteLength(raw) > MAX_BODY) return null;
  const body = parseObject(raw);
  if (!body || typeof body.name !== "string") return null;
  const name = body.name.trim();
  const runes = [...name].length;
  if (runes < 1 || runes > MAX_CATEGORY_RUNES || /\p{Cc}/u.test(name)) return null;
  return name;
}

const sameNameIgnoringCase = (a, b) => a.toLowerCase() === b.toLowerCase();

function listCategories(account, reply) {
  const sorted = [...account.categories].sort((a, b) => {
    const lower = a.name.toLowerCase();
    const other = b.name.toLowerCase();
    return lower < other ? -1 : lower > other ? 1 : a.id - b.id;
  });
  return reply(200, { categories: sorted.map(categoryJson) });
}

function createCategory(account, raw, reply) {
  const name = parseName(raw);
  if (name === null) return reply(400, { error: "invalid name" });
  if (account.categories.some((category) => sameNameIgnoringCase(category.name, name))) {
    return reply(409, { error: "category already exists" });
  }
  const now = new Date();
  const category = { id: account.nextCategoryId++, name, createdAt: now, updatedAt: now };
  account.categories.push(category);
  return reply(201, { category: categoryJson(category) });
}

function renameCategory(account, text, raw, reply) {
  if (!isPositiveId(text)) return reply(404, { error: "category not found" });
  const name = parseName(raw);
  if (name === null) return reply(400, { error: "invalid name" });
  const category = account.categories.find((candidate) => candidate.id === Number(text));
  if (!category) return reply(404, { error: "category not found" });
  if (account.categories.some((other) => other.id !== category.id && sameNameIgnoringCase(other.name, name))) {
    return reply(409, { error: "category already exists" });
  }
  category.name = name;
  category.updatedAt = new Date();
  return reply(200, { category: categoryJson(category) });
}

function deleteCategory(account, text, reply) {
  if (!isPositiveId(text)) return reply(404, { error: "category not found" });
  const index = account.categories.findIndex((category) => category.id === Number(text));
  if (index === -1) return reply(404, { error: "category not found" });
  account.categories.splice(index, 1);
  for (const movement of account.movements) {
    if (movement.categoryId === Number(text)) {
      movement.categoryId = null;
    }
    // A part keeps its amount and tags; it only loses the category (FR6).
    for (const part of movement.splits) {
      if (part.categoryId === Number(text)) {
        part.categoryId = null;
      }
    }
  }
  return reply(204);
}

// ---------------------------------------------------------------------------------------------------------------------
// Movements: export
// ---------------------------------------------------------------------------------------------------------------------

const CSV_HEADER = [
  "id", "occurred_at", "source", "kind", "external_id", "direction", "status", "source_status", "asset", "amount",
  "fee_asset", "fee_amount", "counter_asset", "counter_amount", "unit_price", "counterparty", "reason", "reason_updated_at",
  "category_id", "category_name", "usd_price", "usd_price_source", "usd_price_status", "usd_value", "fee_usd_value",
  "tags", "review_status", "window_start", "window_end", "wallet", "split_status", "split_rest_usd", "splits",
];

// A cell that a spreadsheet could run as a formula gets a quote in front, and a line break becomes LF.
function csvCell(text) {
  let cell = text ?? "";
  if (cell !== "" && "=+-@\t\r".includes(cell[0])) {
    cell = `'${cell}`;
  }
  return cell.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// The quoting of Go's encoding/csv: a cell with a comma, a quote, a line break or a leading space is quoted.
function csvField(cell) {
  const needsQuotes = cell !== "" && (cell === "\\." || /[,"\r\n]/.test(cell) || /^\s/.test(cell));
  return needsQuotes ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function exportCsv(account, parsed, reply, sendRaw) {
  const unreadable = unreadableParam(parsed, EXPORT_PARAMS);
  if (unreadable) return reply(400, { error: `invalid ${unreadable}` });
  const parsedFilter = parseMovementFilter(parsed.params);
  if (parsedFilter.error) return reply(400, { error: parsedFilter.error });
  const rows = account.movements.filter((movement) => matchesFilter(movement, parsedFilter.filter)).sort(newestFirst);
  if (rows.length > EXPORT_MAX_ROWS) return reply(422, { error: "too many rows, narrow the filters" });
  const names = new Map(account.categories.map((category) => [category.id, category.name]));
  const lines = [CSV_HEADER.map(csvField).join(",")];
  for (const movement of rows) {
    const json = movementJson(movement);
    const splitsCell =
      movement.splits.length === 0
        ? ""
        : JSON.stringify(
            movement.splits.map((part) => ({
              category_id: part.categoryId,
              category_name: part.categoryId === null ? "" : (names.get(part.categoryId) ?? ""),
              usd_amount: part.usdAmount,
              tags: part.tags,
            })),
          );
    const cells = [
      String(json.id), json.occurred_at, json.source, json.kind, json.external_id, json.direction, json.status,
      json.source_status ?? "", json.asset, json.amount, json.fee_asset ?? "", json.fee_amount ?? "",
      json.counter_asset ?? "", json.counter_amount ?? "", json.unit_price ?? "", json.counterparty ?? "",
      json.reason ?? "", json.reason_updated_at ?? "", json.category_id === null ? "" : String(json.category_id),
      json.category_id === null ? "" : (names.get(json.category_id) ?? ""), json.usd_price ?? "",
      json.usd_price_source ?? "", json.usd_price_status, json.usd_value ?? "", json.fee_usd_value ?? "",
      json.tags.join(", "), json.review_status ?? "", json.detection?.window_start ?? "",
      json.detection?.window_end ?? "", json.detection?.wallet ?? "", json.split_status,
      json.split_rest_usd ?? "", splitsCell,
    ];
    lines.push(cells.map((cell) => csvField(csvCell(cell))).join(","));
  }
  const body = lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "").replace(/[-:T]/g, "").replace(/(\d{8})(\d{6})/, "$1-$2");
  return sendRaw(200, "text/csv; charset=utf-8", body, {
    "Content-Disposition": `attachment; filename="movements-${stamp}.csv"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------------------------------------------------

// The snapshots the user can see in a range, in captured order. The gap window of the flags leaves out 24 to 48 hours ago.
// It's widened by an hour on each side, so no snapshot is left at either edge.
function visibleSnapshots(account, from, to) {
  const gapFrom = Date.now() - 49 * HOUR;
  const gapTo = Date.now() - 23 * HOUR;
  return account.snapshots
    .filter((snapshot) => {
      const t = snapshot.capturedAt.getTime();
      if (t < from.getTime() || t >= to.getTime()) return false;
      return !(state.flags.gapWindow && t >= gapFrom && t < gapTo);
    })
    .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime() || a.id - b.id);
}

const BUCKETS = {
  raw: { unit: null, width: 5 * 60 * 1000 },
  hour: { unit: "hour", width: HOUR },
  day: { unit: "day", width: DAY },
  week: { unit: "week", width: 7 * DAY },
  month: { unit: "month", width: 31 * DAY },
};

// The bucket a range gets when the request names none: raw up to 2 days, hour up to 31, day up to 731, week beyond that.
function pickBucket(span) {
  if (span <= 2 * DAY) return "raw";
  if (span <= 31 * DAY) return "hour";
  if (span <= 731 * DAY) return "day";
  return "week";
}

// The bucket to use, or an error text: an unknown name is invalid, and a range longer than 2000 buckets is too large.
function resolveBucket(requested, span) {
  const name = requested || pickBucket(span);
  if (!(name in BUCKETS)) return { error: "invalid bucket" };
  if (span > MAX_HISTORY_POINTS * BUCKETS[name].width) return { error: "range too large for bucket" };
  return { name };
}

// from and to, with the defaults: to is now, and from is 30 days before to.
function historyRange(params) {
  const range = timeRange(params);
  if (range.error) return { error: range.error };
  const to = range.to ?? new Date();
  const from = range.from ?? new Date(to.getTime() - HISTORY_DEFAULT_SPAN);
  if (from.getTime() >= to.getTime()) return { error: "invalid range" };
  return { from, to };
}

// The history's shared checks, in the order the backend makes them. A bucket or zone error is answered before the rest.
function historyParameters(parsed) {
  const unreadable = unreadableParam(parsed, HISTORY_PARAMS);
  if (unreadable) return { error: `invalid ${unreadable}` };
  const { params } = parsed;
  const range = historyRange(params);
  if (range.error) return { error: range.error };
  const bucketRead = single(params, "bucket");
  if (bucketRead.present && !bucketRead.ok) return { error: "invalid bucket" };
  const resolved = resolveBucket(bucketRead.present ? bucketRead.value : "", range.to.getTime() - range.from.getTime());
  if (resolved.error) return { error: resolved.error };
  const zone = single(params, "tz");
  let tz = "UTC";
  if (zone.present) {
    if (!zone.ok || !/^[A-Za-z0-9/_+-]{1,64}$/.test(zone.value) || !isKnownZone(zone.value)) {
      return { error: "invalid tz" };
    }
    tz = zone.value;
  }
  return { from: range.from, to: range.to, bucket: resolved.name, tz };
}

// Each bucket's last snapshot, or every snapshot for raw, as the backend's query picks them.
function bucketSnapshots(account, from, to, bucket, tz) {
  const snapshots = visibleSnapshots(account, from, to);
  if (bucket === "raw") {
    return snapshots.map((snapshot) => ({ snapshot, bucketStart: snapshot.capturedAt }));
  }
  const unit = BUCKETS[bucket].unit;
  const last = new Map();
  for (const snapshot of snapshots) {
    const start = periodStart(snapshot.capturedAt.getTime(), tz, unit);
    last.set(start, { snapshot, bucketStart: new Date(start) });
  }
  return [...last.values()].sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime());
}

function historyRoute(account, parsed, reply) {
  const checked = historyParameters(parsed);
  if (checked.error) return reply(400, { error: checked.error });
  const picked = bucketSnapshots(account, checked.from, checked.to, checked.bucket, checked.tz);
  return reply(200, {
    bucket: checked.bucket,
    tz: checked.tz,
    from: rfc3339(checked.from),
    to: rfc3339(checked.to),
    points: picked.map(({ snapshot, bucketStart }) => historyPointJson(snapshot, bucketStart)),
  });
}

// One coin's holding in a snapshot: the sums over both wallets, the spot and funding parts, and a USD value that is null
// when any row of the coin is unpriced. A snapshot without the coin holds zero, and is priced.
function assetPoint(snapshot, asset) {
  const rows = snapshot.assets.filter((row) => row.asset === asset);
  const sum = (list) => (list.length ? addDec(...list.map((row) => row.amount)) : "0");
  const priced = rows.every((row) => row.priced);
  return {
    amount: sum(rows),
    spot_amount: sum(rows.filter((row) => row.walletType === "spot")),
    funding_amount: sum(rows.filter((row) => row.walletType === "funding")),
    usd_value: priced ? (rows.length ? addDec(...rows.map((row) => row.usdValue)) : "0") : null,
    priced,
  };
}

function assetHistoryRoute(account, asset, parsed, reply) {
  const unreadable = unreadableParam(parsed, HISTORY_PARAMS);
  if (unreadable) return reply(400, { error: `invalid ${unreadable}` });
  const checked = historyParameters(parsed);
  if (checked.error) return reply(400, { error: checked.error });
  const picked = bucketSnapshots(account, checked.from, checked.to, checked.bucket, checked.tz);
  return reply(200, {
    asset,
    bucket: checked.bucket,
    tz: checked.tz,
    from: rfc3339(checked.from),
    to: rfc3339(checked.to),
    points: picked.map(({ snapshot, bucketStart }) => ({
      bucket_start: rfc3339(bucketStart),
      snapshot_id: snapshot.id,
      captured_at: rfc3339(snapshot.capturedAt),
      ...assetPoint(snapshot, asset),
    })),
  });
}

function latestSnapshotRoute(account, reply) {
  if (account.snapshots.length === 0) return reply(404, { error: "snapshot not found" });
  const latest = [...account.snapshots].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime() || b.id - a.id)[0];
  return reply(200, { snapshot: snapshotJson(latest) });
}

function snapshotRoute(account, text, reply) {
  const snapshot = isPositiveId(text) ? account.snapshots.find((candidate) => candidate.id === Number(text)) : null;
  if (!snapshot) return reply(404, { error: "snapshot not found" });
  return reply(200, { snapshot: snapshotJson(snapshot) });
}

// ---------------------------------------------------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------------------------------------------------

// The route pattern of a path: the IDs and the asset are shown as :id and :asset.
function patternOf(pathname) {
  const parts = pathname.split("/");
  if (parts[1] === "movements" && parts.length === 3 && parts[2] !== "totals" && parts[2] !== "export") {
    return "/movements/:id";
  }
  if (parts[1] === "categories" && parts.length === 3) {
    return "/categories/:id";
  }
  if (parts[1] === "tags" && parts.length === 3) {
    return "/tags/:id";
  }
  if (parts[1] === "snapshots" && parts[2] === "assets" && parts.length === 4) {
    return "/snapshots/assets/:asset";
  }
  if (parts[1] === "snapshots" && parts.length === 3 && parts[2] !== "latest") {
    return "/snapshots/:id";
  }
  return pathname;
}

async function handle(req, res) {
  const origin = req.headers.origin ?? "";
  const [rawPath, rawQuery = ""] = (req.url ?? "/").split("?");
  const pathname = new URL(rawPath || "/", "http://localhost").pathname;
  const corsHeaders =
    origin === APP_ORIGIN
      ? {
          "Access-Control-Allow-Origin": APP_ORIGIN,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Expose-Headers": "Content-Disposition",
          Vary: "Origin",
        }
      : {};
  const reply = (status, body, headers = {}) => {
    const allHeaders = { ...corsHeaders, ...headers };
    if (body === undefined) {
      res.writeHead(status, allHeaders);
      res.end();
      return;
    }
    res.writeHead(status, { "Content-Type": "application/json", ...allHeaders });
    res.end(JSON.stringify(body));
  };
  const sendRaw = (status, contentType, text, headers = {}) => {
    const bytes = Buffer.from(text, "utf8");
    res.writeHead(status, {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      ...corsHeaders,
      ...headers,
    });
    res.end(bytes);
  };

  // Like the backend's RefuseForeignOrigin: a foreign Origin is refused before CORS is considered.
  if (origin && origin !== APP_ORIGIN && !sameHost(origin, req.headers.host ?? "")) {
    return reply(403, { error: "Origin not allowed" });
  }
  if (req.method === "OPTIONS") {
    return reply(204, undefined, {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
  }

  const raw = await readBody(req);
  const route = `${req.method} ${pathname}`;

  if (pathname === "/__fake/state") {
    if (req.method === "GET") {
      return reply(200, describeState());
    }
    if (req.method === "POST") {
      const result = applyFakeState(raw);
      return reply(result.status, result.body);
    }
    return reply(404, undefined);
  }

  if (state.flags.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, state.flags.delayMs));
  }

  // Like the backend's OriginCheckIfPresent on the auth routes: a request with an Origin or Referer must come from the app.
  if (pathname.startsWith("/auth/") && (req.headers.origin || req.headers.referer)) {
    if (requestOrigin(req) !== APP_ORIGIN) {
      return reply(403, { error: "Origin not allowed" });
    }
  }

  const pattern = `${req.method} ${patternOf(pathname)}`;
  if (state.flags.failRoute === pattern) {
    // A 422 from the export is the one failure the backend words for its route, so the fake words it the same way.
    const tooLarge = pattern === "GET /movements/export" && state.flags.failStatus === 422;
    return reply(state.flags.failStatus, { error: tooLarge ? "too many rows, narrow the filters" : "could not load data" });
  }

  if (pathname.startsWith("/auth/") || pathname.startsWith("/binance/")) {
    switch (route) {
      case "POST /auth/login":
        return login(raw, reply);
      case "POST /auth/register":
        return register(raw, reply);
      case "POST /auth/logout":
        return logout(reply);
      case "GET /binance/credentials":
        return getCredentials(req, reply);
      case "PUT /binance/credentials":
        return putCredentials(req, raw, reply);
      case "DELETE /binance/credentials":
        return deleteCredentials(req, reply);
      case "POST /binance/sync":
        return syncBalances(req, reply);
      case "POST /binance/movements/sync":
        return syncMovements(req, reply);
      default:
        break;
    }
  }

  const isMovements = pathname === "/movements" || pathname.startsWith("/movements/");
  const isTags = pathname === "/tags" || pathname.startsWith("/tags/");
  const isCategories = pathname === "/categories" || pathname.startsWith("/categories/");
  const isSnapshots = pathname === "/snapshots" || pathname.startsWith("/snapshots/");
  if (isMovements || isTags || isCategories || isSnapshots) {
    const userId = authenticate(req, reply);
    if (userId === null) {
      return;
    }
    const account = state.accounts.get(userId) ?? emptyAccount();
    const parsed = parseQuery(rawQuery);
    const parts = pathname.split("/");
    const id = parts[2] ?? "";

    if (isMovements) {
      if (route === "GET /movements") return listMovements(account, parsed, reply);
      if (route === "GET /movements/totals") return totalsRoute(account, parsed, reply);
      if (route === "GET /movements/export") return exportCsv(account, parsed, reply, sendRaw);
      if (pattern === "GET /movements/:id") {
        const movement = findMovement(account, id);
        return movement ? reply(200, { movement: movementJson(movement) }) : reply(404, { error: "movement not found" });
      }
      if (pattern === "PATCH /movements/:id") return patchMovement(account, id, raw, reply);
    }
    if (isTags) {
      if (route === "GET /tags") return listTags(account, reply);
      if (route === "POST /tags") return createTag(account, raw, reply);
      if (pattern === "PATCH /tags/:id") return updateTagRoute(account, id, raw, reply);
      if (pattern === "DELETE /tags/:id") return deleteTag(account, id, reply);
    }
    if (isCategories) {
      if (route === "GET /categories") return listCategories(account, reply);
      if (route === "POST /categories") return createCategory(account, raw, reply);
      if (pattern === "PATCH /categories/:id") return renameCategory(account, id, raw, reply);
      if (pattern === "DELETE /categories/:id") return deleteCategory(account, id, reply);
    }
    if (isSnapshots) {
      if (route === "GET /snapshots") return historyRoute(account, parsed, reply);
      if (route === "GET /snapshots/latest") return latestSnapshotRoute(account, reply);
      if (pattern === "GET /snapshots/assets/:asset") {
        const asset = parts[3] ?? "";
        if (!isAssetSymbol(asset)) return reply(400, { error: "invalid asset" });
        return assetHistoryRoute(account, asset.toUpperCase(), parsed, reply);
      }
      if (pattern === "GET /snapshots/:id") return snapshotRoute(account, id, reply);
    }
    return reply(404, { error: "not found" });
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 page not found");
}

const server = createServer((req, res) => {
  res.on("finish", () => {
    // Only the method, the path and the status are logged. Never bodies, cookies or headers.
    console.log(`${req.method} ${new URL(req.url ?? "/", "http://localhost").pathname} ${res.statusCode}`);
  });
  handle(req, res).catch((error) => {
    console.error(`fake api error: ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "fake api error" }));
    }
  });
});

server.on("error", (error) => {
  console.error(`fake api cannot listen on port ${PORT}: ${error.code ?? error.message}`);
  process.exit(1);
});

state = freshState();

server.listen(PORT, "localhost", () => {
  console.log(`fake billetera API on http://localhost:${PORT}, for the app at ${APP_ORIGIN}`);
});
