import React, { type CSSProperties, useEffect, useState } from 'react'
import {
  equipmentApi, type Equipment, type CalibrationRecord, type InvestmentRecord,
  EQ_CATEGORIES, EQ_STATUSES, CAL_TYPES, CAL_RESULTS, INVEST_TYPES, STATUS_COLORS,
} from '@/api/equipment'
import { standardApi, type StandardItem } from '@/api/standards'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'

interface Props {
  equipmentId: number | null
  onClose: () => void
  onSaved: () => void
}

type Tab = '기본정보' | '교정이력' | 'Capability' | '투자계획'

const emptyForm = {
  name: '', model: '', manufacturer: '', serial_number: '',
  asset_number: '', category: '', manager: '', status: '운용중',
  location: '', purchase_date: '', notes: '',
}

const emptyCalForm = {
  calibration_type: '정기교정', calibration_date: new Date().toISOString().slice(0, 10),
  next_due_date: '', result: '합격', calibration_body: '', certificate_number: '', notes: '',
}

const emptyInvForm = {
  year: new Date().getFullYear(), invest_type: '신규구입',
  item_name: '', amount_est: '', notes: '',
}

export default function EquipmentForm({ equipmentId, onClose, onSaved }: Props) {
  const isEdit = equipmentId !== null
  const [tab, setTab] = useState<Tab>('기본정보')
  const [form, setForm] = useState({ ...emptyForm })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 교정이력 탭
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([])
  const [showCalForm, setShowCalForm] = useState(false)
  const [calForm, setCalForm] = useState({ ...emptyCalForm })
  const [editCalId, setEditCalId] = useState<number | null>(null)
  const [savingCal, setSavingCal] = useState(false)

  // Capability 탭
  const [allStandardItems, setAllStandardItems] = useState<StandardItem[]>([])
  const [selectedStandardIds, setSelectedStandardIds] = useState<Set<number>>(new Set())
  const [savingStandard, setSavingStandard] = useState(false)

  // 투자계획 탭
  const [investments, setInvestments] = useState<InvestmentRecord[]>([])
  const [showInvForm, setShowInvForm] = useState(false)
  const [invForm, setInvForm] = useState({ ...emptyInvForm })
  const [savingInv, setSavingInv] = useState(false)

  useEffect(() => {
    if (!isEdit || !equipmentId) return
    equipmentApi.get(equipmentId).then((eq) => {
      setForm({
        name: eq.name ?? '', model: eq.model ?? '', manufacturer: eq.manufacturer ?? '',
        serial_number: eq.serial_number ?? '', asset_number: eq.asset_number ?? '',
        category: eq.category ?? '', manager: eq.manager ?? '', status: eq.status ?? '운용중',
        location: eq.location ?? '', purchase_date: eq.purchase_date ?? '', notes: eq.notes ?? '',
      })
      setCalibrations(eq.calibrations ?? [])
      setInvestments(eq.investments ?? [])
    }).finally(() => setLoading(false))
  }, [equipmentId])

  useEffect(() => {
    standardApi.list({ size: 500 }).then((r) => setAllStandardItems(r.items))
  }, [])

  useEffect(() => {
    if (!isEdit || !equipmentId) return
    equipmentApi.getStandardItems(equipmentId).then((ids) => setSelectedStandardIds(new Set(ids)))
  }, [equipmentId])

  const set = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }))
  const setCal = (key: string, value: string) => setCalForm((p) => ({ ...p, [key]: value }))
  const setInv = (key: string, value: string | number) => setInvForm((p) => ({ ...p, [key]: value }))

  // ── 기본정보 저장 ──────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { alert('장비명을 입력하세요'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), model: form.model || null,
        manufacturer: form.manufacturer || null, serial_number: form.serial_number || null,
        asset_number: form.asset_number || null, category: form.category || null,
        manager: form.manager || null, status: form.status,
        location: form.location || null, purchase_date: form.purchase_date || null,
        notes: form.notes || null,
      }
      if (isEdit && equipmentId) { await equipmentApi.update(equipmentId, payload) }
      else { await equipmentApi.create(payload) }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!equipmentId) return
    if (!confirm('이 장비를 삭제하시겠습니까?\n교정 이력과 투자 계획도 함께 삭제됩니다.')) return
    setDeleting(true)
    try { await equipmentApi.delete(equipmentId); onSaved() }
    catch { alert('삭제 중 오류가 발생했습니다') }
    finally { setDeleting(false) }
  }

  // ── 교정이력 저장 ──────────────────────────────────────
  const handleSaveCal = async () => {
    if (!equipmentId) return
    if (!calForm.calibration_date) { alert('교정일을 입력하세요'); return }
    setSavingCal(true)
    try {
      const payload = {
        calibration_type: calForm.calibration_type,
        calibration_date: calForm.calibration_date,
        next_due_date: calForm.next_due_date || null,
        result: calForm.result,
        calibration_body: calForm.calibration_body || null,
        certificate_number: calForm.certificate_number || null,
        notes: calForm.notes || null,
      }
      if (editCalId !== null) {
        const updated = await equipmentApi.updateCalibration(equipmentId, editCalId, payload)
        setCalibrations((prev) => prev.map((c) => c.id === editCalId ? updated : c))
      } else {
        const created = await equipmentApi.addCalibration(equipmentId, payload)
        setCalibrations((prev) => [created, ...prev])
      }
      setShowCalForm(false)
      setEditCalId(null)
      setCalForm({ ...emptyCalForm })
    } catch { alert('교정 이력 저장 중 오류가 발생했습니다') }
    finally { setSavingCal(false) }
  }

  const handleDeleteCal = async (calId: number) => {
    if (!equipmentId) return
    if (!confirm('이 교정 이력을 삭제하시겠습니까?')) return
    try {
      await equipmentApi.deleteCalibration(equipmentId, calId)
      setCalibrations((prev) => prev.filter((c) => c.id !== calId))
    } catch { alert('삭제 중 오류가 발생했습니다') }
  }

  const openEditCal = (cal: CalibrationRecord) => {
    setEditCalId(cal.id)
    setCalForm({
      calibration_type: cal.calibration_type,
      calibration_date: cal.calibration_date,
      next_due_date: cal.next_due_date ?? '',
      result: cal.result,
      calibration_body: cal.calibration_body ?? '',
      certificate_number: cal.certificate_number ?? '',
      notes: cal.notes ?? '',
    })
    setShowCalForm(true)
  }

  // ── Capability 저장 ────────────────────────────────────
  const handleSaveStandard = async () => {
    if (!equipmentId) return
    setSavingStandard(true)
    try {
      await equipmentApi.setStandardItems(equipmentId, [...selectedStandardIds])
      alert(`Capability 저장 완료 (${selectedStandardIds.size}개 항목)`)
    } catch { alert('저장 중 오류가 발생했습니다') }
    finally { setSavingStandard(false) }
  }

  const toggleStandard = (id: number) =>
    setSelectedStandardIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // ── 투자계획 저장 ──────────────────────────────────────
  const handleSaveInv = async () => {
    if (!equipmentId) return
    if (!invForm.item_name.trim()) { alert('항목명을 입력하세요'); return }
    setSavingInv(true)
    try {
      const payload = {
        equipment_id: equipmentId,
        year: Number(invForm.year),
        invest_type: invForm.invest_type,
        item_name: invForm.item_name.trim() || null,
        amount_est: invForm.amount_est ? Number(invForm.amount_est) : null,
        notes: invForm.notes || null,
      }
      const created = await equipmentApi.createInvestment(payload)
      setInvestments((prev) => [...prev, created])
      setShowInvForm(false)
      setInvForm({ ...emptyInvForm })
    } catch { alert('저장 중 오류가 발생했습니다') }
    finally { setSavingInv(false) }
  }

  const handleDeleteInv = async (invId: number) => {
    if (!confirm('이 투자 계획을 삭제하시겠습니까?')) return
    try {
      await equipmentApi.deleteInvestment(invId)
      setInvestments((prev) => prev.filter((i) => i.id !== invId))
    } catch { alert('삭제 중 오류가 발생했습니다') }
  }

  // ── 렌더링 ──────────────────────────────────────────────
  const TABS: Tab[] = isEdit ? ['기본정보', '교정이력', 'Capability', '투자계획'] : ['기본정보']

  if (loading) {
    return (
      <Overlay width={860} onClose={onClose}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  // 규격 항목을 standard_no별로 그룹화
  const standardGroups = allStandardItems.reduce<Record<string, StandardItem[]>>((acc, item) => {
    const key = item.standard_no ?? '기타'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <Overlay width={860} onClose={onClose}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {isEdit ? '장비 수정' : '장비 등록'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEdit ? form.name : '새 시험 장비를 등록합니다'}
            </p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>

        {/* tabs */}
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
            <F label="장비명 *" span={2}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                style={inp} placeholder="온도충격시험기" />
            </F>
            <F label="분류">
              <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inp}>
                <option value="">-- 선택 --</option>
                {EQ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
            <F label="상태">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inp}>
                {EQ_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>{s}</option>
                ))}
              </select>
            </F>
            <F label="모델명">
              <input value={form.model} onChange={(e) => set('model', e.target.value)}
                style={inp} placeholder="TS-120R" />
            </F>
            <F label="제조사">
              <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)}
                style={inp} placeholder="ESPEC" />
            </F>
            <F label="시리얼 번호">
              <input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)}
                style={inp} placeholder="SN-2024-001" />
            </F>
            <F label="자산 번호">
              <input value={form.asset_number} onChange={(e) => set('asset_number', e.target.value)}
                style={inp} placeholder="A-2024-001" />
            </F>
            <F label="설치 위치">
              <input value={form.location} onChange={(e) => set('location', e.target.value)}
                style={inp} placeholder="환경시험실 A구역" />
            </F>
            <F label="담당자">
              <input value={form.manager} onChange={(e) => set('manager', e.target.value)}
                style={inp} placeholder="홍길동" />
            </F>
            <F label="구입일">
              <input type="date" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} style={inp} />
            </F>
            <F label="비고" span={2}>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="장비 특이 사항, 주의 사항 등" />
            </F>
          </div>
        )}

        {/* ── 교정이력 ── */}
        {tab === '교정이력' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button size="sm" onClick={() => { setEditCalId(null); setCalForm({ ...emptyCalForm }); setShowCalForm(true) }}>
                + 교정 추가
              </Button>
            </div>

            {showCalForm && (
              <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {editCalId !== null ? '교정 이력 수정' : '교정 이력 추가'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <F label="교정 유형">
                    <select value={calForm.calibration_type} onChange={(e) => setCal('calibration_type', e.target.value)} style={inp}>
                      {CAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </F>
                  <F label="교정일 *">
                    <input type="date" value={calForm.calibration_date} onChange={(e) => setCal('calibration_date', e.target.value)} style={inp} />
                  </F>
                  <F label="다음 교정 만료일">
                    <input type="date" value={calForm.next_due_date} onChange={(e) => setCal('next_due_date', e.target.value)} style={inp} />
                  </F>
                  <F label="결과">
                    <select value={calForm.result} onChange={(e) => setCal('result', e.target.value)} style={inp}>
                      {CAL_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </F>
                  <F label="교정 기관">
                    <input value={calForm.calibration_body} onChange={(e) => setCal('calibration_body', e.target.value)}
                      style={inp} placeholder="KTL" />
                  </F>
                  <F label="성적서 번호">
                    <input value={calForm.certificate_number} onChange={(e) => setCal('certificate_number', e.target.value)}
                      style={inp} placeholder="KTL-2024-00123" />
                  </F>
                </div>
                <div style={{ marginTop: 12 }}>
                  <F label="비고">
                    <input value={calForm.notes} onChange={(e) => setCal('notes', e.target.value)} style={inp} />
                  </F>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => { setShowCalForm(false); setEditCalId(null) }}>취소</Button>
                  <Button size="sm" onClick={handleSaveCal} loading={savingCal}>저장</Button>
                </div>
              </div>
            )}

            {calibrations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                교정 이력이 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['교정일', '유형', '교정 기관', '성적서 번호', '결과', '다음 만료일', ''].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calibrations.map((cal) => (
                    <tr key={cal.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}>{cal.calibration_date}</td>
                      <td style={td}>{cal.calibration_type}</td>
                      <td style={td}>{cal.calibration_body ?? '-'}</td>
                      <td style={td}>{cal.certificate_number ?? '-'}</td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: cal.result === '합격' ? '#E6FFEE' : '#FFF5F5',
                          color: cal.result === '합격' ? '#38A169' : '#E53E3E',
                        }}>{cal.result}</span>
                      </td>
                      <td style={td}>{cal.next_due_date ?? '-'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEditCal(cal)}
                          style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}>수정</button>
                        <button onClick={() => handleDeleteCal(cal.id)}
                          style={{ fontSize: 11, color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Capability (규격 매핑) ── */}
        {tab === 'Capability' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                이 장비로 수행 가능한 규격 항목을 선택하세요 <strong style={{ color: 'var(--text-primary)' }}>({selectedStandardIds.size}개 선택됨)</strong>
              </p>
              <Button size="sm" onClick={handleSaveStandard} loading={savingStandard}>Capability 저장</Button>
            </div>

            {Object.entries(standardGroups).sort().map(([stdNo, items]) => (
              <div key={stdNo} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', background: 'var(--surface-raised, #F9FAFB)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    <input type="checkbox"
                      checked={items.every((i) => selectedStandardIds.has(i.id))}
                      onChange={(e) => {
                        const s = new Set(selectedStandardIds)
                        items.forEach((i) => e.target.checked ? s.add(i.id) : s.delete(i.id))
                        setSelectedStandardIds(s)
                      }} />
                    {stdNo}
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                      ({items.filter((i) => selectedStandardIds.has(i.id)).length}/{items.length})
                    </span>
                  </label>
                </div>
                <div style={{ padding: '8px 14px' }}>
                  {items.map((item) => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '5px 0', fontSize: 13 }}>
                      <input type="checkbox" checked={selectedStandardIds.has(item.id)} onChange={() => toggleStandard(item.id)}
                        style={{ marginTop: 2 }} />
                      <span>
                        <span style={{ fontWeight: 600 }}>{item.standard_code}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{item.name}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {allStandardItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                규격 항목이 없습니다. 먼저 규격 매트릭스에서 항목을 등록하세요.
              </div>
            )}
          </div>
        )}

        {/* ── 투자계획 ── */}
        {tab === '투자계획' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button size="sm" onClick={() => { setInvForm({ ...emptyInvForm }); setShowInvForm(true) }}>
                + 투자 계획 추가
              </Button>
            </div>

            {showInvForm && (
              <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>투자 계획 추가</p>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 120px 1fr 140px', gap: 12 }}>
                  <F label="연도 *">
                    <input type="number" value={invForm.year} onChange={(e) => setInv('year', e.target.value)}
                      style={inp} min={2020} max={2040} />
                  </F>
                  <F label="투자 유형">
                    <select value={invForm.invest_type} onChange={(e) => setInv('invest_type', e.target.value)} style={inp}>
                      {INVEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </F>
                  <F label="항목명 *">
                    <input value={invForm.item_name} onChange={(e) => setInv('item_name', e.target.value)}
                      style={inp} placeholder="온도충격시험기 정기교정" />
                  </F>
                  <F label="금액 (추정, 원)">
                    <input type="number" value={invForm.amount_est} onChange={(e) => setInv('amount_est', e.target.value)}
                      style={inp} placeholder="1500000" />
                  </F>
                </div>
                <div style={{ marginTop: 12 }}>
                  <F label="비고">
                    <input value={invForm.notes} onChange={(e) => setInv('notes', e.target.value)} style={inp} />
                  </F>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setShowInvForm(false)}>취소</Button>
                  <Button size="sm" onClick={handleSaveInv} loading={savingInv}>저장</Button>
                </div>
              </div>
            )}

            {investments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                투자 계획이 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['연도', '투자 유형', '항목명', '금액(추정)', '비고', ''].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}>{inv.year}</td>
                      <td style={td}>{inv.invest_type}</td>
                      <td style={td}>{inv.item_name ?? '-'}</td>
                      <td style={td}>{inv.amount_est != null ? `${inv.amount_est.toLocaleString()}원` : '-'}</td>
                      <td style={td}>{inv.notes ?? '-'}</td>
                      <td style={td}>
                        <button onClick={() => handleDeleteInv(inv.id)}
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
        {tab === '기본정보' && (
          <Button size="sm" onClick={handleSave} loading={saving}>
            {isEdit ? '수정 저장' : '등록'}
          </Button>
        )}
        {tab === 'Capability' && (
          <Button size="sm" onClick={handleSaveStandard} loading={savingStandard}>Capability 저장</Button>
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
