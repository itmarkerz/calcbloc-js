# Changelog

All notable changes to this package are listed here. The package follows [semantic versioning](https://semver.org/); a data-only update (new figures, a new country or year) is a minor release.

## Unreleased

For CalcBloc API 1.7.

- The `RateLimitError` message without a key no longer states fixed limits. It quotes the daily limit the API reported in `X-RateLimit-Limit` when one has been seen ("The free daily allowance without a key (300 requests a day) is used up."), says "The free per-minute allowance without a key is used up for this minute." for the per-minute limit, and otherwise gives no number. It still links to a free email-only key and says how to set it (`new CalcBloc({ apiKey })` or `CALCBLOC_API_KEY`). Docstrings point to https://calcbloc.com/developers#limits instead of quoting numbers.
- Types: optional `short_code` and `iso_code` on `ApiCountry`, `labels` and `aliases` on `EndpointParameter`, and the `coverage` object (`ApiCoverage`) on `CountriesResponse`.
- README: keyless limits are now 300 requests a day and 20 a minute per IP address; countries can be given by short code (`nz`, `de`, `uk`), with the older keys still accepted; US `filing_status` values are `single`, `mfj` and `hoh`; `region` is required for take-home pay in the US and Canada and for employer cost in the US, Australia and Canada; equity compensation, bonus and supplemental withholding and cross-border withholding are not supported yet.

## 0.1.0 (unreleased)

First version.

- `CalcBloc` API client: `countries()`, `taxTables()` (JSON or CSV, any year or `latest`, regions), `netSalary()`, `employerCost()` and `compare()`, with typed responses for CalcBloc API 1.2.0, `CalcBlocError` and `RateLimitError`, rate-limit state from the response headers, injectable `fetch` and a request timeout. Works without a key (50 requests a day); the key comes from `apiKey` or `CALCBLOC_API_KEY`, and a 429 without a key says the free allowance is used up and links to a free key (`KEYS_URL`).
- `calcbloc/tables`: bundled tax tables for offline use in Node (`loadTable`, `loadTablesWithRegions`, `listCountries`, `getCountry`, `manifest`), in the exact shape of `GET /api/v1/tax-tables/{country}/{year}`.
- `calcbloc/tables/<country>`: one module per country with statically imported data, for bundlers, browsers and edge runtimes.
- `taxFromBands()`, `bandBreakdown()`, `findSection()` and `bandsSection()` helpers.
- Data of 13 November 2026: 41 countries, 246 national and regional tables, every row with its official source URL and retrieval date.
- Tests against official worked examples from Irish Revenue (USC), IRAS (Singapore income tax) and GOV.UK (dividend tax).
