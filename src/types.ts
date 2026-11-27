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
  /** API 1.7+: display name of each enum value (e.g. "ca" → "California"). */
  labels?: Record<string, string>;
  /** API 1.7+: accepted spellings of enum values → canonical value (e.g. "married" → "mfj"). */
  aliases?: Record<string, string>;
  description: string;
}

/**
 * API 1.10+: how a calculation is checked. `official-example`: the golden tests reproduce a worked example or simulator
 * result published by the tax authority or social security institution (within 1 currency unit); `law-text`: no
 * official example is published, so the golden tests are worked by hand from the law. `null` for countries with
 * their own engine.
 */
export type Verification = "official-example" | "law-text" | null;

export interface CalculationEndpointInfo {
  path: string;
  calculatorUrl: string;
  /** API 1.10+: how this country's calculation is checked (see `Verification`). */
  verification?: Verification;
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
  /** Country key used in responses and URLs, e.g. "uk", "new-zealand". */
  code: string;
  /** API 1.7+: short code accepted as `country` (ISO 3166-1 alpha-2 in lower case; the UK is "uk"), e.g. "nz". */
  short_code?: string;
  /** API 1.7+: ISO 3166-1 alpha-2 code, e.g. "NZ". */
  iso_code?: string;
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
  /** API 1.7+: what the API covers, counted by the API itself. Country lists use short codes. */
  coverage?: ApiCoverage;
  attribution: Attribution;
}

