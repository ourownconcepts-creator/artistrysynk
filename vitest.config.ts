import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    // Never hang: default to a single run with explicit time budgets.
    watch: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    teardownTimeout: 10_000,
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
  },
});
