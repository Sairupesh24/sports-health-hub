import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Prevent Node 22/24 ECONNRESET crashes on Windows when browser refreshes/aborts connections
process.on("uncaughtException", (err: any) => {
  if (err && (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.code === "EPIPE")) {
    return;
  }
  console.error("[Uncaught Exception]", err);
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err && (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED')) return;
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err && (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED')) return;
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err && (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED')) return;
          });
        },
      },
    },
    hmr: {
      overlay: true,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    allowedHosts: true
  },
  build: {
    minify: 'esbuild',
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
