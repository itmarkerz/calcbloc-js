import { describe, expect, it } from "vitest";
import { CalcBloc, KEYS_URL, type FetchLike } from "../src/client";
import { CalcBlocError, RateLimitError } from "../src/errors";
import { loadTable } from "../src/tables";
import { VERSION } from "../src/version";
import pkg from "../package.json";

interface Call {
  url: string;
  headers: Record<string, string>;
}

/** A fetch double that records calls and replies with a fixed status, body and headers. No network. */
function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Call[] = [];
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers });
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (n: string) => lower[n.toLowerCase()] ?? null },
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    };
  };
  return { fetch, calls };
}

const attribution = { source: "CalcBloc", url: "https://calcbloc.com/developers", required: true, text: "Data by CalcBloc (calcbloc.com)" };
const apiError = (code: string, message: string) => ({ error: { code, message, docs: "https://calcbloc.com/developers#parameters" }, attribution });

describe("CalcBloc client (mocked fetch)", () => {
  it("countries(): GET /api/v1/countries without a key, with JSON Accept and a calcbloc-js User-Agent", async () => {
    const { fetch, calls } = mockFetch(200, { countries: [], attribution }, { "X-RateLimit-Limit": "50", "X-RateLimit-Remaining": "49", "X-RateLimit-Reset": "3600" });
    const client = new CalcBloc({ fetch, apiKey: "" });
    const res = await client.countries();
    expect(res.countries).toEqual([]);
    expect(calls[0].url).toBe("https://calcbloc.com/api/v1/countries");
    expect(calls[0].headers.Accept).toBe("application/json");
    expect(calls[0].headers["X-API-Key"]).toBeUndefined();
    expect(calls[0].headers["User-Agent"]).toBe(`calcbloc-js/${VERSION}`);
    expect(client.rateLimit).toEqual({ limit: 50, remaining: 49, resetSeconds: 3600 });
  });

  it("taxTables(): latest by default, region and year in the right places, returns the table", async () => {
    const table = loadTable("uk", { region: "scotland" });
    const { fetch, calls } = mockFetch(200, table);
    const client = new CalcBloc({ fetch, baseUrl: "https://example.test/" });
    const t = await client.taxTables("UK", { region: "scotland" });
    expect(calls[0].url).toBe("https://example.test/api/v1/tax-tables/uk/latest?region=scotland");
    expect(t.region?.code).toBe("scotland");
    await client.taxTables("uk", { year: "2025-26" });
    expect(calls[1].url).toBe("https://example.test/api/v1/tax-tables/uk/2025-26");
  });

  it("taxTables({ format: 'csv' }) returns text and asks for CSV", async () => {
    const { fetch, calls } = mockFetch(200, "section_id,section\nusc,USC\n");
    const csv = await new CalcBloc({ fetch }).taxTables("ireland", { format: "csv" });
    expect(csv.startsWith("section_id,")).toBe(true);
    expect(calls[0].url).toBe("https://calcbloc.com/api/v1/tax-tables/ireland/latest?format=csv");
    expect(calls[0].headers.Accept).toBe("text/csv");
  });

  it("rejects path segments that are not plain ids (no request is sent)", async () => {
    const { fetch, calls } = mockFetch(200, {});
    const client = new CalcBloc({ fetch });
    await expect(client.taxTables("../countries")).rejects.toBeInstanceOf(CalcBlocError);
    await expect(client.taxTables("uk", { year: "2026?x=1" })).rejects.toThrow(/Invalid year/);
    expect(calls).toHaveLength(0);
  });

  it("netSalary(): sends the key in X-API-Key (never in the URL) and serialises booleans", async () => {
    const body = { endpoint: "net-salary", country: "uk", summary: { netAnnual: 39520.12 }, results: {}, attribution };
    const { fetch, calls } = mockFetch(200, body);
    const client = new CalcBloc({ fetch, apiKey: "cb_test_123" });
    const res = await client.netSalary({ country: "uk", salary: 50000, postgraduate_loan: false, region: undefined });
    expect(res.summary.netAnnual).toBe(39520.12);
    expect(calls[0].url).toBe("https://calcbloc.com/api/v1/net-salary?country=uk&salary=50000&postgraduate_loan=false");
    expect(calls[0].headers["X-API-Key"]).toBe("cb_test_123");
    expect(calls[0].url).not.toContain("cb_test_123");
    await expect(client.netSalary({ country: "uk", salary: 1, key: "x" })).rejects.toMatchObject({ code: "invalid_parameter" });
  });

  it("employerCost() and compare() hit their endpoints", async () => {
    const { fetch, calls } = mockFetch(200, { endpoint: "x", attribution });
    const client = new CalcBloc({ fetch, apiKey: "k" });
    await client.employerCost({ country: "us", salary: 80000, region: "ca" });
    await client.compare({ a: "uk", b: "ireland", salary: 60000, currency: "GBP" });
    expect(calls.map((c) => c.url)).toEqual([
      "https://calcbloc.com/api/v1/employer-cost?country=us&salary=80000&region=ca",
      "https://calcbloc.com/api/v1/compare?a=uk&b=ireland&salary=60000&currency=GBP",
    ]);
  });

  it("maps { error: { code, message, docs } } to CalcBlocError (tables-only country → 400 unsupported_country)", async () => {
    const message = "net-salary is not available for Norway yet. Its tax tables are at https://calcbloc.com/norway/tax-tables/2026";
    const { fetch } = mockFetch(400, apiError("unsupported_country", message));
    const err = await new CalcBloc({ fetch, apiKey: "k" }).netSalary({ country: "norway", salary: 600000 }).catch((e) => e);
    expect(err).toBeInstanceOf(CalcBlocError);
    expect(err).not.toBeInstanceOf(RateLimitError);
    expect(err).toMatchObject({ name: "CalcBlocError", code: "unsupported_country", status: 400, message, docs: "https://calcbloc.com/developers#parameters" });
  });

  it("401 api_key_required / invalid_key keep their codes", async () => {
    const { fetch } = mockFetch(401, apiError("api_key_required", "This endpoint needs a free API key: send it in the X-API-Key header."));
    await expect(new CalcBloc({ fetch, apiKey: "" }).netSalary({ country: "uk", salary: 1 })).rejects.toMatchObject({ code: "api_key_required", status: 401 });
  });

  it("429 → RateLimitError with Retry-After and the limit headers", async () => {
    const { fetch } = mockFetch(429, apiError("rate_limited", "Too many requests this minute (limit 60)."), {
      "Retry-After": "17",
      "X-RateLimit-Limit": "5000",
      "X-RateLimit-Remaining": "4200",
      "X-RateLimit-Reset": "40000",
    });
    const err = await new CalcBloc({ fetch, apiKey: "k" }).countries().catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err).toBeInstanceOf(CalcBlocError);
    expect(err).toMatchObject({ code: "rate_limited", status: 429, retryAfter: 17, limit: 5000, remaining: 4200, resetSeconds: 40000 });
    // With a key the API's message for the key's limit is kept, without the key prompt.
    expect(err.message).toBe("Too many requests this minute (limit 60).");
    expect(err.message).not.toContain("developers/keys");
  });

  it("429 without a key → the free allowance is used up, with the keys link and how to set the key", async () => {
    const { fetch, calls } = mockFetch(429, apiError("rate_limited", "Daily limit of 50 requests reached."), {
      "Retry-After": "36000",
      "X-RateLimit-Limit": "50",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "36000",
    });
    const err = await new CalcBloc({ fetch, apiKey: "" }).netSalary({ country: "uk", salary: 30000 }).catch((e) => e);
    expect(calls[0].headers["X-API-Key"]).toBeUndefined();
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err).toMatchObject({ code: "rate_limited", status: 429, retryAfter: 36000, remaining: 0 });
    expect(err.message).toMatch(/^The free allowance of 50 requests a day without a key is used up\. Add your free API key \(5,000 requests a day\): /);
    expect(err.message).toContain(KEYS_URL);
    expect(KEYS_URL).toBe("https://calcbloc.com/developers/keys?utm_source=calcbloc-js&utm_medium=app&utm_campaign=itmarkerz-oss");
    expect(err.message).toContain("new CalcBloc({ apiKey })");
    expect(err.message).toContain("CALCBLOC_API_KEY");
  });

  it("429 without a key on the per-minute limit says so", async () => {
    const { fetch } = mockFetch(429, apiError("rate_limited", "Too many requests this minute (limit 5)."), { "Retry-After": "20" });
    const err = await new CalcBloc({ fetch, apiKey: "" }).countries().catch((e) => e);
    expect(err.message).toMatch(/^The free allowance without a key \(5 requests a minute, 50 a day\) is used up for this minute\./);
    expect(err.message).toContain(KEYS_URL);
  });

  it("non-JSON error pages → http_error; bad JSON on 200 → invalid_response; fetch failure → network_error", async () => {
    await expect(new CalcBloc({ fetch: mockFetch(502, "<html>Bad gateway</html>").fetch }).countries()).rejects.toMatchObject({ code: "http_error", status: 502 });
    await expect(new CalcBloc({ fetch: mockFetch(200, "not json").fetch }).countries()).rejects.toMatchObject({ code: "invalid_response", status: 200 });
    const failing: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };
    const err = await new CalcBloc({ fetch: failing }).countries().catch((e) => e);
    expect(err).toMatchObject({ code: "network_error", status: 0 });
    expect(err.cause).toBeInstanceOf(TypeError);
  });

  it("reads CALCBLOC_API_KEY from the environment when no apiKey is given", async () => {
    const before = process.env.CALCBLOC_API_KEY;
    process.env.CALCBLOC_API_KEY = "cb_env_key";
    try {
      const { fetch, calls } = mockFetch(200, { countries: [], attribution });
      const client = new CalcBloc({ fetch });
      expect(client.hasApiKey).toBe(true);
      await client.countries();
      expect(calls[0].headers["X-API-Key"]).toBe("cb_env_key");
    } finally {
      if (before === undefined) delete process.env.CALCBLOC_API_KEY;
      else process.env.CALCBLOC_API_KEY = before;
    }
  });

  it("VERSION matches package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
