import { defineConfig } from "@vscode/test-cli";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig([
  {
    label: "unit",
    files: `${__dirname}/out/test/unit/**/*.test.js`,
    runnerEnvironment: "node",
  },
  {
    label: "extension",
    files: `${__dirname}/out/test/integration/suite/**/*.test.js`,
    version: "stable",
    workspaceFolder: `${__dirname}/fixtures/sample-workspace`,
    mocha: {
      ui: "tdd",
      timeout: 20_000,
      forbidOnly: !!process.env.CI,
    },
  },
]);
