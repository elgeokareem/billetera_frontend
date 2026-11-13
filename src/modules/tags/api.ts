import axios from "axios";
import type { Schemas } from "../shared/api-types";
import { normaliseTagName } from "./names";
import type { TagColor } from "./types";

/** GET /tags: every tag of the user, including the ones no movement uses, sorted by name. */
export async function fetchTags() {
  const { data } = await axios.get<Schemas["tags.ListResponse"]>("/tags");
  return data.tags;
}

/** The name as the backend stores it. The callers check it first, so this fallback never reaches a valid form. */
function storedName(name: string) {
  return normaliseTagName(name) ?? name.trim();
}

/** POST /tags. Without a color the backend picks a random one. */
export async function createTag(name: string) {
  const { data } = await axios.post<Schemas["tags.TagEnvelope"]>("/tags", {
    name: storedName(name),
  });
  return data.tag;
}

/** PATCH /tags/:id. A name rename reaches every movement at once; a color change is visual only. */
export async function updateTag(id: number, patch: { name?: string; color?: TagColor }) {
  const body: Schemas["tags.UpdateRequest"] = {};
  if (patch.name !== undefined) {
    body.name = storedName(patch.name);
  }
  if (patch.color !== undefined) {
    body.color = patch.color;
  }
  const { data } = await axios.patch<Schemas["tags.TagEnvelope"]>(`/tags/${id}`, body);
  return data.tag;
}

/** DELETE /tags/:id. Every movement that had it loses it; their reasons, categories and other tags stay. */
export async function deleteTag(id: number) {
  await axios.delete(`/tags/${id}`);
}
