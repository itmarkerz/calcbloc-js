import { CalcBlocError, RateLimitError } from "./errors";
import type {
  ApiErrorBody,
  CalculationParams,
  CompareParams,
  CompareResponse,
  CountriesResponse,
  EmployerCostResponse,
  NetSalaryResponse,
  ParamValue,
  RateLimitInfo,
  TaxTable,
} from "./types";
import { VERSION } from "./version";

/** The parts of a fetch Response the client uses. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** A fetch-compatible function (global fetch, undici, node-fetch, or a test double). */
export type FetchLike = (url: string, init: { method: "GET"; headers: Record<string, string>; signal?: AbortSignal }) => Promise<FetchResponseLike>;

export interface CalcBlocOptions {
  /**
   * Free API key from https://calcbloc.com/developers/keys, sent in the X-API-Key header. In Node it defaults to the
   * CALCBLOC_API_KEY environment variable. Optional: without a key every endpoint works for 50 requests a day and
   * 5 a minute per IP address; a free key allows 5,000 a day and 60 a minute.
   */
  apiKey?: string;
  /** Default https://calcbloc.com */
  baseUrl?: string;
  /** Custom fetch (tests, proxies, runtimes without a global fetch). Defaults to globalThis.fetch. */
  fetch?: FetchLike;
  /** Abort a request after this many milliseconds. Default 30000; 0 disables the timeout. */
  timeoutMs?: number;
  /** Extra request headers. In browsers, only CORS-safelisted headers and X-API-Key are allowed by the API. */
  headers?: Record<string, string>;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface TaxTablesOptions extends RequestOptions {
  /** "latest" (default) or a tax year such as "2026" or "2026-27". */
  year?: string;
  /** Region code: US state, Canadian province, UK nation (scotland, wales), Swiss canton... Returns the regional figures only. */
  region?: string;
  /** "json" (default) returns a TaxTable; "csv" returns the CSV text. */
  format?: "json" | "csv";
}

const SEGMENT = /^[A-Za-z0-9-]{1,40}$/;

/** Where to get a free API key; linked from the RateLimitError raised when the free allowance without a key is used up. */
export const KEYS_URL = "https://calcbloc.com/developers/keys?utm_source=calcbloc-js&utm_medium=app&utm_campaign=itmarkerz-oss";

/** The 429 message without a key: the free allowance is used up; add a free key and how to set it. */
function noKeyLimitMessage(apiMessage: string, retryAfter: number | null): string {
  const perMinute = /minute/i.test(apiMessage) && (retryAfter === null || retryAfter <= 60);
  const usedUp = perMinute
    ? "The free allowance without a key (5 requests a minute, 50 a day) is used up for this minute."
    : "The free allowance of 50 requests a day without a key is used up.";
  return `${usedUp} Add your free API key (5,000 requests a day): ${KEYS_URL} (set it with new CalcBloc({ apiKey }) or the CALCBLOC_API_KEY environment variable).`;
}

function envApiKey(): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return p?.env?.CALCBLOC_API_KEY || undefined;
}

function isNode(): boolean {
  const p = (globalThis as { process?: { versions?: { node?: string } } }).process;
  return typeof p?.versions?.node === "string" && typeof (globalThis as { window?: unknown }).window === "undefined";
}

function num(h: string | null): number | null {
  if (h === null || h.trim() === "") return null;
  const n = Number(h);
  return Number.isFinite(n) ? n : null;
}

/**
 * Client for the CalcBloc API (https://calcbloc.com/developers): countries, official tax tables and the take-home
 * pay, employer cost and salary comparison calculators. Zero dependencies; uses the global fetch.
 *
 * @example
 * const calcbloc = new CalcBloc({ apiKey: process.env.CALCBLOC_API_KEY });
 * const table = await calcbloc.taxTables("uk", { year: "2026-27" });
 * const pay = await calcbloc.netSalary({ country: "uk", salary: 50000 });
 */
export class CalcBloc {
  readonly baseUrl: string;
  /** Rate-limit state from the most recent response that carried X-RateLimit-* headers. */
  rateLimit: RateLimitInfo | null = null;

  readonly #apiKey: string | undefined;
  readonly #fetch: FetchLike;
  readonly #timeoutMs: number;
  readonly #headers: Record<string, string>;

  constructor(options: CalcBlocOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://calcbloc.com").replace(/\/+$/, "");
    this.#apiKey = options.apiKey ?? envApiKey();
    if (options.fetch) this.#fetch = options.fetch;
    else if (typeof globalThis.fetch === "function") this.#fetch = (url, init) => (globalThis.fetch as unknown as FetchLike)(url, init);
    else throw new CalcBlocError("network_error", "No fetch available: pass { fetch } to new CalcBloc() (Node 18+ has a global fetch).");
    this.#timeoutMs = options.timeoutMs ?? 30_000;
    this.#headers = { ...(options.headers ?? {}) };
  }

  /** True when an API key is configured. */
  get hasApiKey(): boolean {
    return !!this.#apiKey;
  }

