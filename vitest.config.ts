import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the `@/*` path alias from tsconfig.json (native Vite support).
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Default to a Node environment; switch individual files to jsdom with a
    // `// @vitest-environment jsdom` comment when we start testing components.
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
