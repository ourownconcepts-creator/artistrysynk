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
      rollupOptions: { treeshake: false },
    },
  },
});