  /** GET /api/v1/countries: every country with its years, regions, supported endpoints and parameters. */
  countries(options: RequestOptions = {}): Promise<CountriesResponse> {
    return this.#getJson("/api/v1/countries", {}, options);
  }

  /** GET /api/v1/tax-tables/{country}/{year}: official income tax brackets, social security rates and thresholds. */
  taxTables(country: string, options?: TaxTablesOptions & { format?: "json" }): Promise<TaxTable>;
  taxTables(country: string, options: TaxTablesOptions & { format: "csv" }): Promise<string>;
  taxTables(country: string, options: TaxTablesOptions = {}): Promise<TaxTable | string> {
    const year = options.year ?? "latest";
    for (const [name, v] of [["country", country], ["year", year]] as const)
      if (typeof v !== "string" || !SEGMENT.test(v)) return Promise.reject(new CalcBlocError("invalid_parameter", `Invalid ${name} "${String(v).slice(0, 40)}": use letters, digits and hyphens (e.g. "uk", "2026-27", "latest").`, { status: 0 }));
    const path = `/api/v1/tax-tables/${encodeURIComponent(country.toLowerCase())}/${encodeURIComponent(year)}`;
    const query: Record<string, ParamValue | undefined> = { region: options.region, format: options.format && options.format !== "json" ? options.format : undefined };
    if (options.format === "csv") return this.#request(path, query, options, "text/csv").then((r) => r.text);
    return this.#getJson(path, query, options);
  }

  /** GET /api/v1/net-salary: take-home pay for an annual salary. */
  netSalary(params: CalculationParams, options: RequestOptions = {}): Promise<NetSalaryResponse> {
    return this.#getJson("/api/v1/net-salary", params, options);
  }

  /** GET /api/v1/employer-cost: the full cost of employing someone on a salary. */
  employerCost(params: CalculationParams, options: RequestOptions = {}): Promise<EmployerCostResponse> {
    return this.#getJson("/api/v1/employer-cost", params, options);
  }

  /** GET /api/v1/compare: the same salary in two countries, converted at the ECB reference rate. */
  compare(params: CompareParams, options: RequestOptions = {}): Promise<CompareResponse> {
    return this.#getJson("/api/v1/compare", params, options);
  }

  async #getJson<T>(path: string, query: Record<string, ParamValue | undefined>, options: RequestOptions): Promise<T> {
    const { text, status } = await this.#request(path, query, options, "application/json");
    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new CalcBlocError("invalid_response", `Expected JSON from ${path} but could not parse the response.`, { status, cause });
    }
  }

  async #request(path: string, query: Record<string, ParamValue | undefined>, options: RequestOptions, accept: string): Promise<{ text: string; status: number }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (k === "key") throw new CalcBlocError("invalid_parameter", "Pass the API key as { apiKey } to new CalcBloc(); the API refuses keys in the URL.");
      qs.set(k, typeof v === "boolean" ? (v ? "true" : "false") : String(v));
    }
    const search = qs.toString();
    const url = `${this.baseUrl}${path}${search ? `?${search}` : ""}`;
    const headers: Record<string, string> = { Accept: accept, ...this.#headers };
    if (this.#apiKey) headers["X-API-Key"] = this.#apiKey;
    if (isNode() && !Object.keys(headers).some((h) => h.toLowerCase() === "user-agent")) headers["User-Agent"] = `calcbloc-js/${VERSION}`;

    let signal = options.signal;
    if (!signal && this.#timeoutMs > 0 && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") signal = AbortSignal.timeout(this.#timeoutMs);

    let res: FetchResponseLike;
    try {
      res = await this.#fetch(url, { method: "GET", headers, ...(signal ? { signal } : {}) });
    } catch (cause) {
      const reason = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
      throw new CalcBlocError("network_error", `Request to ${this.baseUrl}${path} failed (${reason}).`, { status: 0, cause });
    }

    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const reset = num(res.headers.get("x-ratelimit-reset"));
    if (limit !== null && remaining !== null) this.rateLimit = { limit, remaining, resetSeconds: reset ?? 0 };

    const text = await res.text();
    if (res.ok) return { text, status: res.status };

    let body: ApiErrorBody | null = null;
    try {
      body = JSON.parse(text) as ApiErrorBody;
    } catch {
      body = null;
    }
    const err = body && typeof body === "object" && body.error && typeof body.error.code === "string" ? body.error : null;
    if (!err) throw new CalcBlocError("http_error", `HTTP ${res.status} from ${path}${text ? `: ${text.slice(0, 200)}` : ""}`, { status: res.status });
    const { code, message, docs, ...details } = err;
    const common = { status: res.status, docs, details: Object.keys(details).length ? details : undefined };
    if (res.status === 429 || code === "rate_limited") {
      const retryAfter = num(res.headers.get("retry-after"));
      throw new RateLimitError(this.#apiKey ? message : noKeyLimitMessage(message, retryAfter), { ...common, retryAfter, limit, remaining, resetSeconds: reset });
    }
    throw new CalcBlocError(code, message, common);
  }
}
