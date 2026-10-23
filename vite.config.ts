import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api is proxied to the API server so the web app needs no CORS setup.
// In production set VITE_API_URL to the API's public URL (e.g. https://api.example.com/api).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4000" },
  },
});
