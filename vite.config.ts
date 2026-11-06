import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Build exact lucide icon map from lucide-react.js once at build/config initialization time
function getLucideMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const lucidePath = path.resolve(__dirname, "node_modules/lucide-react/dist/esm/lucide-react.js");
    if (fs.existsSync(lucidePath)) {
      const content = fs.readFileSync(lucidePath, "utf8");
      const regex = /export\s*\{([^}]+)\}\s*from\s*['"]\.\/icons\/([^'"]+)['"];/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(content))) {
        const exportsStr = m[1];
        const iconFile = m[2];
        const items = exportsStr.split(",").map(s => s.trim()).filter(Boolean);
        for (const item of items) {
          const parts = item.split(/\s+as\s+/).map(s => s.trim());
          const exportName = parts[1] || parts[0];
          map.set(exportName, iconFile);
        }
      }
    }
  } catch (err) {
    console.warn("[vite.config] Could not build lucide-react map:", err);
  }
  return map;
}

// Build date-fns exports set from package.json once
function getDateFnsExports(): Set<string> {
  const set = new Set<string>();
  try {
    const pkgPath = path.resolve(__dirname, "node_modules/date-fns/package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      for (const k of Object.keys(pkg.exports || {})) {
        set.add(k.replace(/^\.\//, ""));
      }
    }
  } catch (err) {
    console.warn("[vite.config] Could not read date-fns exports:", err);
  }
  return set;
}

// Pre-transform plugin that converts barrel imports from lucide-react and date-fns
// into direct modular imports, preventing Rollup from crawling 1,500+ unused icon/function modules.
function optimizeBarrelImports(): Plugin {
  const lucideMap = getLucideMap();
  const dateFnsExports = getDateFnsExports();

  return {
    name: "optimize-barrel-imports",
    enforce: "pre",
    apply: "build",
    transform(code, id) {
      if (id.startsWith("\0")) return null;
      // Allow src code and react-day-picker (which barrel-imports date-fns) to be transformed
      if (id.includes("node_modules") && !id.includes("react-day-picker")) return null;
      if (!/\.(?:[jt]sx?|mjs)$/.test(id)) return null;

      let modified = code;
      let changed = false;

      // 1. Optimize lucide-react imports: direct imports bypass 1,547-module namespace re-export crawling
      if (modified.includes("lucide-react")) {
        modified = modified.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?/g, (_match, importsStr) => {
          const cleanStr = importsStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
          const imports = cleanStr.split(",").map(s => s.trim()).filter(Boolean);
          const lines: string[] = [];
          const unmapped: string[] = [];
          for (const item of imports) {
            const parts = item.split(/\s+as\s+/).map(s => s.trim());
            const orig = parts[0];
            const alias = parts[1] || orig;
            const iconFile = lucideMap.get(orig);
            if (iconFile) {
              lines.push(`import ${alias} from 'lucide-react/dist/esm/icons/${iconFile}';`);
            } else {
              unmapped.push(item);
            }
          }
          if (unmapped.length > 0) {
            lines.push(`import { ${unmapped.join(", ")} } from 'lucide-react';`);
          }
          changed = true;
          return lines.join("\n");
        });
      }

      // 2. Optimize date-fns imports: direct subpath imports bypass barrel index crawling
      if (modified.includes("date-fns")) {
        modified = modified.replace(/import\s*\{([^}]+)\}\s*from\s*['"]date-fns['"];?/g, (_match, importsStr) => {
          const cleanStr = importsStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
          const imports = cleanStr.split(",").map(s => s.trim()).filter(Boolean);
          const lines: string[] = [];
          const unmapped: string[] = [];
          for (const item of imports) {
            const parts = item.split(/\s+as\s+/).map(s => s.trim());
            const orig = parts[0];
            const alias = parts[1] || orig;
            if (dateFnsExports.has(orig)) {
              const spec = orig === alias ? orig : `${orig} as ${alias}`;
              lines.push(`import { ${spec} } from 'date-fns/${orig}';`);
            } else {
              unmapped.push(item);
            }
          }
          if (unmapped.length > 0) {
            lines.push(`import { ${unmapped.join(", ")} } from 'date-fns';`);
          }
          changed = true;
          return lines.join("\n");
        });
      }

      return changed ? { code: modified, map: null } : null;
    },
  };
}

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
        '**/react-native-body-highlighter-main/**',
        '**/generated/**',
        '**/test-results/**',
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
  plugins: [optimizeBarrelImports(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    allowedHosts: true
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    chunkSizeWarningLimit: 3500,
    reportCompressedSize: false,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
