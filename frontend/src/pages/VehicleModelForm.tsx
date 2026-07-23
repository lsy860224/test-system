import React, { type CSSProperties, useEffect, useState } from 'react'
import { vehicleModelsApi } from '@/api/vehicleModels'
import { useFormState } from '@/hooks/useFormState'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog'
import { useUnsavedFormGuard } from '@/hooks/useUnsavedFormGuard'
import { getErrorMessage } from '@/utils/errorMessage'
import { validateRequired } from '@/utils/validateRequired'

interface Props {
  vehicleModelId: number | null
  onClose: () => void
  onSaved: () => void
  standalone?: boolean
}

const empty = {
  code: '',
  name: '',
  notes: '',
}

export default function VehicleModelForm({ vehicleModelId, onClose, onSaved, standalone }: Props) {
  const isEdit = vehicleModelId !== null
  const [form, setForm, set] = useFormState({ ...empty })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { confirmOpen, requestClose, confirmDiscard, confirmCancel, markClean } = useUnsavedFormGuard(form, !loading)
  const handleClose = () => requestClose(onClose)

  useEffect(() => {
    if (!isEdit || !vehicleModelId) return
    vehicleModelsApi.get(vehicleModelId).then((vm) => {
      setForm({
        code: vm.code,
        name: vm.name ?? '',
        notes: vm.notes ?? '',
      })
    }).finally(() => setLoading(false))
  }, [vehicleModelId])

  const handleDelete = async () => {
    if (!vehicleModelId) return
    if (!confirm('이 차종을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await vehicleModelsApi.delete(vehicleModelId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    const error = validateRequired([[!form.code.trim(), '차종 코드를 입력하세요']])
    if (error) { alert(error); return }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim() || null,
        notes: form.notes || null,
      }
      if (isEdit && vehicleModelId) {
        await vehicleModelsApi.update(vehicleModelId, payload)
      } else {
        await vehicleModelsApi.create(payload)
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

  if (loading) {
    return (
      <Overlay onClose={onClose} standalone={standalone} width={480}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={handleClose} standalone={standalone} width={480}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '차종 수정' : '차종 등록'}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            프로젝트 등록 시 드롭다운으로 선택하는 차종 마스터입니다. 표기를 통일해야 C/O 매칭이 정확합니다.
          </p>
        </div>
        <button onClick={handleClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <F label="차종 코드 *" span={2}>
            <input value={form.code} onChange={(e) => set('code', e.target.value)} style={inp} placeholder="예: JG1" />
          </F>
          <F label="차종명" span={2}>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inp} placeholder="예: 디 올 뉴 아반떼" />
          </F>
          <F label="메모" span={2}>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
          </F>
        </div>
      </div>

      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isEdit && (
          <Button size="sm" onClick={handleDelete} loading={deleting}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            삭제
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
