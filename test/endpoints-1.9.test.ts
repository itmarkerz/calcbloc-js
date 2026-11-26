import { describe, expect, it } from "vitest";
import { CalcBloc, type FetchLike } from "../src/client";

/** A fetch double that records the URLs and replies with a fixed JSON body. No network. */
function mockFetch(status: number, body: unknown) {
  const urls: string[] = [];
  const fetch: FetchLike = async (url) => {
    urls.push(url);
    return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) };
  };
  return { fetch, urls };
}

const attribution = { source: "CalcBloc", url: "https://calcbloc.com/developers", required: true, text: "Data by CalcBloc (calcbloc.com)" };

describe("API 1.8 and 1.9 endpoints (mocked fetch)", () => {
  it("each method calls its endpoint with the parameters as query values", async () => {
    const { fetch, urls } = mockFetch(200, { attribution });
    const c = new CalcBloc({ fetch, apiKey: "" });
    await c.supplementalWithholding({ country: "us", salary: 100000, amount: 10000, type: "bonus", region: "ca" });
    await c.equityTax({ country: "uk", instrument: "emi", units: 1000, grant_date: "2024-01-15", event_date: "2026-03-01", fmv_event: 12, exercise_price: 2 });
    await c.crossBorderEquity({ instrument: "rsu", units: 100, grant_date: "2024-01-01", event_date: "2026-01-01", fmv_event: 50, periods: "us:2024-01-01:2024-12-31,gb:2025-01-01:2026-01-01", us_citizen: false });
    await c.facts({ country: "uk", tax_type: "income.pit" });
    await c.taxCalendar({ country: "uk" });
    await c.taxCalendar();
    await c.tariffs({ destination: "gb", code: "0901", origin: "in" });
    await c.tradeAgreements({ country: "gb", partner: "in" });
    await c.importDuty({ destination: "gb", origin: "in", code: "0901210000", customs_value: 1000, proof_of_origin: true });
    expect(urls).toEqual([
      "https://calcbloc.com/api/v1/supplemental-withholding?country=us&salary=100000&amount=10000&type=bonus&region=ca",
      "https://calcbloc.com/api/v1/equity-tax?country=uk&instrument=emi&units=1000&grant_date=2024-01-15&event_date=2026-03-01&fmv_event=12&exercise_price=2",
      "https://calcbloc.com/api/v1/cross-border-equity?instrument=rsu&units=100&grant_date=2024-01-01&event_date=2026-01-01&fmv_event=50&periods=us%3A2024-01-01%3A2024-12-31%2Cgb%3A2025-01-01%3A2026-01-01&us_citizen=false",
      "https://calcbloc.com/api/v1/facts?country=uk&tax_type=income.pit",
      "https://calcbloc.com/api/v1/tax-calendar?country=uk",
      "https://calcbloc.com/api/v1/tax-calendar",
      "https://calcbloc.com/api/v1/tariffs?destination=gb&code=0901&origin=in",
      "https://calcbloc.com/api/v1/trade-agreements?country=gb&partner=in",
      "https://calcbloc.com/api/v1/import-duty?destination=gb&origin=in&code=0901210000&customs_value=1000&proof_of_origin=true",
    ]);
  });

  it("API errors from the new endpoints are CalcBlocErrors with the API's code", async () => {
    const { fetch } = mockFetch(400, { error: { code: "invalid_parameter", message: "Code 610910 matches 2 tariff lines" }, attribution });
    const c = new CalcBloc({ fetch });
    await expect(c.importDuty({ destination: "gb", origin: "cn", code: "610910", customs_value: 100 })).rejects.toMatchObject({ code: "invalid_parameter", status: 400 });
  });
});
