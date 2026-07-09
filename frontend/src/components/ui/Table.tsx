import React, { type ReactNode, type CSSProperties } from 'react'

export interface Column<T> {
  key: string
  header: string
  width?: number | string
  render?: (row: T) => ReactNode
  sortable?: boolean
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyText?: string
  sort?: SortState
  onSortChange?: (key: string) => void
}

export default function Table<T>({ columns, data, rowKey, onRowClick, loading, emptyText = '데이터가 없습니다', sort, onSortChange }: Props<T>) {
  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {columns.map((col) => {
              const sortable = col.sortable && onSortChange
              const active = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  onClick={sortable ? () => onSortChange!(col.key) : undefined}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? 'var(--au-indigo)' : 'var(--text-secondary)',
                    width: col.width,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    background: '#FAFBFD',
                    boxShadow: 'inset 0 -2px 0 var(--border)',
                    cursor: sortable ? 'pointer' : undefined,
                    userSelect: sortable ? 'none' : undefined,
                  }}
                >
                  {col.header}
                  {sortable && (
                    <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
                      {active ? (sort!.dir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                로딩 중...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLElement).style.background = '#F7F9FC' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', width: col.width, overflow: 'hidden' }}>
                    <span style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
