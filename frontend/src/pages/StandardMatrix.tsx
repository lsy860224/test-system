import { useEffect, useMemo, useRef, useState } from 'react'
import { standardApi, type StandardItem, type StandardCategory } from '@/api/standards'
import { SOP_COVERAGE_COLORS } from '@/api/sop'
import Table, { type Column, type SortState } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useUIStore } from '@/stores/uiStore'
import StandardItemForm from '@/pages/StandardItemForm'

interface StandardGroup {
  standard_no: string // '' = 규격 No. 미지정
  standard_name?: string
  revision_no?: string
  items: StandardItem[]
}

const strCmp = (a?: string, b?: string) => (a ?? '').localeCompare(b ?? '', 'ko')
const SOURCE_TYPES = ['자체', '외주', '검토중']

// "5.2.2" < "5.2.10" 처럼 점으로 구분된 숫자 구간을 실제 숫자로 비교 (항목 No. 정렬용)
function naturalCmp(a?: string, b?: string): number {
  const ax = (a ?? '').match(/\d+|\D+/g) ?? []
  const bx = (b ?? '').match(/\d+|\D+/g) ?? []
  const len = Math.max(ax.length, bx.length)
  for (let i = 0; i < len; i++) {
    const an = ax[i] ?? ''
    const bn = bx[i] ?? ''
    if (an === bn) continue
    if (/^\d+$/.test(an) && /^\d+$/.test(bn)) {
      const diff = parseInt(an, 10) - parseInt(bn, 10)
      if (diff !== 0) return diff
    } else {
      const cmp = an.localeCompare(bn, 'ko')
      if (cmp !== 0) return cmp
    }
  }
  return 0
}

function sortGroups(groups: StandardGroup[], sort: SortState): StandardGroup[] {
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...groups].sort((a, b) => {
    if (sort.key === 'count') return (a.items.length - b.items.length) * dir
    if (sort.key === 'standard_name') return strCmp(a.standard_name, b.standard_name) * dir
    if (sort.key === 'revision_no') return strCmp(a.revision_no, b.revision_no) * dir
    return strCmp(a.standard_no, b.standard_no) * dir
  })
}

function sortItems(items: StandardItem[], sort: SortState): StandardItem[] {
  const dir = sort.dir === 'asc' ? 1 : -1
  const cmp = sort.key === 'standard_code' ? naturalCmp : strCmp
  return [...items].sort((a, b) => {
    const key = sort.key as keyof StandardItem
    return cmp(a[key] as string | undefined, b[key] as string | undefined) * dir
  })
}

