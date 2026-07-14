import { useEffect, useState } from 'react'
import { dashboardApi, type DashboardSummary } from '@/api/dashboard'
import { standardApi } from '@/api/standards'
import { equipmentApi } from '@/api/equipment'
import { PrintButton } from '@/components/ui/PrintButton'
import { BarChart } from '@/components/charts/BarChart'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(CURRENT_YEAR)

  const load = (y: number) => {
    setLoading(true)
    dashboardApi.summary(y).then(setData).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load(year) }, [year])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>로딩 중...</div>

  const standards = data?.standards
  const ncr = data?.ncr
  const sched = data?.schedules
  const eq = data?.equipment
  const sop = data?.sop
  const vendors = data?.vendors
  const ncrTrend = data?.ncr_trend ?? []

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>시험평가팀 현황</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>양산 진입 준비 상황 · 실시간 집계</p>
        </div>
        <div className="no-print" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>기준 연도</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
            {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <PrintButton style={{ padding: '5px 14px' }} />
        </div>
      </div>

      {/* Row 1: 3개 KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>

        {/* 시험 역량 현황 — 규격 커버리지 도넛 게이지 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={iconBox('#2B2F82')}>🔬</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>시험 역량 현황</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <DonutGauge pct={standards?.coverage_pct ?? 0} color="var(--au-indigo)" size={90} />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                전체 {standards?.total ?? 0}건 중<br />수행방법 확정 {standards?.confirmed_count ?? 0}건
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: '자체 수행', count: standards?.self_count ?? 0, color: '#38A169' },
                  { label: '외주 의뢰', count: standards?.outsource_count ?? 0, color: '#D69E2E' },
                  { label: '미결정', count: standards?.pending_count ?? 0, color: '#A0AEC0' },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, flex: 1, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.count}건</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 미결 NCR */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={iconBox('#E53E3E')}>⚠️</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>미결 NCR</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#E53E3E', lineHeight: 1, marginBottom: 6 }}>
            {(ncr?.managed ?? 0) + (ncr?.overdue ?? 0)}건
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            전체 {ncr?.total ?? 0}건 (완료 {ncr?.completed ?? 0}건 제외)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: '관리 중', count: ncr?.managed ?? 0, color: '#D69E2E' },
              { label: '기한 초과', count: ncr?.overdue ?? 0, color: '#E53E3E' },
              { label: '완료', count: ncr?.completed ?? 0, color: '#38A169' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.count}건</span>
              </div>
            ))}
          </div>
        </div>

        {/* 프로젝트 현황 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={iconBox('#38A169')}>🏗️</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>프로젝트</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#38A169', lineHeight: 1, marginBottom: 14 }}>
            {data?.projects.total ?? 0}건
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { key: '활성', label: '진행 중', color: '#3182CE' },
              { key: '완료', label: '완료', color: '#38A169' },
              { key: '보류', label: '보류', color: '#D69E2E' },
              { key: '지연', label: '지연', color: '#E53E3E' },
              { key: '취소', label: '취소', color: '#718096' },
            ].map((row) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{data?.projects.by_status[row.key] ?? 0}건</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: 시험 일정 현황 Full-width */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={iconBox('#1565C0')}>📅</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>시험 일정 현황</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>· {year}년 기준</span>
          <a href="/schedule" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--au-blue)', textDecoration: 'none', fontWeight: 600 }}>상세 →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
          {[
            { label: '예정', desc: '프로젝트에 포함, 일정 미수립', count: sched?.expected ?? 0, color: '#A0AEC0', bg: '#F7FAFC' },
            { label: '계획', desc: '일정 확정, 시작 예정일 이전', count: sched?.planned ?? 0, color: '#D69E2E', bg: '#FFFBEB' },
            { label: '지연', desc: '시작 예정일 경과, 미착수', count: sched?.delayed ?? 0, color: '#E53E3E', bg: '#FFF5F5' },
            { label: '진행 중', desc: '현재 시험 수행 중', count: sched?.in_progress ?? 0, color: '#1565C0', bg: '#EBF4FF' },
            { label: '완료', desc: '시험 완료 (합격/불합격)', count: sched?.completed ?? 0, color: '#38A169', bg: '#F0FFF4' },
          ].map((col) => (
            <div key={col.label} style={{ background: col.bg, borderRadius: 10, padding: '16px 18px', border: `1px solid ${col.color}22` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: col.color, letterSpacing: '0.05em', marginBottom: 6 }}>
                {col.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: col.color, lineHeight: 1, marginBottom: 4 }}>
                {col.count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{col.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2.5: 월별 NCR 트렌드 차트 */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={iconBox('#E53E3E')}>📈</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>월별 NCR 트렌드</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>· 최근 6개월</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: '#E53E3E', borderRadius: 2 }} />신규
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: '#38A169', borderRadius: 2 }} />완료
            </span>
          </div>
        </div>
        <BarChart
          data={ncrTrend.map((t) => ({ key: t.label, label: t.label, a: t.new, b: t.closed }))}
          config={{ chartH: 80, padT: 14, barW: 14, barGap: 4, groupGap: 20, padL: 8, barFontSize: 9, barLabelGap: 3, groupLabelFontSize: 10, groupLabelY: 16, showTicks: true }}
        />
      </div>

      {/* Row 3: P2 현황 — 장비 / 절차서 / 외주 시험소 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>

        {/* 장비 현황 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={iconBox('#744210')}>🔧</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>장비 현황</span>
            <a href="/equipment" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--au-blue)', textDecoration: 'none' }}>상세 →</a>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#744210', lineHeight: 1, marginBottom: 6 }}>
            {eq?.total ?? 0}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>대</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            {Object.entries(eq?.by_status ?? {}).map(([status, cnt]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: status === '운용중' ? '#38A169' : status === '교정중' ? '#D69E2E' : '#A0AEC0', flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{status}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{cnt}대</span>
              </div>
            ))}
          </div>
          {/* Capability 커버리지 */}
          <div style={{ background: '#F7F9FF', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--au-indigo)', marginBottom: 4 }}>Capability 커버리지</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${eq?.capability_pct ?? 0}%`, height: '100%', background: 'var(--au-indigo)', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--au-indigo)', minWidth: 34 }}>{eq?.capability_pct ?? 0}%</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              규격 항목 {eq?.capability_covered ?? 0}건 장비 대응
            </div>
          </div>
          {((eq?.cal_expired_count ?? 0) > 0 || (eq?.cal_alert_count ?? 0) > 0) ? (
            <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, padding: '8px 10px' }}>
              {(eq?.cal_expired_count ?? 0) > 0 && (
                <div style={{ fontSize: 12, color: '#E53E3E', fontWeight: 600 }}>🔴 교정 만료 {eq!.cal_expired_count}대</div>
              )}
              {(eq?.cal_alert_count ?? 0) > 0 && (
                <div style={{ fontSize: 12, color: '#D69E2E', fontWeight: 600, marginTop: eq?.cal_expired_count ? 4 : 0 }}>🟡 60일 내 만료 예정 {eq!.cal_alert_count}대</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#38A169', fontWeight: 600 }}>✅ 교정 기한 정상</div>
          )}
        </div>

        {/* 절차서 현황 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={iconBox('#553C9A')}>📄</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>절차서 현황</span>
            <a href="/sop" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--au-blue)', textDecoration: 'none' }}>상세 →</a>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#553C9A', lineHeight: 1, marginBottom: 6 }}>
            {sop?.total ?? 0}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>건</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            승인율 {sop?.total ? Math.round(((sop.approved) / sop.total) * 100) : 0}%
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: '승인', count: sop?.approved ?? 0, color: '#38A169' },
              { label: '검토중', count: sop?.review ?? 0, color: '#D69E2E' },
              { label: '초안', count: sop?.draft ?? 0, color: '#718096' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.count}건</span>
              </div>
            ))}
          </div>
        </div>

        {/* 외주 시험소 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={iconBox('#065A82')}>🏭</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>외주 시험소</span>
            <a href="/vendors" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--au-blue)', textDecoration: 'none' }}>상세 →</a>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#065A82', lineHeight: 1, marginBottom: 6 }}>
            {vendors?.total ?? 0}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>개소</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>활성 외주 시험소</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'KOLAS 인정 시험소', count: vendors?.kolas ?? 0, color: '#065A82' },
              { label: 'KOLAS 미인정', count: (vendors?.total ?? 0) - (vendors?.kolas ?? 0), color: '#A0AEC0' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.count}개소</span>
              </div>
            ))}
          </div>
          {(vendors?.total ?? 0) === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              외주 시험소를 등록하세요
            </div>
          )}
        </div>
      </div>

      {/* Row 4: 양식 다운로드 */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>양식 다운로드</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: '규격 매트릭스 양식', desc: 'Excel 일괄 등록용', icon: '📋', action: () => standardApi.downloadTemplate() },
            { label: '교정이력 관리 양식', desc: '장비 교정 기록용', icon: '🔧', action: () => equipmentApi.downloadCalibrationTemplate() },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => item.action()}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)',
                cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--au-blue)'
                el.style.background = '#EBF4FF'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.background = 'var(--bg)'
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--au-blue)', fontWeight: 600 }}>↓ xlsx</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// SVG 도넛 게이지
function DonutGauge({ pct, color, size = 100 }: { pct: number; color: string; size?: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ
  const gap = circ - dash
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="#E2E8F0" strokeWidth={10} />
      <circle
        cx={50} cy={50} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x={50} y={50} textAnchor="middle" dy="0.35em"
        style={{ fontSize: 17, fontWeight: 700, fill: color, fontFamily: 'inherit' }}>
        {pct}%
      </text>
    </svg>
  )
}

// 월별 NCR 트렌드 바차트
const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)',
}

function iconBox(color: string): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 8,
    background: `${color}18`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  }
}
