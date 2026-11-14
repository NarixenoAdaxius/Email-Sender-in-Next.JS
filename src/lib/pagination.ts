export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? Math.trunc(value) : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse & clamp page/limit. Invalid/NaN values fall back to defaults. */
export function parsePagination(
  rawPage: unknown,
  rawLimit: unknown,
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const p = toInt(rawPage);
  const l = toInt(rawLimit);
  const page = p === null ? 1 : Math.max(1, p);
  const limit = l === null ? defaultLimit : Math.min(maxLimit, Math.max(1, l));
  return { page, limit, skip: (page - 1) * limit };
}

/** Build pagination metadata. totalPages is at least 1; page is reported as requested. */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const safeTotal = Math.max(0, Math.trunc(total) || 0);
  return { page, limit, total: safeTotal, totalPages: Math.max(1, Math.ceil(safeTotal / limit)) };
}
