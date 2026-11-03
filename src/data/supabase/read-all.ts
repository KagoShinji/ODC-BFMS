interface ReadResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/** Supabase caps result sets. Read every page in a stable order and fail closed. */
export async function readAllRows<T>(
  page: (from: number, to: number) => PromiseLike<ReadResult<T>>,
): Promise<ReadResult<T>> {
  const rows: T[] = [];
  try {
    for (;;) {
      const result = await page(rows.length, rows.length + 499);
      if (result.error) return { data: [], error: result.error };
      if (!result.data?.length) return { data: rows, error: null };
      rows.push(...result.data);
    }
  } catch {
    return { data: [], error: { message: "The database could not be reached." } };
  }
}
