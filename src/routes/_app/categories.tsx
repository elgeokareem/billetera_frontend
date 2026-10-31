import { createFileRoute } from "@tanstack/react-router";
import { CategoriesPage } from "../../modules/categories/CategoriesPage";

export const Route = createFileRoute("/_app/categories")({
  component: CategoriesPage,
});
