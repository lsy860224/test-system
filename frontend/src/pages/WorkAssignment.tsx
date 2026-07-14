import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usersApi, type AppUser } from '@/api/users'
import { standardApi, type StandardItem } from '@/api/standards'
import { scheduleApi } from '@/api/schedules'
import { ncrApi, type NCRItem } from '@/api/ncr'
import { projectsApi, type ProjectItem } from '@/api/projects'
import Table, { type Column } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'

const FETCH_SIZE = 1000

interface AssigneeRow {
  user: AppUser | null // null = 미배정
  standards: StandardItem[]
  schedules: Record<string, unknown>[]
  ncrs: NCRItem[]
  projects: ProjectItem[]
}

export default function WorkAssignment() {
  const currentUser = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AppUser[]>([])
  const [standards, setStandards] = useState<StandardItem[]>([])
  const [schedules, setSchedules] = useState<Record<string, unknown>[]>([])
  const [ncrs, setNcrs] = useState<NCRItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [expanded, setExpanded] = useState<number | null | undefined>(undefined)

  const allowed = currentUser?.role === 'admin' || currentUser?.role === '팀장'

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    Promise.all([
      usersApi.list(),
      standardApi.list({ size: FETCH_SIZE }),
      scheduleApi.list({ size: FETCH_SIZE }),
      ncrApi.list({ size: FETCH_SIZE }),
      projectsApi.list({ size: FETCH_SIZE }),
    ]).then(([u, s, sch, n, p]) => {
      setUsers(u)
      setStandards(s.items)
      setSchedules(sch.items)
      setNcrs(n.items)
      setProjects(p.items)
    }).finally(() => setLoading(false))
  }, [allowed])

  if (!allowed) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        접근 권한이 없습니다. 팀장 또는 관리자만 열람할 수 있습니다.
      </div>
    )
  }

  // 취소된 프로젝트·시험 일정은 담당자의 실제 업무량이 아니므로 집계에서 제외한다.
  // 시험 일정은 저장된 status가 아니라 display_status(compute_status 기준 재판정값)로 취소 여부를 판단한다.
  const activeProjects = projects.filter((p) => p.status !== '취소')
  const activeSchedules = schedules.filter((s) => String(s['display_status'] ?? s['status'] ?? '') !== '취소')

  const rows: AssigneeRow[] = [
    ...users.map((u) => ({
      user: u,
      standards: standards.filter((s) => s.assignee_id === u.id),
      schedules: activeSchedules.filter((s) => s['assignee_id'] === u.id),
      ncrs: ncrs.filter((n) => n.assignee_id === u.id),
      projects: activeProjects.filter((p) => p.assignee_id === u.id),
    })),
    {
      user: null,
      standards: standards.filter((s) => !s.assignee_id),
      schedules: activeSchedules.filter((s) => !s['assignee_id']),
      ncrs: ncrs.filter((n) => !n.assignee_id),
      projects: activeProjects.filter((p) => !p.assignee_id),
    },
  ]

  const total = (r: AssigneeRow) => r.standards.length + r.schedules.length + r.ncrs.length + r.projects.length
  const sortedRows = [...rows].sort((a, b) => total(b) - total(a))

  const columns: Column<AssigneeRow>[] = [
    {
      key: 'user', header: '담당자', width: 160,
      render: (r) => r.user
        ? <div><strong>{r.user.name}</strong> <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({r.user.role})</span></div>
        : <span style={{ color: 'var(--text-muted)' }}>미배정</span>,
    },
    {
      key: 'standards', header: '규격 항목', width: 140,
      render: (r) => <CountCell items={r.standards} pending={r.standards.filter((s) => s.source_type === '검토중').length} pendingLabel="검토중" />,
    },
    {
      key: 'schedules', header: '시험 일정', width: 140,
      render: (r) => <CountCell items={r.schedules} pending={r.schedules.filter((s) => String(s['display_status'] ?? s['status'] ?? '') !== '완료').length} />,
    },
    {
      key: 'ncrs', header: 'NCR', width: 140,
      render: (r) => <CountCell items={r.ncrs} pending={r.ncrs.filter((n) => n.is_overdue).length} pendingLabel="기한초과" />,
    },
    {
      key: 'projects', header: '프로젝트', width: 140,
      render: (r) => <CountCell items={r.projects} pending={r.projects.filter((p) => p.status === '활성').length} pendingLabel="활성" />,
    },
    {
      key: 'total', header: '합계', width: 80,
      render: (r) => <strong>{total(r)}</strong>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: expanded === undefined ? 'var(--page-fill-h)' : 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>담당자별 업무 분배 현황</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        규격 항목 · 시험 일정 · NCR · 프로젝트에 등록된 담당자 기준 업무량 집계입니다. 행을 클릭하면 상세 목록을 볼 수 있습니다.
      </p>

      <Table
        columns={columns}
        data={sortedRows}
        rowKey={(r) => r.user?.id ?? -1}
        loading={loading}
        onRowClick={(r) => setExpanded((prev) => (prev === (r.user?.id ?? -1) ? undefined : (r.user?.id ?? -1)))}
      />

      {expanded !== undefined && (
        <DetailPanel row={sortedRows.find((r) => (r.user?.id ?? -1) === expanded)!} />
      )}
    </div>
  )
}

function CountCell({ items, pending, pendingLabel = '진행중' }: { items: unknown[]; pending: number; pendingLabel?: string }) {
  if (items.length === 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>
  return (
    <span>
      {items.length}건
      {pending > 0 && (
        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--au-blue)' }}>({pendingLabel} {pending})</span>
      )}
    </span>
  )
}

function DetailPanel({ row }: { row: AssigneeRow }) {
  return (
    <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 10, padding: 20, background: 'var(--surface)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
        {row.user ? `${row.user.name} 상세 업무` : '미배정 업무'}
      </h3>

      {row.standards.length > 0 && (
        <Section title={`규격 항목 (${row.standards.length})`}>
          {row.standards.map((s) => (
            <Line key={s.id}>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', marginRight: 8 }}>{s.standard_code}</span>
              {s.name} <Badge label={s.source_type} />
            </Line>
          ))}
        </Section>
      )}

      {row.schedules.length > 0 && (
        <Section title={`시험 일정 (${row.schedules.length})`}>
          {row.schedules.map((s, i) => (
            <Line key={i}>
              {String(s['standard_name'] ?? s['test_type'] ?? '-')} <Badge label={String(s['display_status'] ?? s['status'] ?? '-')} />
            </Line>
          ))}
        </Section>
      )}

      {row.ncrs.length > 0 && (
        <Section title={`NCR (${row.ncrs.length})`}>
          {row.ncrs.map((n) => (
            <Line key={n.id}>
              <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>{n.ncr_number}</span>
              {n.issue_summary} <Badge label={n.status} /> {n.is_overdue && <Badge label="기한초과" color="#E53E3E" />}
            </Line>
          ))}
        </Section>
      )}

      {row.projects.length > 0 && (
        <Section title={`프로젝트 (${row.projects.length})`}>
          {row.projects.map((p) => (
            <Line key={p.id}>
              {p.name} <Badge label={p.phase} /> <Badge label={p.status} />
            </Line>
          ))}
        </Section>
      )}

      {row.standards.length === 0 && row.schedules.length === 0 && row.ncrs.length === 0 && row.projects.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>배정된 업무가 없습니다.</p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--au-indigo)', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

function Line({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}
