import React, { type CSSProperties, useEffect, useState } from 'react'
import { projectsApi, projectStatusLabel, type CoCandidate } from '@/api/projects'
import { vehicleModelsApi, type VehicleModel } from '@/api/vehicleModels'
import { customersApi, type CustomerListItem } from '@/api/customers'
import { standardApi, type StandardItem, type StandardCategory } from '@/api/standards'
import { itemsApi, type Item } from '@/api/items'
import { useFormState } from '@/hooks/useFormState'
import { usersApi, type AppUser } from '@/api/users'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog'
import { useUnsavedFormGuard } from '@/hooks/useUnsavedFormGuard'
import { getErrorMessage } from '@/utils/errorMessage'
import { validateRequired } from '@/utils/validateRequired'

interface Props {
  projectId: number | null
  onClose: () => void
  onSaved: () => void
  standalone?: boolean
}

type Tab = 'info' | 'standards'

const empty = {
  customer_id: '', item_id: '', name: '', project_code: '', vehicle_model: '',
  phase: '개발', status: '활성',
  start_date: '', target_date: '', assignee_id: '', notes: '',
}

const PHASES = ['RFQ', '개발', 'DV', 'PV', '양산준비', '양산']
const STATUSES = ['활성', '완료', '보류', '지연', '취소']

