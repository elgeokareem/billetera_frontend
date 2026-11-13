// The tags the API returns, derived from backend/docs/openapi/openapi.json. A tag has no ID: its lower-case name is its
// identity, and movement_count says how many movements of any status use it.

import type { Schemas } from "../shared/api-types";

export type Tag = Schemas["tags.TagResponse"];
