import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3001,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'https://appbackend.finonest.com',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: 'https://appbackend.finonest.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
