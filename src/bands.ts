import type { BandRow, BandsSection, Section, TaxTable } from "./types";

/** The tax from one band of a progressive scale. */
export interface BandAmount {
  label?: string;
  from: number;
  to: number | null;
  rate: number;
  /** The part of the income that falls in this band. */
  taxable: number;
  /** taxable × rate, unrounded. */
  tax: number;
}

function rowsOf(section: BandsSection | readonly BandRow[]): readonly BandRow[] {
  if (Array.isArray(section)) return section as readonly BandRow[];
  const s = section as Section;
  if (!s || s.kind !== "bands") throw new TypeError(`taxFromBands needs a "bands" section; got ${s && "kind" in s ? `"${s.kind}" section "${s.id}"` : typeof section}`);
  return s.rows;
}

/**
 * Splits `income` across progressive (marginal) bands: each band's rate applies only to the part of the income
 * between its `from` and `to`. Amounts are unrounded; round the way the tax authority does (often per band, to the
 * cent).
 */
export function bandBreakdown(section: BandsSection | readonly BandRow[], income: number): BandAmount[] {
  if (typeof income !== "number" || Number.isNaN(income)) throw new TypeError("income must be a number");
  const base = Math.max(0, income);
  return rowsOf(section).map((r) => {
    const top = r.to === null ? base : Math.min(base, r.to);
    const taxable = Math.max(0, top - r.from);
    return { ...(r.label === undefined ? {} : { label: r.label }), from: r.from, to: r.to, rate: r.rate, taxable, tax: taxable * r.rate };
  });
}

/**
 * Tax on `income` from a bands section (income tax brackets, USC, a payroll-tax scale...), applied marginally.
 *
 * The income must already be on the section's `basis` (read `section.basis`): for example the UK bands apply to
 * taxable income above the Personal Allowance, Singapore's to chargeable income after reliefs. Credits, allowances,
 * surcharges, levies and rounding rules are not applied. This is a convenience for working with the published
 * brackets, not tax advice and not a payroll calculation; use the API's net-salary endpoint for take-home pay.
 *
 * @returns the unrounded tax.
 */
export function taxFromBands(section: BandsSection | readonly BandRow[], income: number): number {
  return bandBreakdown(section, income).reduce((sum, b) => sum + b.tax, 0);
}

/** The section with this id, or undefined. */
export function findSection(table: Pick<TaxTable, "sections">, id: string): Section | undefined {
  return table.sections.find((s) => s.id === id);
}

/** The bands section with this id; throws if it is missing or is not a bands section. */
export function bandsSection(table: Pick<TaxTable, "sections" | "country" | "year">, id: string): BandsSection {
  const s = findSection(table, id);
  if (!s) throw new Error(`No section "${id}" in ${table.country} ${table.year}. Sections: ${table.sections.map((x) => x.id).join(", ")}`);
  if (s.kind !== "bands") throw new Error(`Section "${id}" in ${table.country} ${table.year} is a "${s.kind}" section, not bands`);
  return s;
}
