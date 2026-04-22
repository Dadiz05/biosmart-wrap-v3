import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Same origin as Vite (including when opened via LAN IP on a phone) — avoids hitting the phone's own localhost
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
