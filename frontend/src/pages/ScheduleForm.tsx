import React, { type CSSProperties, useEffect, useState } from 'react'
import { scheduleApi } from '@/api/schedules'
import { projectsApi, type ProjectItem } from '@/api/projects'
import { standardApi, type StandardItem } from '@/api/standards'
import { equipmentApi, type Equipment } from '@/api/equipment'
import { usersApi, type AppUser } from '@/api/users'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog'
import { useFormState } from '@/hooks/useFormState'
import { useUnsavedFormGuard } from '@/hooks/useUnsavedFormGuard'
import { getErrorMessage } from '@/utils/errorMessage'

interface Props {
  scheduleId: number | null
  initialProjectId?: number
  initialStandardItemId?: number
  onClose: () => void
  onSaved: () => void
}

const TEST_TYPES = ['DV', 'PV', '양산정기', '특별']

const empty = {
  project_id: '',
  standard_item_id: '',
  test_type: 'DV',
  equipment_id: '',
  assignee_id: '',
  planned_start: '',
  planned_end: '',
  notes: '',
}

export default function ScheduleForm({ scheduleId, initialProjectId, initialStandardItemId, onClose, onSaved }: Props) {
  const isEdit = scheduleId !== null
  const [form, setForm, set] = useFormState({
    ...empty,
    project_id: initialProjectId ? String(initialProjectId) : '',
    standard_item_id: initialStandardItemId ? String(initialStandardItemId) : '',
  })
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [standardItems, setStandardItems] = useState<StandardItem[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { confirmOpen, requestClose, confirmDiscard, confirmCancel, markClean } = useUnsavedFormGuard(form, !loading)
  const handleClose = () => requestClose(onClose)

  useEffect(() => {
    projectsApi.list({ size: 200, status: '활성' }).then((r) => setProjects(r.items))
    standardApi.list({ size: 500 }).then((r) => setStandardItems(r.items))
    equipmentApi.list({ size: 1000 }).then((r) => setEquipmentList(r.items))
    usersApi.list().then((list) => setUsers(list.filter((u) => u.is_active)))
  }, [])

  useEffect(() => {
    if (!isEdit || !scheduleId) return
    scheduleApi.get(scheduleId).then((item: Record<string, unknown>) => {
      setForm({
        project_id: item.project_id != null ? String(item.project_id) : '',
        standard_item_id: item.standard_item_id != null ? String(item.standard_item_id) : '',
        test_type: String(item.test_type ?? 'DV'),
        equipment_id: item.equipment_id != null ? String(item.equipment_id) : '',
        assignee_id: item.assignee_id != null ? String(item.assignee_id) : '',
        planned_start: String(item.planned_start ?? ''),
        planned_end: String(item.planned_end ?? ''),
        notes: String(item.notes ?? ''),
      })
    }).finally(() => setLoading(false))
  }, [scheduleId])

  const handleDelete = async () => {
    if (!scheduleId) return
    if (!confirm('이 시험 일정을 취소 처리하시겠습니까?\n상태가 "취소"로 변경되며, 목록에서 취소된 일정으로 표시됩니다.')) return
    setDeleting(true)
    try {
      await scheduleApi.delete(scheduleId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!form.project_id) { alert('프로젝트를 선택하세요'); return }
    if (!form.standard_item_id) { alert('규격 항목을 선택하세요'); return }
    if (!form.planned_start) { alert('계획 시작일을 입력하세요'); return }
    if (!form.planned_end) { alert('계획 완료일을 입력하세요'); return }
    if (form.planned_end < form.planned_start) { alert('완료일이 시작일보다 빠를 수 없습니다'); return }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        project_id: Number(form.project_id),
        standard_item_id: Number(form.standard_item_id),
        test_type: form.test_type,
        equipment_id: form.equipment_id ? Number(form.equipment_id) : null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        planned_start: form.planned_start,
        planned_end: form.planned_end,
        notes: form.notes || null,
      }
      if (isEdit && scheduleId) {
        await scheduleApi.update(scheduleId, payload)
      } else {
        await scheduleApi.create(payload)
      }
      markClean()
      onSaved()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '저장 중 오류가 발생했습니다')
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  // 프로젝트 선택 시 해당 프로젝트의 규격 항목으로 필터링
  const [projectStandardItems, setProjectStandardItems] = useState<StandardItem[]>([])
  const [loadingProjectStandards, setLoadingProjectStandards] = useState(false)

  useEffect(() => {
    if (!form.project_id) {
      setProjectStandardItems([])
      return
    }
    setLoadingProjectStandards(true)
    projectsApi.getStandardItems(Number(form.project_id))
      .then(setProjectStandardItems)
      .catch(() => setProjectStandardItems([]))
      .finally(() => setLoadingProjectStandards(false))
  }, [form.project_id])

  const standardListToShow = form.project_id && projectStandardItems.length > 0
    ? projectStandardItems
    : standardItems

  if (loading) {
    return (
      <Overlay width={680} onClose={onClose}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay width={680} onClose={handleClose}>
      {/* header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '시험 일정 수정' : '시험 일정 등록'}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            프로젝트와 규격 항목을 선택하면 해당 프로젝트의 등록 항목만 표시됩니다.
          </p>
        </div>
        <button onClick={handleClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
      </div>

      {/* body */}
      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <F label="프로젝트 *" span={2}>
            <select value={form.project_id} onChange={(e) => { set('project_id', e.target.value); set('standard_item_id', '') }} style={inp}>
              <option value="">-- 프로젝트 선택 --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.project_code ? ` (${p.project_code})` : ''}</option>
              ))}
            </select>
          </F>

          <F label={`규격 항목 *${form.project_id && projectStandardItems.length > 0 ? ` (프로젝트 항목 ${projectStandardItems.length}건)` : ''}`} span={2}>
            <select value={form.standard_item_id} onChange={(e) => set('standard_item_id', e.target.value)} style={inp}
              disabled={loadingProjectStandards}>
              <option value="">-- 규격 항목 선택 --</option>
              {standardListToShow.map((e) => (
                <option key={e.id} value={e.id}>{e.standard_code} {e.name}{e.standard_name ? ` [${e.standard_name}]` : ''}</option>
              ))}
            </select>
            {form.project_id && projectStandardItems.length === 0 && !loadingProjectStandards && (
              <p style={{ fontSize: 11, color: '#D69E2E', marginTop: 4 }}>
                이 프로젝트에 연결된 규격 항목이 없습니다. 프로젝트 설정에서 규격 항목을 추가하세요.
              </p>
            )}
          </F>

          <F label="시험 유형 *">
            <select value={form.test_type} onChange={(e) => set('test_type', e.target.value)} style={inp}>
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </F>

          <F label="장비 매칭">
            <select value={form.equipment_id} onChange={(e) => set('equipment_id', e.target.value)} style={inp}>
              <option value="">-- 장비 선택 (선택사항) --</option>
              {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}{eq.model ? ` (${eq.model})` : ''}</option>)}
            </select>
          </F>

          <F label="담당자">
            <select value={form.assignee_id} onChange={(e) => set('assignee_id', e.target.value)} style={inp}>
              <option value="">-- 담당자 선택 (선택사항) --</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
            </select>
          </F>

          <F label="계획 시작 *">
            <input type="date" value={form.planned_start} onChange={(e) => set('planned_start', e.target.value)} style={inp} />
          </F>

          <F label="계획 완료 *">
            <input type="date" value={form.planned_end} onChange={(e) => set('planned_end', e.target.value)} style={inp} />
          </F>

          <F label="메모" span={2}>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              rows={3} style={{ ...inp, resize: 'vertical' }}
              placeholder="외주 의뢰 예정, 특이 장비 필요 등" />
          </F>

        </div>
      </div>

      {/* footer */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isEdit && (
          <Button size="sm" onClick={handleDelete} loading={deleting}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            일정 취소
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={handleClose}>취소</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>
          {isEdit ? '수정 저장' : '등록'}
        </Button>
      </div>

      {confirmOpen && (
        <UnsavedChangesDialog saving={saving} onSave={handleSave} onDiscard={confirmDiscard} onCancel={confirmCancel} />
      )}
    </Overlay>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
