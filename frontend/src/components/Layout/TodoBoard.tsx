import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { todosApi, type TodoCard } from '@/api/todos'
import NCRForm from '@/pages/NCRForm'
import EquipmentForm from '@/pages/EquipmentForm'
import ScheduleResultForm from '@/pages/ScheduleResultForm'

const SEVERITY_COLOR: Record<TodoCard['severity'], string> = {
  High: '#E53E3E',
  Med: '#D69E2E',
  Low: '#718096',
}

const TYPE_ICON: Record<TodoCard['type'], string> = {
  ncr_pending: '⚠️',
  calibration: '🔧',
  deadline: '📅',
}

const CAP_PER_TYPE = 10 // 백엔드 todo_service.CAP_PER_TYPE과 동일 (표시 문구용)

export default function TodoBoard() {
  const collapsed = useUIStore((s) => s.todoBoardCollapsed)
  const toggleTodoBoard = useUIStore((s) => s.toggleTodoBoard)
  const [cards, setCards] = useState<TodoCard[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionCard, setActionCard] = useState<TodoCard | null>(null)

  const load = () => {
    setLoading(true)
    todosApi.list().then((r) => { setCards(r.items); setTotal(r.total) }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const highCount = cards.filter((c) => c.severity === 'High').length
  const hiddenCount = total - cards.length

  return (
    <aside style={{
      width: collapsed ? 56 : 'var(--sidebar-w)',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 16px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {collapsed ? (
          <button onClick={toggleTodoBoard} style={iconBtnStyle} aria-label="할 일 보드 펼치기">
            📋{highCount > 0 && <span style={badgeDotStyle}>{highCount}</span>}
          </button>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>할 일 보드</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                총 {total}건{highCount > 0 ? ` · 긴급 ${highCount}건` : ''}
              </div>
            </div>
            <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }} aria-label="새로고침">⟳</button>
            <button onClick={toggleTodoBoard} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }} aria-label="할 일 보드 접기">›</button>
          </>
        )}
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
              🎉<br />처리할 항목이 없습니다
            </div>
          ) : (
            cards.map((c, i) => (
              <div key={i} onClick={() => setActionCard(c)} style={{
                display: 'block', padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                borderRadius: 8, border: `1px solid ${SEVERITY_COLOR[c.severity]}33`,
                background: `${SEVERITY_COLOR[c.severity]}0D`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{TYPE_ICON[c.type]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.description}</div>
              </div>
            ))
          )}
          {hiddenCount > 0 && (
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '8px 0' }}>
              종류별 상위 {CAP_PER_TYPE}건만 표시 · {hiddenCount}건 더 있음
            </div>
          )}
        </div>
      )}

      {actionCard?.action.kind === 'ncr_new' && (
        <NCRForm
          ncrId={null}
          initialValues={{
            test_schedule_id: String(actionCard.action.test_schedule_id),
            standard_item_id: String(actionCard.action.standard_item_id),
            issue_summary: actionCard.action.issue_summary,
          }}
          onClose={() => setActionCard(null)}
          onSaved={() => { setActionCard(null); load() }}
        />
      )}
      {actionCard?.action.kind === 'ncr_edit' && (
        <NCRForm
          ncrId={actionCard.action.ncr_id}
          onClose={() => setActionCard(null)}
          onSaved={() => { setActionCard(null); load() }}
        />
      )}
      {actionCard?.action.kind === 'equipment_edit' && (
        <EquipmentForm
          equipmentId={actionCard.action.equipment_id}
          onClose={() => setActionCard(null)}
          onSaved={() => { setActionCard(null); load() }}
        />
      )}
      {actionCard?.action.kind === 'schedule_result' && (
        <ScheduleResultForm
          scheduleId={actionCard.action.schedule_id}
          onClose={() => setActionCard(null)}
          onSaved={() => { setActionCard(null); load() }}
        />
      )}
    </aside>
  )
}

const iconBtnStyle: React.CSSProperties = {
  position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 20, margin: '0 auto',
}

const badgeDotStyle: React.CSSProperties = {
  position: 'absolute', top: -4, right: -8, background: '#E53E3E', color: '#fff',
  fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px', lineHeight: 1.2,
}
