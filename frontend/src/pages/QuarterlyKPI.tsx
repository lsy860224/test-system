import { useEffect, useState } from 'react'
import { reportApi, type QuarterlyKpiReport, type QuarterKpi } from '@/api/reports'
import { PrintButton } from '@/components/ui/PrintButton'
import { BarChart } from '@/components/charts/BarChart'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default function QuarterlyKPI() {
  const [data, setData] = useState<QuarterlyKpiReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(CURRENT_YEAR)

  useEffect(() => {
    setLoading(true)
    reportApi.quarterlyKpi(year).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [year])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>로딩 중...</div>
  if (!data) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>데이터를 불러오지 못했습니다</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* 헤더 */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>임원 보고 · 분기별 KPI 집계</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>실제 발생일 기준 활동 지표 · 추정치 미포함</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
            {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <PrintButton />
        </div>
      </div>

      <div style={card}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--au-indigo)', marginBottom: 4 }}>{data.year}년 분기별 KPI</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          규격 DV/PV 완료, 시험 일정 완료, 교정 수행, SOP 승인, NCR 신규/완료 건수를 분기 단위로 집계했습니다.
          과거 시점의 커버리지·Capability 스냅샷은 저장하지 않으므로 포함하지 않았습니다.
        </p>

        <SectionTitle>NCR 신규 · 완료</SectionTitle>
        <BarChart
          data={data.quarters.map((q) => ({ key: q.quarter, label: q.label, a: q.ncr_new, b: q.ncr_closed }))}
          config={{ chartH: 90, padT: 16, barW: 26, barGap: 6, groupGap: 40, padL: 10, barFontSize: 10, barLabelGap: 4, groupLabelFontSize: 11, groupLabelY: 18, showTicks: false }}
        />

        <div style={{ marginTop: 24 }}>
          <SectionTitle>분기별 활동 지표</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['구분', ...data.quarters.map((q) => q.label)].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <KpiRow label="규격 DV 완료" values={data.quarters.map((q) => `${q.dv_completed}건`)} />
              <KpiRow label="규격 PV 완료" values={data.quarters.map((q) => `${q.pv_completed}건`)} />
              <KpiRow label="시험 일정 완료" values={data.quarters.map((q) => `${q.schedule_completed}건`)} />
              <KpiRow label="시험 합격률" values={data.quarters.map((q) => q.schedule_pass_rate == null ? '-' : `${q.schedule_pass_rate}%`)} />
              <KpiRow label="장비 교정 수행" values={data.quarters.map((q) => `${q.calibration_count}건`)} />
              <KpiRow label="SOP 승인" values={data.quarters.map((q) => `${q.sop_approved}건`)} />
              <KpiRow label="NCR 신규" values={data.quarters.map((q) => `${q.ncr_new}건`)} />
              <KpiRow label="NCR 완료" values={data.quarters.map((q) => `${q.ncr_closed}건`)} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</td>
      {values.map((v, i) => (
        <td key={i} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{v}</td>
      ))}
    </tr>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--au-indigo)', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid var(--au-indigo)' }}>
      {children}
    </div>
  )
}

// 분기별 NCR 신규/완료 그룹 바차트 (Dashboard.tsx의 NcrBarChart와 동일한 패턴)
const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid var(--border)',
}
