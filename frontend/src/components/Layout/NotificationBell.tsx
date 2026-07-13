import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi, type AppNotification } from '@/api/notifications'
import { Overlay } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ProjectForm from '@/pages/ProjectForm'
import SOPForm from '@/pages/SOPForm'

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
  const [detailNotif, setDetailNotif] = useState<AppNotification | null>(null)
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
    if (!n.is_read) { await notificationsApi.markRead(n.id); load() }
    setOpen(false)
    setDetailNotif(n)
  }

  const handleGoTo = () => {
    if (detailNotif?.link_path) navigate(detailNotif.link_path)
    setDetailNotif(null)
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    load()
  }

  const handleRemove = async (e: ReactMouseEvent, id: number) => {
    e.stopPropagation()
    await notificationsApi.remove(id)
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                    {n.message && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, n.id)}
                    aria-label="알림 제거"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: 2, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {detailNotif?.related_type === 'sop' && detailNotif.related_id != null && (
        <SOPForm
          sopId={detailNotif.related_id}
          onClose={() => setDetailNotif(null)}
          onSaved={() => setDetailNotif(null)}
        />
      )}

      {detailNotif?.related_type?.startsWith('project_deadline') && detailNotif.related_id != null && (
        <ProjectForm
          projectId={detailNotif.related_id}
          onClose={() => setDetailNotif(null)}
          onSaved={() => setDetailNotif(null)}
        />
      )}

      {detailNotif && detailNotif.related_type !== 'sop' && !detailNotif.related_type?.startsWith('project_deadline') && (
        <Overlay onClose={() => setDetailNotif(null)} width={420}>
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>알림 상세</h3>
            <button onClick={() => setDetailNotif(null)}
              style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>
              ×
            </button>
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{detailNotif.title}</div>
            {detailNotif.message && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{detailNotif.message}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(detailNotif.created_at).toLocaleString('ko-KR')}</div>
          </div>
          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setDetailNotif(null)}>닫기</Button>
            {detailNotif.link_path && <Button size="sm" onClick={handleGoTo}>바로가기</Button>}
          </div>
        </Overlay>
      )}
    </div>
  )
}
