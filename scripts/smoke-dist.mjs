// Smoke test of the built ESM entry points through the package's own exports map (run after `npm run build`).
import assert from "node:assert/strict";
import { CalcBloc, CalcBlocError, taxFromBands, VERSION } from "calcbloc";
import { listCountries, loadTable, manifest, bandsSection, CalcBlocError as TablesError } from "calcbloc/tables";

assert.equal(typeof CalcBloc, "function");
assert.equal(CalcBlocError, TablesError, "one CalcBlocError class across entry points");
assert.ok(VERSION);
assert.ok(manifest.countries.length > 0);

const ie = loadTable("ireland");
assert.equal(Math.round(taxFromBands(bandsSection(ie, "usc"), 50000) * 100) / 100, 1032.82);

// Every per-country module loads and returns its current table.
for (const c of listCountries()) {
  const mod = await import(`calcbloc/tables/${c.country}`);
  assert.equal(mod.tables, mod.default);
  const t = mod.tables.table();
  assert.equal(t.country, c.country);
  assert.equal(t.year, c.current_year);
  assert.deepEqual(t, loadTable(c.country), `${c.country}: subpath module and loadTable agree`);
}

try {
  loadTable("atlantis");
  assert.fail("expected an error");
} catch (e) {
  assert.ok(e instanceof CalcBlocError);
  assert.equal(e.code, "unsupported_country");
}

console.log(`ESM ok: calcbloc ${VERSION}, ${listCountries().length} countries via calcbloc/tables and calcbloc/tables/<country>`);
