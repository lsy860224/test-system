import React, { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  singleTestApi, SINGLE_TEST_RESULTS, SINGLE_TEST_DELIVERY_METHODS,
  type SingleTestAttachment, type SingleTestComment, type SingleTestDetail,
} from '@/api/singleTest'
import { standardApi, type StandardItem } from '@/api/standards'
import { equipmentApi, type Equipment } from '@/api/equipment'
import { usersApi, type AppUser } from '@/api/users'
import { vendorApi, type VendorLab, type VendorOrder } from '@/api/vendor'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import { FileDropZone } from '@/components/ui/FileDropZone'
import { useFormState } from '@/hooks/useFormState'

interface Props {
  requestId: number | null
  onClose: () => void
  onSaved: () => void
}

type Tab = '기본정보' | '진행/외주' | '첨부파일' | '전달이력' | '댓글'

const empty = {
  requesting_dept: '',
  requester_name: '',
  requester_contact: '',
  test_name: '',
  standard_item_id: '',
  sample_info: '',
  purpose: '',
  desired_due_date: '',
  notes: '',
}

const today = () => new Date().toISOString().slice(0, 10)

export default function SingleTestRequestForm({ requestId, onClose, onSaved }: Props) {
  const isEdit = requestId !== null
  const role = useAuthStore((s) => s.user?.role)
  const isRequester = role === '의뢰자'

  const [tab, setTab] = useState<Tab>('기본정보')
  const [form, setForm, set] = useFormState({ ...empty })
  const [detail, setDetail] = useState<SingleTestDetail | null>(null)
  const [standardItems, setStandardItems] = useState<StandardItem[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [acting, setActing] = useState(false)

  // 첨부파일 탭
  const [attachments, setAttachments] = useState<SingleTestAttachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<{ file: File; type: string }[]>([])
  const [pendingType, setPendingType] = useState('의뢰자료')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 댓글 탭
  const [comments, setComments] = useState<SingleTestComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  // 진행/외주 탭 — 전이 폼 상태
  const [approveForm, setApproveForm] = useState({ execution_type: '자체', equipment_id: '', assignee_id: '', planned_start: '', planned_end: '' })
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [completeForm, setCompleteForm] = useState({ result: '', actual_end: today() })
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // 외주 발주
  const [vendors, setVendors] = useState<VendorLab[]>([])
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([])
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({ vendor_id: '', test_items: '', order_date: today(), due_date: '', total_amount: '', notes: '' })

  // 전달 이력 탭
  const [deliveryForm, setDeliveryForm] = useState({ delivered_at: today(), delivered_to: '', method: '이메일', notes: '' })
  const [savingDelivery, setSavingDelivery] = useState(false)

  useEffect(() => {
    standardApi.list({ size: 500 }).then((r) => setStandardItems(r.items))
    if (!isRequester) {
      usersApi.list().then(setUsers).catch(() => {})
      equipmentApi.list({ size: 500 }).then((r) => setEquipmentList(r.items)).catch(() => {})
    }
  }, [])

  const loadDetail = () => {
    if (!requestId) return
    singleTestApi.get(requestId).then((item) => {
      setDetail(item)
      setForm({
        requesting_dept: item.requesting_dept ?? '',
        requester_name: item.requester_name ?? '',
        requester_contact: item.requester_contact ?? '',
        test_name: item.test_name ?? '',
        standard_item_id: item.standard_item_id != null ? String(item.standard_item_id) : '',
        sample_info: item.sample_info ?? '',
        purpose: item.purpose ?? '',
        desired_due_date: item.desired_due_date ?? '',
        notes: item.notes ?? '',
      })
      setAttachments(item.attachments ?? [])
      setComments(item.comments ?? [])
      setDeliveryForm((p) => ({ ...p, delivered_to: item.requester_name ?? '' }))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { if (isEdit) loadDetail() }, [requestId])

  useEffect(() => {
    if (!requestId || detail?.execution_type !== '외주') return
    vendorApi.listOrdersByRequest(requestId).then(setVendorOrders).catch(() => {})
    if (vendors.length === 0) vendorApi.list({ size: 500 }).then((r) => setVendors(r.items)).catch(() => {})
  }, [detail?.execution_type])

  const status = detail?.status ?? '접수'
  const isTerminal = ['전달완료', '반려', '취소'].includes(status)
  const locked = isRequester && isEdit && status !== '접수'
  const hasReportAttachment = attachments.some((a) => a.attachment_type === '성적서')

  const refreshAfterAction = async (action: Promise<SingleTestDetail>) => {
    setActing(true)
    try {
      const updated = await action
      setDetail(updated)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '처리 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setActing(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setPendingFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files).map((file) => ({ file, type: pendingType }))])
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingFiles((prev) => [...prev, ...Array.from(e.target.files ?? []).map((file) => ({ file, type: pendingType }))])
    e.target.value = ''
  }
  const removePending = (idx: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleDownloadAttachment = (att: SingleTestAttachment) => {
    if (!requestId) return
    singleTestApi.downloadAttachment(requestId, att.id, att.file_name)
  }
  const handleDeleteAttachment = async (attId: number) => {
    if (!requestId) return
    await singleTestApi.deleteAttachment(requestId, attId)
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  const handleAddComment = async () => {
    if (!requestId || !newComment.trim()) return
    setSavingComment(true)
    try {
      const created = await singleTestApi.addComment(requestId, newComment.trim())
      setComments((prev) => [created, ...prev])
      setNewComment('')
    } catch {
      alert('댓글 등록 중 오류가 발생했습니다')
    } finally {
      setSavingComment(false)
    }
  }

  const handleAddDelivery = async () => {
    if (!requestId || !deliveryForm.delivered_to.trim()) { alert('수신자를 입력하세요'); return }
    setSavingDelivery(true)
    try {
      await singleTestApi.addDelivery(requestId, deliveryForm)
      await loadDetail()
    } catch {
      alert('전달 이력 등록 중 오류가 발생했습니다')
    } finally {
      setSavingDelivery(false)
    }
  }

  const handleAddOrder = async () => {
    if (!requestId || !orderForm.vendor_id) { alert('시험소를 선택하세요'); return }
    try {
      await vendorApi.addOrder(Number(orderForm.vendor_id), {
        single_test_request_id: requestId,
        test_items: orderForm.test_items || undefined,
        order_date: orderForm.order_date || undefined,
        due_date: orderForm.due_date || undefined,
        total_amount: orderForm.total_amount ? Number(orderForm.total_amount) : undefined,
        notes: orderForm.notes || undefined,
      })
      const orders = await vendorApi.listOrdersByRequest(requestId)
      setVendorOrders(orders)
      setShowOrderForm(false)
      setOrderForm({ vendor_id: '', test_items: '', order_date: today(), due_date: '', total_amount: '', notes: '' })
    } catch {
      alert('외주 발주 등록 중 오류가 발생했습니다')
    }
  }

  const handleDelete = async () => {
    if (!requestId) return
    if (!confirm('이 단건 시험 요청을 삭제하시겠습니까?\n삭제된 요청은 복구할 수 없습니다.')) return
    setDeleting(true)
    try {
      await singleTestApi.delete(requestId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!form.requesting_dept.trim()) { alert('의뢰 부서를 입력하세요'); return }
    if (!form.requester_name.trim()) { alert('의뢰자 이름을 입력하세요'); return }
    if (!form.test_name.trim()) { alert('시험명을 입력하세요'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        requesting_dept: form.requesting_dept.trim(),
        requester_name: form.requester_name.trim(),
        requester_contact: form.requester_contact || null,
        test_name: form.test_name.trim(),
        standard_item_id: form.standard_item_id ? Number(form.standard_item_id) : null,
        sample_info: form.sample_info || null,
        purpose: form.purpose || null,
        desired_due_date: form.desired_due_date || null,
        notes: form.notes || null,
      }

      let rid = requestId
      if (isEdit && rid) {
        await singleTestApi.update(rid, payload)
      } else {
        const created = await singleTestApi.create(payload)
        rid = created.id
      }

      if (rid !== null) {
        for (const { file, type } of pendingFiles) {
          const uploaded = await singleTestApi.uploadAttachment(rid, file, type)
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

  const TABS: Tab[] = isRequester
    ? ['기본정보']
    : (isEdit ? ['기본정보', '진행/외주', '첨부파일', '전달이력', '댓글'] : ['기본정보'])

  const tabLabel = (t: Tab): string => {
    if (t === '첨부파일') return `첨부파일 (${attachments.length + pendingFiles.length})`
    if (t === '전달이력') return `전달이력 (${detail?.deliveries.length ?? 0})`
    if (t === '댓글') return `댓글 (${comments.length})`
    return t
  }

  if (loading) {
    return (
      <Overlay width={760} onClose={onClose}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay width={760} onClose={onClose}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {isEdit ? `단건 시험 의뢰 — ${detail?.request_number ?? ''}` : '단건 시험 의뢰 등록'}
              {isEdit && detail && <span style={{ marginLeft: 8 }}><Badge label={detail.status} /></span>}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              프로젝트·규격과 무관한 타부서 의뢰 단건 시험. 요청번호는 자동 생성됩니다.
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
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>{tabLabel(t)}</button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>

        {/* ── 기본정보 ── */}
        {tab === '기본정보' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {locked && (
              <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
                시험평가팀이 검토를 시작해 더 이상 수정할 수 없습니다. 문의는 댓글을 이용하세요.
              </div>
            )}
            {isEdit && detail?.status === '반려' && detail.rejection_reason && (
              <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, fontSize: 12, color: '#C53030' }}>
                반려 사유: {detail.rejection_reason}
              </div>
            )}

            <F label="의뢰 부서 *">
              <input value={form.requesting_dept} onChange={(e) => set('requesting_dept', e.target.value)} style={inp} disabled={locked} placeholder="생산팀" />
            </F>
            <F label="의뢰자 이름 *">
              <input value={form.requester_name} onChange={(e) => set('requester_name', e.target.value)} style={inp} disabled={locked} placeholder="홍길동" />
            </F>
            <F label="연락처">
              <input value={form.requester_contact} onChange={(e) => set('requester_contact', e.target.value)} style={inp} disabled={locked} placeholder="내선 / 이메일" />
            </F>
            <F label="희망 완료일">
              <input type="date" value={form.desired_due_date} onChange={(e) => set('desired_due_date', e.target.value)} style={inp} disabled={locked} />
            </F>

            <F label="시험명 *" span={2}>
              <input value={form.test_name} onChange={(e) => set('test_name', e.target.value)} style={inp} disabled={locked} placeholder="배터리 커넥터 내열성 확인 (규격 무관 가능)" />
            </F>

            <F label="시료 정보">
              <input value={form.sample_info} onChange={(e) => set('sample_info', e.target.value)} style={inp} disabled={locked} placeholder="시료명 / 수량" />
            </F>
            <F label="관련 규격 항목 (선택)">
              <select value={form.standard_item_id} onChange={(e) => set('standard_item_id', e.target.value)} style={inp} disabled={locked}>
                <option value="">-- 규격 무관 --</option>
                {standardItems.map((s) => <option key={s.id} value={s.id}>{s.standard_code} {s.name}</option>)}
              </select>
            </F>

            <F label="시험 목적/배경" span={2}>
              <textarea value={form.purpose} onChange={(e) => set('purpose', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} disabled={locked} placeholder="의뢰 배경, 확인하고자 하는 항목" />
            </F>
            <F label="비고" span={2}>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} disabled={locked} />
            </F>
          </div>
        )}

        {/* ── 진행/외주 ── */}
        {tab === '진행/외주' && detail && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>진행방식</span><div>{detail.execution_type ?? '-'}</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>담당자</span><div>{users.find((u) => u.id === detail.assignee_id)?.name ?? '-'}</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>결과</span><div>{detail.result ?? '-'}</div></div>
            </div>

            {status === '접수' && (
              <ActionBox>
                <Button size="sm" loading={acting} onClick={() => refreshAfterAction(singleTestApi.submit(detail.id))}>검토 시작</Button>
              </ActionBox>
            )}

            {status === '검토중' && (
              <ActionBox title="검토 / 승인">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <F label="진행방식 *">
                    <select value={approveForm.execution_type} onChange={(e) => {
                      const execution_type = e.target.value
                      setApproveForm((p) => ({ ...p, execution_type, equipment_id: execution_type === '자체' ? p.equipment_id : '' }))
                    }} style={inp}>
                      <option value="자체">자체</option>
                      <option value="외주">외주</option>
                    </select>
                  </F>
                  {approveForm.execution_type === '자체' && (
                    <F label="사용 장비">
                      <select value={approveForm.equipment_id} onChange={(e) => setApproveForm((p) => ({ ...p, equipment_id: e.target.value }))} style={inp}>
                        <option value="">-- 선택 --</option>
                        {equipmentList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </F>
                  )}
                  <F label="담당자">
                    <select value={approveForm.assignee_id} onChange={(e) => setApproveForm((p) => ({ ...p, assignee_id: e.target.value }))} style={inp}>
                      <option value="">-- 선택 --</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </F>
                  <F label="계획 시작일">
                    <input type="date" value={approveForm.planned_start} onChange={(e) => setApproveForm((p) => ({ ...p, planned_start: e.target.value }))} style={inp} />
                  </F>
                  <F label="계획 종료일">
                    <input type="date" value={approveForm.planned_end} onChange={(e) => setApproveForm((p) => ({ ...p, planned_end: e.target.value }))} style={inp} />
                  </F>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" loading={acting} onClick={() => refreshAfterAction(singleTestApi.approve(detail.id, {
                    execution_type: approveForm.execution_type,
                    equipment_id: approveForm.equipment_id ? Number(approveForm.equipment_id) : null,
                    assignee_id: approveForm.assignee_id ? Number(approveForm.assignee_id) : null,
                    planned_start: approveForm.planned_start || null,
                    planned_end: approveForm.planned_end || null,
                  }))}>승인</Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowReject((v) => !v)}>반려</Button>
                </div>
                {showReject && (
                  <div style={{ marginTop: 10 }}>
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="반려 사유 *" />
                    <Button size="sm" variant="danger" style={{ marginTop: 8 }} loading={acting}
                      onClick={() => { if (!rejectReason.trim()) { alert('반려 사유를 입력하세요'); return } refreshAfterAction(singleTestApi.reject(detail.id, rejectReason.trim())) }}>
                      반려 확정
                    </Button>
                  </div>
                )}
              </ActionBox>
            )}

            {status === '승인' && (
              <ActionBox title="진행 시작">
                <F label="실제 시작일">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inp} />
                </F>
                <Button size="sm" style={{ marginTop: 10 }} loading={acting} onClick={() => refreshAfterAction(singleTestApi.start(detail.id, startDate))}>진행 시작</Button>
              </ActionBox>
            )}

            {status === '진행중' && (
              <ActionBox title="시험 완료 처리">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="결과 *">
                    <select value={completeForm.result} onChange={(e) => setCompleteForm((p) => ({ ...p, result: e.target.value }))} style={inp}>
                      <option value="">-- 선택 --</option>
                      {SINGLE_TEST_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </F>
                  <F label="실제 종료일">
                    <input type="date" value={completeForm.actual_end} onChange={(e) => setCompleteForm((p) => ({ ...p, actual_end: e.target.value }))} style={inp} />
                  </F>
                </div>
                <Button size="sm" style={{ marginTop: 10 }} loading={acting}
                  onClick={() => { if (!completeForm.result) { alert('결과를 선택하세요'); return } refreshAfterAction(singleTestApi.completeTest(detail.id, completeForm.result, completeForm.actual_end)) }}>
                  시험 완료
                </Button>
              </ActionBox>
            )}

            {status === '시험완료' && (
              <ActionBox>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>성적서는 첨부파일 탭에서 &apos;성적서&apos; 유형으로 첨부하세요.</p>
                <Button size="sm" loading={acting} onClick={() => refreshAfterAction(singleTestApi.submitReport(detail.id))}>보고서 작성 시작</Button>
              </ActionBox>
            )}

            {status === '보고서작성' && (
              <ActionBox>
                <p style={{ fontSize: 12, color: hasReportAttachment ? 'var(--text-muted)' : '#C53030', marginBottom: 10 }}>
                  {hasReportAttachment ? '성적서 첨부를 확인한 뒤 검토를 요청하세요.' : '첨부파일 탭에서 \'성적서\' 유형을 먼저 첨부해야 검토를 요청할 수 있습니다.'}
                </p>
                <Button size="sm" loading={acting} disabled={!hasReportAttachment} onClick={() => refreshAfterAction(singleTestApi.reviewReport(detail.id))}>검토 요청</Button>
              </ActionBox>
            )}

            {status === '검토' && (
              <ActionBox>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>전달이력 탭에서 전달 내역을 먼저 등록한 뒤 전달완료 처리하세요.</p>
                <Button size="sm" loading={acting} onClick={() => refreshAfterAction(singleTestApi.deliver(detail.id))}>전달완료 처리</Button>
              </ActionBox>
            )}

            {isTerminal && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>
                이 요청은 &apos;{status}&apos; 상태로 종결되었습니다.
              </div>
            )}

            {!isTerminal && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setShowCancel((v) => !v)} style={{ background: 'none', border: 'none', color: '#E53E3E', fontSize: 12, cursor: 'pointer', padding: 0 }}>이 요청 취소</button>
                {showCancel && (
                  <div style={{ marginTop: 8 }}>
                    <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="취소 사유 (선택)" />
                    <Button size="sm" variant="danger" style={{ marginTop: 8 }} loading={acting}
                      onClick={() => refreshAfterAction(singleTestApi.cancel(detail.id, cancelReason || undefined))}>
                      취소 확정
                    </Button>
                  </div>
                )}
              </div>
            )}

            {detail.execution_type === '외주' && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700 }}>외주 발주</h4>
                  <Button size="sm" variant="secondary" style={{ marginLeft: 'auto' }} onClick={() => setShowOrderForm((v) => !v)}>+ 발주 등록</Button>
                </div>
                {showOrderForm && (
                  <div style={{ marginBottom: 16, padding: 12, background: '#FAFBFD', borderRadius: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <F label="시험소 *">
                        <select value={orderForm.vendor_id} onChange={(e) => setOrderForm((p) => ({ ...p, vendor_id: e.target.value }))} style={inp}>
                          <option value="">-- 선택 --</option>
                          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </F>
                      <F label="시험 항목">
                        <input value={orderForm.test_items} onChange={(e) => setOrderForm((p) => ({ ...p, test_items: e.target.value }))} style={inp} />
                      </F>
                      <F label="발주일">
                        <input type="date" value={orderForm.order_date} onChange={(e) => setOrderForm((p) => ({ ...p, order_date: e.target.value }))} style={inp} />
                      </F>
                      <F label="납기일">
                        <input type="date" value={orderForm.due_date} onChange={(e) => setOrderForm((p) => ({ ...p, due_date: e.target.value }))} style={inp} />
                      </F>
                      <F label="금액(원)">
                        <input type="number" value={orderForm.total_amount} onChange={(e) => setOrderForm((p) => ({ ...p, total_amount: e.target.value }))} style={inp} />
                      </F>
                    </div>
                    <Button size="sm" onClick={handleAddOrder}>등록</Button>
                  </div>
                )}
                {vendorOrders.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>등록된 외주 발주가 없습니다</div>
                ) : (
                  vendorOrders.map((o) => (
                    <div key={o.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ flex: 1 }}>{o.test_items ?? '-'}</span>
                      <Badge label={o.status} />
                      <span style={{ color: 'var(--text-muted)' }}>{o.due_date ?? '-'}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 첨부파일 ── */}
        {tab === '첨부파일' && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>첨부 유형</span>
              <select value={pendingType} onChange={(e) => setPendingType(e.target.value)} style={{ ...inp, width: 140 }}>
                <option value="의뢰자료">의뢰자료</option>
                <option value="성적서">성적서</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <FileDropZone
              isDragOver={isDragOver}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              fileInputRef={fileRef}
              onFileSelect={handleFileSelect}
              hint="의뢰 자료, 시험 성적서 등"
              accentColor="var(--au-blue)"
            />

            {pendingFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>첨부 예정 (저장 시 업로드)</div>
                {pendingFiles.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <Badge label={p.type} />
                    <span style={{ fontSize: 13, flex: 1 }}>{p.file.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(p.file.size / 1024).toFixed(0)} KB</span>
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
                    <Badge label={att.attachment_type} />
                    <span onClick={() => handleDownloadAttachment(att)}
                      style={{ fontSize: 13, flex: 1, cursor: 'pointer', color: 'var(--au-blue)', textDecoration: 'underline' }}>{att.file_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : ''}</span>
                    {!isRequester && (
                      <button onClick={() => handleDeleteAttachment(att.id)}
                        style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: 13 }}>삭제</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {attachments.length === 0 && pendingFiles.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>첨부된 파일이 없습니다</div>
            )}
          </div>
        )}

        {/* ── 전달이력 ── */}
        {tab === '전달이력' && detail && (
          <div>
            {status === '검토' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, padding: 12, background: '#FAFBFD', borderRadius: 8 }}>
                <F label="전달일 *">
                  <input type="date" value={deliveryForm.delivered_at} onChange={(e) => setDeliveryForm((p) => ({ ...p, delivered_at: e.target.value }))} style={inp} />
                </F>
                <F label="수신자 *">
                  <input value={deliveryForm.delivered_to} onChange={(e) => setDeliveryForm((p) => ({ ...p, delivered_to: e.target.value }))} style={inp} />
                </F>
                <F label="전달 방법 *">
                  <select value={deliveryForm.method} onChange={(e) => setDeliveryForm((p) => ({ ...p, method: e.target.value }))} style={inp}>
                    {SINGLE_TEST_DELIVERY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </F>
                <F label="비고">
                  <input value={deliveryForm.notes} onChange={(e) => setDeliveryForm((p) => ({ ...p, notes: e.target.value }))} style={inp} />
                </F>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Button size="sm" loading={savingDelivery} onClick={handleAddDelivery}>전달 이력 등록</Button>
                </div>
              </div>
            )}
            {status !== '검토' && !isTerminal && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                &apos;검토&apos; 상태에서만 전달 이력을 등록할 수 있습니다 (현재: {status}).
              </div>
            )}
            {detail.deliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>등록된 전달 이력이 없습니다</div>
            ) : (
              detail.deliveries.map((d) => (
                <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div>{d.delivered_at} · {d.delivered_to} · <Badge label={d.method} /></div>
                  {d.notes && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{d.notes}</div>}
                </div>
              ))
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
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>등록된 댓글이 없습니다</div>
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
        {isEdit && !isRequester && (
          <Button size="sm" onClick={handleDelete} loading={deleting}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            삭제
          </Button>
        )}
        <div style={{ flex: 1 }} />
        {tab === '기본정보' && (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
            {!locked && (
              <Button size="sm" onClick={handleSave} loading={saving}>{isEdit ? '수정 저장' : '등록'}</Button>
            )}
          </>
        )}
        {tab === '첨부파일' && pendingFiles.length > 0 && (
          <Button size="sm" onClick={handleSave} loading={saving}>파일 업로드</Button>
        )}
      </div>
    </Overlay>
  )
}

function ActionBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, background: '#FAFBFD', borderRadius: 8, marginBottom: 16 }}>
      {title && <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{title}</h4>}
      {children}
    </div>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
