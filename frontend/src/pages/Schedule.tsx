import { useEffect, useState } from 'react'
import { scheduleApi, type ProjectScheduleSummary } from '@/api/schedules'
import Table, { type Column } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { toggleSort, sortByKey, type SortState } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import ScheduleForm from './ScheduleForm'
import ScheduleProjectDetail from './ScheduleProjectDetail'
import GanttChart from './GanttChart'

// 정렬을 위해 전체 목록을 한 번에 불러오고, 페이지네이션은 화면에서 잘라서 보여준다
const FETCH_SIZE = 1000
const PAGE_SIZE = 30

const STATUS_ORDER = ['계획', '준비중', '진행중', '완료', '지연', '취소']

export default function Schedule() {
  const [items, setItems] = useState<ProjectScheduleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: 'project_name', dir: 'asc' })
  const [formScheduleId, setFormScheduleId] = useState<number | null | undefined>(undefined)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined)
  const [view, setView] = useState<'list' | 'gantt'>('list')

  const load = () => {
    setLoading(true)
    scheduleApi.byProjectSummary({ size: FETCH_SIZE, search: search || undefined })
      .then((r) => { setItems(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`프로젝트 ${total}건`) }, [total])

  const sortedItems = sortByKey(items, sort)
  const pageItems = sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<ProjectScheduleSummary>[] = [
    {
      key: 'project_name', header: '프로젝트', sortable: true,
      render: (r) => (
        <span>
          <span style={{ fontWeight: 600 }}>{r.project_name}</span>
          {r.project_code && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{r.project_code}</span>}
        </span>
      ),
    },
    { key: 'item_name', header: '아이템', width: 140, sortable: true, render: (r) => r.item_name ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'customer_name', header: '고객사', width: 140, sortable: true, render: (r) => r.customer_name ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'phase', header: 'Phase', width: 80, sortable: true, render: (r) => <Badge label={r.phase} /> },
    { key: 'total_items', header: '규격 항목 수', width: 100, sortable: true, render: (r) => `${r.total_items}건` },
    {
      key: 'status_counts', header: '진행 현황',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
          {STATUS_ORDER.filter((s) => (r.status_counts[s] ?? 0) > 0).map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Badge label={s} /> <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.status_counts[s]}</span>
            </span>
          ))}
          {r.total_items === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>등록된 규격 항목 없음</span>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setView('list')} style={viewToggleStyle(view === 'list')}>목록</button>
          <button onClick={() => setView('gantt')} style={viewToggleStyle(view === 'gantt')}>간트 차트</button>
        </div>
        <Button size="sm" onClick={() => setFormScheduleId(null)}>+ 일정 등록</Button>
      </div>

      {view === 'gantt' ? (
        <GanttChart />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              placeholder="프로젝트명 / 프로젝트 코드 / 아이템명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 280 }}
            />
            <Button variant="secondary" size="sm" onClick={load}>검색</Button>
          </div>

          <Table columns={columns} data={pageItems} rowKey={(r) => r.project_id} loading={loading}
            emptyText="등록된 프로젝트가 없습니다."
            sort={sort} onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
            onRowClick={(r) => setSelectedProjectId(r.project_id)} />

          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
              <span style={{ fontSize: 13, lineHeight: '28px', color: 'var(--text-secondary)' }}>{page} / {Math.ceil(total / PAGE_SIZE)}</span>
              <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>다음</Button>
            </div>
          )}
        </>
      )}

      {formScheduleId !== undefined && (
        <ScheduleForm
          scheduleId={formScheduleId}
          onClose={() => setFormScheduleId(undefined)}
          onSaved={() => { setFormScheduleId(undefined); load() }}
        />
      )}

      {selectedProjectId !== undefined && (
        <ScheduleProjectDetail
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(undefined)}
          onChanged={load}
        />
      )}
    </div>
  )
}

function viewToggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', border: 'none', fontSize: 13, fontWeight: 600,
    background: active ? 'var(--au-indigo)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-secondary)',
  }
}