export default function ProjectForm({ projectId, onClose, onSaved, standalone }: Props) {
  const isEdit = projectId !== null
  const [tab, setTab] = useState<Tab>('info')
  const [form, setForm, set] = useFormState({ ...empty })
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedProjectId, setSavedProjectId] = useState<number | null>(projectId)

  // 규격 항목 탭 — 항목 선택은 id Set, 비고는 규격(standard_no) 단위로 별도 관리
  const [allStandards, setAllStandards] = useState<StandardItem[]>([])
  const [allCategories, setAllCategories] = useState<StandardCategory[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [standardNotes, setStandardNotes] = useState<Map<string, string>>(new Map())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [standardSearch, setStandardSearch] = useState('')
  const [standardCatFilter, setStandardCatFilter] = useState<number | ''>('')
  const [standardLoading, setStandardLoading] = useState(false)

  // C/O(Carry Over) — 항목 id가 키에 있으면 C/O 적용, 값은 근거가 되는 실제 시험 일정(co_source_schedule_id)
  const [carryOver, setCarryOver] = useState<Map<number, number | null>>(new Map())
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]) // 차종 마스터 — "차종" 드롭다운 소스
  const [coCandidates, setCoCandidates] = useState<CoCandidate[]>([])    // 같은 아이템을 쓰는 타 프로젝트의 실제 시험 일정 — C/O 대상 후보
  const [groupCoChoice, setGroupCoChoice] = useState<Map<string, string>>(new Map())

  const { confirmOpen, requestClose, confirmDiscard, confirmCancel, markClean } = useUnsavedFormGuard(
    { form, selectedIds: [...selectedIds].sort(), standardNotes: [...standardNotes.entries()], carryOver: [...carryOver.entries()].sort() },
    !loading,
  )
  const handleClose = () => requestClose(onClose)

  useEffect(() => {
    customersApi.list({ size: 200 }).then((r) => setCustomers(r.items))
    itemsApi.list({ size: 1000 }).then((r) => setItems(r.items))
    usersApi.list().then(setUsers)
    standardApi.categories().then(setAllCategories)
    standardApi.list({ size: 500 }).then((r) => setAllStandards(r.items))
    vehicleModelsApi.list({ size: 1000 }).then((r) => setVehicleModels(r.items))
  }, [])

  useEffect(() => {
    if (!isEdit || !projectId) return
    Promise.all([
      projectsApi.get(projectId),
      projectsApi.getStandardItems(projectId),
      projectsApi.getStandardNotes(projectId),
    ]).then(([p, standardItems, notes]) => {
      const proj = p as Record<string, unknown>
      setForm({
        customer_id: proj.customer_id != null ? String(proj.customer_id) : '',
        item_id: proj.item_id != null ? String(proj.item_id) : '',
        name: String(proj.name ?? ''),
        project_code: String(proj.project_code ?? ''),
        vehicle_model: String(proj.vehicle_model ?? ''),
        phase: String(proj.phase ?? '개발'),
        status: String(proj.status ?? '활성'),
        start_date: String(proj.start_date ?? ''),
        target_date: String(proj.target_date ?? ''),
        assignee_id: proj.assignee_id != null ? String(proj.assignee_id) : '',
        notes: String(proj.notes ?? ''),
      })
      const items = standardItems
      setSelectedIds(new Set(items.map((e) => e.id)))
      setExpandedGroups(new Set(items.map((e) => e.standard_no || '(규격 No. 미입력)')))
      setStandardNotes(new Map(notes.map((n) => [n.standard_no, n.notes ?? ''])))
      setCarryOver(new Map(items.filter((e) => e.is_carry_over).map((e) => [e.id, e.co_source_schedule_id ?? null])))
    }).finally(() => setLoading(false))
  }, [projectId])

  // C/O 후보 — 같은 아이템(item_id)을 쓰는 다른 프로젝트들의 실제 시험 일정. 아이템이 바뀔 때마다 다시 조회
  useEffect(() => {
    if (!form.item_id) { setCoCandidates([]); return }
    projectsApi.coCandidates(Number(form.item_id), savedProjectId ?? undefined).then(setCoCandidates)
  }, [form.item_id, savedProjectId])

  // 특정 규격 항목에 대해 참조 가능한 일정 후보 — 자기 자신과 같은 차종은 "C/O"의 의미가 없으므로 제외
  const candidatesForItem = (standardItemId: number) =>
    coCandidates.filter((c) => c.standard_item_id === standardItemId && c.vehicle_model !== form.vehicle_model)

  // 완료된 일정을 우선하고, 그중 최신 회차를 기본값으로 추천
  const pickBestCandidate = (candidates: CoCandidate[]): CoCandidate | undefined => {
    if (candidates.length === 0) return undefined
    const completed = candidates.filter((c) => c.actual_end)
    const pool = completed.length > 0 ? completed : candidates
    return [...pool].sort((a, b) => b.round_no - a.round_no)[0]
  }

  const toggleCarryOver = (id: number) => setCarryOver((prev) => {
    const next = new Map(prev)
    if (next.has(id)) { next.delete(id); return next }
    const best = pickBestCandidate(candidatesForItem(id))
    next.set(id, best ? best.schedule_id : null)
    return next
  })

  // 항목별 C/O 선택은 차종만 보여준다 — 구체적인 회차/일정은 pickBestCandidate로 자동 결정(완료 우선, 최신 회차)
  const vehicleModelForSchedule = (scheduleId: number | null | undefined) =>
    scheduleId ? coCandidates.find((c) => c.schedule_id === scheduleId)?.vehicle_model ?? '' : ''

  const setCarryOverVehicle = (id: number, model: string) => {
    const best = pickBestCandidate(candidatesForItem(id).filter((c) => c.vehicle_model === model))
    setCarryOver((prev) => {
      const next = new Map(prev)
      next.set(id, best ? best.schedule_id : null)
      return next
    })
  }

  // 그룹 내 항목들이 참조할 수 있는 차종 목록(자기 차종 제외)
  const groupVehicleOptions = (items: StandardItem[]) => {
    const ids = new Set(items.map((it) => it.id))
    const models = coCandidates.filter((c) => ids.has(c.standard_item_id) && c.vehicle_model !== form.vehicle_model).map((c) => c.vehicle_model)
    return [...new Set(models)]
  }

  const applyGroupCarryOver = (stdName: string, items: StandardItem[]) => {
    const model = groupCoChoice.get(stdName)
    if (!model) { alert('적용할 차종을 선택하세요.'); return }
    const matches = items.map((it) => ({ it, best: pickBestCandidate(candidatesForItem(it.id).filter((c) => c.vehicle_model === model)) }))
    const applicable = matches.filter((m) => m.best)
    if (applicable.length === 0) { alert(`${model} 차종에 이 규격의 참조 가능한 시험 일정이 없습니다.`); return }
    setCarryOver((prev) => {
      const next = new Map(prev)
      applicable.forEach(({ it, best }) => next.set(it.id, best!.schedule_id))
      return next
    })
    setSelectedIds((prev) => {
      const next = new Set(prev)
      applicable.forEach(({ it }) => next.add(it.id))
      return next
    })
    if (applicable.length < items.length) {
      alert(`${applicable.length}/${items.length}건에 C/O를 적용했습니다. 나머지는 ${model} 차종에 해당 항목의 시험 일정이 없어 제외됐습니다.`)
    }
  }

  const clearGroupCarryOver = (items: StandardItem[]) => setCarryOver((prev) => {
    const next = new Map(prev)
    items.forEach((it) => next.delete(it.id))
    return next
  })

  const handleDelete = async () => {
    if (!projectId) return
    if (!confirm('이 프로젝트를 삭제하시겠습니까?\n연결된 시험 일정도 함께 삭제될 수 있습니다.')) return
    setDeleting(true)
    try {
      await projectsApi.delete(projectId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const toggleStandard = (id: number) => setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const setGroupNote = (stdName: string, note: string) => setStandardNotes((prev) => {
    const next = new Map(prev)
    next.set(stdName, note)
    return next
  })

  const toggleGroup = (stdName: string) => setExpandedGroups((prev) => {
    const next = new Set(prev)
    if (next.has(stdName)) next.delete(stdName); else next.add(stdName)
    return next
  })

  const handleSave = async () => {
    if (!form.customer_id) { alert('고객사를 선택하세요'); return }
    const error = validateRequired([[!form.name.trim(), '프로젝트명을 입력하세요']])
    if (error) { alert(error); return }
    setSaving(true)
    try {
      const payload = {
        customer_id: Number(form.customer_id),
        item_id: form.item_id ? Number(form.item_id) : null,
        name: form.name.trim(),
        project_code: form.project_code || null,
        vehicle_model: form.vehicle_model || null,
        phase: form.phase,
        status: form.status,
        start_date: form.start_date || null,
        target_date: form.target_date || null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        notes: form.notes || null,
      }

      let pid = savedProjectId
      if (!isEdit || !pid) {
        const created = await projectsApi.create(payload) as { id: number }
        pid = created.id
        setSavedProjectId(pid)
      } else {
        await projectsApi.update(pid, payload)
      }

      // 규격 항목 연동 + 규격별 비고 저장
      if (pid !== null) {
        setStandardLoading(true)
        const selections = [...selectedIds].map((id) => ({
          standard_item_id: id,
          is_carry_over: carryOver.has(id),
          co_source_schedule_id: carryOver.get(id) ?? null,
        }))
        await projectsApi.setStandardItems(pid, selections)
        const notesPayload = [...standardNotes.entries()]
          .filter(([, notes]) => notes.trim())
          .map(([standard_no, notes]) => ({ standard_no, notes }))
        await projectsApi.setStandardNotes(pid, notesPayload)
        setStandardLoading(false)
      }

      markClean()
      onSaved()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '저장 중 오류가 발생했습니다')
      alert(msg)
    } finally {
      setSaving(false)
      setStandardLoading(false)
    }
  }

  const filteredStandards = allStandards.filter((e) => {
    const matchCat = !standardCatFilter || e.category_id === Number(standardCatFilter)
    const matchSearch = !standardSearch || e.name.includes(standardSearch) || e.standard_code.includes(standardSearch) || (e.standard_name ?? '').includes(standardSearch)
    return matchCat && matchSearch
  })

  // group by standard_no
  const grouped: Record<string, StandardItem[]> = {}
  for (const item of filteredStandards) {
    const key = item.standard_no || '(규격 No. 미입력)'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  if (loading) {
    return (
      <Overlay onClose={onClose} standalone={standalone} width={720}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={handleClose} standalone={standalone} width={720}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{isEdit ? '프로젝트 수정' : '프로젝트 등록'}</h3>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {([['info', '기본 정보'], ['standards', `규격 항목 (${selectedIds.size})`]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--au-blue)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--au-blue)' : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>

        {tab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <F label="고객사 *" span={2}>
              <select value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)} style={inp}>
                <option value="">-- 고객사 선택 --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.short_name ? ` (${c.short_name})` : ''}</option>
                ))}
              </select>
            </F>
            <F label="프로젝트명 *" span={2}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inp} placeholder="HKMC IVI 1세대 시험평가" />
            </F>
            <F label="프로젝트 코드">
              <input value={form.project_code} onChange={(e) => set('project_code', e.target.value)} style={inp} placeholder="PRJ-2025-001" />
            </F>
            <F label="차종">
              <select value={form.vehicle_model} onChange={(e) => set('vehicle_model', e.target.value)} style={inp}>
                <option value="">-- 차종 선택 --</option>
                {vehicleModels.map((v) => <option key={v.id} value={v.code}>{v.code}{v.name ? ` (${v.name})` : ''}</option>)}
              </select>
            </F>
            <F label="아이템" span={2}>
              <select value={form.item_id} onChange={(e) => set('item_id', e.target.value)} style={inp}>
                <option value="">-- 아이템 선택 --</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.item_code ? ` (${i.item_code})` : ''}</option>)}
              </select>
            </F>
            <F label="개발 단계">
              <select value={form.phase} onChange={(e) => set('phase', e.target.value)} style={inp}>
                {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </F>
            <F label="상태">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inp}>
                {STATUSES.map((s) => <option key={s} value={s}>{projectStatusLabel(s)}</option>)}
              </select>
            </F>
            <F label="시작일">
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} style={inp} />
            </F>
            <F label="목표 완료일">
              <input type="date" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} style={inp} />
            </F>
            <F label="담당자">
              <select value={form.assignee_id} onChange={(e) => set('assignee_id', e.target.value)} style={inp}>
                <option value="">-- 담당자 선택 --</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </F>
            <F label="메모" span={2}>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="프로젝트 배경, 특이사항 등" />
            </F>
          </div>
        )}

        {tab === 'standards' && (
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
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {selectedIds.size > 0 && <span style={{ color: 'var(--au-blue)', fontWeight: 600 }}>{selectedIds.size}건 선택됨 · </span>}
                  전체 {allStandards.length}건 중 {filteredStandards.length}건 표시 — 규격명을 클릭하면 항목이 펼쳐집니다
                </div>
                {Object.entries(grouped).map(([stdName, items]) => {
                  const isExpanded = expandedGroups.has(stdName)
                  const selectedCount = items.filter((e) => selectedIds.has(e.id)).length
                  const coCount = items.filter((e) => carryOver.has(e.id)).length
                  return (
                    <div key={stdName} style={{ marginBottom: 8 }}>
                      <div onClick={() => toggleGroup(stdName)} style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--au-indigo)',
                        padding: '8px 10px', background: '#F0F2FF', borderRadius: '6px 6px 0 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                      }}>
                        <span>{isExpanded ? '▾' : '▸'} 📋 {stdName} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                          ({items.length}건{selectedCount > 0 ? `, ${selectedCount}건 선택됨` : ''}{coCount > 0 ? `, C/O ${coCount}건${coCount === items.length ? ' (전체)' : ' (일부)'}` : ''})
                        </span></span>
                        <button onClick={(e) => {
                          e.stopPropagation()
                          const allSelected = items.every((it) => selectedIds.has(it.id))
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            if (allSelected) items.forEach((it) => next.delete(it.id))
                            else items.forEach((it) => next.add(it.id))
                            return next
                          })
                        }} style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--au-blue)' }}>
                          {items.every((it) => selectedIds.has(it.id)) ? '전체 해제' : '전체 선택'}
                        </button>
                      </div>
                      {selectedCount > 0 && (
                        <div style={{ padding: '6px 10px', background: '#F0F2FF', borderTop: '1px solid #E1E5FA' }}>
                          <input
                            value={standardNotes.get(stdName) ?? ''}
                            onChange={(e) => setGroupNote(stdName, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="이 규격 비고 — 일부 항목만 적용되는 경우 조건을 적어두세요 (예: A타입 커넥터 적용 부품만 해당)"
                            style={{ ...inp, fontSize: 12, padding: '6px 8px', background: 'var(--bg)' }}
                          />
                          {!form.item_id ? (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                              C/O 대상 일정은 아이템을 먼저 선택해야 표시됩니다 (같은 아이템을 쓰는 다른 프로젝트의 실제 시험 일정만 후보로 나옵니다).
                            </div>
                          ) : (() => {
                            const vOptions = groupVehicleOptions(items)
                            return vOptions.length === 0 ? (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                이 규격은 같은 아이템의 다른 프로젝트에 참조 가능한 시험 일정이 없어 C/O를 적용할 수 없습니다.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>규격 전체 C/O:</span>
                                <select
                                  value={groupCoChoice.get(stdName) ?? ''}
                                  onChange={(e) => setGroupCoChoice((prev) => new Map(prev).set(stdName, e.target.value))}
                                  style={{ ...inp, fontSize: 12, padding: '4px 6px', width: 'auto', flex: 1 }}
                                >
                                  <option value="">-- 대체 차종 선택 --</option>
                                  {vOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <button onClick={() => applyGroupCarryOver(stdName, items)}
                                  style={{ fontSize: 11, background: 'none', border: '1px solid var(--au-blue)', color: 'var(--au-blue)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  전체 C/O 적용
                                </button>
                                {coCount > 0 && (
                                  <button onClick={() => clearGroupCarryOver(items)}
                                    style={{ fontSize: 11, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    C/O 전체 해제
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                      {isExpanded && (
                        <div style={{ marginTop: 4 }}>
                          {items.map((item) => {
                            const selected = selectedIds.has(item.id)
                            const isCo = carryOver.has(item.id)
                            return (
                              <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                                borderRadius: 6, marginBottom: 2,
                                background: selected ? '#EBF4FF' : 'transparent',
                                border: `1px solid ${selected ? 'var(--au-blue)' : 'var(--border)'}`,
                              }}>
                                <div onClick={() => toggleStandard(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}>
                                  <input type="checkbox" checked={selected} onChange={() => toggleStandard(item.id)}
                                    onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, fontFamily: 'monospace' }}>{item.standard_code}</span>
                                  <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
                                  {item.category_name && (
                                    <Badge label={item.category_name} color={item.category_color} />
                                  )}
                                </div>
                                {selected && (() => {
                                  const itemCandidates = candidatesForItem(item.id)
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={isCo} onChange={() => toggleCarryOver(item.id)} style={{ cursor: 'pointer' }} />
                                        C/O
                                      </label>
                                      {isCo && (
                                        itemCandidates.length === 0 ? (
                                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>참조 가능한 일정 없음</span>
                                        ) : (
                                          <select
                                            value={vehicleModelForSchedule(carryOver.get(item.id))}
                                            onChange={(e) => setCarryOverVehicle(item.id, e.target.value)}
                                            style={{ ...inp, fontSize: 11, padding: '3px 6px', width: 110 }}
                                          >
                                            <option value="">-- 차종 선택 --</option>
                                            {[...new Set(itemCandidates.map((c) => c.vehicle_model))].map((v) => (
                                              <option key={v} value={v}>{v}</option>
                                            ))}
                                          </select>
                                        )
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
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
        {(saving || standardLoading) && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>저장 중...</span>
        )}
        <Button variant="secondary" size="sm" onClick={handleClose}>취소</Button>
        <Button size="sm" onClick={handleSave} loading={saving || standardLoading}>
          {isEdit ? '수정 저장' : '등록'}
        </Button>
      </div>

      {confirmOpen && (
        <UnsavedChangesDialog
          saving={saving || standardLoading}
          onSave={handleSave}
          onDiscard={confirmDiscard}
          onCancel={confirmCancel}
        />
      )}
    </Overlay>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
