import React, { type CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

interface MenuItem {
  key: string
  label: string
  icon: string
  path?: string
  children?: { key: string; label: string; path: string }[]
  badge?: string
  rolesOnly?: string[]
}

const STAFF_ROLES = ['admin', '임원', '팀장', '팀원']

const MENU: MenuItem[] = [
  { key: 'm1', label: '대시보드',    icon: '📊', path: '/dashboard', rolesOnly: STAFF_ROLES },
  { key: 'm2', label: '규격 매트릭스', icon: '📋', path: '/standards', rolesOnly: STAFF_ROLES },
  { key: 'm3', label: '시험 일정',   icon: '📅', path: '/schedule', rolesOnly: STAFF_ROLES },
  { key: 'm4', label: 'NCR 추적',    icon: '⚠️', path: '/ncr', rolesOnly: STAFF_ROLES },
  { key: 'm11', label: '단건 시험',  icon: '🧪', path: '/single-tests' },
  { key: 'm7', label: '외주 시험소', icon: '🏭', path: '/vendors', rolesOnly: STAFF_ROLES },
  { key: 'm6', label: '장비 관리',   icon: '🔧', path: '/equipment', rolesOnly: STAFF_ROLES },
  { key: 'm8', label: '절차서 관리',  icon: '📄', path: '/sop', rolesOnly: STAFF_ROLES },
  { key: 'm4b', label: '업무 분배',  icon: '👥', path: '/workload', rolesOnly: ['admin', '팀장'] },
  {
    key: 'm5b', label: '정보 관리', icon: '🏢', rolesOnly: STAFF_ROLES,
    children: [
      { key: 'm5-1b', label: '업체 리스트',   path: '/customers' },
      { key: 'm5-2b', label: '프로젝트 리스트', path: '/projects' },
      { key: 'm5-3b', label: '아이템 리스트', path: '/items' },
    ],
  },
  {
    key: 'm9', label: '임원 보고', icon: '📈', rolesOnly: STAFF_ROLES,
    children: [
      { key: 'm9-1', label: 'Gap Analysis', path: '/reports/gap-analysis' },
      { key: 'm9-2', label: '분기별 KPI',    path: '/reports/quarterly-kpi' },
    ],
  },
  {
    key: 'm5', label: '정보 입력', icon: '📝', rolesOnly: STAFF_ROLES,
    children: [
      { key: 'm5-1a', label: '업체 등록',     path: '/customers/new' },
      { key: 'm5-2a', label: '프로젝트 등록', path: '/projects/new' },
      { key: 'm5-3a', label: '아이템 등록',   path: '/items/new' },
      { key: 'm5-5', label: '외주 시험소 등록', path: '/vendors/registry' },
    ],
  },
  { key: 'm4c', label: '사용자 관리', icon: '👤', path: '/users', rolesOnly: ['admin', '팀장', '임원'] },
  { key: 'm10', label: '데이터 내보내기', icon: '📤', path: '/export', rolesOnly: STAFF_ROLES },
]

export default function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const role = useAuthStore((s) => s.user?.role)
  const location = useLocation()
  const [expanded, setExpanded] = useState<string[]>([])
  const menu = MENU.filter((item) => !item.rolesOnly || (role && item.rolesOnly.includes(role)))

  const toggleExpand = (key: string) =>
    setExpanded((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])

  const isActive = (path: string) => location.pathname === path
  const isParentActive = (item: MenuItem) =>
    item.children?.some((c) => location.pathname.startsWith(c.path)) ?? false

  return (
    <aside className="no-print" style={{
      width: collapsed ? 56 : 'var(--sidebar-w)',
      background: 'var(--au-gradient-v)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        {collapsed ? (
          <div style={{ fontSize: 20, textAlign: 'center', position: 'relative' }}>
            AU
            {import.meta.env.DEV && (
              <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#facc15' }} />
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              AU INC.
              {import.meta.env.DEV && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#111', background: '#facc15', padding: '1px 6px', borderRadius: 4 }}>
                  DEV
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>시험평가팀 시스템</div>
          </>
        )}
      </div>

      {/* nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {menu.map((item) =>
          item.children ? (
            <div key={item.key}>
              <button
                onClick={() => toggleExpand(item.key)}
                style={navBtnStyle(isParentActive(item), false)}
              >
                <span>{item.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>{expanded.includes(item.key) ? '▲' : '▼'}</span>
                  </>
                )}
              </button>
              {!collapsed && expanded.includes(item.key) && (
                <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                  {item.children.map((child) => (
                    <NavLink key={child.key} to={child.path} style={subNavStyle(isActive(child.path))}>
                      <span style={{ marginLeft: 8, marginRight: 6, opacity: 0.4 }}>│</span>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink key={item.key} to={item.path!} style={({ isActive }) => navStyle(isActive)}>
              <span>{item.icon}</span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 4 }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* version */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
          v0.1.0
        </div>
      )}
    </aside>
  )
}

const baseStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 16px', width: '100%', border: 'none',
  fontSize: 13, color: 'rgba(255,255,255,0.8)',
  background: 'transparent', transition: 'background 0.15s',
  cursor: 'pointer',
}

const navStyle = (active: boolean): CSSProperties => ({
  ...baseStyle,
  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
  color: active ? '#fff' : 'rgba(255,255,255,0.8)',
  fontWeight: active ? 600 : 400,
})

const navBtnStyle = (active: boolean, _: boolean): CSSProperties => ({
  ...baseStyle,
  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
  color: active ? '#fff' : 'rgba(255,255,255,0.8)',
})

const subNavStyle = (active: boolean): CSSProperties => ({
  display: 'flex', alignItems: 'center',
  padding: '8px 16px', fontSize: 13,
  color: active ? '#fff' : 'rgba(255,255,255,0.65)',
  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
  fontWeight: active ? 600 : 400,
})
