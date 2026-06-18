import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/app/api/**/route.ts"],
      exclude: ["**/*.test.ts", "**/types.ts"],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
