import { useEffect, useState } from 'react'
import { vendorApi, type VendorLab, LAB_TYPES } from '@/api/vendor'
import Button from '@/components/ui/Button'
import SortableTh from '@/components/ui/SortableTh'
import { type SortState, toggleSort, sortByKey } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import VendorForm from '@/pages/VendorForm'

const FETCH_SIZE = 1000

export default function VendorRegistry() {
  const [items, setItems] = useState<VendorLab[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterKolas, setFilterKolas] = useState(false)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const [formId, setFormId] = useState<number | null | undefined>(undefined)
  const PAGE_SIZE = 20

  const load = () => {
    setLoading(true)
    vendorApi.list({
      size: FETCH_SIZE,
      search: search || undefined,
      lab_type: filterType || undefined,
      kolas_only: filterKolas || undefined,
    }).then((r) => { setItems(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1); load() }, [filterType, filterKolas])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}개 시험소`) }, [total])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load() }
  const handleSaved = () => { setFormId(undefined); load() }

  const sortedItems = sortByKey(items, sort)
  const pageItems = sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: 28, maxWidth: 1100, display: 'flex', flexDirection: 'column', height: 'var(--page-fill-h)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          시험소 마스터 정보(명칭·연락처·KOLAS 인정)를 등록·관리합니다. 단가표·발주이력·단가비교는 '외주 시험소' 메뉴에서 다룹니다.
        </p>
        <Button onClick={() => setFormId(null)}>+ 시험소 등록</Button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="시험소명 / 약칭 검색"
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 200 }}
        />
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 유형</option>
          {LAB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <input type="checkbox" checked={filterKolas} onChange={(e) => { setFilterKolas(e.target.checked); setPage(1) }} />
          KOLAS만 보기
        </label>
        <Button type="submit" size="sm">검색</Button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <p>등록된 시험소가 없습니다</p>
          <Button style={{ marginTop: 16 }} onClick={() => setFormId(null)}>첫 시험소 등록</Button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <SortableTh label="시험소명" sortKey="name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="약칭" sortKey="short_name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="유형" sortKey="lab_type" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="KOLAS" sortKey="kolas_certified" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <SortableTh label="담당자" sortKey="contact_name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
              <th style={{ position: 'sticky', top: 0, zIndex: 1, background: '#FAFBFD', boxShadow: 'inset 0 -2px 0 var(--border)', padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>연락처</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((v) => (
              <tr key={v.id}
                onClick={() => setFormId(v.id)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover, #F7F8FA)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 200 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {v.short_name ? (
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#EBF4FF', color: 'var(--primary)' }}>
                      {v.short_name}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{v.lab_type ?? '-'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {v.kolas_certified ? (
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#E6FFEE', color: '#38A169' }}>KOLAS</span>
                  ) : '-'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{v.contact_name ?? '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{v.contact_phone ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>이전</Button>
          <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음</Button>
        </div>
      )}

      {formId !== undefined && (
        <VendorForm vendorId={formId} allowedTabs={['기본정보']} onClose={() => setFormId(undefined)} onSaved={handleSaved} />
      )}
    </div>
  )
}
