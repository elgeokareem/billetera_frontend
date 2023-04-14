import { ReactRouter, RootRoute, Route } from "@tanstack/react-router";
import App from "../App";
import Dashboard from "../modules/dashboard/dashboard";
import { fetchServer } from "../shared/services/fetchService";
import { aboutRoute } from "./routeAbout";
import { authRoute, authLoginRoute, authRegisterRoute } from "./routeAuth";

// Create a root route
export const rootRoute = new RootRoute({
  component: App
});

// Create an index route
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
  onLoad: async function () {
    try {
      console.log("pasa por el onLoad");
      const res = await fetchServer.get("");

      return res.data;
    } catch (error) {
      // TODO: Make a toaster depending on the error
      authRoute.router?.navigate({
        to: "/auth/login"
      });
    }
  }
});

// Create the route tree using your routes
const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  authRoute.addChildren([authLoginRoute, authRegisterRoute])
]);

// Create the router using your route tree
export const router = new ReactRouter({ routeTree });

// Register your router for maximum type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
