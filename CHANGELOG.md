# Changelog

All notable changes to this package are listed here. The package follows [semantic versioning](https://semver.org/); a data-only update (new figures, a new country or year) is a minor release.

## 0.1.0 (unreleased)

First version.

- `CalcBloc` API client: `countries()`, `taxTables()` (JSON or CSV, any year or `latest`, regions), `netSalary()`, `employerCost()` and `compare()`, with typed responses for CalcBloc API 1.2.0, `CalcBlocError` and `RateLimitError`, rate-limit state from the response headers, injectable `fetch` and a request timeout. Works without a key (50 requests a day); the key comes from `apiKey` or `CALCBLOC_API_KEY`, and a 429 without a key says the free allowance is used up and links to a free key (`KEYS_URL`).
- `calcbloc/tables`: bundled tax tables for offline use in Node (`loadTable`, `loadTablesWithRegions`, `listCountries`, `getCountry`, `manifest`), in the exact shape of `GET /api/v1/tax-tables/{country}/{year}`.
- `calcbloc/tables/<country>`: one module per country with statically imported data, for bundlers, browsers and edge runtimes.
- `taxFromBands()`, `bandBreakdown()`, `findSection()` and `bandsSection()` helpers.
- Data of 11 November 2026: 29 countries, 213 national and regional tables, every row with its official source URL and retrieval date.
- Tests against official worked examples from Irish Revenue (USC), IRAS (Singapore income tax) and GOV.UK (dividend tax).
