import { useState } from 'react'
import { type SortState, sortByKey } from '@/utils/sort'

export const FETCH_SIZE = 1000
export const PAGE_SIZE = 20

export function useListPagination<T extends object>(initialSort: SortState, pageSize: number = PAGE_SIZE) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>(initialSort)

  const totalPages = Math.ceil(total / pageSize)
  const sortedItems = sortByKey(items, sort)
  const pageItems = sortedItems.slice((page - 1) * pageSize, page * pageSize)

  const runLoad = (fetcher: () => Promise<{ items: T[]; total: number }>) => {
    setLoading(true)
    return fetcher().then((r) => { setItems(r.items); setTotal(r.total) }).finally(() => setLoading(false))
  }

  return { items, total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad }
}
