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
    watch: {
      ignored: [
        '**/server/**',
        '**/scratch/**',
        '**/plans/**',
        '**/uploads/**',
        '**/mock_reports/**',
        '**/*.log',
        '**/dist/**',
        '**/.git/**',
      ],
    },
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
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // PDF and export heavy libs (including core-js / canvg / dompurify)
            if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas') || id.includes('pdfjs-dist') || id.includes('canvg') || id.includes('core-js') || id.includes('dompurify')) {
              return 'vendor-pdf';
            }
            // Office docs & spreadsheet libs
            if (id.includes('xlsx') || id.includes('mammoth') || id.includes('docxtemplater') || id.includes('pizzip')) {
              return 'vendor-docs';
            }
            // Charts & Data visualization
            if (id.includes('recharts') || id.includes('chart.js') || id.includes('/d3-')) {
              return 'vendor-charts';
            }
            // Maps
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }
            // Rich text editor
            if (id.includes('@tiptap') || id.includes('prosemirror')) {
              return 'vendor-editor';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            // Core react runtime & Radix UI (bundled together to avoid circular chunk dependencies)
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router') || id.includes('@remix-run/router') || id.includes('@radix-ui')) {
              return 'vendor-framework';
            }
          }
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
