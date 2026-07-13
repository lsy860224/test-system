import { useEffect, useState } from 'react'
import { scheduleApi, type ProjectScheduleSummary } from '@/api/schedules'
import Table, { type Column } from '@/components/ui/Table'
import Badge, { STATUS_COLORS, SHORT_LABELS } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { toggleSort } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import Pagination from '@/components/ui/Pagination'
import ScheduleForm from './ScheduleForm'
import ScheduleProjectDetail from './ScheduleProjectDetail'
import GanttChart from './GanttChart'

const STATUS_ORDER = ['계획', '준비중', '진행중', '완료', '지연', '취소']

export default function Schedule() {
  // 목록 화면 밀도가 높아 다른 목록(20건/페이지)보다 한 페이지에 30건을 보여준다
  const { total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<ProjectScheduleSummary>({ key: 'project_name', dir: 'asc' }, 30)
  const [search, setSearch] = useState('')
  const [formScheduleId, setFormScheduleId] = useState<number | null | undefined>(undefined)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined)
  const [view, setView] = useState<'list' | 'gantt'>('list')

  const load = () => runLoad(() => scheduleApi.byProjectSummary({ size: FETCH_SIZE, search: search || undefined }))

  useEffect(() => { load() }, [])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`프로젝트 ${total}건`) }, [total])

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
    { key: 'phase', header: 'Phase', width: 100, sortable: true, render: (r) => <Badge label={r.phase} /> },
    { key: 'total_items', header: '규격 항목 수', width: 100, sortable: true, render: (r) => `${r.total_items}건` },
    ...STATUS_ORDER.map((s): Column<ProjectScheduleSummary> => ({
      key: `status_${s}`, header: SHORT_LABELS[s] ?? s, width: 60,
      render: (r) => {
        const count = r.status_counts[s] ?? 0
        return count > 0
          ? <span style={{ fontWeight: 700, color: STATUS_COLORS[s] ?? 'var(--text-primary)' }}>{count}</span>
          : <span style={{ color: 'var(--text-muted)' }}>-</span>
      },
    })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--page-fill-h)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexShrink: 0 }}>
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
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', flexShrink: 0 }}>
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

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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
