import { useEffect, useState } from 'react'
import { equipmentApi, type Equipment, type InvestmentRecord, EQ_CATEGORIES, EQ_STATUSES, STATUS_COLORS, expiryColor, expiryLabel } from '@/api/equipment'
import { SOP_COVERAGE_COLORS } from '@/api/sop'
import Button from '@/components/ui/Button'
import SortableTh from '@/components/ui/SortableTh'
import { type SortState, toggleSort, sortByKey } from '@/utils/sort'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import EquipmentForm from '@/pages/EquipmentForm'
import { useUIStore } from '@/stores/uiStore'

type Tab = '장비 대장' | '투자 로드맵'

const INVEST_TYPES = ['신규구입', '유지보수', '교정비', '수리', '폐기']
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)

export default function EquipmentList() {
  const [tab, setTab] = useState<Tab>('장비 대장')
  const { items, total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<Equipment>({ key: 'name', dir: 'asc' })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [formId, setFormId] = useState<number | null | undefined>(undefined)

  // 투자 로드맵
  const [investments, setInvestments] = useState<InvestmentRecord[]>([])
  const [invLoading, setInvLoading] = useState(false)
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterInvestType, setFilterInvestType] = useState('')
  const [invSort, setInvSort] = useState<SortState>({ key: 'year', dir: 'desc' })

  const load = () => runLoad(() => equipmentApi.list({
    size: FETCH_SIZE,
    search: search || undefined,
    status: filterStatus || undefined,
    category: filterCategory || undefined,
  }))

  const loadInvestments = () => {
    setInvLoading(true)
    equipmentApi.listInvestments({ year: filterYear || undefined })
      .then(setInvestments)
      .finally(() => setInvLoading(false))
  }

  useEffect(() => { setPage(1); load() }, [filterStatus, filterCategory])
  useEffect(() => { if (tab === '투자 로드맵') loadInvestments() }, [tab, filterYear])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}개 장비`) }, [total])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load() }
  const handleSaved = () => { setFormId(undefined); load() }

  // 투자 로드맵 — 연도별 합계
  const filteredInvestments = sortByKey(
    filterInvestType ? investments.filter((i) => i.invest_type === filterInvestType) : investments,
    invSort,
  )
  const invByYear = filteredInvestments.reduce<Record<number, { total: number; byType: Record<string, number> }>>((acc, inv) => {
    if (!acc[inv.year]) acc[inv.year] = { total: 0, byType: {} }
    const amt = inv.amount_est ?? 0
    acc[inv.year].total += amt
    acc[inv.year].byType[inv.invest_type] = (acc[inv.year].byType[inv.invest_type] ?? 0) + amt
    return acc
  }, {})

  const visibleYears = filterYear ? [Number(filterYear)] : YEARS

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      {/* page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>시험 장비 대장 및 교정 관리</p>
        {tab === '장비 대장' && (
          <Button onClick={() => setFormId(null)}>+ 장비 등록</Button>
        )}
      </div>

      {/* sub-tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {(['장비 대장', '투자 로드맵'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </div>

      {/* ══ 장비 대장 ══ */}
      {tab === '장비 대장' && (
        <>
          {/* filters */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="장비명 / 모델 / S/N 검색"
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 220 }}
            />
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
              style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <option value="">전체 분류</option>
              {EQ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
              style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <option value="">전체 상태</option>
              {EQ_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button type="submit" size="sm">검색</Button>
          </form>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
              <p>등록된 장비가 없습니다</p>
              <Button style={{ marginTop: 16 }} onClick={() => setFormId(null)}>첫 장비 등록</Button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <SortableTh label="장비명" sortKey="name" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="분류" sortKey="category" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="모델명" sortKey="model" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="상태" sortKey="status" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="S/N" sortKey="serial_number" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="설치 위치" sortKey="location" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="담당자" sortKey="manager" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="교정 만료일" sortKey="days_to_expiry" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                    <SortableTh label="절차서" sortKey="sop_status" sort={sort} onSort={(k) => { setSort(toggleSort(sort, k)); setPage(1) }} />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((eq) => (
                    <tr
                      key={eq.id}
                      onClick={() => setFormId(eq.id)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover, #F7F8FA)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.name}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{eq.category ?? '-'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{eq.model ?? '-'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          background: STATUS_COLORS[eq.status] + '22',
                          color: STATUS_COLORS[eq.status],
                        }}>{eq.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {eq.serial_number ?? '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{eq.location ?? '-'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{eq.manager ?? '-'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {eq.latest_expiry ? (
                          <div>
                            <span style={{ fontSize: 12 }}>{eq.latest_expiry}</span>
                            <span style={{
                              marginLeft: 8, fontSize: 11, fontWeight: 700,
                              color: expiryColor(eq.days_to_expiry),
                            }}>{expiryLabel(eq.days_to_expiry)}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          background: SOP_COVERAGE_COLORS[eq.sop_status] + '22',
                          color: SOP_COVERAGE_COLORS[eq.sop_status],
                        }}>{eq.sop_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>이전</Button>
              <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음</Button>
            </div>
          )}
        </>
      )}

      {/* ══ 투자 로드맵 ══ */}
      {tab === '투자 로드맵' && (
        <>
          {/* filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : '')}
              style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <option value="">전체 연도</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={filterInvestType} onChange={(e) => setFilterInvestType(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <option value="">전체 투자 유형</option>
              {INVEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              총 {filteredInvestments.length}건 /&nbsp;
              <strong style={{ color: 'var(--text-primary)' }}>
                {filteredInvestments.reduce((s, i) => s + (i.amount_est ?? 0), 0).toLocaleString()}원 (추정)
              </strong>
            </span>
          </div>

          {invLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : (
            <>
              {/* 연도별 요약 카드 */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                {visibleYears.filter((y) => invByYear[y]).map((y) => (
                  <div key={y} style={{ flex: '1 1 180px', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{y}년</p>
                    <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                      {(invByYear[y]?.total ?? 0).toLocaleString()}원
                    </p>
                    {Object.entries(invByYear[y]?.byType ?? {}).map(([type, amt]) => (
                      <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        <span>{type}</span>
                        <span>{amt.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                ))}
                {visibleYears.every((y) => !invByYear[y]) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>투자 계획이 없습니다. 장비 상세 화면에서 추가하세요.</p>
                )}
              </div>

              {/* 상세 목록 */}
              {filteredInvestments.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <SortableTh label="연도" sortKey="year" sort={invSort} onSort={(k) => setInvSort(toggleSort(invSort, k))} />
                      <SortableTh label="장비명" sortKey="equipment_name" sort={invSort} onSort={(k) => setInvSort(toggleSort(invSort, k))} />
                      <SortableTh label="투자 유형" sortKey="invest_type" sort={invSort} onSort={(k) => setInvSort(toggleSort(invSort, k))} />
                      <SortableTh label="항목명" sortKey="item_name" sort={invSort} onSort={(k) => setInvSort(toggleSort(invSort, k))} />
                      <SortableTh label="금액(추정)" sortKey="amount_est" sort={invSort} onSort={(k) => setInvSort(toggleSort(invSort, k))} />
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestments.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600 }}>{inv.year}</td>
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{inv.equipment_name ?? '(미지정)'}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: '#EBF4FF', color: 'var(--primary)',
                          }}>{inv.invest_type}</span>
                        </td>
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{inv.item_name ?? '-'}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {inv.amount_est != null ? `${inv.amount_est.toLocaleString()}원` : <span style={{ color: 'var(--text-muted)' }}>추정 미입력</span>}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-muted)', maxWidth: 220 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.notes ?? '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}

      {/* form modal */}
      {formId !== undefined && (
        <EquipmentForm
          equipmentId={formId}
          onClose={() => setFormId(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
