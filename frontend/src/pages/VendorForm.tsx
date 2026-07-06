import React, { type CSSProperties, useEffect, useState } from 'react'
import {
  vendorApi, type VendorLab, type TestScope, type VendorOrder,
  LAB_TYPES, ORDER_STATUSES, ORDER_STATUS_COLORS,
} from '@/api/vendor'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import { useFormState } from '@/hooks/useFormState'

interface Props {
  vendorId: number | null
  onClose: () => void
  onSaved: () => void
  allowedTabs?: Tab[]
}

type Tab = '기본정보' | '단가표' | '발주이력'

const emptyForm = {
  name: '', short_name: '', lab_type: '', kolas_certified: false,
  contact_name: '', contact_phone: '', contact_email: '',
  address: '', website: '', notes: '', is_active: true,
}

const emptyScopeForm = {
  test_name: '', standard_no: '', unit_price: '',
  lead_days: '', accreditation_scope: '', notes: '',
}

const emptyOrderForm = {
  project_name: '', test_items: '',
  order_date: new Date().toISOString().slice(0, 10),
  due_date: '', status: '발주전', total_amount: '', notes: '',
}

export default function VendorForm({ vendorId, onClose, onSaved, allowedTabs }: Props) {
  const isEdit = vendorId !== null
  const TABS: Tab[] = allowedTabs ?? (isEdit ? ['기본정보', '단가표', '발주이력'] : ['기본정보'])
  const showBasicInfo = TABS.includes('기본정보')
  const [tab, setTab] = useState<Tab>(TABS[0])
  const [form, setForm, set] = useFormState({ ...emptyForm })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 단가표 탭
  const [scopes, setScopes] = useState<TestScope[]>([])
  const [showScopeForm, setShowScopeForm] = useState(false)
  const [scopeForm, setScopeForm] = useState({ ...emptyScopeForm })
  const [editScopeId, setEditScopeId] = useState<number | null>(null)
  const [savingScope, setSavingScope] = useState(false)

  // 발주이력 탭
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({ ...emptyOrderForm })
  const [editOrderId, setEditOrderId] = useState<number | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  useEffect(() => {
    if (!isEdit || !vendorId) return
    vendorApi.get(vendorId).then((v) => {
      setForm({
        name: v.name ?? '', short_name: v.short_name ?? '',
        lab_type: v.lab_type ?? '', kolas_certified: v.kolas_certified,
        contact_name: v.contact_name ?? '', contact_phone: v.contact_phone ?? '',
        contact_email: v.contact_email ?? '', address: v.address ?? '',
        website: v.website ?? '', notes: v.notes ?? '', is_active: v.is_active,
      })
      setScopes(v.test_scopes ?? [])
      setOrders(v.orders ?? [])
    }).finally(() => setLoading(false))
  }, [vendorId])

  const setScope = (key: string, value: string) => setScopeForm((p) => ({ ...p, [key]: value }))
  const setOrder = (key: string, value: string) => setOrderForm((p) => ({ ...p, [key]: value }))

  // ── 기본정보 저장 ──────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { alert('시험소명을 입력하세요'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), short_name: form.short_name || null,
        lab_type: form.lab_type || null, kolas_certified: form.kolas_certified,
        contact_name: form.contact_name || null, contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null, address: form.address || null,
        website: form.website || null, notes: form.notes || null, is_active: form.is_active,
      }
      if (isEdit && vendorId) { await vendorApi.update(vendorId, payload) }
      else { await vendorApi.create(payload) }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
      alert(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!vendorId) return
    if (!confirm('이 시험소를 삭제하시겠습니까?\n단가표와 발주 이력도 함께 삭제됩니다.')) return
    setDeleting(true)
    try { await vendorApi.delete(vendorId); onSaved() }
    catch { alert('삭제 중 오류가 발생했습니다') }
    finally { setDeleting(false) }
  }

  // ── 단가표 저장 ────────────────────────────────────────
  const handleSaveScope = async () => {
    if (!vendorId) return
    if (!scopeForm.test_name.trim()) { alert('시험 항목명을 입력하세요'); return }
    setSavingScope(true)
    try {
      const payload = {
        test_name: scopeForm.test_name.trim(),
        standard_no: scopeForm.standard_no || null,
        unit_price: scopeForm.unit_price ? Number(scopeForm.unit_price) : null,
        lead_days: scopeForm.lead_days ? Number(scopeForm.lead_days) : null,
        accreditation_scope: scopeForm.accreditation_scope || null,
        notes: scopeForm.notes || null,
      }
      if (editScopeId !== null) {
        const updated = await vendorApi.updateScope(vendorId, editScopeId, payload)
        setScopes((prev) => prev.map((s) => s.id === editScopeId ? updated : s))
      } else {
        const created = await vendorApi.addScope(vendorId, payload)
        setScopes((prev) => [...prev, created])
      }
      setShowScopeForm(false); setEditScopeId(null); setScopeForm({ ...emptyScopeForm })
    } catch { alert('저장 중 오류가 발생했습니다') }
    finally { setSavingScope(false) }
  }

  const handleDeleteScope = async (scopeId: number) => {
    if (!vendorId || !confirm('이 항목을 삭제하시겠습니까?')) return
    try {
      await vendorApi.deleteScope(vendorId, scopeId)
      setScopes((prev) => prev.filter((s) => s.id !== scopeId))
    } catch { alert('삭제 중 오류가 발생했습니다') }
  }

  const openEditScope = (s: TestScope) => {
    setEditScopeId(s.id)
    setScopeForm({
      test_name: s.test_name, standard_no: s.standard_no ?? '',
      unit_price: s.unit_price != null ? String(s.unit_price) : '',
      lead_days: s.lead_days != null ? String(s.lead_days) : '',
      accreditation_scope: s.accreditation_scope ?? '', notes: s.notes ?? '',
    })
    setShowScopeForm(true)
  }

  // ── 발주이력 저장 ──────────────────────────────────────
  const handleSaveOrder = async () => {
    if (!vendorId) return
    if (!orderForm.project_name.trim()) { alert('프로젝트명을 입력하세요'); return }
    setSavingOrder(true)
    try {
      const payload = {
        project_name: orderForm.project_name.trim(),
        test_items: orderForm.test_items || null,
        order_date: orderForm.order_date || null,
        due_date: orderForm.due_date || null,
        status: orderForm.status,
        total_amount: orderForm.total_amount ? Number(orderForm.total_amount) : null,
        notes: orderForm.notes || null,
      }
      if (editOrderId !== null) {
        const updated = await vendorApi.updateOrder(vendorId, editOrderId, payload)
        setOrders((prev) => prev.map((o) => o.id === editOrderId ? updated : o))
      } else {
        const created = await vendorApi.addOrder(vendorId, payload)
        setOrders((prev) => [created, ...prev])
      }
      setShowOrderForm(false); setEditOrderId(null); setOrderForm({ ...emptyOrderForm })
    } catch { alert('저장 중 오류가 발생했습니다') }
    finally { setSavingOrder(false) }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (!vendorId || !confirm('이 발주 이력을 삭제하시겠습니까?')) return
    try {
      await vendorApi.deleteOrder(vendorId, orderId)
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch { alert('삭제 중 오류가 발생했습니다') }
  }

  const openEditOrder = (o: VendorOrder) => {
    setEditOrderId(o.id)
    setOrderForm({
      project_name: o.project_name, test_items: o.test_items ?? '',
      order_date: o.order_date ?? '', due_date: o.due_date ?? '',
      status: o.status,
      total_amount: o.total_amount != null ? String(o.total_amount) : '',
      notes: o.notes ?? '',
    })
    setShowOrderForm(true)
  }

  if (loading) {
    return (
      <Overlay width={800} onClose={onClose}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay width={800} onClose={onClose}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {isEdit ? '시험소 수정' : '시험소 등록'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEdit ? form.name : '새 외주 시험소를 등록합니다'}
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
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxHeight: 'calc(90vh - 180px)' }}>

        {/* ── 기본정보 ── */}
        {tab === '기본정보' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <F label="시험소명 *" span={2}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                style={inp} placeholder="한국산업기술시험원" />
            </F>
            <F label="약칭">
              <input value={form.short_name} onChange={(e) => set('short_name', e.target.value)}
                style={inp} placeholder="KTL" />
            </F>
            <F label="기관 유형">
              <select value={form.lab_type} onChange={(e) => set('lab_type', e.target.value)} style={inp}>
                <option value="">-- 선택 --</option>
                {LAB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </F>
            <F label="KOLAS 인정" span={2}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.kolas_certified}
                  onChange={(e) => set('kolas_certified', e.target.checked)} />
                KOLAS 공인 시험소 (인정 범위 등록 필수)
              </label>
            </F>
            <F label="담당자명">
              <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)}
                style={inp} placeholder="홍길동 선임" />
            </F>
            <F label="연락처">
              <input value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)}
                style={inp} placeholder="02-1234-5678" />
            </F>
            <F label="이메일" span={2}>
              <input value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)}
                style={inp} placeholder="test@ktl.re.kr" />
            </F>
            <F label="주소" span={2}>
              <input value={form.address} onChange={(e) => set('address', e.target.value)}
                style={inp} placeholder="경남 진주시 동진로 430" />
            </F>
            <F label="웹사이트" span={2}>
              <input value={form.website} onChange={(e) => set('website', e.target.value)}
                style={inp} placeholder="https://www.ktl.re.kr" />
            </F>
            <F label="비고" span={2}>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="계약 조건, 특이 사항 등" />
            </F>
          </div>
        )}

        {/* ── 단가표 ── */}
        {tab === '단가표' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button size="sm" onClick={() => { setEditScopeId(null); setScopeForm({ ...emptyScopeForm }); setShowScopeForm(true) }}>
                + 시험 항목 추가
              </Button>
            </div>

            {showScopeForm && (
              <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {editScopeId !== null ? '시험 항목 수정' : '시험 항목 추가'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <F label="시험 항목명 *">
                    <input value={scopeForm.test_name} onChange={(e) => setScope('test_name', e.target.value)}
                      style={inp} placeholder="온도충격시험" />
                  </F>
                  <F label="적용 규격">
                    <input value={scopeForm.standard_no} onChange={(e) => setScope('standard_no', e.target.value)}
                      style={inp} placeholder="ISO 16750-4" />
                  </F>
                  <F label="KOLAS 인정 범위">
                    <input value={scopeForm.accreditation_scope} onChange={(e) => setScope('accreditation_scope', e.target.value)}
                      style={inp} placeholder="KAB-T-0123" />
                  </F>
                  <F label="단가 (원)">
                    <input type="number" value={scopeForm.unit_price} onChange={(e) => setScope('unit_price', e.target.value)}
                      style={inp} placeholder="1500000" />
                  </F>
                  <F label="납기 (일)">
                    <input type="number" value={scopeForm.lead_days} onChange={(e) => setScope('lead_days', e.target.value)}
                      style={inp} placeholder="21" />
                  </F>
                  <F label="비고">
                    <input value={scopeForm.notes} onChange={(e) => setScope('notes', e.target.value)} style={inp} />
                  </F>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => { setShowScopeForm(false); setEditScopeId(null) }}>취소</Button>
                  <Button size="sm" onClick={handleSaveScope} loading={savingScope}>저장</Button>
                </div>
              </div>
            )}

            {scopes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                등록된 시험 항목이 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['시험 항목명', '적용 규격', 'KOLAS 인정', '단가', '납기', ''].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scopes.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}><strong>{s.test_name}</strong></td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{s.standard_no ?? '-'}</td>
                      <td style={td}>{s.accreditation_scope ?? '-'}</td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {s.unit_price != null ? `${s.unit_price.toLocaleString()}원` : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                      </td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{s.lead_days != null ? `${s.lead_days}일` : '-'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEditScope(s)}
                          style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}>수정</button>
                        <button onClick={() => handleDeleteScope(s.id)}
                          style={{ fontSize: 11, color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── 발주이력 ── */}
        {tab === '발주이력' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button size="sm" onClick={() => { setEditOrderId(null); setOrderForm({ ...emptyOrderForm }); setShowOrderForm(true) }}>
                + 발주 등록
              </Button>
            </div>

            {showOrderForm && (
              <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {editOrderId !== null ? '발주 이력 수정' : '발주 등록'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <F label="프로젝트명 *">
                    <input value={orderForm.project_name} onChange={(e) => setOrder('project_name', e.target.value)}
                      style={inp} placeholder="IVI 온도충격 DV 시험" />
                  </F>
                  <F label="발주일">
                    <input type="date" value={orderForm.order_date} onChange={(e) => setOrder('order_date', e.target.value)} style={inp} />
                  </F>
                  <F label="납기일">
                    <input type="date" value={orderForm.due_date} onChange={(e) => setOrder('due_date', e.target.value)} style={inp} />
                  </F>
                  <F label="상태">
                    <select value={orderForm.status} onChange={(e) => setOrder('status', e.target.value)} style={inp}>
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </F>
                  <F label="총 금액 (원)">
                    <input type="number" value={orderForm.total_amount} onChange={(e) => setOrder('total_amount', e.target.value)}
                      style={inp} placeholder="3000000" />
                  </F>
                </div>
                <div style={{ marginTop: 12 }}>
                  <F label="시험 항목 목록">
                    <textarea value={orderForm.test_items} onChange={(e) => setOrder('test_items', e.target.value)}
                      rows={2} style={{ ...inp, resize: 'vertical' }}
                      placeholder="온도충격시험 × 3회, 진동시험 × 1회" />
                  </F>
                </div>
                <div style={{ marginTop: 8 }}>
                  <F label="비고">
                    <input value={orderForm.notes} onChange={(e) => setOrder('notes', e.target.value)} style={inp} />
                  </F>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => { setShowOrderForm(false); setEditOrderId(null) }}>취소</Button>
                  <Button size="sm" onClick={handleSaveOrder} loading={savingOrder}>저장</Button>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                발주 이력이 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['프로젝트명', '발주일', '납기일', '상태', '금액', ''].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}><strong>{o.project_name}</strong></td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{o.order_date ?? '-'}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{o.due_date ?? '-'}</td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: ORDER_STATUS_COLORS[o.status] + '22',
                          color: ORDER_STATUS_COLORS[o.status],
                        }}>{o.status}</span>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {o.total_amount != null ? `${o.total_amount.toLocaleString()}원` : '-'}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEditOrder(o)}
                          style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}>수정</button>
                        <button onClick={() => handleDeleteOrder(o.id)}
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
        {isEdit && showBasicInfo && (
          <Button size="sm" onClick={handleDelete} loading={deleting}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            삭제
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
        {tab === '기본정보' && (
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

const td: CSSProperties = { padding: '8px 10px', color: 'var(--text-primary)' }
