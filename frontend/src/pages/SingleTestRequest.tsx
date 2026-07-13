import { useEffect, useState } from 'react'
import { singleTestApi, SINGLE_TEST_STATUSES, type SingleTestItem } from '@/api/singleTest'
import { usersApi, type AppUser } from '@/api/users'
import { useAuthStore } from '@/stores/authStore'
import Table, { type Column } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { toggleSort } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import Pagination from '@/components/ui/Pagination'
import SingleTestRequestForm from './SingleTestRequestForm'

function dDayLabel(dateStr?: string): { text: string; color?: string } {
  if (!dateStr) return { text: '-' }
  const diff = Math.ceil((new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (diff < 0) return { text: `${dateStr} (D+${-diff})`, color: '#E53E3E' }
  if (diff === 0) return { text: `${dateStr} (D-Day)`, color: '#E53E3E' }
  return { text: `${dateStr} (D-${diff})`, color: diff <= 3 ? '#D69E2E' : undefined }
}

export default function SingleTestRequest() {
  const role = useAuthStore((s) => s.user?.role)
  const isRequester = role === '의뢰자'
  const { total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<SingleTestItem>({ key: 'created_at', dir: 'desc' })
  const [users, setUsers] = useState<AppUser[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [formId, setFormId] = useState<number | null | undefined>(undefined)

  const load = () => runLoad(() => singleTestApi.list({
    size: FETCH_SIZE,
    status: filterStatus || undefined,
    search: search || undefined,
  }))

  useEffect(() => { setPage(1); load() }, [filterStatus])
  useEffect(() => { usersApi.list().then(setUsers).catch(() => {}) }, [])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}건`) }, [total])

  const userName = (id?: number) => users.find((u) => u.id === id)?.name ?? '-'

  const columns: Column<SingleTestItem>[] = [
    { key: 'request_number', header: '요청번호', width: 120, sortable: true },
    { key: 'requesting_dept', header: '의뢰 부서', width: 120, sortable: true },
    { key: 'test_name', header: '시험명', render: (r) => <span className="truncate">{r.test_name}</span> },
    { key: 'execution_type', header: '진행방식', width: 90, render: (r) => r.execution_type ? <Badge label={r.execution_type} /> : <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'status', header: '상태', width: 100, sortable: true, render: (r) => <Badge label={r.status} /> },
    { key: 'assignee_id', header: '담당자', width: 90, render: (r) => userName(r.assignee_id) },
    {
      key: 'desired_due_date', header: '희망 완료일', width: 150, sortable: true,
      render: (r) => {
        const d = dDayLabel(r.desired_due_date)
        return <span style={{ color: d.color, fontWeight: d.color ? 700 : 400 }}>{d.text}</span>
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--page-fill-h)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button size="sm" onClick={() => setFormId(null)}>+ 단건 시험 의뢰 등록</Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <input placeholder="부서 / 시험명 검색" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 220, flexShrink: 0 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, flexShrink: 0 }}>
          <option value="">전체 상태</option>
          {SINGLE_TEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="secondary" size="sm" onClick={load}>검색</Button>
      </div>

      {isRequester && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          본인이 등록한 의뢰 건만 표시됩니다.
        </div>
      )}

      <Table columns={columns} data={pageItems} rowKey={(r) => r.id} loading={loading} emptyText="등록된 단건 시험 의뢰가 없습니다."
        sort={sort} onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
        onRowClick={(r) => setFormId(r.id)} />

      {formId !== undefined && (
        <SingleTestRequestForm
          requestId={formId}
          onClose={() => setFormId(undefined)}
          onSaved={() => { setFormId(undefined); load() }}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
