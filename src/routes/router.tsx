import {
  Link,
  Outlet,
  ReactRouter,
  RootRoute,
  Route
} from "@tanstack/react-router";
import App from "../App";
import Index from "../modules/dashboard/dashboard";
import { aboutRoute } from "./routeAbout";

// Create a root route
export const rootRoute = new RootRoute({
  component: App
});

// Create an index route
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Index
});

// Create the route tree using your routes
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

// Create the router using your route tree
export const router = new ReactRouter({ routeTree });

// Register your router for maximum type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
