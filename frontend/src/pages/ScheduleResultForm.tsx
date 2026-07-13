import React, { type CSSProperties, useEffect, useState } from 'react'
import { scheduleApi } from '@/api/schedules'
import Button from '@/components/ui/Button'
import { FormField as F } from '@/components/ui/FormField'
import { getErrorMessage } from '@/utils/errorMessage'
import { validateRequired } from '@/utils/validateRequired'

interface Props {
  scheduleId: number
  onClose: () => void
  onSaved: (result: string) => void
}

const RESULTS = ['합격', '불합격', '보류']

export default function ScheduleResultForm({ scheduleId, onClose, onSaved }: Props) {
  const [result, setResult] = useState('합격')
  const [actualEnd, setActualEnd] = useState(new Date().toISOString().slice(0, 10))
  const [dataPath, setDataPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    scheduleApi.get(scheduleId).then((item: Record<string, unknown>) => {
      if (item.result) {
        setResult(String(item.result))
        setIsEdit(true)
      }
      if (item.actual_end) setActualEnd(String(item.actual_end))
      if (item.data_path) setDataPath(String(item.data_path))
    }).finally(() => setLoading(false))
  }, [scheduleId])

  const handleSave = async () => {
    const error = validateRequired([[!dataPath.trim(), '데이터 저장 경로를 입력하세요 (합격/불합격 관계없이 필수)']])
    if (error) { alert(error); return }
    setSaving(true)
    try {
      await scheduleApi.recordResult(scheduleId, result, actualEnd, dataPath.trim())
      onSaved(result)
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '저장 중 오류가 발생했습니다')
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: 440, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '시험 결과 수정' : '시험 결과 입력'}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {result === '보류'
                ? "'보류'로 저장하면 일정은 '진행중' 상태로 유지되며, 이후 다시 결과를 입력할 수 있습니다."
                : "결과를 저장하면 일정 상태가 '완료'로 바뀝니다."}
            </p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
        ) : (
          <>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <F label="결과 *">
                <select value={result} onChange={(e) => setResult(e.target.value)} style={inp}>
                  {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </F>
              <F label="실제 종료일">
                <input type="date" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} style={inp} />
              </F>
              <F label="데이터 저장 경로 *">
                <input value={dataPath} onChange={(e) => setDataPath(e.target.value)} style={inp}
                  placeholder="\\\\nas\\test-data\\2026\\PRJ-001\\..." />
              </F>
              {result === '불합격' && (
                <p style={{ fontSize: 12, color: '#E53E3E', background: '#FFF5F5', padding: '8px 10px', borderRadius: 8 }}>
                  결과가 처음 '불합격'으로 저장될 때 NCR 레포트 작성 창이 자동으로 열립니다.
                </p>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
              <Button size="sm" onClick={handleSave} loading={saving}>저장</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
