import React, { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  sopApi, type SOPItem, type SOPRevision, type SOPAttachment,
  SOP_CATEGORIES, SOP_STATUSES, SOP_STATUS_COLORS,
} from '@/api/sop'
import { standardApi, type StandardItem, type StandardCategory } from '@/api/standards'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'

interface Props {
  sopId: number | null
  onClose: () => void
  onSaved: () => void
}

type Tab = '기본정보' | '절차 내용' | '첨부파일' | '규격 항목' | '개정 이력'

const emptyForm = {
  sop_number: '', title: '', version: 'v1.0', category: '',
  status: '초안', owner: '', approved_by: '',
  issue_date: '', revision_date: '', description: '', content: '', notes: '',
}

const emptyRevForm = {
  version: '', change_summary: '', changed_by: '',
}

export default function SOPForm({ sopId, onClose, onSaved }: Props) {
  const isEdit = sopId !== null
  const [tab, setTab] = useState<Tab>('기본정보')
  const [form, setForm] = useState({ ...emptyForm })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedSopId, setSavedSopId] = useState<number | null>(sopId)

  // 개정 이력 탭
  const [revisions, setRevisions] = useState<SOPRevision[]>([])
  const [showRevForm, setShowRevForm] = useState(false)
  const [revForm, setRevForm] = useState({ ...emptyRevForm })
  const [savingRev, setSavingRev] = useState(false)

  // 첨부파일 탭
  const [attachments, setAttachments] = useState<SOPAttachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 규격 항목 탭
  const [allStandards, setAllStandards] = useState<StandardItem[]>([])
  const [allCategories, setAllCategories] = useState<StandardCategory[]>([])
  const [selectedStandardIds, setSelectedStandardIds] = useState<Set<number>>(new Set())
  const [standardSearch, setStandardSearch] = useState('')
  const [standardCatFilter, setStandardCatFilter] = useState<number | ''>('')
  const [standardLoading, setStandardLoading] = useState(false)

  useEffect(() => {
    standardApi.categories().then(setAllCategories)
    standardApi.list({ size: 500 }).then((r) => setAllStandards(r.items))
  }, [])

  useEffect(() => {
    if (!isEdit || !sopId) return
    Promise.all([
      sopApi.get(sopId),
      sopApi.getStandardItems(sopId),
    ]).then(([s, standardItems]) => {
      setForm({
        sop_number: s.sop_number ?? '', title: s.title ?? '',
        version: s.version ?? 'v1.0', category: s.category ?? '',
        status: s.status ?? '초안', owner: s.owner ?? '',
        approved_by: s.approved_by ?? '', issue_date: s.issue_date ?? '',
        revision_date: s.revision_date ?? '', description: s.description ?? '',
        content: s.content ?? '', notes: s.notes ?? '',
      })
      setRevisions(s.revisions ?? [])
      setAttachments(s.attachments ?? [])
      setSelectedStandardIds(new Set(standardItems.map((e) => e.id)))
    }).finally(() => setLoading(false))
  }, [sopId])

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }))
  const setRev = (key: string, value: string) => setRevForm((p) => ({ ...p, [key]: value }))

  const toggleStandard = (id: number) => setSelectedStandardIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setPendingFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])
    e.target.value = ''
  }

  const removePending = (idx: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleDownloadAttachment = (att: SOPAttachment) => {
    if (!savedSopId) return
    sopApi.downloadAttachment(savedSopId, att.id, att.file_name)
  }

  const handleDeleteAttachment = async (attId: number) => {
    if (!savedSopId) return
    await sopApi.deleteAttachment(savedSopId, attId)
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  // 분류 선택 시 문서번호 자동 제안 (신규 시)
  const handleCategoryChange = (cat: string) => {
    set('category', cat)
    if (!isEdit && !form.sop_number) {
      const prefixMap: Record<string, string> = {
        '환경시험': 'ENV', '전기시험': 'ELE', 'EMC 시험': 'EMC',
        '기계시험': 'MEC', '신뢰성시험': 'REL', '측정': 'MSR', '공통': 'GEN', '기타': 'ETC',
      }
      const prefix = prefixMap[cat] ?? 'GEN'
      set('sop_number', `SOP-${prefix}-001`)
    }
  }

  // ── 기본정보 저장 ──────────────────────────────────────
  const handleSave = async () => {
    if (!form.sop_number.trim()) { alert('문서 번호를 입력하세요'); return }
    if (!form.title.trim()) { alert('문서명을 입력하세요'); return }
    setSaving(true)
    try {
      const payload = {
        sop_number: form.sop_number.trim(), title: form.title.trim(),
        version: form.version || 'v1.0', category: form.category || null,
        status: form.status, owner: form.owner || null,
        approved_by: form.approved_by || null,
        issue_date: form.issue_date || null,
        revision_date: form.revision_date || null,
        description: form.description || null,
        content: form.content || null, notes: form.notes || null,
      }
      let sid = savedSopId
      if (isEdit && sid) { await sopApi.update(sid, payload) }
      else {
        const created = await sopApi.create(payload)
        sid = created.id
        setSavedSopId(sid)
      }

      if (sid !== null) {
        for (const file of pendingFiles) {
          const uploaded = await sopApi.uploadAttachment(sid, file)
          setAttachments((prev) => [uploaded, ...prev])
        }
        setPendingFiles([])

        setStandardLoading(true)
        await sopApi.setStandardItems(sid, [...selectedStandardIds])
        setStandardLoading(false)
      }

      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
      alert(msg)
    } finally { setSaving(false); setStandardLoading(false) }
  }

  const handleDelete = async () => {
    if (!sopId) return
    if (!confirm('이 SOP를 삭제하시겠습니까?\n개정 이력도 함께 삭제됩니다.')) return
    setDeleting(true)
    try { await sopApi.delete(sopId); onSaved() }
    catch { alert('삭제 중 오류가 발생했습니다') }
    finally { setDeleting(false) }
  }

  // ── 개정 이력 저장 ─────────────────────────────────────
  const handleSaveRev = async () => {
    if (!sopId) return
    if (!revForm.version.trim()) { alert('버전을 입력하세요'); return }
    setSavingRev(true)
    try {
      const created = await sopApi.addRevision(sopId, {
        version: revForm.version.trim(),
        change_summary: revForm.change_summary || null,
        changed_by: revForm.changed_by || null,
      } as Partial<SOPRevision>)
      setRevisions((prev) => [created, ...prev])
      setShowRevForm(false)
      setRevForm({ ...emptyRevForm })
    } catch { alert('저장 중 오류가 발생했습니다') }
    finally { setSavingRev(false) }
  }

  const handleDeleteRev = async (revId: number) => {
    if (!sopId || !confirm('이 개정 이력을 삭제하시겠습니까?')) return
    try {
      await sopApi.deleteRevision(sopId, revId)
      setRevisions((prev) => prev.filter((r) => r.id !== revId))
    } catch { alert('삭제 중 오류가 발생했습니다') }
  }

  const TABS: Tab[] = isEdit
    ? ['기본정보', '절차 내용', '첨부파일', '규격 항목', '개정 이력']
    : ['기본정보', '절차 내용', '첨부파일', '규격 항목']

  const tabLabel = (t: Tab): string => {
    if (t === '첨부파일') return `첨부파일 (${attachments.length + pendingFiles.length})`
    if (t === '규격 항목') return `규격 항목 (${selectedStandardIds.size})`
    return t
  }

  if (loading) {
    return (
      <Overlay width={840} onClose={onClose}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay width={840} onClose={onClose}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {isEdit ? 'SOP 수정' : 'SOP 등록'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEdit ? `${form.sop_number} ${form.version}` : '새 시험 절차서를 등록합니다'}
            </p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            }}>{tabLabel(t)}</button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxHeight: 'calc(90vh - 180px)' }}>

        {/* ── 기본정보 ── */}
        {tab === '기본정보' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <F label="분류">
              <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} style={inp}>
                <option value="">-- 선택 --</option>
                {SOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
            <F label="상태">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inp}>
                {SOP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="문서 번호 *">
              <input value={form.sop_number} onChange={(e) => set('sop_number', e.target.value)}
                style={inp} placeholder="SOP-ENV-001" />
            </F>
            <F label="버전">
              <input value={form.version} onChange={(e) => set('version', e.target.value)}
                style={inp} placeholder="v1.0" />
            </F>
            <F label="문서명 *" span={2}>
              <input value={form.title} onChange={(e) => set('title', e.target.value)}
                style={inp} placeholder="온도충격시험 절차서" />
            </F>
            <F label="작성자">
              <input value={form.owner} onChange={(e) => set('owner', e.target.value)}
                style={inp} placeholder="홍길동" />
            </F>
            <F label="승인자">
              <input value={form.approved_by} onChange={(e) => set('approved_by', e.target.value)}
                style={inp} placeholder="김팀장" />
            </F>
            <F label="최초 발행일">
              <input type="date" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} style={inp} />
            </F>
            <F label="최근 개정일">
              <input type="date" value={form.revision_date} onChange={(e) => set('revision_date', e.target.value)} style={inp} />
            </F>
            <F label="적용 범위" span={2}>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="본 절차서는 온도충격시험기를 사용한 모든 시험에 적용한다." />
            </F>
            <F label="비고" span={2}>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={2} style={{ ...inp, resize: 'vertical' }}
                placeholder="참고 규격, 관련 장비 등" />
            </F>
          </div>
        )}

        {/* ── 절차 내용 ── */}
        {tab === '절차 내용' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              시험 절차의 주요 단계를 기술합니다. 저장 후 공식 문서(Word/PDF)로 출력하세요.
            </p>
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              style={{
                ...inp, resize: 'vertical', minHeight: 420,
                fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
              }}
              placeholder={`1. 목적\n   본 시험은 제품이 온도 급변 환경에서 기능 및 구조를 유지하는지 검증한다.\n\n2. 적용 범위\n   IVI 인포테인먼트 시스템 — DV 단계\n\n3. 준비 사항\n   3.1 시험 장비: 온도충격시험기 (TS-120R)\n   3.2 시험 조건: -40°C ↔ +85°C, 전환 시간 ≤ 30초\n\n4. 절차\n   4.1 시험편 준비...\n   4.2 초기 측정...\n   4.3 시험 실시...\n   4.4 최종 측정...\n\n5. 합부 판정\n   외관 이상 없음 + 기능 정상 동작 → 합격`}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button size="sm" onClick={handleSave} loading={saving}>내용 저장</Button>
            </div>
          </div>
        )}

        {/* ── 첨부파일 ── */}
        {tab === '첨부파일' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 12, padding: '32px 20px',
                textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                background: isDragOver ? '#EBF4FF' : 'transparent',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>파일을 드래그하거나 클릭하여 첨부</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>절차서 PDF, Word 원본 등</div>
            </div>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />

            {pendingFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>첨부 예정 (저장 시 업로드)</div>
                {pendingFiles.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, flex: 1 }}>{file.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: 13 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>업로드된 파일</div>
                {attachments.map((att) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span onClick={() => handleDownloadAttachment(att)}
                      style={{ fontSize: 13, flex: 1, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{att.file_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : ''}</span>
                    <button onClick={() => handleDeleteAttachment(att.id)}
                      style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: 13 }}>삭제</button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length === 0 && pendingFiles.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>첨부된 파일이 없습니다</div>
            )}
          </div>
        )}

        {/* ── 규격 항목 ── */}
        {tab === '규격 항목' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                value={standardSearch} onChange={(e) => setStandardSearch(e.target.value)}
                placeholder="코드 / 항목명 / 규격명 검색"
                style={{ ...inp, flex: 1 }}
              />
              <select value={standardCatFilter} onChange={(e) => setStandardCatFilter(e.target.value ? Number(e.target.value) : '')} style={{ ...inp, width: 'auto' }}>
                <option value="">전체 분류</option>
                {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name_ko}</option>)}
              </select>
            </div>

            {allStandards.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                등록된 규격 항목이 없습니다.<br />규격 매트릭스에서 항목을 먼저 추가하세요.
              </div>
            ) : (() => {
              const filteredStandards = allStandards.filter((e) => {
                const matchCat = !standardCatFilter || e.category_id === Number(standardCatFilter)
                const matchSearch = !standardSearch || e.name.includes(standardSearch) || e.standard_code.includes(standardSearch) || (e.standard_name ?? '').includes(standardSearch)
                return matchCat && matchSearch
              })
              const grouped: Record<string, StandardItem[]> = {}
              for (const item of filteredStandards) {
                const key = item.standard_no || '(규격 No. 미입력)'
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(item)
              }
              return (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {selectedStandardIds.size > 0 && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedStandardIds.size}건 선택됨 · </span>}
                    전체 {allStandards.length}건 중 {filteredStandards.length}건 표시
                  </div>
                  {Object.entries(grouped).map(([stdName, items]) => (
                    <div key={stdName} style={{ marginBottom: 14 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--primary)',
                        padding: '6px 10px', background: '#F0F2FF', borderRadius: 6, marginBottom: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span>📋 {stdName}</span>
                        <button onClick={() => {
                          const allSelected = items.every((e) => selectedStandardIds.has(e.id))
                          setSelectedStandardIds((prev) => {
                            const next = new Set(prev)
                            if (allSelected) items.forEach((e) => next.delete(e.id))
                            else items.forEach((e) => next.add(e.id))
                            return next
                          })
                        }} style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                          {items.every((e) => selectedStandardIds.has(e.id)) ? '전체 해제' : '전체 선택'}
                        </button>
                      </div>
                      {items.map((item) => (
                        <div key={item.id} onClick={() => toggleStandard(item.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                          borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                          background: selectedStandardIds.has(item.id) ? '#EBF4FF' : 'transparent',
                          border: `1px solid ${selectedStandardIds.has(item.id) ? 'var(--primary)' : 'var(--border)'}`,
                        }}>
                          <input type="checkbox" checked={selectedStandardIds.has(item.id)} onChange={() => toggleStandard(item.id)}
                            onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, fontFamily: 'monospace' }}>{item.standard_code}</span>
                          <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
                          {item.category_name && (
                            <Badge label={item.category_name} color={item.category_color} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── 개정 이력 ── */}
        {tab === '개정 이력' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button size="sm" onClick={() => { setRevForm({ ...emptyRevForm }); setShowRevForm(true) }}>
                + 개정 이력 추가
              </Button>
            </div>

            {showRevForm && (
              <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>개정 이력 추가</p>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px', gap: 12 }}>
                  <F label="버전 *">
                    <input value={revForm.version} onChange={(e) => setRev('version', e.target.value)}
                      style={inp} placeholder="v1.1" />
                  </F>
                  <F label="개정 내용 요약">
                    <input value={revForm.change_summary} onChange={(e) => setRev('change_summary', e.target.value)}
                      style={inp} placeholder="§4.3 시험 조건 변경 (-40→-45°C)" />
                  </F>
                  <F label="개정자">
                    <input value={revForm.changed_by} onChange={(e) => setRev('changed_by', e.target.value)}
                      style={inp} placeholder="홍길동" />
                  </F>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setShowRevForm(false)}>취소</Button>
                  <Button size="sm" onClick={handleSaveRev} loading={savingRev}>저장</Button>
                </div>
              </div>
            )}

            {revisions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                개정 이력이 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['버전', '개정일', '개정자', '개정 내용', ''].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--primary)' }}>{r.version}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                        {new Date(r.changed_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{r.changed_by ?? '-'}</td>
                      <td style={{ padding: '8px 10px' }}>{r.change_summary ?? '-'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => handleDeleteRev(r.id)}
                          style={{ fontSize: 11, color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isEdit && (
          <Button size="sm" onClick={handleDelete} loading={deleting}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            삭제
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
        {tab !== '개정 이력' && (
          <Button size="sm" onClick={handleSave} loading={saving}>
            {isEdit ? '수정 저장' : '등록'}
          </Button>
        )}
      </div>
    </Overlay>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
