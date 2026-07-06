import React, { type CSSProperties, useEffect, useRef, useState } from 'react'
import { ncrApi, NCR_SEVERITIES, NCR_STATUSES, type NCRAttachment, type NCRComment } from '@/api/ncr'
import { standardApi, type StandardItem } from '@/api/standards'
import { scheduleApi } from '@/api/schedules'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import { FileDropZone } from '@/components/ui/FileDropZone'
import { useFormState } from '@/hooks/useFormState'

export interface NCRPrefill {
  part_name?: string
  issue_summary?: string
  test_section?: string
  standard_item_id?: string
  test_schedule_id?: string
}

interface Props {
  ncrId: number | null
  initialValues?: NCRPrefill
  onClose: () => void
  onSaved: () => void
}

type Tab = '기본정보' | '8D 보고서' | '첨부파일' | '댓글'

interface ScheduleOption {
  id: number
  test_type: string
  planned_start: string
  planned_end: string
}

const empty = {
  part_name: '',
  issue_summary: '',
  issue_detail: '',
  severity: 'Medium',
  status: '초기분석',
  test_section: '',
  detected_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  standard_item_id: '',
  test_schedule_id: '',
}

const empty8d = {
  d1_team: '', d2_problem: '', d3_containment: '', d4_root_cause: '',
  d5_permanent_action: '', d6_verify_action: '', d7_prevent_recurrence: '', d8_congratulate: '',
}

const D_FIELDS: { key: keyof typeof empty8d; label: string; placeholder: string }[] = [
  { key: 'd1_team', label: 'D1. 팀 구성', placeholder: '시험평가팀 홍길동, 품질팀 김철수 ...' },
  { key: 'd2_problem', label: 'D2. 문제 정의', placeholder: '무엇이, 언제, 어디서, 얼마나 발생했는지 구체적으로 기술' },
  { key: 'd3_containment', label: 'D3. 긴급 조치 (봉쇄 조치)', placeholder: '즉시 격리/재검사/출하 중지 등 임시 조치' },
  { key: 'd4_root_cause', label: 'D4. 근본 원인 분석', placeholder: '5-Why, 어골도 등으로 도출한 근본 원인' },
  { key: 'd5_permanent_action', label: 'D5. 영구 대책', placeholder: '근본 원인을 제거하는 영구적 시정 조치' },
  { key: 'd6_verify_action', label: 'D6. 대책 실행 및 검증', placeholder: '대책 적용 결과 및 효과 검증 방법/결과' },
  { key: 'd7_prevent_recurrence', label: 'D7. 재발 방지', placeholder: 'SOP/규격 매트릭스/교육 등 시스템 반영 사항' },
  { key: 'd8_congratulate', label: 'D8. 종결', placeholder: '팀 인정 및 종결 코멘트' },
]

