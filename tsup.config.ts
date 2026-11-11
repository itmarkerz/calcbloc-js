import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", tables: "src/tables.ts", country: "src/country.ts" },
  format: ["esm", "cjs"],
  dts: true,
  // Shared code (errors, row rebuilding) lives in one chunk in both formats, so `instanceof CalcBlocError` holds
  // across calcbloc, calcbloc/tables and calcbloc/tables/<country>.
  splitting: true,
  // import.meta.url in the CJS build of calcbloc/tables (data directory lookup).
  shims: true,
  target: "node18",
  platform: "neutral",
  external: ["node:fs"],
  sourcemap: false,
  clean: true,
  treeshake: true,
});
