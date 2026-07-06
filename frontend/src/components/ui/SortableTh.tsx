import type { SortState } from './Table'

interface Props {
  label: string
  sortKey: string
  sort: SortState
  onSort: (key: string) => void
  width?: number | string
}

// EquipmentList/VendorList/SOPList처럼 직접 <table>을 그리는 화면에서 쓰는 정렬 헤더.
// Table.tsx의 헤더 렌더링과 동일한 화살표 표기를 재사용한다.
export default function SortableTh({ label, sortKey, sort, onSort, width }: Props) {
  const active = sort.key === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        position: 'sticky', top: 0, zIndex: 1, background: '#FAFBFD',
        boxShadow: 'inset 0 -2px 0 var(--border)',
        padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12,
        color: active ? 'var(--au-indigo)' : 'var(--text-muted)', whiteSpace: 'nowrap',
        cursor: 'pointer', userSelect: 'none', width,
      }}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  )
}
