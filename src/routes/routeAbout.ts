import { Route } from "@tanstack/react-router";
import { rootRoute } from "./router";
import About from "../modules/about/about";

export const aboutRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: About
});
