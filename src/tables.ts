/**
 * calcbloc/tables: the bundled CalcBloc tax tables, read from the package in Node with no network access.
 *
 * Every table has the shape of GET /api/v1/tax-tables/{country}/{year}[?region=]. For bundlers and browsers, import
 * one country instead: `import { tables } from "calcbloc/tables/uk"`.
 *
 * Data: CC BY 4.0. Credit "Data by CalcBloc (calcbloc.com/data)" with a link to https://calcbloc.com/data.
 */
import { readFileSync } from "node:fs";
import { CalcBlocError } from "./errors";
import { finishTable, findCountry, resolveFile, type LoadTableOptions } from "./resolve";
import type { StoredTable } from "./rows";
import type { Manifest, ManifestCountry, TaxTable } from "./types";

const DATA_DIR = new URL("../data/", import.meta.url);

function readData(file: string): string {
  try {
    return readFileSync(new URL(file, DATA_DIR), "utf8");
  } catch (cause) {
    throw new CalcBlocError("not_found", `Bundled data file ${file} is missing from the calcbloc package.`, { status: 404, cause });
  }
}

/** The bundled manifest: every country with its years, regions, files, official source URLs and last verification date. */
export const manifest: Manifest = JSON.parse(readData("manifest.json")) as Manifest;

const cache = new Map<string, string>();

/** Every bundled country, in manifest order. */
export function listCountries(): ManifestCountry[] {
  return manifest.countries.slice();
}

/** The manifest entry for a country id ("uk", "new-zealand"...), or undefined. */
export function getCountry(country: string): ManifestCountry | undefined {
  return findCountry(manifest, country);
}

/**
 * A bundled tax table, synchronously and offline.
 *
 * @example
 * const uk = loadTable("uk");                                   // current year, national
 * const ca = loadTable("us", { year: "2026", region: "ca" });   // California's state figures
 * @throws CalcBlocError with code unsupported_country, unsupported_year, unsupported_region or not_found.
 */
export function loadTable(country: string, options: LoadTableOptions = {}): TaxTable {
  const resolved = resolveFile(manifest, country, options);
  let text = cache.get(resolved.file);
  if (text === undefined) {
    text = readData(resolved.file);
    cache.set(resolved.file, text);
  }
  return finishTable(JSON.parse(text) as StoredTable, resolved);
}

/** The national table and every regional table of a country for one year. */
export function loadTablesWithRegions(country: string, options: Omit<LoadTableOptions, "region"> = {}): { national: TaxTable; regions: TaxTable[] } {
  const national = loadTable(country, options);
  const entry = getCountry(country)!;
  const regions = entry.regions
    .filter((r) => entry.files.includes(`${entry.country}/${national.year}/${r.code}.json`))
    .map((r) => loadTable(country, { year: national.year, region: r.code }));
  return { national, regions };
}

export { bandBreakdown, bandsSection, findSection, taxFromBands, type BandAmount } from "./bands";
export { CalcBlocError } from "./errors";
export type { LoadTableOptions } from "./resolve";
export type * from "./types";
