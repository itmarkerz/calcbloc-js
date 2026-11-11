// Smoke test of the built CommonJS entry points through the package's own exports map (run after `npm run build`).
const assert = require("node:assert/strict");
const { CalcBloc, CalcBlocError, taxFromBands } = require("calcbloc");
const tablesApi = require("calcbloc/tables");

assert.equal(typeof CalcBloc, "function");
assert.equal(CalcBlocError, tablesApi.CalcBlocError, "one CalcBlocError class across entry points");

const sg = tablesApi.loadTable("singapore");
assert.equal(Math.round(taxFromBands(tablesApi.bandsSection(sg, "income-tax"), 80000) * 100) / 100, 3350);

for (const c of tablesApi.listCountries()) {
  const mod = require(`calcbloc/tables/${c.country}`);
  assert.equal(mod.tables, mod.default);
  assert.deepEqual(mod.tables.table(), tablesApi.loadTable(c.country), `${c.country}: subpath module and loadTable agree`);
}

assert.throws(() => tablesApi.loadTable("atlantis"), (e) => e instanceof CalcBlocError && e.code === "unsupported_country");

console.log(`CJS ok: ${tablesApi.listCountries().length} countries via calcbloc/tables and calcbloc/tables/<country>`);
