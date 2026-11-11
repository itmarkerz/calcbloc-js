# calcbloc: tax tables 2026 for Node.js and TypeScript

[![npm version](https://img.shields.io/npm/v/calcbloc.svg)](https://www.npmjs.com/package/calcbloc)
[![tests](https://github.com/itmarkerz/calcbloc-js/actions/workflows/test.yml/badge.svg)](https://github.com/itmarkerz/calcbloc-js/actions/workflows/test.yml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-green.svg)](https://calcbloc.com/data)

Official **income tax brackets**, **social security rates** and payroll thresholds for the United States, the United Kingdom, Canada, Australia, New Zealand, Ireland, India, Singapore, the UAE and a growing list of European countries, in one package:

- **Bundled tax tables** for offline use: every table the [CalcBloc tax tables API](https://calcbloc.com/developers) serves, including US states, Canadian provinces and Swiss cantons, readable in Node with no network and no API key.
- **A typed API client** for the CalcBloc API: countries, tax tables in JSON or CSV, take-home pay (net salary), employer cost and salary comparison between countries.
- **Every figure is sourced.** Each band and value carries the tax authority's URL, the date it was last checked and its effective dates, exactly as on [calcbloc.com/data](https://calcbloc.com/data).

Zero runtime dependencies. ESM and CommonJS. Node 18 or later. Full TypeScript types.

## Install

```sh
npm install calcbloc
```

> **Not yet published.** The package is not on npm yet. Until it is, install from a clone: `npm install ../calcbloc-js` or `npm pack` then `npm install calcbloc-0.1.0.tgz`.

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

Response from the live API on 11 November 2026. Get a free key at [calcbloc.com/developers/keys](https://calcbloc.com/developers/keys).

## Offline tables or the API?

| | `calcbloc/tables` (bundled) | `CalcBloc` client (API) |
| --- | --- | --- |
| Network | None | HTTPS to calcbloc.com |
| API key | Not needed | Optional for tables, needed for calculations |
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

Any country id from the coverage table works (`calcbloc/tables/new-zealand`, `calcbloc/tables/us`...). In Node's native ESM this uses JSON import attributes (Node 18.20, 20.10 or later).

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
await calcbloc.netSalary({ country: "canada", salary: 85_000, region: "on" });
await calcbloc.employerCost({ country: "germany", salary: 60_000 });
await calcbloc.compare({ a: "uk", b: "ireland", salary: 60_000 });

calcbloc.rateLimit; // { limit, remaining, resetSeconds } from the last response
```

Each country's calculation parameters (filing status, pension rate, region, student loan plan...) are listed by `countries()` under `endpoints["net-salary"].parameters` and documented at [calcbloc.com/developers](https://calcbloc.com/developers). The OpenAPI 3.1 document is at [calcbloc.com/api/openapi.json](https://calcbloc.com/api/openapi.json).

### Errors

Every API error has the body `{ "error": { "code", "message", "docs" } }`. The client throws a `CalcBlocError` with `code`, `status`, `message` and `docs`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `unsupported_country` | A tables-only country on `netSalary`, `employerCost` or `compare`; the message links to its tax tables |
| 400 | `invalid_parameter`, `unknown_parameter`, `missing_parameter` | A parameter is wrong, unknown or missing |
| 401 | `api_key_required`, `invalid_key` | No key on a calculation endpoint, or a revoked key |
| 404 | `unsupported_country`, `unsupported_year`, `not_found` | No such tax table |
| 429 | `rate_limited` | Thrown as `RateLimitError` with `retryAfter` (seconds) |
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

### API keys and rate limits

| | Per day | Per minute |
| --- | --- | --- |
| No key (per IP address) | 50 | 5 |
| Free key | 5,000 | 60 |

Tax tables and countries work without a key. The calculation endpoints (net salary, employer cost, compare) need a free key: send it with `apiKey` (the client puts it in the `X-API-Key` header; the API refuses keys in the URL). Keep keys on the server; do not ship them in browser code. For higher volumes, see [calcbloc.com/developers](https://calcbloc.com/developers).

## Data, sources and licence

- **Where the data comes from:** each figure is taken from the tax authority or legislation (for example HMRC and GOV.UK, the IRS and state revenue departments, the Canada Revenue Agency, Australian federal and state legislation, Inland Revenue NZ, Irish Revenue, IRAS, official gazettes and finance ministries) and checked by CalcBloc. Every section has a `source` and every flat row a `source_url` and `retrieved_at`; the manifest lists each country's `sourceUrls` and `lastVerified` date.
- **Same data as the website and the API:** the tables are published at [calcbloc.com/data](https://calcbloc.com/data), served by the [API](https://calcbloc.com/developers) and shown on each country's tax-tables page (`pageUrl`).
- **Data licence: CC BY 4.0.** You may use, share and adapt the tables, including commercially, with credit: **"Data by CalcBloc (calcbloc.com/data)"** and a link to [https://calcbloc.com/data](https://calcbloc.com/data). The API's own terms ask for a visible link to calcbloc.com wherever API figures are shown ([terms](https://calcbloc.com/developers/terms)).
- **Code licence: MIT** (see [LICENSE](LICENSE)).

Figures can change during a tax year and are provided as published, without warranty. Check the official source before relying on a figure for a filing or a payroll run.

## Coverage

<!-- coverage:start -->
| Country | id | Tax years | Regions | Last verified |
| --- | --- | --- | --- | --- |
| [United States](https://calcbloc.com/us/tax-tables/2026) | `us` | 2026 | 51 | 9 Nov 2026 |
| [United Kingdom](https://calcbloc.com/uk/tax-tables/2026-27) | `uk` | 2026-27, 2025-26 | 2 | 9 Nov 2026 |
| [Australia](https://calcbloc.com/australia/tax-tables/2026-27) | `australia` | 2026-27 | – | 9 Nov 2026 |
| [New Zealand](https://calcbloc.com/new-zealand/tax-tables/2026-27) | `new-zealand` | 2026-27 | – | 9 Nov 2026 |
| [Canada](https://calcbloc.com/canada/tax-tables/2026) | `canada` | 2026 | 13 | 9 Nov 2026 |
| [Ireland](https://calcbloc.com/ireland/tax-tables/2026) | `ireland` | 2026 | – | 6 Nov 2026 |
| [India](https://calcbloc.com/india/tax-tables/2026-27) | `india` | 2026-27 | – | 11 Nov 2026 |
| [Germany](https://calcbloc.com/germany/tax-tables/2026) | `germany` | 2026 | – | 9 Nov 2026 |
| [Spain](https://calcbloc.com/spain/tax-tables/2026) | `spain` | 2026 | 21 | 9 Nov 2026 |
| [Netherlands](https://calcbloc.com/netherlands/tax-tables/2026) | `netherlands` | 2026 | – | 9 Nov 2026 |
| [France](https://calcbloc.com/france/tax-tables/2026) | `france` | 2026 | – | 9 Nov 2026 |
| [Singapore](https://calcbloc.com/singapore/tax-tables/2026) | `singapore` | 2026 | – | 9 Nov 2026 |
| [United Arab Emirates](https://calcbloc.com/uae/tax-tables/2026) | `uae` | 2026 | – | 9 Nov 2026 |
| [Italy](https://calcbloc.com/italy/tax-tables/2026) | `italy` | 2026 | 21 | 9 Nov 2026 |
| [Portugal](https://calcbloc.com/portugal/tax-tables/2026) | `portugal` | 2026 | 2 | 9 Nov 2026 |
| [Switzerland](https://calcbloc.com/switzerland/tax-tables/2026) | `switzerland` | 2026 | 26 | 9 Nov 2026 |
| [Denmark](https://calcbloc.com/denmark/tax-tables/2026) | `denmark` | 2026 | 5 | 9 Nov 2026 |
| [Sweden](https://calcbloc.com/sweden/tax-tables/2026) | `sweden` | 2026 | 21 | 10 Nov 2026 |
| [Austria](https://calcbloc.com/austria/tax-tables/2026) | `austria` | 2026 | – | 10 Nov 2026 |
| [Poland](https://calcbloc.com/poland/tax-tables/2026) | `poland` | 2026 | – | 10 Nov 2026 |
| [Luxembourg](https://calcbloc.com/luxembourg/tax-tables/2026) | `luxembourg` | 2026 | – | 11 Nov 2026 |
| [Czechia](https://calcbloc.com/czechia/tax-tables/2026) | `czechia` | 2026 | – | 11 Nov 2026 |
| [Norway](https://calcbloc.com/norway/tax-tables/2026) | `norway` | 2026 | – | 11 Nov 2026 |
| [Finland](https://calcbloc.com/finland/tax-tables/2026) | `finland` | 2026 | 19 | 11 Nov 2026 |
| Slovenia * | `slovenia` | 2026 | – | 11 Nov 2026 |
| Romania * | `romania` | 2026 | – | 11 Nov 2026 |
| Hungary * | `hungary` | 2026 | – | 11 Nov 2026 |
| Slovakia * | `slovakia` | 2026 | – | 11 Nov 2026 |
| Greece * | `greece` | 2026 | – | 11 Nov 2026 |

29 countries, generated from the bundled `manifest.json` (data of 11 Nov 2026). **Regions** is the number of regional tables (states, provinces, cantons, nations...) bundled for the country; `listCountries()` returns their codes and names.

\* Bundled in the package; the calcbloc.com page and the API endpoint for this country are not published yet.

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

- API documentation and free keys: [calcbloc.com/developers](https://calcbloc.com/developers)
- Official tax datasets: [calcbloc.com/data](https://calcbloc.com/data)
- OpenAPI: [calcbloc.com/api/openapi.json](https://calcbloc.com/api/openapi.json)
- Issues: [github.com/itmarkerz/calcbloc-js/issues](https://github.com/itmarkerz/calcbloc-js/issues)
- The tables as plain JSON and CSV: [itmarkerz/calcbloc-data](https://github.com/itmarkerz/calcbloc-data)
- Python and PHP clients: [itmarkerz/calcbloc-python](https://github.com/itmarkerz/calcbloc-python), [itmarkerz/calcbloc-php](https://github.com/itmarkerz/calcbloc-php)
