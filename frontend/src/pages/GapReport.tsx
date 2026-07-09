import { useEffect, useState } from 'react'
import { reportApi, type GapAnalysisReport, type GapFinding } from '@/api/reports'
import { PrintButton } from '@/components/ui/PrintButton'

const LEVEL_COLOR: Record<GapFinding['level'], string> = {
  high: '#E53E3E',
  med: '#D69E2E',
  low: '#718096',
}
const LEVEL_LABEL: Record<GapFinding['level'], string> = {
  high: '높음',
  med: '중간',
  low: '낮음',
}

export default function GapReport() {
  const [data, setData] = useState<GapAnalysisReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportApi.gapAnalysis().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>로딩 중...</div>
  if (!data) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>데이터를 불러오지 못했습니다</div>

  const genDate = new Date(data.generated_at)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* 헤더 */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          생성 시각 {genDate.toLocaleString('ko-KR')} · 실측 데이터 기준 자동 집계
        </p>
        <PrintButton style={{ marginLeft: 'auto' }} />
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--au-indigo)' }}>HKMC 양산 진입 Gap Analysis</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{genDate.toLocaleDateString('ko-KR')} 기준</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
          규격 매트릭스 · 장비 Capability · 절차서 · NCR 실측 데이터를 기준으로 자동 산출되었습니다. 추정치는 포함하지 않았습니다.
        </p>

        {/* 핵심 지표 4개 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          <Kpi label="규격 커버리지" value={`${data.standards.coverage_pct}%`}
            sub={`확정 ${data.standards.self_count + data.standards.outsource_count} / 전체 ${data.standards.total}건`} />
          <Kpi label="장비 Capability" value={`${data.equipment.capability_pct}%`}
            sub={`미확보 ${data.equipment.uncovered_total}건`} />
          <Kpi label="절차서 승인율" value={`${data.sop.approved_pct}%`}
            sub={`승인 ${data.sop.approved} / 전체 ${data.sop.total}건`} />
          <Kpi label="NCR 기한초과" value={`${data.ncr.overdue_count}건`}
            sub={`관리 중 ${data.ncr.managed} / 전체 ${data.ncr.total}건`} warn={data.ncr.overdue_count > 0} />
        </div>

        {/* Gap Findings */}
        <SectionTitle>핵심 Gap 및 리스크</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {data.findings.map((f, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8,
              background: `${LEVEL_COLOR[f.level]}0F`, border: `1px solid ${LEVEL_COLOR[f.level]}33`,
            }}>
              <span style={{
                flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff', background: LEVEL_COLOR[f.level],
                borderRadius: 4, padding: '2px 6px', height: 'fit-content',
              }}>{LEVEL_LABEL[f.level]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 상세 테이블 */}
        {data.standards.pending_items.length > 0 && (
          <DetailTable
            title={`규격 자체/외주 미결정 (${data.standards.pending_count}건)`}
            columns={['규격 No.', '항목 No.', '시험 항목명']}
            rows={data.standards.pending_items.map((s) => [s.standard_no ?? '-', s.standard_code, s.name])}
          />
        )}

        {data.equipment.uncovered_items.length > 0 && (
          <DetailTable
            title={`장비 Capability 미확보 규격 (${data.equipment.uncovered_total}건)`}
            columns={['규격 No.', '항목 No.', '시험 항목명']}
            rows={data.equipment.uncovered_items.map((s) => [s.standard_no ?? '-', s.standard_code, s.name])}
          />
        )}

        {data.equipment.cal_expired.length > 0 && (
          <DetailTable
            title={`교정 만료 장비 (${data.equipment.cal_expired.length}대)`}
            columns={['장비명', '만료일', '경과일']}
            rows={data.equipment.cal_expired.map((e) => [e.name, e.next_due_date, `${Math.abs(e.days_to_expiry)}일 경과`])}
          />
        )}

        {data.ncr.overdue_items.length > 0 && (
          <DetailTable
            title={`기한 초과 NCR (${data.ncr.overdue_count}건)`}
            columns={['NCR No.', '부품명', '이슈 요약', '심각도', '기한']}
            rows={data.ncr.overdue_items.map((n) => [n.ncr_number, n.part_name, n.issue_summary, n.severity, n.due_date ?? '-'])}
          />
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: warn ? '#E53E3E' : 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--au-indigo)', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid var(--au-indigo)' }}>
      {children}
    </div>
  )
}

function DetailTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <div style={{ marginBottom: 18 }} className="avoid-break">
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{ textAlign: 'left', padding: '6px 8px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid var(--border)',
}
