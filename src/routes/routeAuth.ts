import { Route } from "@tanstack/react-router";
import Auth from "../modules/auth/Auth";
import Login from "../modules/auth/Login";
import Register from "../modules/auth/Register";
import { rootRoute } from "./router";

const authRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: Auth
});

export const authLoginRoute = new Route({
  getParentRoute: () => authRoute,
  path: "/login",
  component: Login
});

export const authRegisterRoute = new Route({
  getParentRoute: () => authRoute,
  path: "/register",
  component: Register
});

export { authRoute };
