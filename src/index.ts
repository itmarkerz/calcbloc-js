/**
 * calcbloc: typed client for the CalcBloc API (https://calcbloc.com/developers) with official income tax brackets,
 * social security rates and thresholds, plus helpers for working with tax bands.
 *
 * Offline tables (Node): import { loadTable } from "calcbloc/tables"
 * One country (bundlers/browsers): import { tables } from "calcbloc/tables/uk"
 */
export { CalcBloc, KEYS_URL, type CalcBlocOptions, type FetchLike, type FetchResponseLike, type RequestOptions, type TaxTablesOptions } from "./client";
export { CalcBlocError, RateLimitError, type CalcBlocErrorCode, type CalcBlocErrorOptions } from "./errors";
export { bandBreakdown, bandsSection, findSection, taxFromBands, type BandAmount } from "./bands";
export { buildRows } from "./rows";
export { VERSION } from "./version";
export type * from "./types";
