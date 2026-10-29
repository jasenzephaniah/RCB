import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api/* is proxied to the FastAPI server so the browser sees one origin.
// In Docker, nginx does the same job (see nginx.conf).
// On Vercel, set VITE_API_URL to the deployed backend URL instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000",
    },
  },
});
