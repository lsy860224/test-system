import { useEffect, useState } from 'react'
import { sopApi, type SOPItem, SOP_CATEGORIES, SOP_STATUSES, SOP_STATUS_COLORS, SOP_DOC_TYPES, SOP_DOC_TYPE_COLORS } from '@/api/sop'
import { usersApi, type AppUser } from '@/api/users'
import Button from '@/components/ui/Button'
import SortableTh from '@/components/ui/SortableTh'
import { toggleSort } from '@/utils/sort'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import { useUIStore } from '@/stores/uiStore'
import SOPForm from '@/pages/SOPForm'

export default function SOPList() {
  const { items, total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<SOPItem>({ key: 'sop_number', dir: 'asc' })
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [formId, setFormId] = useState<number | null | undefined>(undefined)

  useEffect(() => { usersApi.list().then(setUsers) }, [])
  const approverName = (id?: number | null) => users.find((u) => u.id === id)?.name

  const load = () => runLoad(() => sopApi.list({
    size: FETCH_SIZE,
    search: search || undefined,
    category: filterCategory || undefined,
    status: filterStatus || undefined,
    doc_type: filterDocType || undefined,
  }))

  useEffect(() => { setPage(1); load() }, [filterCategory, filterStatus, filterDocType])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}개 절차서`) }, [total])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load() }
  const handleSaved = () => { setFormId(undefined); load() }

  // 상태별 카운트
  const statusCounts = items.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      {/* page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>시험 절차서 · 장비 절차서 (Standard Operating Procedure)</p>
        <Button onClick={() => setFormId(null)}>+ 절차서 등록</Button>
      </div>

      {/* 상태 요약 뱃지 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {SOP_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1) }}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: filterStatus === s ? `2px solid ${SOP_STATUS_COLORS[s]}` : '2px solid transparent',
              background: SOP_STATUS_COLORS[s] + '22',
              color: SOP_STATUS_COLORS[s], whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {s} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
          </button>
        ))}
        {filterStatus && (
          <button onClick={() => { setFilterStatus(''); setPage(1) }}
            style={{ padding: '6px 10px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            ✕ 초기화
          </button>
        )}
      </div>

      {/* filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="문서번호 / 문서명 / 작성자 검색"
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 240 }}
        />
        <select value={filterDocType} onChange={(e) => { setFilterDocType(e.target.value); setPage(1) }}
          style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 종류</option>
          {SOP_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
          style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 분류</option>
          {SOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button type="submit" size="sm">검색</Button>
      </form>


      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <p>등록된 절차서가 없습니다</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>시험 절차를 표준화하여 속인성을 제거하세요</p>
          <Button style={{ marginTop: 16 }} onClick={() => setFormId(null)}>첫 절차서 등록</Button>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <SortableTh label="문서번호" sortKey="sop_number" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="종류" sortKey="doc_type" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="버전" sortKey="version" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="문서명" sortKey="title" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="분류" sortKey="category" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="상태" sortKey="status" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="작성자" sortKey="owner" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="승인자" sortKey="approver_id" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="최근 개정일" sortKey="revision_date" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => (
              <tr
                key={s.id}
                onClick={() => setFormId(s.id)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover, #F7F8FA)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{s.sop_number}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: SOP_DOC_TYPE_COLORS[s.doc_type] + '22',
                    color: SOP_DOC_TYPE_COLORS[s.doc_type], whiteSpace: 'nowrap',
                  }}>{s.doc_type}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.version}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 280 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: 160 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.category ?? '-'}</span>
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: SOP_STATUS_COLORS[s.status] + '22',
                    color: SOP_STATUS_COLORS[s.status], whiteSpace: 'nowrap',
                  }}>{s.status}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.owner ?? '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{approverName(s.approver_id) ?? '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                  {s.revision_date ?? s.issue_date ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>이전</Button>
          <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음</Button>
        </div>
      )}

      {formId !== undefined && (
        <SOPForm sopId={formId} onClose={() => setFormId(undefined)} onSaved={handleSaved} />
      )}
    </div>
  )
}
