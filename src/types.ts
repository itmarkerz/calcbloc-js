/**
 * Types for the CalcBloc API (OpenAPI 1.2.0, https://calcbloc.com/api/openapi.json) and the bundled tax tables,
 * which use the same shape as GET /api/v1/tax-tables/{country}/{year}.
 */

/** Attribution block. API responses carry `required` and `text`; bundled tables carry `licence` and `credit`. */
export interface Attribution {
  source: "CalcBloc";
  url: string;
  required?: true;
  text?: string;
  licence?: string;
  credit?: string;
}

/** An official source (tax authority page, legislation or published table). */
export interface Source {
  title: string;
  url: string;
  /** Date the figure was last checked against the source (YYYY-MM-DD). */
  retrievedAt: string;
  /** Set when the record has its own period, e.g. a rate in force since an earlier year. */
  effectiveFrom?: string;
  /** null: in force until changed. */
  effectiveTo?: string | null;
  publisher?: string;
}

/** One band of a progressive scale: `rate` applies to the part of the base between `from` and `to`. */
export interface BandRow {
  label?: string;
  from: number;
  /** null: no upper limit. */
  to: number | null;
  /** Decimal: 0.2 = 20%. */
  rate: number;
}

export type ValueUnit = "rate" | "money" | "number" | "text";
export type RowStatus = "verified" | "under_review" | "not_applicable";

/** One named figure: a rate (decimal), an amount of money, a count or a short text. */
export interface ValueRow {
  label: string;
  value: number | string | null;
  unit: ValueUnit;
  note?: string;
  source?: Source;
  status?: RowStatus;
}

export type SectionGroup = "income-tax" | "employee" | "employer" | "other";

interface SectionBase {
  /** Stable id within the table, e.g. "income-tax-england", "usc", "federal-income-tax". */
  id: string;
  title: string;
  group: SectionGroup | (string & {});
  source: Source;
  verified: boolean;
  /** What the bands or values apply to, e.g. "Taxable income above the Personal Allowance, per year". */
  basis?: string;
  note?: string;
}

/** Income tax brackets and other progressive scales. */
export interface BandsSection extends SectionBase {
  kind: "bands";
  rows: BandRow[];
}

/** Allowances, thresholds, social security rates, caps and other single figures. */
export interface ValuesSection extends SectionBase {
  kind: "values";
  rows: ValueRow[];
}

export type Section = BandsSection | ValuesSection;

/** One flat, self-describing row per band or value (the `rows` array and the CSV columns). */
export interface ExportRow {
  section_id: string;
  section: string;
  group: string;
  basis: string;
  note: string;
  tax_year: string;
  effective_from: string;
  /** null: in force until changed. */
  effective_to: string | null;
  source_title: string;
  source_url: string;
  retrieved_at: string;
  status: RowStatus;
  label: string;
  from: number | null;
  to: number | null;
  /** Decimal (0.2 = 20%). */
  rate: number | null;
  value: number | string | null;
  unit: ValueUnit;
}

export interface Region {
  code: string;
  name: string;
  slug: string;
}

/** A tax table: the response of GET /api/v1/tax-tables/{country}/{year}[?region=] and the shape of the bundled data. */
export interface TaxTable {
  country: string;
  countryName: string;
  /** Tax year id, e.g. "2026" or "2026-27". */
  year: string;
  /** Display label, e.g. "2026/27". */
  yearLabel: string;
  /** false for an earlier year kept for reference. */
  isCurrent: boolean;
  /** Short notice about changes in the year, when there is one. */
  notice?: string;
  /** null for the national table; the region for a regional table (which holds the regional figures only). */
  region: Region | null;
  /** ISO 4217 code. */
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "verified" | "unverified" | (string & {});
  /** Section ids still being checked. */
  underReview: string[];
  dataVerified: boolean;
  sections: Section[];
  sources: Source[];
  /** The year as requested ("latest" or a year). */
  requested_year: string;
  current_year: string;
  /** Every served year, current first. */
  years_available: string[];
  rows: ExportRow[];
  /** The calcbloc.com page with the same figures. */
  pageUrl: string;
  attribution: Attribution;
}

/** One country in the bundled manifest. */
export interface ManifestCountry {
  /** Country id used in URLs and the API, e.g. "uk", "new-zealand". */
  country: string;
  name: string;
  currency: string;
  current_year: string;
  /** Bundled years, current first. */
  years: string[];
  regions: Region[];
  /** Data files, relative to the data directory. */
  files: string[];
  pageUrl: string;
  apiUrl: string;
  /** Date the country's figures were last checked against official sources. */
  lastVerified: string;
  sourceUrls: string[];
  rowCount: number;
  underReviewRows: number;
}

export interface Manifest {
  generatedAt: string;
  source: string;
  licence: string;
  credit: string;
  api: string;
  countries: ManifestCountry[];
  /** Countries being prepared, with the reason they are not in the data yet. */
  pending: { country: string; name: string; reason: string }[];
}

// ---------------------------------------------------------------------------------------------------------------
// API responses

export type Endpoint = "net-salary" | "employer-cost" | "compare" | "tax-tables";

