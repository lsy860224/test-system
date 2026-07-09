import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi, type ProjectItem, projectStatusLabel } from '@/api/projects'
import { customersApi, type CustomerListItem } from '@/api/customers'
import { usersApi, type AppUser } from '@/api/users'
import Table, { type Column, type SortState } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { toggleSort, sortByKey } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import ProjectForm from '@/pages/ProjectForm'

const PHASES = ['RFQ', '개발', 'DV', 'PV', '양산준비', '양산']
const FETCH_SIZE = 1000

interface ProjectRow extends ProjectItem {
  customer_name?: string
  assignee_name?: string
}

export default function ProjectOverview() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ProjectItem[]>([])
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPhase, setFilterPhase] = useState('')
  const [filterCustomer, setFilterCustomer] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: '', dir: 'desc' }) // 기본은 서버가 내려주는 최신순 그대로 유지
  const [formProjectId, setFormProjectId] = useState<number | null | undefined>(undefined)
  const PAGE_SIZE = 20

  const load = () => {
    setLoading(true)
    projectsApi.list({
      size: FETCH_SIZE,
      status: filterStatus || undefined,
      phase: filterPhase || undefined,
      customer_id: filterCustomer || undefined,
      search: search || undefined,
    })
      .then((r) => { setItems(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { customersApi.list({ size: 1000 }).then((r) => setCustomers(r.items)) }, [])
  useEffect(() => { usersApi.list().then(setUsers) }, [])
  useEffect(() => { setPage(1); load() }, [filterStatus, filterPhase, filterCustomer])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}건`) }, [total])

  const handleSaved = () => { setFormProjectId(undefined); load() }

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name
  const assigneeName = (id?: number) => id != null ? users.find((u) => u.id === id)?.name : undefined

  const rows: ProjectRow[] = items.map((it) => ({ ...it, customer_name: customerName(it.customer_id), assignee_name: assigneeName(it.assignee_id) }))
  const sortedRows = sortByKey(rows, sort)
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<ProjectRow>[] = [
    { key: 'project_code', header: '프로젝트 코드', width: 140, sortable: true, render: (r) => r.project_code ?? '-' },
    { key: 'name',         header: '프로젝트명',    width: 200, sortable: true },
    {
      key: 'customer_name', header: '고객사', width: 140, sortable: true,
      render: (r) => r.customer_name ?? <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
    { key: 'item_name',    header: '아이템',        width: 160, sortable: true, render: (r) => r.item_name ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'phase',        header: '단계',          width: 90,  sortable: true, render: (r) => <Badge label={r.phase} /> },
    { key: 'status',       header: '상태',          width: 80,  sortable: true, render: (r) => <Badge label={projectStatusLabel(r.status)} /> },
    {
      key: 'progress_pct', header: '진행률', width: 130, sortable: true,
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r.progress_pct}%`, background: 'var(--au-blue)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{r.progress_pct}%</span>
        </div>
      ),
    },
    { key: 'target_date', header: '목표 완료', width: 110, sortable: true, render: (r) => r.target_date ?? '-' },
    { key: 'assignee_name', header: '담당자', width: 90, sortable: true, render: (r) => r.assignee_name ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button size="sm" onClick={() => navigate('/projects/new')}>+ 프로젝트 등록</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="프로젝트명 / 코드 / 아이템명 검색"
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 240 }}
        />
        <select value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value ? Number(e.target.value) : '') }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 고객사</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPhase} onChange={(e) => { setFilterPhase(e.target.value) }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 단계</option>
          {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value) }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          {['', '활성', '완료', '보류', '지연', '취소'].map((s) => <option key={s} value={s}>{s ? projectStatusLabel(s) : '전체 상태'}</option>)}
        </select>
        <Button variant="secondary" size="sm" onClick={load}>검색</Button>
      </div>

      <Table
        columns={columns}
        data={pageRows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyText="등록된 프로젝트가 없습니다."
        sort={sort}
        onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
        onRowClick={(r) => setFormProjectId(r.id)}
      />

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
          <span style={{ fontSize: 13, lineHeight: '28px', color: 'var(--text-secondary)' }}>{page} / {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>다음</Button>
        </div>
      )}

      {formProjectId !== undefined && (
        <ProjectForm
          projectId={formProjectId}
          onClose={() => setFormProjectId(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
