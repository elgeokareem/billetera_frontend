import { jwtDecode } from "jwt-decode";
import { getCookie } from "./utils";

export function isAuthenticated() {
  const token = getCookie("token");
  if (token) {
    const decoded = jwtDecode(token.split("+")[1]);
    const now = Date.now() / 1000;
    return Number(decoded.exp) > now;
  }
  return false;
}
