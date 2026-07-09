import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import NotificationBell from './NotificationBell'

const TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/es-matrix': '규격 매트릭스',
  '/schedule': '시험 일정',
  '/ncr': 'NCR 추적',
  '/customers': '업체 등록',
  '/items': '아이템 등록',
  '/users': '담당자 관리',
  '/projects': '프로젝트 관리',
  '/equipment': '장비 관리',
  '/vendors': '외주 시험소',
  '/sop': 'SOP 관리',
  '/reports/gap-analysis': '임원 보고 · Gap Analysis',
  '/reports/quarterly-kpi': '임원 보고 · 분기별 KPI',
  '/export': '데이터 내보내기',
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const title = TITLES[location.pathname] ?? ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="no-print" style={{
      height: 'var(--topbar-h)',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      flexShrink: 0,
    }}>
      <button
        onClick={toggleSidebar}
        style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1 }}
        aria-label="사이드바 토글"
      >
        ☰
      </button>
      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{title}</span>
      <div style={{ flex: 1 }} />
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NotificationBell />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.name}</span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 12, padding: '4px 10px', border: '1px solid var(--border)',
              borderRadius: 6, background: 'none', color: 'var(--text-secondary)',
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  )
}
