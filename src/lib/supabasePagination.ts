const SUPABASE_PAGE_SIZE = 1000

interface PageResponse<T> {
  data: T[] | null
  error: { message: string } | null
}

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResponse<T>>
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1)
    if (error) throw error

    const page = data || []
    rows.push(...page)
    if (page.length < SUPABASE_PAGE_SIZE) return rows
    from += SUPABASE_PAGE_SIZE
  }
}
