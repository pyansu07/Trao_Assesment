export type ErrorCode =
  | "INVALID_INPUT"
  | "COMPANY_UNREACHABLE"
  | "COMPANY_NOT_FOUND"
  | "COMPANY_TIMEOUT"
  | "NO_RESEARCH_SOURCES"
  | "LLM_RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "LLM_INVALID_OUTPUT"
  | "KIT_VALIDATION_FAILED"
  | "DATABASE_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  COMPANY_UNREACHABLE: 422,
  COMPANY_NOT_FOUND: 422,
  COMPANY_TIMEOUT: 422,
  NO_RESEARCH_SOURCES: 422,
  LLM_RATE_LIMITED: 429,
  LLM_UNAVAILABLE: 503,
  LLM_INVALID_OUTPUT: 502,
  KIT_VALIDATION_FAILED: 422,
  DATABASE_ERROR: 500,
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message } };
  }
}
