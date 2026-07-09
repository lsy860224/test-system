import React, { type CSSProperties, useEffect, useState } from 'react'
import { usersApi, USER_ROLES, type AppUser } from '@/api/users'
import Button from '@/components/ui/Button'
import { FormField as F } from '@/components/ui/FormField'

interface Props {
  user: AppUser | null
  onClose: () => void
  onSaved: () => void
}

export default function UserForm({ user, onClose, onSaved }: Props) {
  const isEdit = user !== null
  const [username, setUsername] = useState(user?.username ?? '')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(user?.name ?? '')
  const [role, setRole] = useState(user?.role ?? '팀원')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setUsername(user?.username ?? '')
    setName(user?.name ?? '')
    setRole(user?.role ?? '팀원')
    setPassword('')
  }, [user])

  const handleSave = async () => {
    if (!isEdit && !username.trim()) { alert('아이디를 입력하세요'); return }
    if (!name.trim()) { alert('이름을 입력하세요'); return }
    if (!isEdit && !password) { alert('비밀번호를 입력하세요'); return }
    setSaving(true)
    try {
      if (isEdit && user) {
        await usersApi.update(user.id, { name: name.trim(), role, password: password || undefined })
      } else {
        await usersApi.create({ username: username.trim(), password, name: name.trim(), role })
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '저장 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: 440, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '사용자 계정 수정' : '사용자 계정 등록'}</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <F label="아이디 *">
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={inp} disabled={isEdit} placeholder="hong.gildong" />
          </F>
          <F label={isEdit ? '비밀번호 (변경 시에만 입력)' : '비밀번호 *'}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inp} />
          </F>
          <F label="이름 *">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="홍길동" />
          </F>
          <F label="역할 *">
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inp}>
              {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </F>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>{isEdit ? '수정 저장' : '등록'}</Button>
        </div>
      </div>
    </div>
  )
}


const inp: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
