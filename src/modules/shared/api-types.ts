import type { components, operations } from "./api-schema";

/**
 * The schemas of `components.schemas` in the generated file. Names keep the Go package, such as
 * `Schemas["movements.MovementResponse"]`.
 */
export type Schemas = components["schemas"];

/** One route's parameters, request body and responses, keyed by its operationId. */
export type Operations = operations;