export default function NCRForm({ ncrId, initialValues, onClose, onSaved }: Props) {
  const isEdit = ncrId !== null
  const [tab, setTab] = useState<Tab>('기본정보')
  const [form, setForm, set] = useFormState({ ...empty, ...(!isEdit ? initialValues : {}) })
  const [form8d, setForm8d] = useState({ ...empty8d })
  const [standardItems, setStandardItems] = useState<StandardItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleOption[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 첨부파일 탭
  const [attachments, setAttachments] = useState<NCRAttachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 댓글 탭
  const [comments, setComments] = useState<NCRComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  useEffect(() => {
    standardApi.list({ size: 500 }).then((r) => setStandardItems(r.items))
    scheduleApi.list({ size: 500 }).then((r) => setSchedules(r.items as unknown as ScheduleOption[]))
  }, [])

  useEffect(() => {
    if (!isEdit || !ncrId) return
    ncrApi.get(ncrId).then((item) => {
      setForm({
        part_name: item.part_name ?? '',
        issue_summary: item.issue_summary ?? '',
        issue_detail: item.issue_detail ?? '',
        severity: item.severity ?? 'Medium',
        status: item.status ?? '초기분석',
        test_section: item.test_section ?? '',
        detected_date: item.detected_date ?? '',
        due_date: item.due_date ?? '',
        standard_item_id: item.standard_item_id != null ? String(item.standard_item_id) : '',
        test_schedule_id: item.test_schedule_id != null ? String(item.test_schedule_id) : '',
      })
      setForm8d({
        d1_team: item.d1_team ?? '', d2_problem: item.d2_problem ?? '',
        d3_containment: item.d3_containment ?? '', d4_root_cause: item.d4_root_cause ?? '',
        d5_permanent_action: item.d5_permanent_action ?? '', d6_verify_action: item.d6_verify_action ?? '',
        d7_prevent_recurrence: item.d7_prevent_recurrence ?? '', d8_congratulate: item.d8_congratulate ?? '',
      })
      setAttachments(item.attachments ?? [])
      setComments(item.comments ?? [])
    }).finally(() => setLoading(false))
  }, [ncrId])

  const set8d = (key: keyof typeof empty8d, value: string) => setForm8d((p) => ({ ...p, [key]: value }))

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

  const handleDownloadAttachment = (att: NCRAttachment) => {
    if (!ncrId) return
    ncrApi.downloadAttachment(ncrId, att.id, att.file_name)
  }

  const handleDeleteAttachment = async (attId: number) => {
    if (!ncrId) return
    await ncrApi.deleteAttachment(ncrId, attId)
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  const handleAddComment = async () => {
    if (!ncrId || !newComment.trim()) return
    setSavingComment(true)
    try {
      const created = await ncrApi.addComment(ncrId, newComment.trim())
      setComments((prev) => [created, ...prev])
      setNewComment('')
    } catch {
      alert('댓글 등록 중 오류가 발생했습니다')
    } finally {
      setSavingComment(false)
    }
  }

  const handleDelete = async () => {
    if (!ncrId) return
    if (!confirm('이 NCR을 삭제하시겠습니까?\n삭제된 NCR은 복구할 수 없습니다.')) return
    setDeleting(true)
    try {
      await ncrApi.delete(ncrId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!form.part_name.trim()) { alert('부품명을 입력하세요'); return }
    if (!form.issue_summary.trim()) { alert('이슈 요약을 입력하세요'); return }
    if (!form.detected_date) { alert('발생일을 입력하세요'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        part_name: form.part_name.trim(),
        issue_summary: form.issue_summary.trim(),
        issue_detail: form.issue_detail || null,
        severity: form.severity,
        test_section: form.test_section || null,
        detected_date: form.detected_date,
        due_date: form.due_date || null,
        standard_item_id: form.standard_item_id ? Number(form.standard_item_id) : null,
        test_schedule_id: form.test_schedule_id ? Number(form.test_schedule_id) : null,
        ...Object.fromEntries(Object.entries(form8d).map(([k, v]) => [k, v || null])),
      }

      let nid = ncrId
      if (isEdit && nid) {
        payload.status = form.status
        await ncrApi.update(nid, payload)
      } else {
        const created = await ncrApi.create(payload)
        nid = created.id
      }

      if (nid !== null) {
        for (const file of pendingFiles) {
          const uploaded = await ncrApi.uploadAttachment(nid, file)
          setAttachments((prev) => [uploaded, ...prev])
        }
        setPendingFiles([])
      }

      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const TABS: Tab[] = isEdit ? ['기본정보', '8D 보고서', '첨부파일', '댓글'] : ['기본정보', '8D 보고서', '첨부파일']

  const tabLabel = (t: Tab): string => {
    if (t === '첨부파일') return `첨부파일 (${attachments.length + pendingFiles.length})`
    if (t === '댓글') return `댓글 (${comments.length})`
    return t
  }

  if (loading) {
    return (
      <Overlay width={720} onClose={onClose}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay width={720} onClose={onClose}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? 'NCR 수정' : 'NCR 등록'}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              부적합 보고서(Non-Conformance Report) — NCR 번호는 자동 생성됩니다.
            </p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--au-blue)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--au-blue)' : '2px solid transparent',
              marginBottom: -1,
            }}>{tabLabel(t)}</button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>

        {/* ── 기본정보 ── */}
        {tab === '기본정보' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <F label="부품명 *" span={2}>
              <input value={form.part_name} onChange={(e) => set('part_name', e.target.value)}
                style={inp} placeholder="IVI 인포테인먼트 시스템" />
            </F>

            <F label="이슈 요약 *" span={2}>
              <input value={form.issue_summary} onChange={(e) => set('issue_summary', e.target.value)}
                style={inp} placeholder="온도 사이클 시험 중 전원 공급 불안정 현상 발생" />
            </F>

            <F label="심각도 *">
              <select value={form.severity} onChange={(e) => set('severity', e.target.value)} style={inp}>
                {NCR_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>

            {isEdit ? (
              <F label="상태">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inp}>
                  {NCR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
            ) : (
              <F label="시험 섹션">
                <input value={form.test_section} onChange={(e) => set('test_section', e.target.value)}
                  style={inp} placeholder="§6.3.1" />
              </F>
            )}

            <F label="발생일 *">
              <input type="date" value={form.detected_date} onChange={(e) => set('detected_date', e.target.value)} style={inp} />
            </F>

            <F label="마감 기한">
              <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} style={inp} />
            </F>

            <F label="관련 규격 항목">
              <select value={form.standard_item_id} onChange={(e) => set('standard_item_id', e.target.value)} style={inp}>
                <option value="">-- 규격 항목 연결 (선택) --</option>
                {standardItems.map((e) => (
                  <option key={e.id} value={e.id}>{e.standard_code} {e.name}</option>
                ))}
              </select>
            </F>

            <F label="관련 시험 일정">
              <select value={form.test_schedule_id} onChange={(e) => set('test_schedule_id', e.target.value)} style={inp}>
                <option value="">-- 시험 일정 연결 (선택) --</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>#{s.id} {s.test_type} ({s.planned_start} ~ {s.planned_end})</option>
                ))}
              </select>
            </F>

            <F label="상세 내용" span={2}>
              <textarea value={form.issue_detail} onChange={(e) => set('issue_detail', e.target.value)}
                rows={4} style={{ ...inp, resize: 'vertical' }}
                placeholder="발생 경위, 재현 조건, 영향 범위 등 상세 기술" />
            </F>
          </div>
        )}

        {/* ── 8D 보고서 ── */}
        {tab === '8D 보고서' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              8 Disciplines — 문제 해결 8단계 보고서. 상태를 &apos;8D진행&apos;으로 변경 후 단계별로 채워나가세요.
            </p>
            {D_FIELDS.map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{f.label}</label>
                <textarea
                  value={form8d[f.key]} onChange={(e) => set8d(f.key, e.target.value)}
                  rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── 첨부파일 ── */}
        {tab === '첨부파일' && (
          <div>
            <FileDropZone
              isDragOver={isDragOver}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              fileInputRef={fileRef}
              onFileSelect={handleFileSelect}
              hint="불량 사진, 시험 성적서, 8D 근거 자료 등"
              accentColor="var(--au-blue)"
            />

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
                      style={{ fontSize: 13, flex: 1, cursor: 'pointer', color: 'var(--au-blue)', textDecoration: 'underline' }}>{att.file_name}</span>
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

        {/* ── 댓글 ── */}
        {tab === '댓글' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="댓글을 입력하세요" style={{ ...inp, flex: 1 }}
              />
              <Button size="sm" onClick={handleAddComment} loading={savingComment}>등록</Button>
            </div>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                등록된 댓글이 없습니다
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>{c.content}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('ko-KR')}</div>
                </div>
              ))
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
        {tab !== '댓글' && (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              {isEdit ? '수정 저장' : '등록'}
            </Button>
          </>
        )}
      </div>
    </Overlay>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
