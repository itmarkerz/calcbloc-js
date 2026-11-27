# Changelog

All notable changes to this package are listed here. The package follows [semantic versioning](https://semver.org/); a data-only update (new figures, a new country or year) is a minor release.

## 0.2.0 (unreleased)

For CalcBloc API 1.10.

- New client method `taxTreaties()` for GET /api/v1/tax-treaties: the double taxation treaties stored for a country (India), with the maximum withholding rates on dividends, interest, royalties and fees for technical services, their articles and wording, the relief methods, dates and the official source. Typed parameters and response (`TaxTreatiesParams`, `TaxTreatiesResponse`, `TaxTreaty`, `TreatyWithholding`).
- `verification` on `NetSalaryResponse`, `EmployerCostResponse` and on each `net-salary` and `employer-cost` entry of `countries()` (`Verification`: `"official-example"`, `"law-text"` or `null`). With a value, the first note says how the calculation was checked and links the official sources.
- Take-home pay and employer cost for Denmark (`dk`: `municipality`, `church`, `atp_hours`), Estonia (`ee`: `funded_pension`, `pension_age`) and Poland (`pl`: `accident_rate_pct`, `commuter`) work through `netSalary()` and `employerCost()` as they are; `compare()` accepts `dk`, `ee` and `pl`.
- Bundled tables: 217 countries (422 tables), synced from calcbloc-data 2026-11-27; Belgium stays pending. Country codes, ISO codes and names for the 84 new countries in `src/country-codes.json`, from the API's own list.
- Tests use real API 1.10 responses as fixtures (`test/fixtures/api-1.10/`).

For CalcBloc API 1.9.

- New client methods: `supplementalWithholding()` and `equityTax()` (API 1.8), and `crossBorderEquity()`, `facts()`, `taxCalendar()`, `tariffs()`, `tradeAgreements()` and `importDuty()` (API 1.9), with typed parameters (`SupplementalWithholdingParams`, `EquityTaxParams`, `CrossBorderEquityParams`, `FactsParams`, `TaxCalendarParams`, `TariffsParams`, `TradeAgreementsParams`, `ImportDutyParams`). They return the API's JSON as `ApiResponse`.
- Bundled tables: 133 countries (338 tables), synced from calcbloc-data 2026-11-26; Belgium stays pending. Country codes, ISO codes and names for all of them in `src/country-codes.json`, from the API's own list.
- The flat `rows` are now stored in the data files: since API 1.8 they carry columns the sections do not hold (`tax_type`, `jurisdiction`, `level`, `table_version`), so they cannot be rebuilt at load time. `test/data-integrity.json` still checks every loaded table byte for byte.
- Band rate check: rates above 100% are accepted for an ad valorem vehicle registration tax (Hong Kong's first registration tax, 115% and 132%).

For CalcBloc API 1.7:

- The `RateLimitError` message without a key no longer states fixed limits. It quotes the daily limit the API reported in `X-RateLimit-Limit` when one has been seen ("The free daily allowance without a key (300 requests a day) is used up."), says "The free per-minute allowance without a key is used up for this minute." for the per-minute limit, and otherwise gives no number. It still links to a free email-only key and says how to set it (`new CalcBloc({ apiKey })` or `CALCBLOC_API_KEY`). Docstrings point to https://calcbloc.com/developers#limits instead of quoting numbers.
- Countries can be given by short code (`nz`; `gb` or `uk` for the UK), ISO code (`NZ`) or English name (`New Zealand`), case-insensitively, as well as by the existing id (`new-zealand`): in `loadTable()`, `getCountry()` and `loadTablesWithRegions()`, as `calcbloc/tables/<short code>` modules (`calcbloc/tables/nz`), and in `taxTables()`, which maps them to the id before building the request path. The table mirrors the API's own (`src/country-codes.json`).
- Types: optional `short_code` and `iso_code` on `ApiCountry`, `labels` and `aliases` on `EndpointParameter`, and the `coverage` object (`ApiCoverage`) on `CountriesResponse`.
- README: keyless limits are now 300 requests a day and 20 a minute per IP address; countries can be given by short code (`nz`, `de`, `uk`), with the older keys still accepted; US `filing_status` values are `single`, `mfj` and `hoh`; `region` is required for take-home pay in the US and Canada and for employer cost in the US, Australia and Canada; equity compensation, bonus and supplemental withholding and cross-border withholding are not supported yet.

## 0.1.0 (unreleased)

First version.

- `CalcBloc` API client: `countries()`, `taxTables()` (JSON or CSV, any year or `latest`, regions), `netSalary()`, `employerCost()` and `compare()`, with typed responses for CalcBloc API 1.2.0, `CalcBlocError` and `RateLimitError`, rate-limit state from the response headers, injectable `fetch` and a request timeout. Works without a key, within the keyless allowance; the key comes from `apiKey` or `CALCBLOC_API_KEY`, and a 429 without a key says the free allowance is used up and links to a free key (`KEYS_URL`).
- `calcbloc/tables`: bundled tax tables for offline use in Node (`loadTable`, `loadTablesWithRegions`, `listCountries`, `getCountry`, `manifest`), in the exact shape of `GET /api/v1/tax-tables/{country}/{year}`.
- `calcbloc/tables/<country>`: one module per country with statically imported data, for bundlers, browsers and edge runtimes.
- `taxFromBands()`, `bandBreakdown()`, `findSection()` and `bandsSection()` helpers.
- Data of 13 November 2026: 41 countries, 246 national and regional tables, every row with its official source URL and retrieval date.
- Tests against official worked examples from Irish Revenue (USC), IRAS (Singapore income tax) and GOV.UK (dividend tax).
