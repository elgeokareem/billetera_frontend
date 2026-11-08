import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// The project doesn't install @types/node, so declare the part of `process`
// this file uses. Type-only: nothing is emitted and the real Node object is used.
declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Netlify builds must know the API origin. Without it, requests go to the
  // site itself and fail in confusing ways, so stop the build instead.
  if (command === "build" && mode === "production" && process.env.NETLIFY === "true") {
    // Same sources as Vite's own env handling; process.env wins over .env files.
    const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
    if (!env.VITE_BACKEND_ENDPOINT?.trim()) {
      throw new Error(
        "VITE_BACKEND_ENDPOINT is missing or empty. Set it in Netlify's environment " +
          "variables to the API origin, e.g. https://api-billetera.william-vegas.com"
      );
    }
  }

  return {
    plugins: [TanStackRouterVite(), react()]
  };
});
