import type { Schemas } from "../shared/api-types";

/** A category, as GET /categories and POST /categories answer it. Times are UTC. */
export type Category = Schemas["categories.CategoryResponse"];
