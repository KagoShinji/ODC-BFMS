export const pageSizes = [10, 25, 50, 100] as const;

export function paginate<T>(items: readonly T[], requestedPage: number, requestedSize: number) {
  const pageSize = pageSizes.includes(requestedSize as (typeof pageSizes)[number])
    ? requestedSize
    : pageSizes[0];
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(
    1,
    Math.min(pageCount, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1),
  );
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    total: items.length,
    page,
    pageSize,
    pageCount,
    start: items.length ? offset + 1 : 0,
    end: Math.min(offset + pageSize, items.length),
  };
}
