/**
 * Errors thrown by the client and the offline loader. API errors keep the server's `code` (e.g. "unsupported_country",
 * "invalid_key", "rate_limited"); see https://calcbloc.com/developers for the full list.
 */
export type CalcBlocErrorCode =
  | "not_found"
  | "method_not_allowed"
  | "unknown_parameter"
  | "invalid_parameter"
  | "missing_parameter"
  | "duplicate_parameter"
  | "unsupported_country"
  | "unsupported_year"
  | "unsupported_region"
  | "api_key_required"
  | "invalid_key"
  | "rate_limited"
  | "response_too_large"
  | "signup_closed"
  | "service_unavailable"
  | "internal_error"
  /** Client-side: the request did not reach the API or no response arrived (DNS, TLS, timeout, abort). */
  | "network_error"
  /** Client-side: a non-2xx response without the API's JSON error body (e.g. a proxy error page). */
  | "http_error"
  /** Client-side: a 2xx response that was not valid JSON. */
  | "invalid_response"
  | (string & {});

export interface CalcBlocErrorOptions {
  status?: number;
  docs?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class CalcBlocError extends Error {
  /** Machine-readable error code from the API (or a client-side code such as "network_error"). */
  readonly code: CalcBlocErrorCode;
  /** HTTP status; 0 when no response was received. */
  readonly status: number;
  /** Documentation link sent by the API. */
  readonly docs?: string;
  /** Any further fields of the API's error object. */
  readonly details?: Record<string, unknown>;

  constructor(code: CalcBlocErrorCode, message: string, options: CalcBlocErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "CalcBlocError";
    this.code = code;
    this.status = options.status ?? 0;
    this.docs = options.docs;
    this.details = options.details;
  }
}

/** HTTP 429: the per-minute burst or the daily limit was reached. Wait `retryAfter` seconds. */
export class RateLimitError extends CalcBlocError {
  /** Seconds to wait before retrying (Retry-After header), when sent. */
  readonly retryAfter: number | null;
  readonly limit: number | null;
  readonly remaining: number | null;
  /** Seconds until the daily window resets, when sent. */
  readonly resetSeconds: number | null;

  constructor(message: string, options: CalcBlocErrorOptions & { retryAfter?: number | null; limit?: number | null; remaining?: number | null; resetSeconds?: number | null } = {}) {
    super("rate_limited", message, { status: 429, ...options });
    this.name = "RateLimitError";
    this.retryAfter = options.retryAfter ?? null;
    this.limit = options.limit ?? null;
    this.remaining = options.remaining ?? null;
    this.resetSeconds = options.resetSeconds ?? null;
  }
}
