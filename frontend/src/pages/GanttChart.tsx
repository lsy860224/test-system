import { useEffect, useState } from 'react'
import { scheduleApi, type GanttData, type GanttSchedule } from '@/api/schedules'

const STATUS_COLOR: Record<string, string> = {
  '계획': '#718096',
  '준비중': '#D69E2E',
  '진행중': '#3182CE',
  '완료': '#38A169',
  '지연': '#E53E3E',
  '취소': '#A0AEC0',
}

const DAY_MS = 24 * 60 * 60 * 1000
const PX_PER_DAY = 6
const LABEL_W = 260
const ROW_H = 32
const BAR_H = 16

export default function GanttChart({ projectId }: { projectId?: number }) {
  const [data, setData] = useState<GanttData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    scheduleApi.gantt({ project_id: projectId }).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>로딩 중...</div>

  const allSchedules = (data?.projects ?? []).flatMap((p) => p.schedules)
  if (allSchedules.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>표시할 일정이 없습니다. (진행 중 프로젝트에 등록된 시험 일정 기준)</div>
  }

  // ── 날짜 범위 계산 (계획+실적 전부 포함, 앞뒤 7일 여백) ──
  const allDates = allSchedules.flatMap((s) => [s.planned_start, s.planned_end, s.actual_start, s.actual_end].filter(Boolean) as string[])
  const minDate = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())) - 7 * DAY_MS)
  const maxDate = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())) + 7 * DAY_MS)
  const totalDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / DAY_MS))
  const totalW = totalDays * PX_PER_DAY
  const xOf = (dateStr: string) => Math.round((new Date(dateStr).getTime() - minDate.getTime()) / DAY_MS) * PX_PER_DAY

  // ── 월 구분선 (UTC 기준으로 통일 — 로컬↔UTC 왕복 시 KST 등에서 하루 밀리는 것 방지) ──
  const monthTicks: { x: number; label: string }[] = []
  let cursorMs = Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1)
  while (cursorMs <= maxDate.getTime()) {
    const cd = new Date(cursorMs)
    const x = Math.round((cursorMs - minDate.getTime()) / DAY_MS) * PX_PER_DAY
    monthTicks.push({ x, label: `${cd.getUTCFullYear()}.${cd.getUTCMonth() + 1}` })
    cursorMs = Date.UTC(cd.getUTCFullYear(), cd.getUTCMonth() + 1, 1)
  }

  // "오늘"은 사용자 로컬 달력 기준으로 판단해 동일한 UTC 자정 그리드에 맞춤
  const now = new Date()
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const todayX = Math.round((todayMs - minDate.getTime()) / DAY_MS) * PX_PER_DAY

  // ── 행 목록 (프로젝트 헤더 + 일정 행) ──────────────────
  type Row = { kind: 'project'; label: string } | { kind: 'schedule'; s: GanttSchedule }
  const rows: Row[] = []
  for (const p of data!.projects) {
    rows.push({ kind: 'project', label: `${p.project_code ? p.project_code + ' · ' : ''}${p.project_name} (${p.phase})` })
    for (const s of p.schedules) rows.push({ kind: 'schedule', s })
  }
  const chartH = rows.length * ROW_H + 30

  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
      {/* 좌측 라벨 컬럼 */}
      <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
        <div style={{ height: 30, borderBottom: '1px solid var(--border)' }} />
        {rows.map((row, i) =>
          row.kind === 'project' ? (
            <div key={i} style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--bg)', fontSize: 12, fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
              {row.label}
            </div>
          ) : (
            <div key={i} style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 10px 0 20px', fontSize: 12, borderBottom: '1px solid var(--border)' }} className="truncate">
              <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>[{row.s.test_type}]</span>{row.s.standard_name}
            </div>
          )
        )}
      </div>

      {/* 우측 타임라인 */}
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <svg width={totalW} height={chartH} style={{ display: 'block' }}>
          {/* 월 구분선 */}
          {monthTicks.map((t, i) => (
            <g key={i}>
              <line x1={t.x} y1={0} x2={t.x} y2={chartH} stroke="#E2E8F0" strokeWidth={1} />
              <text x={t.x + 4} y={18} style={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}>{t.label}</text>
            </g>
          ))}
          {/* 오늘 라인 */}
          {todayX >= 0 && todayX <= totalW && (
            <line x1={todayX} y1={0} x2={todayX} y2={chartH} stroke="#E53E3E" strokeWidth={1.5} strokeDasharray="4 3" />
          )}
          {/* 행 */}
          {rows.map((row, i) => {
            const y = 30 + i * ROW_H
            if (row.kind === 'project') {
              return <rect key={i} x={0} y={y} width={totalW} height={ROW_H} fill="var(--bg)" />
            }
            const s = row.s
            const color = STATUS_COLOR[s.status] ?? '#718096'
            const px = xOf(s.planned_start)
            const pw = Math.max(xOf(s.planned_end) - px, 3)
            const barY = y + (ROW_H - BAR_H) / 2
            const hasActual = s.actual_start && s.actual_end
            return (
              <g key={i}>
                {/* 계획 바 (아웃라인) */}
                <rect x={px} y={barY} width={pw} height={BAR_H} rx={4} fill={hasActual ? 'none' : `${color}33`} stroke={color} strokeWidth={1.5} />
                {/* 실적 바 (채움) */}
                {hasActual && (
                  <rect x={xOf(s.actual_start!)} y={barY} width={Math.max(xOf(s.actual_end!) - xOf(s.actual_start!), 3)} height={BAR_H} rx={4} fill={color} />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