export default function StandardMatrix() {
  const [items, setItems] = useState<StandardItem[]>([])
  const [categories, setCategories] = useState<StandardCategory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<number | ''>('')
  const [formItemId, setFormItemId] = useState<number | null | undefined>(undefined)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  // 규격 목록 ↔ 규격 상세(시험 항목 리스트) 전환
  const [selectedStdNo, setSelectedStdNo] = useState<string | null>(null)
  const [groupSort, setGroupSort] = useState<SortState>({ key: 'standard_no', dir: 'asc' })
  const [itemSort, setItemSort] = useState<SortState>({ key: 'standard_code', dir: 'asc' })

  // 시험 항목 리스트 내 검색/필터
  const [itemSearch, setItemSearch] = useState('')
  const [itemFilterCategory, setItemFilterCategory] = useState<number | ''>('')
  const [itemFilterSourceType, setItemFilterSourceType] = useState('')

  // 규격 복사 관련 상태
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  const [copyFromStdNo, setCopyFromStdNo] = useState<string | undefined>(undefined)
  const [copyPickerStdNo, setCopyPickerStdNo] = useState('')
  const [copyStdNos, setCopyStdNos] = useState<string[]>([])
  const [copyStdNosLoading, setCopyStdNosLoading] = useState(false)

  // 규격 기본 정보 수정 상태
  const [editingGroupInfo, setEditingGroupInfo] = useState(false)
  const [groupEditForm, setGroupEditForm] = useState({ standard_no: '', standard_name: '', revision_no: '' })
  const [groupEditSaving, setGroupEditSaving] = useState(false)

  // 그룹 내 시험 항목 추가 상태
  const [addItemHeader, setAddItemHeader] = useState<{ standard_no?: string; standard_name?: string; revision_no?: string } | undefined>(undefined)

  // 규격 단위로 묶어 보기 위해 필터에 맞는 전체 항목을 한 번에 불러온다 (그룹 경계가 페이지에 걸쳐 끊기지 않도록)
  const load = () => {
    setLoading(true)
    standardApi.list({
      size: 1000,
      search: search || undefined,
      category_id: filterCategory || undefined,
    }).then((r) => { setItems(r.items); setTotal(r.total) }).finally(() => setLoading(false))
  }

  useEffect(() => { standardApi.categories().then(setCategories) }, [])
  useEffect(() => { setSelectedStdNo(null); load() }, [filterCategory])

  const groups = useMemo(() => {
    const map = new Map<string, StandardGroup>()
    for (const it of items) {
      const key = it.standard_no ?? ''
      const g = map.get(key)
      if (g) g.items.push(it)
      else map.set(key, { standard_no: key, standard_name: it.standard_name, revision_no: it.revision_no, items: [it] })
    }
    return sortGroups([...map.values()], groupSort)
  }, [items, groupSort])

  const selectedGroup = groups.find((g) => g.standard_no === selectedStdNo)

  const selectedItems = useMemo(() => {
    if (!selectedGroup) return []
    const q = itemSearch.trim().toLowerCase()
    const filtered = selectedGroup.items.filter((it) => {
      if (q && !`${it.standard_code} ${it.name} ${it.test_condition_summary ?? ''}`.toLowerCase().includes(q)) return false
      if (itemFilterCategory && it.category_id !== itemFilterCategory) return false
      if (itemFilterSourceType && it.source_type !== itemFilterSourceType) return false
      return true
    })
    return sortItems(filtered, itemSort)
  }, [selectedGroup, itemSearch, itemFilterCategory, itemFilterSourceType, itemSort])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => {
    setPageCountLabel(selectedGroup
      ? `${selectedGroup.standard_no || '(규격 No. 미지정)'} · 시험 항목 ${selectedItems.length}건`
      : `규격 ${groups.length}종 · 총 ${total}건`)
  }, [selectedGroup, selectedItems.length, groups.length, total])

  const selectGroup = (stdNo: string) => {
    setItemSearch('')
    setItemFilterCategory('')
    setItemFilterSourceType('')
    setSelectedStdNo(stdNo)
  }

  const handleSaved = () => {
    setFormItemId(undefined)
    setCopyFromStdNo(undefined)
    setAddItemHeader(undefined)
    load()
  }

  const openAddItem = () => {
    if (!selectedGroup) return
    setCopyFromStdNo(undefined)
    setAddItemHeader({
      standard_no: selectedGroup.standard_no || undefined,
      standard_name: selectedGroup.standard_name,
      revision_no: selectedGroup.revision_no,
    })
    setFormItemId(null)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const result = await standardApi.importExcel(file)
      const msg = [`등록: ${result.created}건`, `중복 건너뜀: ${result.skipped}건`]
      if (result.errors.length > 0) msg.push(`오류: ${result.errors.join(', ')}`)
      alert(msg.join('\n'))
      load()
    } catch {
      alert('Excel 가져오기 중 오류가 발생했습니다')
    } finally {
      setImporting(false)
    }
  }

  // 규격 복사 picker 열기: 전체 목록에서 unique standard_no 추출
  const handleOpenCopyPicker = () => {
    setCopyPickerStdNo('')
    setShowCopyPicker(true)
    setCopyStdNosLoading(true)
    standardApi.list({ size: 1000 }).then((r) => {
      const nos = [...new Set(
        r.items.map((i) => i.standard_no).filter((s): s is string => !!s)
      )].sort()
      setCopyStdNos(nos)
    }).finally(() => setCopyStdNosLoading(false))
  }

  const handleConfirmCopy = () => {
    if (!copyPickerStdNo) return
    setShowCopyPicker(false)
    setCopyFromStdNo(copyPickerStdNo)
    setFormItemId(null)
  }

  const openGroupInfoEdit = () => {
    if (!selectedGroup) return
    setGroupEditForm({
      standard_no: selectedGroup.standard_no,
      standard_name: selectedGroup.standard_name ?? '',
      revision_no: selectedGroup.revision_no ?? '',
    })
    setEditingGroupInfo(true)
  }

  const handleSaveGroupInfo = async () => {
    if (!selectedGroup) return
    setGroupEditSaving(true)
    try {
      await standardApi.updateGroupInfo({
        old_standard_no: selectedGroup.standard_no || undefined,
        standard_no: groupEditForm.standard_no || undefined,
        standard_name: groupEditForm.standard_name || undefined,
        revision_no: groupEditForm.revision_no || undefined,
      })
      setEditingGroupInfo(false)
      setSelectedStdNo(groupEditForm.standard_no || '')
      load()
    } catch {
      alert('규격 기본 정보 수정 중 오류가 발생했습니다')
    } finally {
      setGroupEditSaving(false)
    }
  }

  const toggleGroupSort = (key: string) => {
    setGroupSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }
  const toggleItemSort = (key: string) => {
    setItemSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const groupColumns: Column<StandardGroup>[] = [
    {
      key: 'standard_no', header: '규격 No.', width: 160, sortable: true,
      render: (g) => g.standard_no
        ? <span style={{ fontSize: 12, color: 'var(--au-indigo)', fontWeight: 600 }}>{g.standard_no}</span>
        : <span style={{ color: 'var(--text-muted)' }}>(규격 No. 미지정)</span>,
    },
    {
      key: 'standard_name', header: '규격명', sortable: true,
      render: (g) => g.standard_name ?? <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
    {
      key: 'revision_no', header: 'Revision No.', width: 130, sortable: true,
      render: (g) => g.revision_no ?? <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
    {
      key: 'count', header: '시험 항목 수', width: 110, sortable: true,
      render: (g) => `${g.items.length}건`,
    },
    {
      key: 'sop_done', header: '절차서 완료', width: 110,
      render: (g) => {
        const done = g.items.filter((it) => it.sop_status === '완료').length
        return (
          <span style={{ fontWeight: 600, color: done === g.items.length ? '#38A169' : 'var(--text-secondary)' }}>
            {done}/{g.items.length}
          </span>
        )
      },
    },
  ]

  const itemColumns: Column<StandardItem>[] = [
    { key: 'standard_code', header: '항목 No.', width: 90, sortable: true },
    { key: 'name', header: '시험 항목명', width: 200, sortable: true },
    {
      key: 'category_name', header: '분류', width: 100, sortable: true,
      render: (r) => r.category_name
        ? <Badge label={r.category_name} color={r.category_color} />
        : <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
    {
      key: 'test_condition_summary', header: '시험 조건',
      render: (r) => r.test_condition_summary ?? '-',
    },
    {
      key: 'source_type', header: '수행방식', width: 90, sortable: true,
      render: (r) => <Badge label={r.source_type} />,
    },
    {
      key: 'sop_status', header: '절차서', width: 90, sortable: true,
      render: (r) => <Badge label={r.sop_status} color={SOP_COVERAGE_COLORS[r.sop_status]} />,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }} />
        {!selectedGroup && (
          <>
            <Button variant="secondary" size="sm" loading={importing} onClick={() => importRef.current?.click()}>
              Excel 가져오기
            </Button>
            <Button variant="secondary" size="sm" onClick={() => standardApi.downloadTemplate()}>
              양식 다운로드
            </Button>
            <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFile} />
            <Button variant="secondary" size="sm" onClick={handleOpenCopyPicker}>규격 복사</Button>
            <Button size="sm" onClick={() => { setCopyFromStdNo(undefined); setFormItemId(null) }}>+ 규격 추가</Button>
          </>
        )}
      </div>

      {selectedGroup ? (
        <>
          <Button variant="secondary" size="sm" onClick={() => setSelectedStdNo(null)} style={{ marginBottom: 16 }}>
            ← 규격 목록으로
          </Button>

          {/* 규격 기본 정보 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            width: '100%', boxSizing: 'border-box', padding: '14px 18px',
            background: 'var(--surface-secondary, #F5F7FA)', border: '1px solid var(--border)',
            borderRadius: 10, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 28 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>규격 No.</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--au-indigo)' }}>
                    {selectedGroup.standard_no || '(미지정)'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Revision No.</div>
                  <div style={{ fontSize: 14 }}>{selectedGroup.revision_no || '-'}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>규격명</div>
                <div style={{ fontSize: 14 }}>{selectedGroup.standard_name || '-'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <Button variant="secondary" size="sm" onClick={openGroupInfoEdit}>규격 정보 수정</Button>
              <Button size="sm" onClick={openAddItem}>+ 시험 항목 추가</Button>
            </div>
          </div>

          {/* 시험 항목 검색/필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <input
              placeholder="항목 No. / 시험 항목명 / 시험 조건 검색"
              value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 240 }}
            />
            <select
              value={itemFilterCategory}
              onChange={(e) => setItemFilterCategory(e.target.value ? Number(e.target.value) : '')}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            >
              <option value="">전체 분류</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ko}</option>)}
            </select>
            <select
              value={itemFilterSourceType}
              onChange={(e) => setItemFilterSourceType(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            >
              <option value="">전체 수행방식</option>
              {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Table
            columns={itemColumns}
            data={selectedItems}
            rowKey={(r) => r.id}
            loading={loading}
            emptyText={selectedGroup.items.length === 0 ? '시험 항목이 없습니다.' : '검색/필터 조건에 맞는 항목이 없습니다.'}
            sort={itemSort}
            onSortChange={toggleItemSort}
            onRowClick={(r) => { setCopyFromStdNo(undefined); setFormItemId(r.id) }}
          />
        </>
      ) : (
        <>
          {/* 필터 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              placeholder="규격 No. / 항목명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 220 }}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : '')}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            >
              <option value="">전체 분류</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ko}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={load}>검색</Button>
          </div>

          <Table
            columns={groupColumns}
            data={groups}
            rowKey={(g) => g.standard_no}
            loading={loading}
            emptyText="규격 항목이 없습니다. '+ 규격 추가'로 등록하거나 Excel 양식을 가져오세요."
            sort={groupSort}
            onSortChange={toggleGroupSort}
            onRowClick={(g) => selectGroup(g.standard_no)}
          />
        </>
      )}

      {/* 규격 복사 picker */}
      {showCopyPicker && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCopyPicker(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: 14, width: 440, maxWidth: '95vw',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}>
            {/* 헤더 */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>규격 복사</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  복사할 규격을 선택하면 해당 규격의 항목이 자동으로 채워집니다.<br />
                  Revision No.만 변경 후 저장하세요.
                </p>
              </div>
              <button onClick={() => setShowCopyPicker(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '20px 22px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                복사할 규격 No.
              </label>
              {copyStdNosLoading ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>규격 목록 로딩 중...</div>
              ) : copyStdNos.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>
                  규격 No.가 입력된 항목이 없습니다.
                </div>
              ) : (
                <select
                  value={copyPickerStdNo}
                  onChange={(e) => setCopyPickerStdNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                >
                  <option value="">-- 규격 선택 --</option>
                  {copyStdNos.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            {/* 푸터 */}
            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setShowCopyPicker(false)}>취소</Button>
              <Button size="sm" disabled={!copyPickerStdNo} onClick={handleConfirmCopy}>
                복사해서 규격 추가 →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 규격 기본 정보 수정 */}
      {editingGroupInfo && selectedGroup && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingGroupInfo(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: 14, width: 420, maxWidth: '95vw',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>규격 기본 정보 수정</h3>
              <button onClick={() => setEditingGroupInfo(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>규격 No.</label>
                <input
                  value={groupEditForm.standard_no}
                  onChange={(e) => setGroupEditForm((f) => ({ ...f, standard_no: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>규격명</label>
                <input
                  value={groupEditForm.standard_name}
                  onChange={(e) => setGroupEditForm((f) => ({ ...f, standard_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Revision No.</label>
                <input
                  value={groupEditForm.revision_no}
                  onChange={(e) => setGroupEditForm((f) => ({ ...f, revision_no: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                이 규격에 속한 시험 항목 {selectedGroup.items.length}건 전체에 반영됩니다.
              </p>
            </div>

            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setEditingGroupInfo(false)}>취소</Button>
              <Button size="sm" loading={groupEditSaving} onClick={handleSaveGroupInfo}>저장</Button>
            </div>
          </div>
        </div>
      )}

      {/* 규격 항목 폼 */}
      {formItemId !== undefined && (
        <StandardItemForm
          itemId={formItemId}
          onClose={() => { setFormItemId(undefined); setCopyFromStdNo(undefined); setAddItemHeader(undefined) }}
          onSaved={handleSaved}
          copyFromStdNo={formItemId === null ? copyFromStdNo : undefined}
          initialHeader={formItemId === null ? addItemHeader : undefined}
        />
      )}
    </div>
  )
}
