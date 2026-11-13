import axios from "axios";
import type { Schemas } from "../shared/api-types";

/** GET /tags: the user's tags that at least one movement uses, sorted by name. */
export async function fetchTags() {
  const { data } = await axios.get<Schemas["tags.ListResponse"]>("/tags");
  return data.tags;
}
