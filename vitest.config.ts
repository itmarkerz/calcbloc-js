import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Some tests read all ~200 bundled tables.
    testTimeout: 30_000,
  },
});
