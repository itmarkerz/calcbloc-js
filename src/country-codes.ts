/**
 * Country identifiers, as the CalcBloc API accepts them since 1.7: the key ("new-zealand", the id used in URLs, the
 * bundled data and every response), the short code (ISO 3166-1 alpha-2 in lower case, with the UK as "uk"; "gb" also
 * works), the ISO code ("NZ") and the English name ("New Zealand"), plus a few common variants. Matching ignores case
 * and accents; spaces, dots and underscores count as hyphens. Mirrors the API's own table.
 */
import CODES from "./country-codes.json";

export interface CountryCodeInfo {
  /** Short code used in docs and examples, e.g. "nz" (the UK is "uk"). */
  short: string;
  /** ISO 3166-1 alpha-2, e.g. "NZ" (the UK is "GB"). */
  iso: string;
  /** English name. */
  name: string;
  /** Other names and codes in use (ISO alpha-3, local names...). */
  names?: string[];
}

export const COUNTRY_CODES: Record<string, CountryCodeInfo> = CODES;

/** Lower case, accents removed, spaces/dots/underscores → hyphens. */
export function normKey(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, "-");
}

const ALIAS = new Map<string, string>();
for (const [key, info] of Object.entries(COUNTRY_CODES)) {
  for (const a of [key, info.short, info.iso, info.name, ...(info.names ?? [])]) {
    const k = normKey(a);
    const prev = ALIAS.get(k);
    if (prev && prev !== key) throw new Error(`calcbloc: country alias "${a}" maps to both ${prev} and ${key}`);
    ALIAS.set(k, key);
  }
}

/**
 * The country key ("new-zealand") for any accepted identifier: the key, short code ("nz"), ISO code ("NZ"), English
 * name ("New Zealand") or a listed variant. `names` adds further key → name pairs (e.g. from a manifest). Returns
 * undefined when nothing matches.
 */
export function resolveCountryKey(input: string, names: Record<string, string> = {}): string | undefined {
  const k = normKey(input);
  if (!k) return undefined;
  const hit = ALIAS.get(k);
  if (hit) return hit;
  return Object.entries(names).find(([key, n]) => normKey(key) === k || normKey(n) === k)?.[0];
}