export interface EndpointParameter {
  name: string;
  type: "number" | "integer" | "boolean" | "enum";
  required: boolean;
  values?: string[];
  min?: number;
  max?: number;
  default?: string | number | boolean;
  unit?: string;
  description: string;
}

export interface CalculationEndpointInfo {
  path: string;
  calculatorUrl: string;
  parameters: EndpointParameter[];
}

export interface TaxTablesEndpointInfo {
  path: string;
  pageUrl: string;
  years: string[];
  current_year: string;
  years_available: string[];
  latestPath: string;
  regions: { code: string; name: string }[];
  formats: ("json" | "csv")[];
}

export interface ApiCountry {
  code: string;
  name: string;
  currency: string;
  years: string[];
  current_year: string;
  years_available: string[];
  /** Every endpoint the country supports; ["tax-tables"] alone means tables only. */
  available_endpoints: Endpoint[];
  tables_only: boolean;
  endpoints: {
    "net-salary"?: CalculationEndpointInfo;
    "employer-cost"?: CalculationEndpointInfo;
    "tax-tables": TaxTablesEndpointInfo;
  };
}

/** GET /api/v1/countries */
export interface CountriesResponse {
  countries: ApiCountry[];
  attribution: Attribution;
}

export interface NetSalarySummary {
  grossAnnual: number | null;
  netAnnual: number | null;
  totalDeductions: number | null;
  /** Decimal (0.21 = 21%). */
  effectiveRate: number | null;
}

export interface EmployerCostSummary {
  salary: number | null;
  totalCost: number | null;
  monthlyCost: number | null;
  multiplier: number | null;
}

export interface Breakdown {
  title: string;
  columns: string[];
  rows: { label: string; values: (number | string | null)[] }[];
}

interface CalculationResponseBase<E extends string, S> {
  endpoint: E;
  country: string;
  countryName: string;
  /** The tax year used (latest resolves to the current year). */
  year: string;
  requested_year: string;
  currency: string;
  /** The validated inputs used, with defaults filled in. */
  inputs: Record<string, string | number | boolean>;
  summary: S;
  /** Every numeric output of the calculator engine, annual unless the key says otherwise. */
  results: Record<string, number>;
  breakdown: Breakdown | null;
  notes: string[];
  calculatorUrl: string;
  /** Notes about clamped or rounded inputs. */
  warnings: string[];
  attribution: Attribution;
}

/** GET /api/v1/net-salary */
export type NetSalaryResponse = CalculationResponseBase<"net-salary", NetSalarySummary>;
/** GET /api/v1/employer-cost */
export type EmployerCostResponse = CalculationResponseBase<"employer-cost", EmployerCostSummary>;

export interface CompareSide {
  country: string;
  place: string;
  currency: string;
  gross: number;
  incomeTax: number;
  contributions: number;
  retained: number;
  net: number;
  effectiveRate: number;
  grossInOtherCurrency: number;
  netInOtherCurrency: number;
  parts: unknown[];
  assumptions: string[];
  [key: string]: unknown;
}

/** GET /api/v1/compare */
export interface CompareResponse {
  endpoint: "compare";
  inputs: Record<string, string | number | boolean>;
  a: CompareSide;
  b: CompareSide;
  /** e.g. { GBP_EUR: 1.17, date: "2026-11-10", note: "..." } */
  exchangeRate: Record<string, number | string>;
  difference: { inACurrency: number; inBCurrency: number; percentOfA: number; deductionRateGapPoints: number };
  interpretation: string;
  calculatorUrl: string;
  warnings: string[];
  attribution: Attribution;
}

/** Body of every error response: { error: { code, message, docs }, attribution }. */
export interface ApiErrorBody {
  error: { code: string; message: string; docs?: string; [key: string]: unknown };
  attribution?: Attribution;
}

export type ParamValue = string | number | boolean;

/**
 * Query parameters of /net-salary and /employer-cost. `country` and `salary` are required; every other parameter
 * depends on the country (see `countries()` → endpoints[...].parameters, or https://calcbloc.com/developers).
 */
export interface CalculationParams {
  /** Country id, e.g. "uk", "us", "new-zealand". */
  country: string;
  /** Annual salary in the country's currency (India net-salary: annual CTC). */
  salary: number;
  /** "latest" (default) or the current tax year; calculations use the current year only. */
  year?: string;
  /** Region code where the country has regions (US state, Canadian province, UK nation...). */
  region?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /compare. */
export interface CompareParams {
  a: string;
  b: string;
  salary: number;
  /** Currency of `salary`: a's or b's. Default: a's. */
  currency?: string;
  us_state?: string;
  uk_region?: "england" | "scotland" | "wales";
  ca_province?: string;
  in_state?: string;
  [param: string]: ParamValue | undefined;
}

/** Rate-limit state from the X-RateLimit-* headers of the last response. */
export interface RateLimitInfo {
  /** Requests allowed per day for this key or address. */
  limit: number;
  remaining: number;
  /** Seconds until the daily window resets (UTC midnight). */
  resetSeconds: number;
}
