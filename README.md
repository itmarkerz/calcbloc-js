# calcbloc: tax tables 2026 for Node.js and TypeScript

[![npm version](https://img.shields.io/npm/v/calcbloc.svg)](https://www.npmjs.com/package/calcbloc)
[![tests](https://github.com/itmarkerz/calcbloc-js/actions/workflows/test.yml/badge.svg)](https://github.com/itmarkerz/calcbloc-js/actions/workflows/test.yml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-green.svg)](https://calcbloc.com/data?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss)

Official **income tax brackets**, **social security rates** and payroll thresholds for the United States, the United Kingdom, Canada, Australia, New Zealand, Ireland, India, Singapore, the UAE and a growing list of European countries, in one package:

- **Bundled tax tables** for offline use: every table the [CalcBloc tax tables API](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) serves, including US states, Canadian provinces and Swiss cantons, readable in Node with no network and no API key.
- **A typed API client** for the CalcBloc API: countries, tax tables in JSON or CSV, take-home pay (net salary), employer cost and salary comparison between countries.
- **Every figure is sourced.** Each band and value carries the tax authority's URL, the date it was last checked and its effective dates, exactly as on [calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss).

Zero runtime dependencies. ESM and CommonJS. Node 18 or later. Full TypeScript types.

CalcBloc is a product of [itmarkerz technologies](https://itmarkerz.co.in/?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss).

## Install

```sh
npm install calcbloc
```

> **Not yet published.** The package is not on npm yet. Until it is, install from a clone: `npm install ../calcbloc-js` or `npm pack` then `npm install calcbloc-0.2.0.tgz`.

## Three examples

The outputs below come from the data bundled in this version.

### 1. Income tax brackets, offline

```js
import { loadTable, bandsSection, taxFromBands } from "calcbloc/tables";

const uk = loadTable("uk", { year: "2026-27" });
const bands = bandsSection(uk, "income-tax-england");

for (const b of bands.rows) console.log(b.label, b.rate, b.from, b.to);
// Basic rate 0.2 0 37700
// Higher rate 0.4 37700 125140
// Additional rate 0.45 125140 null

// The bands apply to taxable income above the £12,570 Personal Allowance (see bands.basis).
taxFromBands(bands, 50_000 - 12_570); // 7486  → £7,486 of Income Tax on a £50,000 salary
bands.source.url; // https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
```

### 2. Social security rates, offline

```js
import { loadTable, findSection } from "calcbloc/tables";

const us = loadTable("us"); // latest year: 2026
const fica = findSection(us, "fica-employee");

for (const r of fica.rows) console.log(`${r.label}: ${r.value}`);
// Social Security rate: 0.062
// Social Security wage base: 184500
// Medicare rate (no wage limit): 0.0145
// Additional Medicare Tax: 0.009
// Additional Medicare Tax withholding starts above (any filing status): 200000

const value = (label) => fica.rows.find((r) => r.label === label).value;
const salary = 90_000;
const employeeFica =
  Math.min(salary, value("Social Security wage base")) * value("Social Security rate") +
  salary * value("Medicare rate (no wage limit)");
// 6885  → $6,885 of Social Security and Medicare on $90,000
fica.source.url; // https://www.irs.gov/pub/irs-pdf/p15.pdf (IRS Publication 15, checked 2026-10-20)
```

### 3. Take-home pay from the API

```js
import { CalcBloc } from "calcbloc";

const calcbloc = new CalcBloc({ apiKey: process.env.CALCBLOC_API_KEY });
const pay = await calcbloc.netSalary({ country: "uk", salary: 50_000 });

pay.year;                // "2026-27"
pay.summary.netAnnual;   // 39520.12
pay.results.incomeTax;   // 7486  (the same figure as example 1)
pay.results.employeeNi;  // 2993.88
pay.calculatorUrl;       // https://calcbloc.com/uk/take-home-pay-calculator
pay.attribution.text;    // "Data by CalcBloc (calcbloc.com)"
```

Response from the live API on 11 November 2026. Works without a key for 300 requests a day and 20 a minute per IP address (see [calcbloc.com/developers#limits](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss#limits)); a free key from [calcbloc.com/developers/keys](https://calcbloc.com/developers/keys?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) gives 5,000.

## Offline tables or the API?

| | `calcbloc/tables` (bundled) | `CalcBloc` client (API) |
| --- | --- | --- |
| Network | None | HTTPS to calcbloc.com |
| API key | Not needed | Optional: 300 requests a day and 20 a minute per IP address without one, 5,000 a day with a free key |
| Data | This package version (see `manifest.generatedAt`) | Always current |
| Tax tables | National and regional, every bundled year | Same, plus CSV |
| Take-home pay, employer cost, compare | No (use `taxFromBands` for brackets only) | Yes |
| Runs in | Node (reads JSON from the package) | Node 18+, browsers, edge runtimes |

Upgrade the package to get newer figures, or call `calcbloc.taxTables()` when you always need the latest.

## Offline tables

```js
import { manifest, listCountries, getCountry, loadTable, loadTablesWithRegions } from "calcbloc/tables";

listCountries().map((c) => c.country);       // ["us", "uk", "australia", ...] from the manifest
getCountry("canada").regions;                 // [{ code: "on", name: "Ontario", slug: "ontario" }, ...]
loadTable("canada", { region: "qc" });        // Quebec's provincial figures only
loadTable("nz");                              // short code, ISO code ("NZ") or name ("New Zealand") work too
loadTable("uk", { year: "2025-26" });         // an earlier year kept for reference (isCurrent: false)
loadTablesWithRegions("switzerland");          // { national, regions: [26 cantons] }
manifest.countries[0].sourceUrls;             // the official pages behind a country's figures
```

- `loadTable(country, { year = "latest", region })` returns a `TaxTable` in the exact shape of `GET /api/v1/tax-tables/{country}/{year}`: `sections` (bands and values, each with its official `source`), `sources`, a flat `rows` array (one row per band or value with `source_url`, `retrieved_at`, `effective_from`, `effective_to` and `status`), `pageUrl` and `attribution`.
- Regional tables hold the regional figures only; load the national table alongside.
- Errors are `CalcBlocError`s with the API's codes: `unsupported_country`, `unsupported_year`, `unsupported_region`.
- Loading is synchronous. Each call returns a fresh object, so you can change it freely.

### One country at a time (bundlers, browsers, edge)

`calcbloc/tables` reads files with `node:fs`. For browsers and bundlers, import a single country; its JSON is imported statically, so your bundle contains only that country:

```js
import { tables } from "calcbloc/tables/ireland";

tables.currentYear; // "2026"
const ie = tables.table(); // same TaxTable as loadTable("ireland")
```

Any country id from the coverage table works (`calcbloc/tables/new-zealand`, `calcbloc/tables/us`...), and so does its lower-case short code (`calcbloc/tables/nz`, `calcbloc/tables/de`, `calcbloc/tables/gb` for the UK). In Node's native ESM this uses JSON import attributes (Node 18.20, 20.10 or later).

### `taxFromBands(section, income)`

Applies a bands section (income tax brackets, the Irish USC, a payroll-tax scale) marginally: each rate applies only to the part of the income inside its band. `bandBreakdown()` returns the amount per band.

The income must already be on the section's `basis` (for example taxable income after allowances). Credits, reliefs, surcharges, levies and rounding rules are not applied, so the result is the tax on that income from the published brackets, **not a payroll calculation and not tax advice**. For take-home pay use the API's `netSalary()`, which runs the full calculator engine.

## API client

```js
import { CalcBloc, CalcBlocError, RateLimitError } from "calcbloc";

const calcbloc = new CalcBloc({
  apiKey: process.env.CALCBLOC_API_KEY, // optional; in Node this is the default anyway
  baseUrl: "https://calcbloc.com",      // default
  fetch: globalThis.fetch,              // default; inject your own for tests or older runtimes
  timeoutMs: 30_000,                    // default
});

await calcbloc.countries();                                        // countries, years, regions, endpoints and parameters
await calcbloc.taxTables("us", { year: "latest", region: "ny" });  // TaxTable
await calcbloc.taxTables("ireland", { format: "csv" });            // CSV text
await calcbloc.netSalary({ country: "us", salary: 120_000, region: "ca", filing_status: "mfj" });
await calcbloc.netSalary({ country: "ca", salary: 85_000, region: "on" });     // Canada; "canada" works too
await calcbloc.netSalary({ country: "nz", salary: 80_000 });                    // New Zealand; "new-zealand" works too
await calcbloc.employerCost({ country: "de", salary: 60_000 });
await calcbloc.compare({ a: "uk", b: "ie", salary: 60_000 });

// API 1.8: bonus withholding and equity compensation
await calcbloc.supplementalWithholding({ country: "us", salary: 150_000, amount: 20_000, type: "bonus", region: "ca" });
await calcbloc.equityTax({ country: "uk", instrument: "emi", units: 1_000, grant_date: "2024-01-15", event_date: "2026-03-01", fmv_event: 12, exercise_price: 2 });

// API 1.9: cross-border equity, tax facts, tax calendar, tariffs and import duty
await calcbloc.crossBorderEquity({ instrument: "rsu", units: 500, grant_date: "2024-01-01", event_date: "2026-01-01", fmv_event: 80, periods: "us:2024-01-01:2024-12-31,gb:2025-01-01:2026-01-01", salaries: "us:150000,gb:90000" });
await calcbloc.facts({ country: "uk", tax_type: "income.pit" });
await calcbloc.taxCalendar({ country: "au" });                                  // without a country: every country
await calcbloc.tariffs({ destination: "gb", code: "0901", origin: "in" });      // UK, EU (or a member state), US, India
await calcbloc.tradeAgreements({ country: "gb", partner: "in" });
await calcbloc.importDuty({ destination: "gb", origin: "in", code: "0901210000", customs_value: 1_000, proof_of_origin: true });

// API 1.10: tax treaties; take-home pay and employer cost for Denmark, Estonia and Poland
await calcbloc.taxTreaties({ country: "in", partner: "us" });                  // TaxTreatiesResponse (treaties are stored for India)
await calcbloc.netSalary({ country: "dk", salary: 600_000, municipality: "average", church: false, atp_hours: "0" });
await calcbloc.netSalary({ country: "ee", salary: 30_000, funded_pension: "0", pension_age: false });
await calcbloc.employerCost({ country: "pl", salary: 120_000, accident_rate_pct: 1.67, commuter: false });

calcbloc.rateLimit; // { limit, remaining, resetSeconds } from the last response
```

In API calls, countries are given by their short code: ISO 3166-1 alpha-2 in lower case, with the UK as `uk` (`gb` also works), such as `nz`, `de` or `ae`. English names and the older keys (`new-zealand`, `germany`) still work, and responses carry the older key in `country`. The offline `calcbloc/tables` loader accepts the same identifiers.

Each country's calculation parameters (filing status, pension rate, region, student loan plan...) are listed by `countries()` under `endpoints["net-salary"].parameters` and documented at [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss). The OpenAPI 3.1 document is at [calcbloc.com/api/openapi.json](https://calcbloc.com/api/openapi.json). The US `filing_status` values are `single`, `mfj` and `hoh` (common spellings such as `married` are accepted as `mfj`). `region` is required for take-home pay in the US and Canada and for employer cost in the US, Australia and Canada; without it the API returns 400 `missing_parameter` with the valid codes.

Since API 1.10, take-home pay and employer cost responses carry `verification`: `"official-example"` where the golden tests reproduce a worked example published by the tax authority or social security institution (Estonia, Poland), `"law-text"` where no official example is published and the tests are worked by hand from the law (Denmark), and `null` for the countries with their own engine. With a value, the first note says how the calculation was checked and links the official sources; `countries()` gives the same field on each `net-salary` and `employer-cost` entry.

`taxTreaties()` (API 1.10) returns the treaties typed as `TaxTreatiesResponse`: for each, the maximum withholding rates in the source State on dividends, interest, royalties and fees for technical services (decimals, 0.15 = 15%) with their conditions, articles and wording, the relief method of each country, signature and entry-into-force dates, MLI status and the official source. Nothing is computed.

The API 1.8 and 1.9 methods return the API's JSON as `ApiResponse` (the attribution block plus every field the endpoint documents at [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss)); their parameters are typed. Import duty results are estimates, not customs rulings.

Not supported yet: cross-border salary withholding (multi-country payroll), and the double-tax relief amount (`taxTreaties()` lists the treaty rates without computing anything).

### Errors

Every API error has the body `{ "error": { "code", "message", "docs" } }`. The client throws a `CalcBlocError` with `code`, `status`, `message` and `docs`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `unsupported_country` | A tables-only country on `netSalary`, `employerCost` or `compare`; the message links to its tax tables |
| 400 | `invalid_parameter`, `unknown_parameter`, `missing_parameter` | A parameter is wrong, unknown or missing |
| 401 | `api_key_required`, `invalid_key` | A revoked or unknown key (or no key, if keyless calculations are ever switched off) |
| 404 | `unsupported_country`, `unsupported_year`, `not_found` | No such tax table |
| 429 | `rate_limited` | Thrown as `RateLimitError` with `retryAfter` (seconds); without a key the message asks for a free API key |
| 503 | `service_unavailable` | Temporary; retry after `Retry-After` |

Client-side codes: `network_error` (no response), `http_error` (an error page that is not the API's JSON), `invalid_response`.

```js
try {
  await calcbloc.netSalary({ country: "norway", salary: 600_000 });
} catch (e) {
  if (e instanceof RateLimitError) await sleep(e.retryAfter * 1000);
  else if (e instanceof CalcBlocError && e.code === "unsupported_country") {
    const table = await calcbloc.taxTables("norway"); // tables are available for every country
  } else throw e;
}
```

### Free use and API keys

- **Offline tables need no key and no network**: `calcbloc/tables` reads the tables bundled in the package.
- **API calls work without a key** for 300 requests a day and 20 a minute per IP address (see [calcbloc.com/developers#limits](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss#limits)), on every endpoint.
- **Add a free API key for 5,000 requests a day** (60 a minute). Get one instantly at [calcbloc.com/developers/keys](https://calcbloc.com/developers/keys?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) (enter your email address; the key is shown once).
- **Set it** with `new CalcBloc({ apiKey: "cb_..." })`, or in the `CALCBLOC_API_KEY` environment variable, which the client reads by default in Node. It is sent in the `X-API-Key` header; the API refuses keys in the URL. Keep keys on the server; do not ship them in browser code.

| | Per day | Per minute |
| --- | --- | --- |
| No key (per IP address) | 300 | 20 |
| Free key | 5,000 | 60 |

Every response carries `X-RateLimit-Limit` (the daily limit) and `X-RateLimit-Remaining`. When the free allowance without a key is used up, the client throws a `RateLimitError` whose message says so (quoting the daily limit the API last reported), links to the keys page and shows how to set the key. With a key, the message gives that key's limit. For higher volumes, see [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss).

## Data, sources and licence

- **Where the data comes from:** each figure is taken from the tax authority or legislation (for example HMRC and GOV.UK, the IRS and state revenue departments, the Canada Revenue Agency, Australian federal and state legislation, Inland Revenue NZ, Irish Revenue, IRAS, official gazettes and finance ministries) and checked by CalcBloc. Every section has a `source` and every flat row a `source_url` and `retrieved_at`; the manifest lists each country's `sourceUrls` and `lastVerified` date.
- **Same data as the website and the API:** the tables are published at [calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss), served by the [API](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) and shown on each country's tax-tables page (`pageUrl`).
- **Data licence: CC BY 4.0.** You may use, share and adapt the tables, including commercially, with credit: **"Data by CalcBloc (calcbloc.com/data)"** and a link to [https://calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss). The API's own terms ask for a visible link to calcbloc.com wherever API figures are shown ([terms](https://calcbloc.com/developers/terms?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss)).
- The canonical, most recent version of each table is its country page on calcbloc.com.
- **Code licence: MIT** (see [LICENSE](LICENSE)).
- **Copyright:** © 2026 itmarkerz technologies (code and data). CalcBloc is a product of itmarkerz technologies.

Figures can change during a tax year and are provided as published, without warranty. Check the official source before relying on a figure for a filing or a payroll run.

## Coverage

<!-- coverage:start -->
| Country | id | Tax years | Regions | Last checked |
| --- | --- | --- | --- | --- |
| [United States](https://calcbloc.com/us/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `us` | 2026 | 51 | 22 Nov 2026 |
| [United Kingdom](https://calcbloc.com/uk/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `uk` | 2026-27, 2025-26 | 2 | 22 Nov 2026 |
| [Australia](https://calcbloc.com/australia/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `australia` | 2026-27 | – | 27 Nov 2026 |
| [New Zealand](https://calcbloc.com/new-zealand/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `new-zealand` | 2026-27 | – | 22 Nov 2026 |
| [Canada](https://calcbloc.com/canada/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `canada` | 2026 | 13 | 22 Nov 2026 |
| [Ireland](https://calcbloc.com/ireland/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `ireland` | 2026 | – | 22 Nov 2026 |
| [India](https://calcbloc.com/india/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `india` | 2026-27 | – | 22 Nov 2026 |
| [Germany](https://calcbloc.com/germany/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `germany` | 2026 | – | 22 Nov 2026 |
| [Spain](https://calcbloc.com/spain/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `spain` | 2026 | 21 | 22 Nov 2026 |
| [Netherlands](https://calcbloc.com/netherlands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `netherlands` | 2026 | – | 22 Nov 2026 |
| [France](https://calcbloc.com/france/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `france` | 2026 | – | 27 Nov 2026 |
| [Singapore](https://calcbloc.com/singapore/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `singapore` | 2026 | – | 22 Nov 2026 |
| [United Arab Emirates](https://calcbloc.com/uae/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `uae` | 2026 | – | 21 Nov 2026 |
| [Italy](https://calcbloc.com/italy/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `italy` | 2026 | 21 | 22 Nov 2026 |
| [Portugal](https://calcbloc.com/portugal/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `portugal` | 2026 | 2 | 27 Nov 2026 |
| [Switzerland](https://calcbloc.com/switzerland/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `switzerland` | 2026 | 26 | 22 Nov 2026 |
| [Denmark](https://calcbloc.com/denmark/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `denmark` | 2026 | 5 | 22 Nov 2026 |
| [Sweden](https://calcbloc.com/sweden/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `sweden` | 2026 | 21 | 22 Nov 2026 |
| [Austria](https://calcbloc.com/austria/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `austria` | 2026 | – | 27 Nov 2026 |
| [Poland](https://calcbloc.com/poland/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `poland` | 2026 | – | 22 Nov 2026 |
| [Luxembourg](https://calcbloc.com/luxembourg/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `luxembourg` | 2026 | – | 27 Nov 2026 |
| [Czechia](https://calcbloc.com/czechia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `czechia` | 2026 | – | 22 Nov 2026 |
| [Norway](https://calcbloc.com/norway/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `norway` | 2026 | – | 22 Nov 2026 |
| [Finland](https://calcbloc.com/finland/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `finland` | 2026 | 19 | 22 Nov 2026 |
| [Slovenia](https://calcbloc.com/slovenia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `slovenia` | 2026 | – | 22 Nov 2026 |
| [Romania](https://calcbloc.com/romania/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `romania` | 2026 | – | 22 Nov 2026 |
| [Hungary](https://calcbloc.com/hungary/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `hungary` | 2026 | – | 22 Nov 2026 |
| [Slovakia](https://calcbloc.com/slovakia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `slovakia` | 2026 | – | 22 Nov 2026 |
| [Greece](https://calcbloc.com/greece/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `greece` | 2026 | – | 22 Nov 2026 |
| [Latvia](https://calcbloc.com/latvia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `latvia` | 2026 | – | 21 Nov 2026 |
| [Croatia](https://calcbloc.com/croatia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `croatia` | 2026 | 21 | 22 Nov 2026 |
| [Estonia](https://calcbloc.com/estonia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `estonia` | 2026 | – | 21 Nov 2026 |
| [Bulgaria](https://calcbloc.com/bulgaria/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bulgaria` | 2026 | – | 27 Nov 2026 |
| [Lithuania](https://calcbloc.com/lithuania/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `lithuania` | 2026 | – | 21 Nov 2026 |
| [Malta](https://calcbloc.com/malta/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `malta` | 2026 | – | 22 Nov 2026 |
| [Cyprus](https://calcbloc.com/cyprus/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cyprus` | 2026 | – | 22 Nov 2026 |
| [Iceland](https://calcbloc.com/iceland/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `iceland` | 2026 | – | 22 Nov 2026 |
| [Ukraine](https://calcbloc.com/ukraine/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `ukraine` | 2026 | – | 22 Nov 2026 |
| [Liechtenstein](https://calcbloc.com/liechtenstein/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `liechtenstein` | 2026 | – | 22 Nov 2026 |
| [Serbia](https://calcbloc.com/serbia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `serbia` | 2026 | – | 22 Nov 2026 |
| [Türkiye](https://calcbloc.com/turkey/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `turkey` | 2026 | – | 27 Nov 2026 |
| [Japan](https://calcbloc.com/japan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `japan` | 2026 | – | 27 Nov 2026 |
| [South Korea](https://calcbloc.com/south-korea/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `south-korea` | 2026 | – | 21 Nov 2026 |
| [Mexico](https://calcbloc.com/mexico/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `mexico` | 2026 | – | 21 Nov 2026 |
| [Brazil](https://calcbloc.com/brazil/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `brazil` | 2026 | – | 27 Nov 2026 |
| [Chile](https://calcbloc.com/chile/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `chile` | 2026 | – | 22 Nov 2026 |
| [Colombia](https://calcbloc.com/colombia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `colombia` | 2026 | – | 22 Nov 2026 |
| [Argentina](https://calcbloc.com/argentina/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `argentina` | 2026 | – | 26 Nov 2026 |
| [Costa Rica](https://calcbloc.com/costa-rica/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `costa-rica` | 2026 | – | 22 Nov 2026 |
| [Saudi Arabia](https://calcbloc.com/saudi-arabia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saudi-arabia` | 2026 | – | 22 Nov 2026 |
| [Qatar](https://calcbloc.com/qatar/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `qatar` | 2026 | – | 22 Nov 2026 |
| [Kuwait](https://calcbloc.com/kuwait/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `kuwait` | 2026 | – | 22 Nov 2026 |
| [Bahrain](https://calcbloc.com/bahrain/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bahrain` | 2026 | – | 22 Nov 2026 |
| [Oman](https://calcbloc.com/oman/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `oman` | 2026 | – | 22 Nov 2026 |
| [Israel](https://calcbloc.com/israel/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `israel` | 2026 | – | 22 Nov 2026 |
| [South Africa](https://calcbloc.com/south-africa/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `south-africa` | 2026-27 | – | 22 Nov 2026 |
| [Indonesia](https://calcbloc.com/indonesia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `indonesia` | 2026 | – | 22 Nov 2026 |
| [China](https://calcbloc.com/china/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `china` | 2026 | – | 22 Nov 2026 |
| [Malaysia](https://calcbloc.com/malaysia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `malaysia` | 2026 | – | 22 Nov 2026 |
| [Thailand](https://calcbloc.com/thailand/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `thailand` | 2026 | – | 22 Nov 2026 |
| [Vietnam](https://calcbloc.com/vietnam/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `vietnam` | 2026 | – | 22 Nov 2026 |
| [Philippines](https://calcbloc.com/philippines/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `philippines` | 2026 | – | 26 Nov 2026 |
| [Pakistan](https://calcbloc.com/pakistan/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `pakistan` | 2026-27 | – | 22 Nov 2026 |
| [Bangladesh](https://calcbloc.com/bangladesh/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bangladesh` | 2026-27 | – | 22 Nov 2026 |
| [Sri Lanka](https://calcbloc.com/sri-lanka/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `sri-lanka` | 2026-27 | – | 26 Nov 2026 |
| [Nepal](https://calcbloc.com/nepal/tax-tables/2083-84?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `nepal` | 2083-84 | – | 26 Nov 2026 |
| [Jordan](https://calcbloc.com/jordan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `jordan` | 2026 | – | 26 Nov 2026 |
| [Tunisia](https://calcbloc.com/tunisia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `tunisia` | 2026 | – | 26 Nov 2026 |
| [Algeria](https://calcbloc.com/algeria/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `algeria` | 2026 | – | 26 Nov 2026 |
| [Paraguay](https://calcbloc.com/paraguay/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `paraguay` | 2026 | – | 26 Nov 2026 |
| [Bolivia](https://calcbloc.com/bolivia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bolivia` | 2026 | – | 26 Nov 2026 |
| [El Salvador](https://calcbloc.com/el-salvador/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `el-salvador` | 2026 | – | 26 Nov 2026 |
| [Honduras](https://calcbloc.com/honduras/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `honduras` | 2026 | – | 26 Nov 2026 |
| [Jamaica](https://calcbloc.com/jamaica/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `jamaica` | 2026 | – | 26 Nov 2026 |
| [Trinidad and Tobago](https://calcbloc.com/trinidad-and-tobago/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `trinidad-and-tobago` | 2026 | – | 26 Nov 2026 |
| [Egypt](https://calcbloc.com/egypt/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `egypt` | 2026 | – | 26 Nov 2026 |
| [Nigeria](https://calcbloc.com/nigeria/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `nigeria` | 2026 | – | 26 Nov 2026 |
| [Kenya](https://calcbloc.com/kenya/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `kenya` | 2026 | – | 26 Nov 2026 |
| [Morocco](https://calcbloc.com/morocco/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `morocco` | 2026 | – | 26 Nov 2026 |
| [Ghana](https://calcbloc.com/ghana/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `ghana` | 2026 | – | 26 Nov 2026 |
| [Peru](https://calcbloc.com/peru/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `peru` | 2026 | – | 26 Nov 2026 |
| [Uruguay](https://calcbloc.com/uruguay/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `uruguay` | 2026 | – | 26 Nov 2026 |
| [Ecuador](https://calcbloc.com/ecuador/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `ecuador` | 2026 | – | 26 Nov 2026 |
| [Panama](https://calcbloc.com/panama/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `panama` | 2026 | – | 26 Nov 2026 |
| [Dominican Republic](https://calcbloc.com/dominican-republic/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `dominican-republic` | 2026 | – | 26 Nov 2026 |
| [Guatemala](https://calcbloc.com/guatemala/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `guatemala` | 2026 | – | 26 Nov 2026 |
| [Kazakhstan](https://calcbloc.com/kazakhstan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `kazakhstan` | 2026 | – | 26 Nov 2026 |
| [Georgia](https://calcbloc.com/georgia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `georgia` | 2026 | – | 26 Nov 2026 |
| [Armenia](https://calcbloc.com/armenia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `armenia` | 2026 | – | 27 Nov 2026 |
| [Azerbaijan](https://calcbloc.com/azerbaijan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `azerbaijan` | 2026 | – | 26 Nov 2026 |
| [Uzbekistan](https://calcbloc.com/uzbekistan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `uzbekistan` | 2026 | – | 26 Nov 2026 |
| [Russia](https://calcbloc.com/russia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `russia` | 2026 | – | 26 Nov 2026 |
| [Tanzania](https://calcbloc.com/tanzania/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `tanzania` | 2026 | – | 26 Nov 2026 |
| [Uganda](https://calcbloc.com/uganda/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `uganda` | 2026-27 | – | 26 Nov 2026 |
| [Rwanda](https://calcbloc.com/rwanda/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `rwanda` | 2026 | – | 26 Nov 2026 |
| [Ethiopia](https://calcbloc.com/ethiopia/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `ethiopia` | 2026-27 | – | 26 Nov 2026 |
| [Mauritius](https://calcbloc.com/mauritius/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `mauritius` | 2026-27 | – | 26 Nov 2026 |
| [Botswana](https://calcbloc.com/botswana/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `botswana` | 2026-27 | – | 26 Nov 2026 |
| [Montenegro](https://calcbloc.com/montenegro/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `montenegro` | 2026 | – | 26 Nov 2026 |
| [North Macedonia](https://calcbloc.com/north-macedonia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `north-macedonia` | 2026 | – | 26 Nov 2026 |
| [Albania](https://calcbloc.com/albania/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `albania` | 2026 | – | 26 Nov 2026 |
| [Bosnia and Herzegovina](https://calcbloc.com/bosnia-and-herzegovina/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bosnia-and-herzegovina` | 2026 | – | 26 Nov 2026 |
| [Moldova](https://calcbloc.com/moldova/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `moldova` | 2026 | – | 26 Nov 2026 |
| [Kosovo](https://calcbloc.com/kosovo/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `kosovo` | 2026 | – | 26 Nov 2026 |
| [Andorra](https://calcbloc.com/andorra/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `andorra` | 2026 | – | 26 Nov 2026 |
| [Monaco](https://calcbloc.com/monaco/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `monaco` | 2026 | – | 26 Nov 2026 |
| [San Marino](https://calcbloc.com/san-marino/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `san-marino` | 2026 | – | 26 Nov 2026 |
| [Hong Kong](https://calcbloc.com/hong-kong/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `hong-kong` | 2026-27 | – | 26 Nov 2026 |
| [Taiwan](https://calcbloc.com/taiwan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `taiwan` | 2026 | – | 26 Nov 2026 |
| [Macao](https://calcbloc.com/macao/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `macao` | 2026 | – | 26 Nov 2026 |
| [Cambodia](https://calcbloc.com/cambodia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cambodia` | 2026 | – | 26 Nov 2026 |
| [Brunei](https://calcbloc.com/brunei/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `brunei` | 2026 | – | 26 Nov 2026 |
| [Côte d’Ivoire](https://calcbloc.com/cote-divoire/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cote-divoire` | 2026 | – | 26 Nov 2026 |
| [Senegal](https://calcbloc.com/senegal/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `senegal` | 2026 | – | 26 Nov 2026 |
| [Cameroon](https://calcbloc.com/cameroon/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cameroon` | 2026 | – | 26 Nov 2026 |
| [Zambia](https://calcbloc.com/zambia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `zambia` | 2026 | – | 26 Nov 2026 |
| [Zimbabwe](https://calcbloc.com/zimbabwe/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `zimbabwe` | 2026 | – | 26 Nov 2026 |
| [Namibia](https://calcbloc.com/namibia/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `namibia` | 2026-27 | – | 26 Nov 2026 |
| [Bahamas](https://calcbloc.com/bahamas/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bahamas` | 2026 | – | 26 Nov 2026 |
| [Barbados](https://calcbloc.com/barbados/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `barbados` | 2026 | – | 26 Nov 2026 |
| [Belize](https://calcbloc.com/belize/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `belize` | 2026 | – | 26 Nov 2026 |
| [Guyana](https://calcbloc.com/guyana/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `guyana` | 2026 | – | 26 Nov 2026 |
| [Suriname](https://calcbloc.com/suriname/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `suriname` | 2026 | – | 26 Nov 2026 |
| [Haiti](https://calcbloc.com/haiti/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `haiti` | 2026-27 | – | 26 Nov 2026 |
| [Kyrgyzstan](https://calcbloc.com/kyrgyzstan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `kyrgyzstan` | 2026 | – | 26 Nov 2026 |
| [Tajikistan](https://calcbloc.com/tajikistan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `tajikistan` | 2026 | – | 26 Nov 2026 |
| [Maldives](https://calcbloc.com/maldives/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `maldives` | 2026 | – | 26 Nov 2026 |
| [Bhutan](https://calcbloc.com/bhutan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bhutan` | 2026 | – | 27 Nov 2026 |
| [Myanmar](https://calcbloc.com/myanmar/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `myanmar` | 2026-27 | – | 26 Nov 2026 |
| [Madagascar](https://calcbloc.com/madagascar/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `madagascar` | 2026 | – | 26 Nov 2026 |
| [DR Congo](https://calcbloc.com/dr-congo/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `dr-congo` | 2026 | – | 26 Nov 2026 |
| [Republic of the Congo](https://calcbloc.com/congo/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `congo` | 2026 | – | 26 Nov 2026 |
| [Malawi](https://calcbloc.com/malawi/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `malawi` | 2026-27 | – | 26 Nov 2026 |
| [Fiji](https://calcbloc.com/fiji/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `fiji` | 2026 | – | 26 Nov 2026 |
| [Papua New Guinea](https://calcbloc.com/papua-new-guinea/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `papua-new-guinea` | 2026 | – | 26 Nov 2026 |
| [Samoa](https://calcbloc.com/samoa/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `samoa` | 2026 | – | 26 Nov 2026 |
| [Tonga](https://calcbloc.com/tonga/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `tonga` | 2026-27 | – | 26 Nov 2026 |
| [Vanuatu](https://calcbloc.com/vanuatu/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `vanuatu` | 2026 | – | 26 Nov 2026 |
| [Solomon Islands](https://calcbloc.com/solomon-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `solomon-islands` | 2026 | – | 26 Nov 2026 |
| [Eswatini](https://calcbloc.com/eswatini/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `eswatini` | 2026-27 | – | 26 Nov 2026 |
| [Lesotho](https://calcbloc.com/lesotho/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `lesotho` | 2026-27 | – | 26 Nov 2026 |
| [Seychelles](https://calcbloc.com/seychelles/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `seychelles` | 2026 | – | 26 Nov 2026 |
| [Cabo Verde](https://calcbloc.com/cabo-verde/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cabo-verde` | 2026 | – | 26 Nov 2026 |
| [Gabon](https://calcbloc.com/gabon/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `gabon` | 2026 | – | 26 Nov 2026 |
| [Burundi](https://calcbloc.com/burundi/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `burundi` | 2026-27 | – | 27 Nov 2026 |
| [Djibouti](https://calcbloc.com/djibouti/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `djibouti` | 2026 | – | 26 Nov 2026 |
| [Jersey](https://calcbloc.com/jersey/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `jersey` | 2026 | – | 26 Nov 2026 |
| [Bermuda](https://calcbloc.com/bermuda/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `bermuda` | 2026-27 | – | 26 Nov 2026 |
| [Cayman Islands](https://calcbloc.com/cayman-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cayman-islands` | 2026 | – | 26 Nov 2026 |
| [Faroe Islands](https://calcbloc.com/faroe-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `faroe-islands` | 2026 | – | 27 Nov 2026 |
| [Greenland](https://calcbloc.com/greenland/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `greenland` | 2026 | – | 27 Nov 2026 |
| [Gibraltar](https://calcbloc.com/gibraltar/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `gibraltar` | 2026-27 | – | 27 Nov 2026 |
| [Isle of Man](https://calcbloc.com/isle-of-man/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `isle-of-man` | 2026-27 | – | 27 Nov 2026 |
| [Guernsey](https://calcbloc.com/guernsey/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `guernsey` | 2026 | – | 27 Nov 2026 |
| [Antigua and Barbuda](https://calcbloc.com/antigua-and-barbuda/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `antigua-and-barbuda` | 2026 | – | 26 Nov 2026 |
| [Saint Kitts and Nevis](https://calcbloc.com/saint-kitts-and-nevis/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-kitts-and-nevis` | 2026 | – | 26 Nov 2026 |
| [Saint Lucia](https://calcbloc.com/saint-lucia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-lucia` | 2026 | – | 26 Nov 2026 |
| [Saint Vincent and the Grenadines](https://calcbloc.com/saint-vincent-and-the-grenadines/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-vincent-and-the-grenadines` | 2026 | – | 26 Nov 2026 |
| [Dominica](https://calcbloc.com/dominica/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `dominica` | 2026 | – | 26 Nov 2026 |
| [Grenada](https://calcbloc.com/grenada/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `grenada` | 2026 | – | 27 Nov 2026 |
| [Aruba](https://calcbloc.com/aruba/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `aruba` | 2026 | – | 27 Nov 2026 |
| [Curaçao](https://calcbloc.com/curacao/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `curacao` | 2026 | – | 27 Nov 2026 |
| [Belarus](https://calcbloc.com/belarus/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `belarus` | 2026 | – | 26 Nov 2026 |
| [Cuba](https://calcbloc.com/cuba/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cuba` | 2026 | – | 26 Nov 2026 |
| [Nicaragua](https://calcbloc.com/nicaragua/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `nicaragua` | 2026 | – | 27 Nov 2026 |
| [Turkmenistan](https://calcbloc.com/turkmenistan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `turkmenistan` | 2026 | – | 27 Nov 2026 |
| [Timor-Leste](https://calcbloc.com/timor-leste/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `timor-leste` | 2026 | – | 27 Nov 2026 |
| [Benin](https://calcbloc.com/benin/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `benin` | 2026 | – | 26 Nov 2026 |
| [Togo](https://calcbloc.com/togo/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `togo` | 2026 | – | 26 Nov 2026 |
| [Burkina Faso](https://calcbloc.com/burkina-faso/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `burkina-faso` | 2026 | – | 26 Nov 2026 |
| [Mali](https://calcbloc.com/mali/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `mali` | 2026 | – | 26 Nov 2026 |
| [Niger](https://calcbloc.com/niger/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `niger` | 2026 | – | 26 Nov 2026 |
| [Sierra Leone](https://calcbloc.com/sierra-leone/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `sierra-leone` | 2026 | – | 26 Nov 2026 |
| [Liberia](https://calcbloc.com/liberia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `liberia` | 2026 | – | 27 Nov 2026 |
| [Guinea](https://calcbloc.com/guinea/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `guinea` | 2026 | – | 27 Nov 2026 |
| [The Gambia](https://calcbloc.com/gambia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `gambia` | 2026 | – | 27 Nov 2026 |
| [Somalia](https://calcbloc.com/somalia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `somalia` | 2026 | – | 27 Nov 2026 |
| [Palestine](https://calcbloc.com/palestine/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `palestine` | 2026 | – | 27 Nov 2026 |
| [Laos](https://calcbloc.com/laos/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `laos` | 2026 | – | 27 Nov 2026 |
| [Kiribati](https://calcbloc.com/kiribati/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `kiribati` | 2026 | – | 26 Nov 2026 |
| [Marshall Islands](https://calcbloc.com/marshall-islands/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `marshall-islands` | 2026-27 | – | 26 Nov 2026 |
| [Micronesia](https://calcbloc.com/micronesia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `micronesia` | 2026 | – | 27 Nov 2026 |
| [Palau](https://calcbloc.com/palau/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `palau` | 2026 | – | 27 Nov 2026 |
| [Nauru](https://calcbloc.com/nauru/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `nauru` | 2026-27 | – | 27 Nov 2026 |
| [Tuvalu](https://calcbloc.com/tuvalu/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `tuvalu` | 2026 | – | 27 Nov 2026 |
| [Cook Islands](https://calcbloc.com/cook-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `cook-islands` | 2026 | – | 27 Nov 2026 |
| [Niue](https://calcbloc.com/niue/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `niue` | 2026-27 | – | 27 Nov 2026 |
| [Puerto Rico](https://calcbloc.com/puerto-rico/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `puerto-rico` | 2026 | – | 27 Nov 2026 |
| [US Virgin Islands](https://calcbloc.com/us-virgin-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `us-virgin-islands` | 2026 | – | 27 Nov 2026 |
| [Guam](https://calcbloc.com/guam/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `guam` | 2026 | – | 27 Nov 2026 |
| [British Virgin Islands](https://calcbloc.com/british-virgin-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `british-virgin-islands` | 2026 | – | 26 Nov 2026 |
| [Turks and Caicos Islands](https://calcbloc.com/turks-and-caicos-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `turks-and-caicos-islands` | 2026 | – | 27 Nov 2026 |
| [Anguilla](https://calcbloc.com/anguilla/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `anguilla` | 2026 | – | 27 Nov 2026 |
| [New Caledonia](https://calcbloc.com/new-caledonia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `new-caledonia` | 2026 | – | 27 Nov 2026 |
| [French Polynesia](https://calcbloc.com/french-polynesia/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `french-polynesia` | 2026 | – | 27 Nov 2026 |
| [Mauritania](https://calcbloc.com/mauritania/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `mauritania` | 2026 | – | 26 Nov 2026 |
| [Chad](https://calcbloc.com/chad/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `chad` | 2026 | – | 26 Nov 2026 |
| [Central African Republic](https://calcbloc.com/central-african-republic/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `central-african-republic` | 2026 | – | 27 Nov 2026 |
| [South Sudan](https://calcbloc.com/south-sudan/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `south-sudan` | 2026-27 | – | 27 Nov 2026 |
| [Comoros](https://calcbloc.com/comoros/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `comoros` | 2026 | – | 27 Nov 2026 |
| [Guinea-Bissau](https://calcbloc.com/guinea-bissau/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `guinea-bissau` | 2026 | – | 27 Nov 2026 |
| [Sudan](https://calcbloc.com/sudan/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `sudan` | 2026 | – | 27 Nov 2026 |
| [Angola](https://calcbloc.com/angola/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `angola` | 2026 | – | 27 Nov 2026 |
| [Mozambique](https://calcbloc.com/mozambique/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `mozambique` | 2026 | – | 27 Nov 2026 |
| [French Southern Territories](https://calcbloc.com/french-southern-territories/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `french-southern-territories` | 2026 | – | 27 Nov 2026 |
| [Pitcairn Islands](https://calcbloc.com/pitcairn-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `pitcairn-islands` | 2026 | – | 27 Nov 2026 |
| [American Samoa](https://calcbloc.com/american-samoa/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `american-samoa` | 2026 | – | 27 Nov 2026 |
| [Northern Mariana Islands](https://calcbloc.com/northern-mariana-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `northern-mariana-islands` | 2026 | – | 27 Nov 2026 |
| [Montserrat](https://calcbloc.com/montserrat/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `montserrat` | 2026 | – | 27 Nov 2026 |
| [Falkland Islands](https://calcbloc.com/falkland-islands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `falkland-islands` | 2026 | – | 27 Nov 2026 |
| [Saint Helena](https://calcbloc.com/saint-helena/tax-tables/2026-27?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-helena` | 2026-27 | – | 27 Nov 2026 |
| [Sint Maarten](https://calcbloc.com/sint-maarten/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `sint-maarten` | 2026 | – | 27 Nov 2026 |
| [Caribbean Netherlands](https://calcbloc.com/caribbean-netherlands/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `caribbean-netherlands` | 2026 | – | 27 Nov 2026 |
| [Saint-Barthélemy](https://calcbloc.com/saint-barthelemy/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-barthelemy` | 2026 | – | 27 Nov 2026 |
| [Saint-Martin](https://calcbloc.com/saint-martin/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-martin` | 2026 | – | 27 Nov 2026 |
| [Saint Pierre and Miquelon](https://calcbloc.com/saint-pierre-and-miquelon/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `saint-pierre-and-miquelon` | 2026 | – | 27 Nov 2026 |
| [Wallis and Futuna](https://calcbloc.com/wallis-and-futuna/tax-tables/2026?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) | `wallis-and-futuna` | 2026 | – | 27 Nov 2026 |

217 countries, generated from the bundled `manifest.json` (data of 27 Nov 2026). **Regions** is the number of regional tables (states, provinces, cantons, nations...) bundled for the country; `listCountries()` returns their codes and names.

In preparation: Belgium.
<!-- coverage:end -->

## Tested against official worked examples

The test suite computes tax with `taxFromBands` on the bundled tables and compares it with examples published by tax authorities:

| Country | Official example | Result |
| --- | --- | --- |
| Ireland | Revenue, [Calculating your USC](https://www.revenue.ie/en/jobs-and-pensions/usc/calculating-usc.aspx) (2026), Examples 1 to 4 | €319.82, €1,032.82, €819.82 (reduced rates), €2,030.62 |
| Singapore | IRAS, [Individual income tax rates](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates) (YA 2024 onwards), gross tax payable at each band | $200 on $30,000 up to $199,150 on $1,000,000 |
| United Kingdom | GOV.UK, [Tax on dividends](https://www.gov.uk/tax-on-dividends) (2026 to 2027): £29,570 wages and £3,000 dividends | 10.75% on £2,500 = £268.75 |

The suite also checks that every row of every table has a source URL and retrieval date, that each bundled table is byte-identical to the API's, and the client against a mocked `fetch` (no network).

## Development

```sh
npm install
npm run sync -- --from ../calcbloc-data/tables   # copy the tables into data/ (default source: ../calcbloc-data/tables)
npm test                                          # vitest: loader, data checks, official examples, client
npm run build                                     # dist/ (ESM, CJS, .d.ts) and the per-country modules
npm run test:dist                                 # smoke-test the built package through its exports map
npm run readme:coverage -- --live https://calcbloc.com/api/v1/countries
```

`scripts/sync-tables.mjs` copies every file listed in the source `manifest.json` (it never names a country), checks that each row has a source, and stores each table without its flat `rows` array, which the loader rebuilds exactly; `test/data-integrity.json` records the SHA-256 of every original table so the tests prove the round trip.

## Links

- API documentation and free keys: [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss)
- Official tax datasets: [calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss)
- OpenAPI: [calcbloc.com/api/openapi.json](https://calcbloc.com/api/openapi.json)
- Issues: [github.com/itmarkerz/calcbloc-js/issues](https://github.com/itmarkerz/calcbloc-js/issues)
- The tables as plain JSON and CSV: [itmarkerz/calcbloc-data](https://github.com/itmarkerz/calcbloc-data)
- Python and PHP clients: [itmarkerz/calcbloc-python](https://github.com/itmarkerz/calcbloc-python), [itmarkerz/calcbloc-php](https://github.com/itmarkerz/calcbloc-php)

## About

[CalcBloc](https://calcbloc.com/?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) is built and maintained by [itmarkerz technologies](https://itmarkerz.co.in/?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss), a web and mobile app development company in Kerala, India. The open data behind this package is at [calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss) and the API documentation at [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-js&utm_medium=readme&utm_campaign=itmarkerz-oss). The other CalcBloc packages (Python, PHP, R, Google Sheets, the MCP server and the dataset itself) are in the [itmarkerz GitHub organization](https://github.com/itmarkerz).
