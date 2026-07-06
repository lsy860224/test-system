import { useEffect, useState } from 'react'
import { usersApi, type AppUser } from '@/api/users'
import { useAuthStore } from '@/stores/authStore'
import Table, { type Column } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import UserForm from './UserForm'

export default function UserManagement() {
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'
  const [items, setItems] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [formUser, setFormUser] = useState<AppUser | null | undefined>(undefined)

  const load = () => {
    setLoading(true)
    usersApi.list().then(setItems).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSaved = () => { setFormUser(undefined); load() }

  const handleToggleActive = async (u: AppUser) => {
    if (!confirm(u.is_active ? `${u.name} 계정을 비활성화하시겠습니까?` : `${u.name} 계정을 다시 활성화하시겠습니까?`)) return
    try {
      if (u.is_active) await usersApi.deactivate(u.id)
      else await usersApi.activate(u.id)
      load()
    } catch {
      alert('처리 중 오류가 발생했습니다')
    }
  }

  const columns: Column<AppUser>[] = [
    { key: 'username', header: '아이디', width: 140 },
    { key: 'name', header: '이름', width: 140 },
    { key: 'role', header: '역할', width: 100, render: (r) => <Badge label={r.role} color={r.role === 'admin' ? 'var(--au-indigo)' : undefined} /> },
    { key: 'is_active', header: '상태', width: 90, render: (r) => <Badge label={r.is_active ? '활성' : '비활성'} color={r.is_active ? '#38A169' : '#718096'} /> },
    { key: 'last_login', header: '최근 로그인', width: 160, render: (r) => r.last_login ? new Date(r.last_login).toLocaleString('ko-KR') : <span style={{ color: 'var(--text-muted)' }}>-</span> },
    ...(isAdmin ? [{
      key: 'actions', header: '', width: 90,
      render: (r: AppUser) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleActive(r) }}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          {r.is_active ? '비활성화' : '활성화'}
        </button>
      ),
    }] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>
          담당자 관리 <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>총 {items.length}명</span>
        </h2>
        {isAdmin ? (
          <Button size="sm" onClick={() => setFormUser(null)}>+ 담당자 등록</Button>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>계정 등록/수정은 관리자만 가능합니다</span>
        )}
      </div>

      <Table
        columns={columns}
        data={items}
        rowKey={(r) => r.id}
        loading={loading}
        emptyText="등록된 담당자가 없습니다."
        onRowClick={isAdmin ? (r) => setFormUser(r) : undefined}
      />

      {formUser !== undefined && (
        <UserForm
          user={formUser}
          onClose={() => setFormUser(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
