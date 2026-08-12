// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      // CJS packages that need bundling so named exports resolve during SSR.
      noExternal: ["react-helmet-async"],
    },
    build: {
      // Rolldown splits @tanstack/start-server-core and start-client-core into
      // two circular chunks, so `createCsrfMiddleware` is undefined when the
      // server entry evaluates → every SSR request 500s. Disabling tree-shaking
      // keeps the declarations in one initialization order.
      rollupOptions: {
        treeshake: false,
        output: {
          // Keep the TanStack Start runtime (createSsrRpc, server-fn plumbing) in a
          // dedicated vendor chunk. Otherwise it gets inlined into an app chunk that
          // is itself imported by the route chunk, creating a circular chunk pair —
          // `createSsrRpc` is then undefined while the route chunk initializes and
          // every SSR request 500s with "createSsrRpc is not a function".
          manualChunks(id: string) {
            if (
              id.includes("node_modules/@tanstack/react-start/") ||
              id.includes("node_modules/@tanstack/start-server-core/") ||
              id.includes("node_modules/@tanstack/start-client-core/") ||
              id.includes("node_modules/@tanstack/react-start-client/") ||
              id.includes("node_modules/@tanstack/react-start-server/")
            ) {
              return "tanstack-start-runtime";
            }
            return undefined;
          },
        },
      },
    },
  },
});