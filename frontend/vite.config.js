import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CITY NERVE frontend build config.
// VITE_API_BASE_URL (see .env.example) points the app at the
// FastAPI backend. In local dev, a proxy is also provided so
// the frontend can be run without CORS friction.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
