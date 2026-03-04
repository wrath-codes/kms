import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "out"],
    globals: true,
    environment: "node",
    testTimeout: 10_000,
    hookTimeout: 10_000,
    alias: {
      vscode: path.resolve(__dirname, "src/test/shims/vscodeShim.ts"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.test.ts", "src/test/**", "src/extension.ts", "src/worker/**", "src/services/IndexWorkerService.ts"],
    },
  },
});
