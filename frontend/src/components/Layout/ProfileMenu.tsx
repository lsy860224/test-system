import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import Button from '@/components/ui/Button'
import { FormField as F } from '@/components/ui/FormField'

export default function ProfileMenu() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [showPwForm, setShowPwForm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowPwForm(false) }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        {user.name}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '160%', right: 0, width: 260,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 1100, padding: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>역할 · {user.role}</div>

          {!showPwForm ? (
            <Button size="sm" variant="secondary" style={{ marginTop: 14, width: '100%' }} onClick={() => setShowPwForm(true)}>
              비밀번호 변경
            </Button>
          ) : (
            <PasswordChangeForm onClose={() => setShowPwForm(false)} onDone={() => { setShowPwForm(false); setOpen(false) }} />
          )}
        </div>
      )}
    </div>
  )
}

function PasswordChangeForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!current || !next) { alert('현재 비밀번호와 새 비밀번호를 입력하세요'); return }
    if (next !== confirm) { alert('새 비밀번호가 일치하지 않습니다'); return }
    setSaving(true)
    try {
      await authApi.changePassword(current, next)
      alert('비밀번호가 변경되었습니다')
      onDone()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '변경 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <F label="현재 비밀번호">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} style={inp} />
      </F>
      <F label="새 비밀번호">
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} style={inp} />
      </F>
      <F label="새 비밀번호 확인">
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inp} />
      </F>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button size="sm" variant="secondary" onClick={onClose}>취소</Button>
        <Button size="sm" onClick={handleSubmit} loading={saving}>변경</Button>
      </div>
    </div>
  )
}

const inp: CSSProperties = {
  width: '100%', padding: '7px 9px', border: '1px solid var(--border)',
  borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box',
}
