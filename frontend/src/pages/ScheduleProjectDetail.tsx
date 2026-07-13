import { useEffect, useState } from 'react'
import { projectsApi, type ScheduleDetailResponse, type ScheduleDetailGroup, type ScheduleDetailItem, projectStatusLabel } from '@/api/projects'
import { scheduleApi } from '@/api/schedules'
import Badge from '@/components/ui/Badge'
import ScheduleForm from './ScheduleForm'
import ScheduleResultForm from './ScheduleResultForm'
import NCRForm, { type NCRPrefill } from './NCRForm'

interface Props {
  projectId: number
  onClose: () => void
  onChanged: () => void
}

const STATUS_ORDER = ['계획', '준비중', '진행중', '완료', '지연', '취소']

export default function ScheduleProjectDetail({ projectId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<ScheduleDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [startingId, setStartingId] = useState<number | null>(null)

  // 자식 다이얼로그 상태
  const [scheduleFormState, setScheduleFormState] = useState<{ scheduleId: number | null; standardItemId?: number } | undefined>(undefined)
  const [resultFormScheduleId, setResultFormScheduleId] = useState<number | null>(null)
  const [ncrPrefill, setNcrPrefill] = useState<NCRPrefill | undefined>(undefined)
  const [retestingId, setRetestingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    projectsApi.scheduleDetail(projectId).then(setDetail).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleStart = async (scheduleId: number) => {
    setStartingId(scheduleId)
    try {
      await scheduleApi.start(scheduleId)
      load()
      onChanged()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '시험 시작 처리 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setStartingId(null)
    }
  }

  const handleResultSaved = (item: ScheduleDetailItem, result: string) => {
    setResultFormScheduleId(null)
    load()
    onChanged()
    if (result === '불합격' && !item.has_ncr && detail) {
      setNcrPrefill({
        part_name: detail.project.item_name || detail.project.name,
        test_section: item.standard_code,
        standard_item_id: String(item.standard_item_id),
        test_schedule_id: item.schedule_id ? String(item.schedule_id) : undefined,
      })
    }
  }

  const handleRetest = async (scheduleId: number) => {
    setRetestingId(scheduleId)
    try {
      await scheduleApi.retest(scheduleId)
      load()
      onChanged()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '재시험 등록 중 오류가 발생했습니다'
      alert(msg)
    } finally {
      setRetestingId(null)
    }
  }

  const openIssueReport = (item: ScheduleDetailItem) => {
    if (item.result !== '불합격' || item.has_ncr || !detail) return
    setNcrPrefill({
      part_name: detail.project.item_name || detail.project.name,
      test_section: item.standard_code,
      standard_item_id: String(item.standard_item_id),
      test_schedule_id: item.schedule_id ? String(item.schedule_id) : undefined,
    })
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width: 1080, maxWidth: '96vw',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {/* header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>
              {loading ? '로딩 중...' : detail?.project.name}
              {detail?.project.project_code && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{detail.project.project_code}</span>}
            </h3>
            {detail && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span>아이템 <b>{detail.project.item_name ?? '-'}</b></span>
                <span>고객사 <b>{detail.project.customer_name ?? '-'}</b></span>
                <span>Phase <Badge label={detail.project.phase} /></span>
                <span>프로젝트 상태 <Badge label={projectStatusLabel(detail.project.status)} /></span>
                <span>전체 일정 <b>{detail.project.start_date ?? '-'} ~ {detail.project.target_date ?? '-'}</b></span>
              </div>
            )}
            {detail && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {STATUS_ORDER.filter((s) => (detail.summary[s] ?? 0) > 0).map((s) => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Badge label={s} /> <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{detail.summary[s]}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>

        {/* body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : !detail || detail.standards.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>연결된 규격 항목이 없습니다. 프로젝트 설정에서 규격 항목을 추가하세요.</div>
          ) : (
            detail.standards.map((g) => (
              <StandardGroupCard
                key={g.standard_no ?? ''}
                group={g}
                expanded={expanded.has(g.standard_no ?? '')}
                onToggle={() => toggleGroup(g.standard_no ?? '')}
                startingId={startingId}
                onStart={handleStart}
                onRegisterSchedule={(item) => setScheduleFormState({ scheduleId: null, standardItemId: item.standard_item_id })}
                onEndTest={(item) => setResultFormScheduleId(item.schedule_id)}
                onIssueReport={openIssueReport}
                onRetest={handleRetest}
                retestingId={retestingId}
              />
            ))
          )}
        </div>
      </div>

      {scheduleFormState !== undefined && (
        <ScheduleForm
          scheduleId={scheduleFormState.scheduleId}
          initialProjectId={projectId}
          initialStandardItemId={scheduleFormState.standardItemId}
          onClose={() => setScheduleFormState(undefined)}
          onSaved={() => { setScheduleFormState(undefined); load(); onChanged() }}
        />
      )}

      {resultFormScheduleId !== null && (
        <ScheduleResultForm
          scheduleId={resultFormScheduleId}
          onClose={() => setResultFormScheduleId(null)}
          onSaved={(result) => {
            const item = detail?.standards.flatMap((g) => g.items).find((it) => it.schedule_id === resultFormScheduleId)
            if (item) handleResultSaved(item, result)
          }}
        />
      )}

      {ncrPrefill !== undefined && (
        <NCRForm
          ncrId={null}
          initialValues={ncrPrefill}
          onClose={() => setNcrPrefill(undefined)}
          onSaved={() => setNcrPrefill(undefined)}
        />
      )}
    </div>
  )
}

function StandardGroupCard({
  group, expanded, onToggle, startingId, onStart, onRegisterSchedule, onEndTest, onIssueReport, onRetest, retestingId,
}: {
  group: ScheduleDetailGroup
  expanded: boolean
  onToggle: () => void
  startingId: number | null
  onStart: (scheduleId: number) => void
  onRegisterSchedule: (item: ScheduleDetailItem) => void
  onEndTest: (item: ScheduleDetailItem) => void
  onIssueReport: (item: ScheduleDetailItem) => void
  onRetest: (scheduleId: number) => void
  retestingId: number | null
}) {
  const scheduledCount = group.items.filter((it) => it.schedule_id !== null).length
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
          background: '#FAFBFD', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 14 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--au-indigo)', width: 160 }}>
          {group.standard_no || '(규격 No. 미지정)'}
        </span>
        <span style={{ fontSize: 13, flex: 1 }}>{group.standard_name ?? '-'}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 110 }}>{group.revision_no ?? '-'}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 140 }}>시험 항목 {scheduledCount}/{group.items.length}건 (선택됨)</span>
      </div>

      {group.notes && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--text-secondary)', background: '#FFFBEA', borderTop: '1px solid var(--border)' }}>
          📌 {group.notes}
        </div>
      )}

      {expanded && (
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid var(--border)' }}>
          <thead>
            <tr style={{ background: '#FCFCFD' }}>
              <Th w={90}>항목 No.</Th>
              <Th>시험 항목명</Th>
              <Th w={110}>시작</Th>
              <Th w={110}>종료</Th>
              <Th w={80}>상태</Th>
              <Th w={80}>결과</Th>
              <Th w={280}></Th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((it) => (
              <ItemRow key={it.schedule_id ?? `pending-${it.standard_item_id}`} item={it} starting={startingId === it.schedule_id}
                retesting={it.schedule_id !== null && retestingId === it.schedule_id}
                onStart={onStart} onRegisterSchedule={onRegisterSchedule} onEndTest={onEndTest} onIssueReport={onIssueReport} onRetest={onRetest} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ItemRow({
  item, starting, retesting, onStart, onRegisterSchedule, onEndTest, onIssueReport, onRetest,
}: {
  item: ScheduleDetailItem
  starting: boolean
  retesting: boolean
  onStart: (scheduleId: number) => void
  onRegisterSchedule: (item: ScheduleDetailItem) => void
  onEndTest: (item: ScheduleDetailItem) => void
  onIssueReport: (item: ScheduleDetailItem) => void
  onRetest: (scheduleId: number) => void
}) {
  const endedEarly = !!(item.actual_end && item.planned_end && item.actual_end < item.planned_end)
  const canIssueReport = item.result === '불합격' && !item.has_ncr

  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <Td>{item.standard_code}</Td>
      <Td>{item.name}</Td>
      <Td>
        <DateCell planned={item.planned_start} actual={item.actual_start} />
      </Td>
      <Td>
        <DateCell planned={item.planned_end} actual={item.actual_end} actualColor={endedEarly ? '#E53E3E' : undefined} />
      </Td>
      <Td><Badge label={item.display_status} /></Td>
      <Td>{item.result ? <Badge label={item.result} /> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</Td>
      <Td>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {item.schedule_id === null ? (
            <ActionBtn onClick={() => onRegisterSchedule(item)}>일정 등록</ActionBtn>
          ) : (
            <>
              {(item.display_status === '준비중' || item.display_status === '지연') && (
                <ActionBtn onClick={() => onStart(item.schedule_id!)} loading={starting}>시험 시작</ActionBtn>
              )}
              {item.display_status === '진행중' && (
                <ActionBtn onClick={() => onEndTest(item)}>시험 종료</ActionBtn>
              )}
              {item.display_status === '완료' && (
                <ActionBtn onClick={() => onEndTest(item)}>결과 수정</ActionBtn>
              )}
              {item.can_retest && (
                <ActionBtn onClick={() => onRetest(item.schedule_id!)} loading={retesting}>재시험</ActionBtn>
              )}
              <ActionBtn onClick={() => onIssueReport(item)} disabled={!canIssueReport} danger>
                {item.result === '불합격' && item.has_ncr ? 'NCR 작성됨' : '이상발생보고'}
              </ActionBtn>
            </>
          )}
        </div>
      </Td>
    </tr>
  )
}

function DateCell({ planned, actual, actualColor }: { planned: string | null; actual: string | null; actualColor?: string }) {
  return (
    <div style={{ lineHeight: 1.5 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{planned ?? '-'}</div>
      <div style={{ fontSize: 12, color: actualColor ?? (actual ? 'var(--text-primary)' : 'var(--text-muted)'), fontWeight: actualColor ? 700 : 400 }}>
        {actual ?? '-'}
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick, loading, disabled, danger }: { children: React.ReactNode; onClick: () => void; loading?: boolean; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled && !loading) onClick() }}
      disabled={disabled || loading}
      style={{
        background: danger ? (disabled ? '#F7F7F8' : '#FFF5F5') : '#fff',
        border: `1px solid ${danger ? (disabled ? 'var(--border)' : '#FED7D7') : 'var(--border)'}`,
        borderRadius: 6, padding: '3px 8px', fontSize: 11,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        color: danger ? (disabled ? 'var(--text-muted)' : '#E53E3E') : 'var(--text-secondary)',
        opacity: loading ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '처리 중...' : children}
    </button>
  )
}

function Th({ children, w }: { children?: React.ReactNode; w?: number }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', width: w }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', fontSize: 12.5, verticalAlign: 'top' }}>{children}</td>
}
