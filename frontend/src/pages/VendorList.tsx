import { useEffect, useState } from 'react'
import { vendorApi, type VendorLab, type PriceCompareItem, LAB_TYPES } from '@/api/vendor'
import Button from '@/components/ui/Button'
import SortableTh from '@/components/ui/SortableTh'
import { toggleSort } from '@/utils/sort'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import VendorForm from '@/pages/VendorForm'

type Tab = '시험소 목록' | '단가 비교'

export default function VendorList() {
  const [tab, setTab] = useState<Tab>('시험소 목록')
  const { items, total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<VendorLab>({ key: 'name', dir: 'asc' })
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterKolas, setFilterKolas] = useState(false)
  const [formId, setFormId] = useState<number | null | undefined>(undefined)

  // 단가 비교 탭
  const [compareQuery, setCompareQuery] = useState('')
  const [compareResults, setCompareResults] = useState<PriceCompareItem[]>([])
  const [comparing, setComparing] = useState(false)

  const load = () => runLoad(() => vendorApi.list({
    size: FETCH_SIZE,
    search: search || undefined,
    lab_type: filterType || undefined,
    kolas_only: filterKolas || undefined,
  }))

  useEffect(() => { setPage(1); load() }, [filterType, filterKolas])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load() }
  const handleSaved = () => { setFormId(undefined); load() }

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compareQuery.trim()) return
    setComparing(true)
    try {
      const results = await vendorApi.comparePrices(compareQuery.trim())
      setCompareResults(results)
    } catch { alert('비교 중 오류가 발생했습니다') }
    finally { setComparing(false) }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      {/* page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>외주 시험소</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>외주 시험소 단가표·발주이력·단가비교 관리 (시험소 신규 등록은 기본 정보 &gt; 외주 시험소 등록에서)</p>
        </div>
      </div>

      {/* sub-tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {(['시험소 목록', '단가 비교'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* ══ 시험소 목록 ══ */}
      {tab === '시험소 목록' && (
        <>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={filterKolas} onChange={(e) => { setFilterKolas(e.target.checked); setPage(1) }} />
              KOLAS만 보기
            </label>
            <Button type="submit" size="sm">검색</Button>
          </form>

          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
            총 <strong style={{ color: 'var(--text-primary)' }}>{total}</strong>개 시험소
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
              <p>등록된 시험소가 없습니다</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>기본 정보 &gt; 외주 시험소 등록 메뉴에서 먼저 등록하세요</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 380px)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <SortableTh label="시험소명" sortKey="name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  <SortableTh label="약칭" sortKey="short_name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  <SortableTh label="유형" sortKey="lab_type" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  <SortableTh label="KOLAS" sortKey="kolas_certified" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  <SortableTh label="담당자" sortKey="contact_name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: '#FAFBFD', boxShadow: 'inset 0 -2px 0 var(--border)', padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>연락처</th>
                  <SortableTh label="시험항목" sortKey="scope_count" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  <SortableTh label="발주건수" sortKey="order_count" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
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
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v.name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {v.short_name ? (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#EBF4FF', color: 'var(--primary)' }}>
                          {v.short_name}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{v.lab_type ?? '-'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {v.kolas_certified ? (
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#E6FFEE', color: '#38A169' }}>KOLAS</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{v.contact_name ?? '-'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{v.contact_phone ?? '-'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600 }}>{v.scope_count}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>개</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600 }}>{v.order_count}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>건</span>
                    </td>
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
        </>
      )}

      {/* ══ 단가 비교 ══ */}
      {tab === '단가 비교' && (
        <>
          <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
              시험 항목명을 입력하면 등록된 모든 시험소의 단가·납기를 비교합니다
            </p>
            <form onSubmit={handleCompare} style={{ display: 'flex', gap: 10 }}>
              <input
                value={compareQuery} onChange={(e) => setCompareQuery(e.target.value)}
                placeholder="시험 항목명 입력 (예: 온도충격, 진동)"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
              />
              <Button type="submit" loading={comparing}>비교 검색</Button>
            </form>
          </div>

          {compareResults.length > 0 && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                검색 결과: <strong style={{ color: 'var(--text-primary)' }}>{compareResults.length}</strong>개 시험소 — 단가 낮은 순 정렬
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {compareResults.map((r, i) => (
                  <div key={r.vendor_id} style={{
                    border: i === 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 10, padding: 16, position: 'relative',
                  }}>
                    {i === 0 && (
                      <span style={{
                        position: 'absolute', top: -10, left: 12,
                        background: 'var(--primary)', color: '#fff',
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      }}>최저가</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <strong style={{ fontSize: 14 }}>{r.vendor_name}</strong>
                      {r.vendor_short && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#EBF4FF', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4 }}>
                          {r.vendor_short}
                        </span>
                      )}
                      {r.kolas_certified && (
                        <span style={{ fontSize: 10, fontWeight: 600, background: '#E6FFEE', color: '#38A169', padding: '1px 6px', borderRadius: 20 }}>
                          KOLAS
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: i === 0 ? 'var(--primary)' : 'var(--text-primary)', marginBottom: 6 }}>
                      {r.unit_price != null ? `${r.unit_price.toLocaleString()}원` : '단가 미등록'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      납기 {r.lead_days != null ? `${r.lead_days}일` : '-'}
                      {r.accreditation_scope && <span style={{ marginLeft: 8 }}>| {r.accreditation_scope}</span>}
                    </div>
                    {r.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{r.notes}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {compareResults.length === 0 && compareQuery && !comparing && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              일치하는 시험 항목이 없습니다
            </div>
          )}
        </>
      )}

      {formId !== undefined && (
        <VendorForm vendorId={formId} allowedTabs={['단가표', '발주이력']} onClose={() => setFormId(undefined)} onSaved={handleSaved} />
      )}
    </div>
  )
}
