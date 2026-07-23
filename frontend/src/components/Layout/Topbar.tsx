import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import NotificationBell from './NotificationBell'
import ProfileMenu from './ProfileMenu'

const TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/standards': '규격 매트릭스',
  '/schedule': '시험 일정',
  '/ncr': 'NCR 추적',
  '/workload': '업무 분배',
  '/equipment': '장비 관리',
  '/vendors': '외주 시험소',
  '/sop': '절차서 관리',
  '/users': '사용자 관리',
  '/export': '데이터 내보내기',
  '/customers': '정보 관리 : 업체 리스트',
  '/projects': '정보 관리 : 프로젝트 리스트',
  '/items': '정보 관리 : 아이템 리스트',
  '/reports/gap-analysis': '임원 보고 : Gap Analysis',
  '/reports/quarterly-kpi': '임원 보고 : 분기별 KPI',
  '/customers/new': '업체 등록',
  '/projects/new': '프로젝트 등록',
  '/items/new': '아이템 등록',
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const pageCountLabel = useUIStore((s) => s.pageCountLabel)
  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)

  const title = TITLES[location.pathname] ?? ''

  useEffect(() => { setPageCountLabel(null) }, [location.pathname])

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
      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
        {title}
        {pageCountLabel && (
          <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-muted)', marginLeft: 10 }}>{pageCountLabel}</span>
        )}
      </span>
      <div style={{ flex: 1 }} />
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <NotificationBell />
          <ProfileMenu />
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
