import type { SortState } from '@/components/ui/Table'
export type { SortState }

export function toggleSort(prev: SortState, key: string): SortState {
  return prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
}

export function sortByKey<T extends object>(items: T[], sort: SortState): T[] {
  if (!sort.key) return items.slice()
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sort.key]
    const bv = (b as Record<string, unknown>)[sort.key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir
  })
}
