// The tags the API returns, derived from backend/docs/openapi/openapi.json. A tag has an ID, a palette color and a
// lower-case name that is unique per user, and movement_count says how many movements of any status use it.

import type { Schemas } from "../shared/api-types";

export type Tag = Schemas["tags.TagResponse"];
export type TagColor = Tag["color"];
