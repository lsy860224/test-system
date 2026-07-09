import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi, type AppNotification } from '@/api/notifications'

const POLL_MS = 30000

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  return `${Math.floor(hour / 24)}일 전`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const load = () => notificationsApi.list().then((r) => { setItems(r.items); setUnreadCount(r.unread_count) })

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleItemClick = async (n: AppNotification) => {
    if (!n.is_read) await notificationsApi.markRead(n.id)
    setOpen(false)
    load()
    if (n.link_path) navigate(n.link_path)
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    load()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ position: 'relative', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1, color: 'var(--text-secondary)' }}
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -6, background: '#E53E3E', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 5px', lineHeight: 1.4,
          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '130%', right: 0, width: 340, maxHeight: 420, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 1100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>알림</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                모두 읽음
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>알림이 없습니다</div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: n.is_read ? 'transparent' : '#F0F5FF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: 5, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{n.title}</div>
                    {n.message && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
