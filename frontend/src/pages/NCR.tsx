import { useEffect, useState } from 'react'
import { ncrApi, type NCRItem } from '@/api/ncr'
import Table, { type Column, type SortState } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { toggleSort, sortByKey } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import NCRForm from './NCRForm'

const FETCH_SIZE = 1000

export default function NCR() {
  const [items, setItems] = useState<NCRItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: 'detected_date', dir: 'desc' })
  const PAGE_SIZE = 20
  const [formNcrId, setFormNcrId] = useState<number | null | undefined>(undefined)

  const load = () => {
    setLoading(true)
    ncrApi.list({
      size: FETCH_SIZE,
      status: filterStatus || undefined,
      severity: filterSeverity || undefined,
      search: search || undefined,
      overdue: filterOverdue || undefined,
    }).then((r) => { setItems(r.items); setTotal(r.total) }).finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1); load() }, [filterStatus, filterSeverity, filterOverdue])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}건`) }, [total])

  const sortedItems = sortByKey(items, sort)
  const pageItems = sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<NCRItem>[] = [
    { key: 'ncr_number',    header: 'NCR 번호',   width: 130, sortable: true },
    { key: 'part_name',     header: '부품명',      width: 150, sortable: true },
    { key: 'issue_summary', header: '이슈 요약',   render: (r) => <span className="truncate">{r.issue_summary}</span> },
    { key: 'severity',      header: '심각도',      width: 90,  sortable: true, render: (r) => <Badge label={r.severity} /> },
    { key: 'status',        header: '상태',        width: 100, sortable: true, render: (r) => <Badge label={r.status} /> },
    { key: 'detected_date', header: '발생일',      width: 100, sortable: true, render: (r) => r.detected_date ?? '-' },
    {
      key: 'due_date', header: '마감일', width: 120, sortable: true,
      render: (r) => (
        <span style={{ color: r.is_overdue ? '#E53E3E' : undefined, fontWeight: r.is_overdue ? 700 : 400 }}>
          {r.due_date ?? '-'}{r.is_overdue ? ' ⚠️ 기한초과' : ''}
        </span>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--page-fill-h)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button size="sm" onClick={() => setFormNcrId(null)}>+ NCR 등록</Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <input placeholder="부품명 / 이슈 검색" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 220, flexShrink: 0 }} />
        <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value) }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, flexShrink: 0 }}>
          {['', 'Critical', 'High', 'Medium', 'Low'].map((s) => <option key={s} value={s}>{s || '전체 심각도'}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value) }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, flexShrink: 0 }}>
          {['', '초기분석', '8D진행', '검토중', '완료', '취소'].map((s) => <option key={s} value={s}>{s || '전체 상태'}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#E53E3E', cursor: 'pointer', padding: '0 4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <input type="checkbox" checked={filterOverdue} onChange={(e) => { setFilterOverdue(e.target.checked) }} />
          기한초과만 보기
        </label>
        <Button variant="secondary" size="sm" onClick={load}>검색</Button>
      </div>

      <Table columns={columns} data={pageItems} rowKey={(r) => r.id} loading={loading} emptyText="등록된 NCR이 없습니다."
        sort={sort} onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
        onRowClick={(r) => setFormNcrId(r.id)} />

      {formNcrId !== undefined && (
        <NCRForm
          ncrId={formNcrId}
          onClose={() => setFormNcrId(undefined)}
          onSaved={() => { setFormNcrId(undefined); load() }}
        />
      )}

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
          <span style={{ fontSize: 13, lineHeight: '28px', color: 'var(--text-secondary)' }}>{page} / {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>다음</Button>
        </div>
      )}
    </div>
  )
}
