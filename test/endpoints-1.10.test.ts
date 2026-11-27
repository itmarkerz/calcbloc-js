import { describe, expect, it } from "vitest";
import { CalcBloc, type FetchLike } from "../src/client";
import { resolveCountryKey } from "../src/country-codes";
import type { CountriesResponse, EmployerCostResponse, NetSalaryResponse, TaxTreatiesResponse } from "../src/types";
// Real API 1.10.0 responses, produced by the site's own request handler (no network).
import treaties from "./fixtures/api-1.10/tax-treaties-in-us.json";
import netPl from "./fixtures/api-1.10/net-salary-pl.json";
import netDk from "./fixtures/api-1.10/net-salary-dk.json";
import netUk from "./fixtures/api-1.10/net-salary-uk.json";
import costEe from "./fixtures/api-1.10/employer-cost-ee.json";
import countries from "./fixtures/api-1.10/countries-1.10-sample.json";

/** A fetch double that records the URLs and replies with a fixed JSON body. No network. */
function mockFetch(status: number, body: unknown) {
  const urls: string[] = [];
  const fetch: FetchLike = async (url) => {
    urls.push(url);
    return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) };
  };
  return { fetch, urls };
}

describe("API 1.10: /tax-treaties", () => {
  it("taxTreaties() calls the endpoint and returns the typed treaty list", async () => {
    const { fetch, urls } = mockFetch(200, treaties);
    const c = new CalcBloc({ fetch, apiKey: "" });
    const res: TaxTreatiesResponse = await c.taxTreaties({ country: "in", partner: "us" });
    expect(urls).toEqual(["https://calcbloc.com/api/v1/tax-treaties?country=in&partner=us"]);
    expect(res).toMatchObject({ country: "in", partner: "us", count: 1 });
    const us = res.treaties[0];
    expect(us).toMatchObject({ countries: ["in", "us"], partner_name: "United States", signed: "1989-09-12", in_force: "1990-12-18", relief_method: { in: "credit", us: "credit" } });
    expect(us.withholding[0]).toMatchObject({ kind: "dividend_substantial", rate: 0.15, article: "Article 10(2)(a)" });
    expect(us.source.url).toBe("https://www.irs.gov/pub/irs-trty/india.pdf");
    expect(res.attribution.required).toBe(true);
  });

  it("country alone lists every stored treaty; an unknown country is a CalcBlocError", async () => {
    const ok = mockFetch(200, treaties);
    await new CalcBloc({ fetch: ok.fetch, apiKey: "" }).taxTreaties({ country: "India" });
    expect(ok.urls).toEqual(["https://calcbloc.com/api/v1/tax-treaties?country=India"]);

    const bad = mockFetch(400, { error: { code: "unsupported_country", message: 'No treaties are stored for "de". Countries: in.' }, attribution: treaties.attribution });
    await expect(new CalcBloc({ fetch: bad.fetch }).taxTreaties({ country: "de" })).rejects.toMatchObject({ code: "unsupported_country", status: 400 });
  });
});

describe("API 1.10: verification and Denmark, Estonia, Poland", () => {
  it("net-salary and employer-cost responses carry verification", async () => {
    const pl = mockFetch(200, netPl);
    const resPl: NetSalaryResponse = await new CalcBloc({ fetch: pl.fetch, apiKey: "" }).netSalary({ country: "pl", salary: 120_000, accident_rate_pct: 1.67, commuter: false });
    expect(pl.urls[0]).toBe("https://calcbloc.com/api/v1/net-salary?country=pl&salary=120000&accident_rate_pct=1.67&commuter=false");
    expect(resPl.verification).toBe("official-example");
    expect(resPl.notes[0]).toMatch(/^Verification \(official-example\)/);
    expect(resPl.currency).toBe("PLN");

    const dk = mockFetch(200, netDk);
    const resDk = await new CalcBloc({ fetch: dk.fetch, apiKey: "" }).netSalary({ country: "dk", salary: 600_000, municipality: "average", church: false, atp_hours: "0" });
    expect(dk.urls[0]).toBe("https://calcbloc.com/api/v1/net-salary?country=dk&salary=600000&municipality=average&church=false&atp_hours=0");
    expect(resDk.verification).toBe("law-text");

    const ee = mockFetch(200, costEe);
    const resEe: EmployerCostResponse = await new CalcBloc({ fetch: ee.fetch, apiKey: "" }).employerCost({ country: "ee", salary: 30_000, funded_pension: "0" });
    expect(resEe.verification).toBe("official-example");
    expect(resEe.summary.totalCost).toBeGreaterThan(30_000);

    const uk = mockFetch(200, netUk);
    expect((await new CalcBloc({ fetch: uk.fetch, apiKey: "" }).netSalary({ country: "uk", salary: 50_000 })).verification).toBeNull();
  });

  it("countries() gives verification on each calculation endpoint entry", async () => {
    const { fetch } = mockFetch(200, countries);
    const res: CountriesResponse = await new CalcBloc({ fetch, apiKey: "" }).countries();
    const byCode = new Map(res.countries.map((x) => [x.code, x]));
    expect(byCode.get("denmark")?.endpoints["net-salary"]?.verification).toBe("law-text");
    expect(byCode.get("poland")?.endpoints["employer-cost"]?.verification).toBe("official-example");
    expect(byCode.get("estonia")?.endpoints["net-salary"]?.verification).toBe("official-example");
    expect(byCode.get("uk")?.endpoints["net-salary"]?.verification).toBeNull();
    expect(res.coverage?.tax_tables).toBe(217);
    expect(res.coverage?.net_salary_countries).toEqual(expect.arrayContaining(["dk", "ee", "pl"]));
  });

  it("the offline country codes cover every country of API 1.10", () => {
    for (const [input, key] of [["dk", "denmark"], ["EE", "estonia"], ["Poland", "poland"], ["fj", "fiji"], ["Faroe Islands", "faroe-islands"], ["gl", "greenland"], ["ky", "cayman-islands"]]) {
      expect(resolveCountryKey(input), input).toBe(key);
    }
  });
});