/** API 1.7+: the `coverage` object of GET /api/v1/countries. */
export interface ApiCoverage {
  tax_tables: number;
  net_salary: number;
  employer_cost: number;
  compare: number;
  tables_only?: number;
  net_salary_countries?: string[];
  employer_cost_countries?: string[];
  compare_countries?: string[];
  /** Countries where `region` is required, per endpoint. */
  region_required: { "net-salary": string[]; "employer-cost": string[] };
  region_optional?: { "net-salary": string[]; "employer-cost": string[] };
  not_supported?: string;
  /** One sentence with the counts. */
  summary: string;
  [key: string]: unknown;
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
  /** With a `verification`, the first note says how the calculation was checked and gives the official URLs. */
  notes: string[];
  /**
   * API 1.10+: "official-example" (checked against an official worked example: Estonia, Poland), "law-text" (worked
   * by hand from the law: Denmark) or null (countries with their own engine).
   */
  verification?: Verification;
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
  /**
   * Country: a short code ("uk", "us", "nz", "de"; ISO 3166-1 alpha-2 in lower case, the UK as "uk" or "gb"), an
   * English name, or the older key ("new-zealand", "germany"). Responses carry the older key in `country`.
   */
  country: string;
  /** Annual salary in the country's currency (India net-salary: annual CTC). */
  salary: number;
  /** "latest" (default) or the current tax year; calculations use the current year only. */
  year?: string;
  /**
   * Region code where the country has regions (US state, Canadian province, UK nation...). Required for take-home
   * pay in the US and Canada and for employer cost in the US, Australia and Canada (listed in `coverage.region_required`
   * of `countries()`); without it the API answers 400 `missing_parameter` with the valid codes.
   */
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

// ---------------------------------------------------------------------------------------------------------------
// API 1.8 and 1.9 endpoints. Responses are typed loosely (the shared fields only); every field the API returns is
// present. See https://calcbloc.com/developers for each endpoint's full response.

/** A JSON response of the API: always carries the attribution block. */
export interface ApiResponse {
  attribution: Attribution;
  [field: string]: unknown;
}

/** Query parameters of /supplemental-withholding (API 1.8): tax withheld on a bonus or other supplemental pay. */
export interface SupplementalWithholdingParams {
  /** Country: short code, English name or key (us, uk, ie, ca, au, nz...). */
  country: string;
  /** Regular gross annual salary, before the supplemental payment. */
  salary: number;
  /** The supplemental payment (gross), in the country's currency. */
  amount: number;
  /** bonus (default), commission, rsu_vest, option_exercise, lump_sum... (per country; see countries()). */
  type?: string;
  /** Region where required (US state, Canadian province). */
  region?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /equity-tax (API 1.8): RSUs and stock options at vest or exercise, and on sale. */
export interface EquityTaxParams {
  country: string;
  /** us: rsu, nso, iso; uk: rsu, emi, csop, unapproved_option; au: ess_upfront, ess_deferred, rsu; ca: stock_option; in: esop, rsu. */
  instrument: string;
  units: number;
  /** YYYY-MM-DD */
  grant_date: string;
  /** Vest date (RSUs), exercise date (options) or the taxing point, YYYY-MM-DD. */
  event_date: string;
  /** Market value per share at the event. */
  fmv_event?: number;
  /** Market value per share at grant (UK EMI and CSOP, Canada 110(1)(d)). */
  fmv_grant?: number;
  exercise_price?: number;
  sale_date?: string;
  sale_price?: number;
  salary?: number;
  region?: string;
  [param: string]: ParamValue | undefined;
}

/**
 * Query parameters of /cross-border-equity (API 1.9): an RSU vest or option exercise split between the countries
 * worked in from grant to vest.
 */
export interface CrossBorderEquityParams {
  /** rsu or stock_option */
  instrument: string;
  units: number;
  grant_date: string;
  vest_date?: string;
  event_date: string;
  fmv_event?: number;
  exercise_price?: number;
  /** Currency of fmv_event and exercise_price (default USD). */
  currency?: string;
  /** Work periods, comma-separated country:start:end[:workdays], e.g. "us:2024-01-01:2024-12-31:220,gb:2025-01-01:2025-06-30:120". */
  periods: string;
  residence?: string;
  grant_country?: string;
  us_citizen?: boolean;
  /** Regular annual salary per country in its own currency, e.g. "us:150000,gb:80000". */
  salaries?: string;
  /** Per-country options, comma-separated country.option:value, e.g. "us.filing_status:mfj,us.region:ny". */
  options?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /facts (API 1.9): tax facts by country, tax type and jurisdiction. */
export interface FactsParams {
  country?: string;
  /** Tax type code or dotted prefix: income.pit, consumption.vat, consumption.sales... */
  tax_type?: string;
  level?: string;
  /** Jurisdiction id, exact: gb, gb-sct, us-ca... */
  jurisdiction?: string;
  /** "latest" or a tax year (2026, 2026-27). */
  year?: string;
  limit?: number;
  /** next_cursor from the previous page. */
  cursor?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /tax-calendar (API 1.9). Without a country, every country's calendar. */
export interface TaxCalendarParams {
  country?: string;
  region?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /tariffs (API 1.9): tariff lines of a commodity code in the UK, EU, US or Indian tariff. */
export interface TariffsParams {
  /** Importing country or area: gb (uk), eu or a member state, us, in. */
  destination: string;
  /** HS prefix (2, 4, 6 or 8 digits) or a full commodity code. */
  code: string;
  /** Country of origin: with it, the best preference for that origin. */
  origin?: string;
  limit?: number;
  cursor?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /trade-agreements (API 1.9). */
export interface TradeAgreementsParams {
  /** Country whose tariff the agreements come from: gb, eu, us, in. */
  country: string;
  /** Only agreements covering this origin country. */
  partner?: string;
  [param: string]: ParamValue | undefined;
}

/** Query parameters of /import-duty (API 1.9): duties, import VAT, excise and landed cost of one import. */
export interface ImportDutyParams {
  destination: string;
  origin: string;
  /** The 10-digit commodity code (8 for India). */
  code: string;
  /** Customs value in the tariff's currency. */
  customs_value: number;
  quantity?: number;
  unit?: string;
  proof_of_origin?: boolean;
  additional_code?: string;
  excise_code?: string;
  documents?: string;
  vat_code?: string;
  /** US only: vessel, air, truck, rail, mail, other. */
  transport?: string;
  [param: string]: ParamValue | undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// API 1.10

/** Query parameters of /tax-treaties (API 1.10): the double taxation treaties stored for a country. */
export interface TaxTreatiesParams {
  /** Country whose treaties to list: ISO 3166-1 alpha-2 code ("in") or English name ("India"). Treaties are stored for India. */
  country: string;
  /** Only the treaty with this country: ISO code ("us", "gb" or "uk") or English name. */
  partner?: string;
  [param: string]: ParamValue | undefined;
}

/** Kind of payment a treaty withholding limit applies to. */
export type TreatyWithholdingKind = "dividend" | "dividend_substantial" | "interest" | "royalty" | "fts";

/** One withholding limit of a treaty: the maximum tax the source State may charge. */
export interface TreatyWithholding {
  kind: TreatyWithholdingKind;
  /** Maximum rate in the source State, as a decimal (0.15 = 15%). */
  rate: number;
  condition: string | null;
  /** Article and paragraph, e.g. "Article 10(2)(a)". */
  article: string | null;
  /** The article's wording, verbatim. */
  quote: string | null;
}

/** One double taxation treaty of GET /api/v1/tax-treaties. */
export interface TaxTreaty {
  /** The two countries (ISO 3166-1 alpha-2, lower case), e.g. ["in", "us"]. */
  countries: string[];
  partner: string;
  partner_name: string | null;
  title: string;
  /** Signature date (YYYY-MM-DD) where the source states it. */
  signed: string | null;
  /** Entry-into-force date (YYYY-MM-DD) where the source states it. */
  in_force: string | null;
  /** Whether the MLI modifies the treaty; null where not stated. */
  mli: boolean | null;
  /** Relief method of each country, keyed by ISO code. */
  relief_method: Record<string, "credit" | "exemption" | "exemption_with_progression">;
  withholding: TreatyWithholding[];
  source: { id: string; url?: string; title?: string; publisher?: string; instrument?: string | null; retrieved_at?: string; quote?: string | null };
  data_file: string;
}

/** GET /api/v1/tax-treaties (API 1.10). Nothing is computed: the rates are the treaty's maximum rates. */
export interface TaxTreatiesResponse {
  /** ISO code of the country asked for, e.g. "in". */
  country: string;
  partner: string | null;
  count: number;
  treaties: TaxTreaty[];
  attribution: Attribution;
}
