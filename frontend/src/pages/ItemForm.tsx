import React, { type CSSProperties, useEffect, useState } from 'react'
import { itemsApi, ITEM_CATEGORIES } from '@/api/items'
import { useFormState } from '@/hooks/useFormState'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'

interface Props {
  itemId: number | null
  onClose: () => void
  onSaved: () => void
  standalone?: boolean
}

const empty = {
  name: '',
  category: '',
  spec: '',
  notes: '',
}

export default function ItemForm({ itemId, onClose, onSaved, standalone }: Props) {
  const isEdit = itemId !== null
  const [form, setForm, set] = useFormState({ ...empty })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isEdit || !itemId) return
    itemsApi.get(itemId).then((item) => {
      setForm({
        name: item.name,
        category: item.category ?? '',
        spec: item.spec ?? '',
        notes: item.notes ?? '',
      })
    }).finally(() => setLoading(false))
  }, [itemId])

  const handleDelete = async () => {
    if (!itemId) return
    if (!confirm('이 아이템을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await itemsApi.delete(itemId)
      onSaved()
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('아이템명을 입력하세요'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        spec: form.spec || null,
        notes: form.notes || null,
      }
      if (isEdit && itemId) {
        await itemsApi.update(itemId, payload)
      } else {
        await itemsApi.create(payload)
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Overlay onClose={onClose} standalone={standalone} width={560}>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose} standalone={standalone} width={560}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '아이템 수정' : '아이템 등록'}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            프로젝트(차종)에서 재사용되는 부품/아이템 마스터입니다. 아이템 코드는 자동 생성됩니다.
          </p>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <F label="분류" span={2}>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inp}>
              <option value="">-- 분류 선택 --</option>
              {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </F>
          <F label="아이템명 *" span={2}>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inp} placeholder="BCM 모듈" />
          </F>
          <F label="사양/설명" span={2}>
            <textarea value={form.spec} onChange={(e) => set('spec', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="주요 사양, 규격 요구사항 등" />
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
        <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>
          {isEdit ? '수정 저장' : '등록'}
        </Button>
      </div>
    </Overlay>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
