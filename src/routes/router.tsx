import { ReactRouter, RootRoute, Route } from "@tanstack/react-router";
import axios from "axios";
import App from "../App";
import Dashboard from "../modules/dashboard/dashboard";
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
      const res = await axios.get(`${import.meta.env.VITE_KEK}/auth/login`);

      return res.data;
    } catch (error) {
      return error;
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
