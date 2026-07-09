import React, { type CSSProperties, useEffect, useState } from 'react'
import { standardApi, type StandardItem, type StandardCategory } from '@/api/standards'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import { useFormState } from '@/hooks/useFormState'

interface Props {
  itemId: number | null
  onClose: () => void
  onSaved: () => void
  copyFromStdNo?: string
  initialHeader?: { standard_no?: string; standard_name?: string; revision_no?: string }
}

// ── 수정 모드용 단일 폼 ────────────────────────────────
const emptyForm = {
  standard_no: '', standard_name: '', revision_no: '',
  standard_code: '', name: '', category_id: '', test_condition_summary: '', notes: '',
  source_type: '검토중',
}

const SOURCE_TYPES = ['자체', '외주', '검토중']

// ── 생성 모드용 행 타입 ────────────────────────────────
type ItemRow = {
  key: string
  standard_code: string
  name: string
  category_id: string
  test_condition_summary: string
  notes: string
}

const mkRow = (): ItemRow => ({
  key: `${Date.now()}-${Math.random()}`,
  standard_code: '', name: '', category_id: '', test_condition_summary: '', notes: '',
})

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function StandardItemForm({ itemId, onClose, onSaved, copyFromStdNo, initialHeader }: Props) {
  const isEdit = itemId !== null
  const isAddToGroup = !isEdit && !!initialHeader && !copyFromStdNo

  // 수정 모드 상태
  const [form, setForm, set] = useFormState({ ...emptyForm })

  // 생성 모드 상태
  const [header, setHeader] = useState({
    standard_no: initialHeader?.standard_no ?? '',
    standard_name: initialHeader?.standard_name ?? '',
    revision_no: initialHeader?.revision_no ?? '',
  })
  const [rows, setRows] = useState<ItemRow[]>([mkRow()])

  const [categories, setCategories] = useState<StandardCategory[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [copyLoading, setCopyLoading] = useState(!!copyFromStdNo && !isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { standardApi.categories().then(setCategories) }, [])

  // 수정 모드: 기존 항목 로드
  useEffect(() => {
    if (!isEdit || !itemId) return
    standardApi.get(itemId).then((item: StandardItem) => {
      setForm({
        standard_no: item.standard_no ?? '',
        standard_name: item.standard_name ?? '',
        revision_no: item.revision_no ?? '',
        standard_code: item.standard_code,
        name: item.name,
        category_id: item.category_id != null ? String(item.category_id) : '',
        test_condition_summary: item.test_condition_summary ?? '',
        notes: item.notes ?? '',
        source_type: item.source_type,
      })
    }).finally(() => setLoading(false))
  }, [itemId])

  // 규격 복사 모드: 소스 규격 항목 자동 로드
  useEffect(() => {
    if (!copyFromStdNo || isEdit) return
    setCopyLoading(true)
    standardApi.list({ size: 500 }).then((r) => {
      const matched = r.items.filter((i) => i.standard_no === copyFromStdNo)
      if (matched.length > 0) {
        setHeader({
          standard_no: matched[0].standard_no ?? '',
          standard_name: matched[0].standard_name ?? '',
          revision_no: '',
        })
        setRows(matched.map((item) => ({
          key: `copy-${item.id}`,
          standard_code: item.standard_code,
          name: item.name,
          category_id: item.category_id ? String(item.category_id) : '',
          test_condition_summary: item.test_condition_summary ?? '',
          notes: item.notes ?? '',
        })))
      }
    }).finally(() => setCopyLoading(false))
  }, [copyFromStdNo])

  // ── 핸들러 ─────────────────────────────────────────
  const setH = (key: string, v: string) => setHeader((p) => ({ ...p, [key]: v }))

  const setRow = (key: string, field: keyof ItemRow, v: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: v } : r)))

  const addRow = () => setRows((prev) => [...prev, mkRow()])
  const removeRow = (key: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))

  const handleDelete = async () => {
    if (!itemId) return
    if (!confirm('이 규격 항목을 삭제하시겠습니까?\n삭제된 항목은 복구할 수 없습니다.')) return
    setDeleting(true)
    try {
      await standardApi.delete(itemId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (isEdit) {
      if (!form.standard_code.trim()) { alert('항목 No.를 입력하세요'); return }
      if (!form.name.trim()) { alert('시험 항목명을 입력하세요'); return }
      setSaving(true)
      try {
        await standardApi.update(itemId!, {
          standard_no: form.standard_no || undefined,
          standard_name: form.standard_name || undefined,
          revision_no: form.revision_no || undefined,
          standard_code: form.standard_code.trim(),
          name: form.name.trim(),
          category_id: form.category_id ? Number(form.category_id) : undefined,
          test_condition_summary: form.test_condition_summary || undefined,
          notes: form.notes || undefined,
          source_type: form.source_type,
        })
        onSaved()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
        alert(msg)
      } finally {
        setSaving(false)
      }
    } else {
      const valid = rows.filter((r) => r.standard_code.trim() && r.name.trim())
      if (valid.length === 0) { alert('항목 No.와 시험 항목명을 1개 이상 입력하세요'); return }
      setSaving(true)
      try {
        await Promise.all(
          valid.map((row) =>
            standardApi.create({
              standard_no: header.standard_no || undefined,
              standard_name: header.standard_name || undefined,
              revision_no: header.revision_no || undefined,
              standard_code: row.standard_code.trim(),
              name: row.name.trim(),
              category_id: row.category_id ? Number(row.category_id) : undefined,
              test_condition_summary: row.test_condition_summary || undefined,
              notes: row.notes || undefined,
            })
          )
        )
        onSaved()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
        alert(msg)
      } finally {
        setSaving(false)
      }
    }
  }

  // ── 로딩 ───────────────────────────────────────────
  if (loading || copyLoading) {
    return (
      <Overlay onClose={onClose} width={isEdit ? 640 : 900}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  // ── 수정 모드 ───────────────────────────────────────
  if (isEdit) {
    return (
      <Overlay onClose={onClose} width={640}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>규격 항목 수정</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              규격 항목은 시험 규격 코드 DB입니다. 세부 일정(DV/PV 목표일)은 프로젝트/시험일정에서 관리합니다.
            </p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(80vh - 150px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <F label="규격 No.">
              <input value={form.standard_no} onChange={(e) => set('standard_no', e.target.value)} style={inp} placeholder="ISO 16750-2" />
            </F>
            <F label="규격명">
              <input value={form.standard_name} onChange={(e) => set('standard_name', e.target.value)} style={inp} placeholder="도로차량 전기전자장치 환경조건 및 시험" />
            </F>
            <F label="Revision No.">
              <input value={form.revision_no} onChange={(e) => set('revision_no', e.target.value)} style={inp} placeholder="Ed.4.0 / Rev.5" />
            </F>
            <div />
            <F label="항목 No. *">
              <input value={form.standard_code} onChange={(e) => set('standard_code', e.target.value)} style={inp} placeholder="6.3.1" />
            </F>
            <F label="분류">
              <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} style={inp}>
                <option value="">-- 분류 선택 --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ko}</option>)}
              </select>
            </F>
            <F label="시험 항목명 *" span={2}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inp} placeholder="온도 사이클 시험" />
            </F>
            <F label="시험 조건 요약" span={2}>
              <input value={form.test_condition_summary} onChange={(e) => set('test_condition_summary', e.target.value)} style={inp} placeholder="-40°C ~ +85°C, 1000 cycles" />
            </F>
            <F label="수행방식">
              <select value={form.source_type} onChange={(e) => set('source_type', e.target.value)} style={inp}>
                {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <div />
            <F label="메모" span={2}>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="특이사항, 외주 의뢰 조건 등" />
            </F>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button size="sm" onClick={handleDelete} loading={deleting}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            삭제
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>수정 저장</Button>
        </div>
      </Overlay>
    )
  }

  // ── 생성 모드 (다중 항목) ───────────────────────────
  const validCount = rows.filter((r) => r.standard_code.trim() && r.name.trim()).length

  return (
    <Overlay onClose={onClose} width={900}>
      {/* 헤더 */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            {isAddToGroup ? '시험 항목 추가' : '규격 추가'}
            {copyFromStdNo && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>— {copyFromStdNo} 복사</span>}
            {isAddToGroup && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>— {header.standard_no || '(미지정)'}</span>}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {isAddToGroup
              ? '이 규격에 새 시험 항목을 추가하세요. 한 번에 여러 항목을 등록할 수 있습니다.'
              : '규격 정보를 입력 후 항목을 추가하세요. 한 번에 여러 항목을 등록할 수 있습니다.'}
          </p>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 150px)' }}>

        {/* 규격 공통 정보 */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px', gap: 12, marginBottom: 20, padding: '16px', background: '#F7F8FA', borderRadius: 10, border: '1px solid var(--border)' }}>
          <F label="규격 No.">
            <input value={header.standard_no} onChange={(e) => setH('standard_no', e.target.value)}
              style={inp} placeholder="ISO 16750-2" />
          </F>
          <F label="규격명">
            <input value={header.standard_name} onChange={(e) => setH('standard_name', e.target.value)}
              style={inp} placeholder="도로차량 전기전자장치 환경조건 및 시험" />
          </F>
          <F label="Revision No.">
            <input value={header.revision_no} onChange={(e) => setH('revision_no', e.target.value)}
              style={inp} placeholder="Ed.4.0" />
          </F>
        </div>

        {/* 항목 테이블 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            항목 목록
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
              ({rows.length}행 · 입력 완료 {validCount}건)
            </span>
          </span>
          <button onClick={addRow} style={{
            marginLeft: 'auto', padding: '5px 14px', background: 'var(--au-blue)', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            + 항목 추가
          </button>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* 컬럼 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '28px 100px 1fr 118px 160px 28px',
            background: '#F0F2F5',
            padding: '7px 10px',
            gap: 8,
            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ textAlign: 'center' }}>#</span>
            <span>항목 No. *</span>
            <span>시험 항목명 *</span>
            <span>분류</span>
            <span>시험 조건 요약</span>
            <span />
          </div>

          {/* 행 목록 */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {rows.map((row, idx) => (
              <div key={row.key} style={{
                display: 'grid',
                gridTemplateColumns: '28px 100px 1fr 118px 160px 28px',
                padding: '6px 10px', gap: 8, alignItems: 'center',
                borderBottom: idx < rows.length - 1 ? '1px solid var(--border)' : undefined,
                background: idx % 2 === 0 ? '#fff' : '#FAFBFC',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: '28px' }}>
                  {idx + 1}
                </span>
                <input
                  value={row.standard_code}
                  onChange={(e) => setRow(row.key, 'standard_code', e.target.value)}
                  style={inpSm} placeholder="6.3.1"
                />
                <input
                  value={row.name}
                  onChange={(e) => setRow(row.key, 'name', e.target.value)}
                  style={inpSm} placeholder="시험 항목명"
                />
                <select
                  value={row.category_id}
                  onChange={(e) => setRow(row.key, 'category_id', e.target.value)}
                  style={inpSm}
                >
                  <option value="">-</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ko}</option>)}
                </select>
                <input
                  value={row.test_condition_summary}
                  onChange={(e) => setRow(row.key, 'test_condition_summary', e.target.value)}
                  style={inpSm} placeholder="-40°C~+85°C"
                />
                <button
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  style={{
                    background: 'none', border: 'none', cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                    color: rows.length === 1 ? 'var(--text-muted)' : '#E53E3E',
                    fontSize: 15, fontWeight: 700, lineHeight: 1,
                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 빈 행 안내 */}
        {rows.length > validCount && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            항목 No. 또는 시험 항목명이 비어있는 행은 저장 시 제외됩니다.
          </p>
        )}
      </div>

      {/* 푸터 */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {validCount > 0
            ? <><span style={{ color: 'var(--au-blue)', fontWeight: 600 }}>{validCount}건</span> 등록 예정</>
            : '항목을 1건 이상 입력하세요'
          }
        </span>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={validCount === 0}>
          등록 ({validCount}건)
        </Button>
      </div>
    </Overlay>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const inpSm: CSSProperties = {
  width: '100%', padding: '5px 8px', border: '1px solid var(--border)',
  borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box',
}
