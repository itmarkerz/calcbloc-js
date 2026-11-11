/**
 * Runtime for the per-country modules (calcbloc/tables/<country>), which import their JSON statically so bundlers
 * include only the countries you import. Works in browsers, edge runtimes and Node.
 */
import { finishTable, resolveEntryFile, type LoadTableOptions } from "./resolve";
import type { StoredTable } from "./rows";
import type { ManifestCountry, Region, TaxTable } from "./types";

export interface CountryTables {
  /** Country id, e.g. "uk". */
  country: string;
  name: string;
  currency: string;
  currentYear: string;
  /** Bundled years, current first. */
  years: string[];
  regions: Region[];
  /** The manifest entry (source URLs, last verification date, page and API URLs). */
  entry: ManifestCountry;
  /** A table for this country: current year and national figures by default. */
  table(options?: LoadTableOptions): TaxTable;
}

export function defineCountry(entry: ManifestCountry, files: Record<string, StoredTable>): CountryTables {
  return {
    country: entry.country,
    name: entry.name,
    currency: entry.currency,
    currentYear: entry.current_year,
    years: entry.years.slice(),
    regions: entry.regions.map((r) => ({ ...r })),
    entry,
    table(options: LoadTableOptions = {}) {
      const resolved = resolveEntryFile(entry, options);
      const stored = files[resolved.file];
      if (!stored) throw new Error(`calcbloc: ${resolved.file} is not bundled in this module`);
      return finishTable(JSON.parse(JSON.stringify(stored)) as StoredTable, resolved);
    },
  };
}

export type { LoadTableOptions } from "./resolve";
