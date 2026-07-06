import React, { type CSSProperties, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, token } = useAuthStore()

  // 이미 로그인된 경우 대시보드로 이동
  useEffect(() => {
    if (token) window.location.href = '/dashboard'
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      window.location.href = '/dashboard'
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360, background: 'var(--surface)', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', padding: 40 }}>
        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'var(--au-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', fontWeight: 700,
          }}>AU</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            AU Inc.
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>시험평가팀 시스템</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>아이디</label>
            <input
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required autoFocus
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ marginBottom: 16, fontSize: 13, color: '#E53E3E', textAlign: 'center' }}>{error}</div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '11px', border: 'none', borderRadius: 8,
              background: 'var(--au-gradient)', color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const inputStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 14, outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
}
