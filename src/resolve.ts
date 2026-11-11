import { CalcBlocError } from "./errors";
import { hydrateTable, type StoredTable } from "./rows";
import type { Manifest, ManifestCountry, TaxTable } from "./types";

export interface LoadTableOptions {
  /** "latest" (default) or a bundled tax year such as "2026" or "2026-27". */
  year?: string;
  /** Region code (US state, Canadian province, UK nation, Swiss canton...). Returns the regional figures only. */
  region?: string;
}

export interface ResolvedFile {
  entry: ManifestCountry;
  year: string;
  requestedYear: string;
  region: string | null;
  /** Path relative to the data directory, e.g. "uk/2026-27/scotland.json". */
  file: string;
}

const DOCS = "https://calcbloc.com/developers";

export function findCountry(manifest: Manifest, country: string): ManifestCountry | undefined {
  const id = String(country ?? "").trim().toLowerCase();
  return manifest.countries.find((c) => c.country === id);
}

/** Maps (country, year, region) to a bundled file, with the same error codes as the API. */
export function resolveEntryFile(entry: ManifestCountry, options: LoadTableOptions = {}): ResolvedFile {
  const requestedYear = String(options.year ?? "latest").trim();
  const year = requestedYear.toLowerCase() === "latest" ? entry.current_year : requestedYear;
  if (!entry.years.includes(year))
    throw new CalcBlocError("unsupported_year", `No bundled ${entry.name} tax tables for "${requestedYear.slice(0, 16)}". Years: ${entry.years.join(", ")} (or latest).`, { status: 404, docs: DOCS });
  let region: string | null = null;
  if (options.region !== undefined && options.region !== null && options.region !== "") {
    if (!entry.regions.length) throw new CalcBlocError("unsupported_region", `${entry.name} tax tables have no regional variants.`, { status: 400, docs: DOCS });
    const want = String(options.region).trim().toLowerCase();
    const r = entry.regions.find((x) => x.code === want || x.slug === want);
    if (!r) throw new CalcBlocError("unsupported_region", `Unknown ${entry.name} region "${String(options.region).slice(0, 40)}". Regions: ${entry.regions.map((x) => x.code).join(", ")}.`, { status: 400, docs: DOCS });
    region = r.code;
  }
  const file = region ? `${entry.country}/${year}/${region}.json` : `${entry.country}/${year}.json`;
  if (!entry.files.includes(file))
    throw new CalcBlocError("not_found", `No bundled table for ${entry.name} ${year}${region ? ` (${region})` : ""}. Fetch it from the API instead: new CalcBloc().taxTables("${entry.country}", { year: "${year}"${region ? `, region: "${region}"` : ""} }).`, { status: 404, docs: DOCS });
  return { entry, year, requestedYear, region, file };
}

export function resolveFile(manifest: Manifest, country: string, options: LoadTableOptions = {}): ResolvedFile {
  const entry = findCountry(manifest, country);
  if (!entry)
    throw new CalcBlocError("unsupported_country", `No bundled tax tables for "${String(country).slice(0, 40)}". Countries: ${manifest.countries.map((c) => c.country).join(", ")}.`, { status: 404, docs: DOCS });
  return resolveEntryFile(entry, options);
}

/** The API-shaped table, with `requested_year` set as the API would ("latest" when asked for latest). */
export function finishTable(stored: StoredTable, resolved: ResolvedFile): TaxTable {
  const table = hydrateTable(stored);
  if (resolved.requestedYear.toLowerCase() === "latest") table.requested_year = "latest";
  return table;
}
