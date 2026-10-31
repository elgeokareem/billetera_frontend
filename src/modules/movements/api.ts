import axios from "axios";
import type { Operations, Schemas } from "../shared/api-types";
import { fileNameOf } from "../shared/download";
import type {
  MovementPatch,
  MovementsPage,
  MovementTotals,
} from "./types";

type ListQuery = NonNullable<
  Operations["movements.list"]["parameters"]["query"]
>;
type TotalsQueryParams = NonNullable<
  Operations["movements.totals"]["parameters"]["query"]
>;

/**
 * The query of GET /movements. Every value is text, as the API reads it, and a list is comma-separated, such as
 * kind=p2p,pay. Times are API instants, so a + never appears in them.
 */
export type MovementsQuery = ListQuery;

/** The query of GET /movements/totals: the filters of the list, with the grouping and zone of the totals. */
export type TotalsQuery = TotalsQueryParams;

/**
 * The query string for a set of parameters. Empty and missing values are left out, and a list keeps its commas, as the
 * API reads them. Every other character is escaped, so a + in a value goes out as %2B.
 */
export function queryString(query: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const text = params.toString().replace(/%2C/gi, ",");
  return text ? `?${text}` : "";
}

export async function fetchMovements(query: MovementsQuery) {
  const { data } = await axios.get<MovementsPage>(
    `/movements${queryString(query)}`,
  );
  return data;
}

export async function fetchMovementTotals(query: TotalsQuery) {
  const { data } = await axios.get<MovementTotals>(
    `/movements/totals${queryString(query)}`,
  );
  return data;
}

export async function updateMovement(id: number, body: MovementPatch) {
  const { data } = await axios.patch<Schemas["movements.MovementEnvelope"]>(
    `/movements/${id}`,
    body,
  );
  return data.movement;
}

/**
 * GET /movements/export: every movement that matches the filters, as CSV. The request carries the session cookie, and the
 * file name comes from Content-Disposition, which the API lets the app read. A failed export answers JSON, so its body is
 * read back from the Blob, and getApiErrorKey can translate it.
 */
export async function exportMovements(query: Omit<MovementsQuery, "limit" | "cursor">) {
  try {
    const response = await axios.get<Blob>(`/movements/export${queryString(query)}`, {
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] as string | undefined;
    return { blob: response.data, filename: fileNameOf(disposition, "movements.csv") };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      error.response.data = await readJson(error.response.data);
    }
    throw error;
  }
}

async function readJson(blob: Blob): Promise<unknown> {
  try {
    return JSON.parse(await blob.text());
  } catch {
    return undefined;
  }
}
