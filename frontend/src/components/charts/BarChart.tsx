export interface BarChartDatum {
  key: string
  label: string
  a: number
  b: number
}

export interface BarChartConfig {
  chartH: number
  padT: number
  barW: number
  barGap: number
  groupGap: number
  padL: number
  barFontSize: number
  barLabelGap: number
  groupLabelFontSize: number
  groupLabelY: number
  showTicks?: boolean
  colorA?: string
  colorB?: string
}

export function BarChart({ data, config }: { data: BarChartDatum[]; config: BarChartConfig }) {
  const {
    chartH, padT, barW, barGap, groupGap, padL,
    barFontSize, barLabelGap, groupLabelFontSize, groupLabelY,
    showTicks, colorA = '#E53E3E', colorB = '#38A169',
  } = config
  const maxVal = Math.max(...data.flatMap((d) => [d.a, d.b]), 1)
  const groupW = barW * 2 + barGap
  const totalW = padL + data.length * (groupW + groupGap)
  const baseY = padT + chartH

  return (
    <svg viewBox={`0 0 ${totalW} ${padT + chartH + 28}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const x = padL + i * (groupW + groupGap)
        const aH = Math.max((d.a / maxVal) * chartH, d.a > 0 ? 3 : 0)
        const bH = Math.max((d.b / maxVal) * chartH, d.b > 0 ? 3 : 0)
        return (
          <g key={d.key}>
            <rect x={x} y={baseY - aH} width={barW} height={aH} fill={colorA} rx={2} />
            {d.a > 0 && (
              <text x={x + barW / 2} y={baseY - aH - barLabelGap} textAnchor="middle"
                style={{ fontSize: barFontSize, fill: colorA, fontFamily: 'inherit' }}>{d.a}</text>
            )}
            <rect x={x + barW + barGap} y={baseY - bH} width={barW} height={bH} fill={colorB} rx={2} />
            {d.b > 0 && (
              <text x={x + barW + barGap + barW / 2} y={baseY - bH - barLabelGap} textAnchor="middle"
                style={{ fontSize: barFontSize, fill: colorB, fontFamily: 'inherit' }}>{d.b}</text>
            )}
            <text x={x + groupW / 2} y={baseY + groupLabelY} textAnchor="middle"
              style={{ fontSize: groupLabelFontSize, fill: 'var(--text-muted)', fontFamily: 'inherit' }}>{d.label}</text>
            {showTicks && (
              <line x1={x - groupGap / 2} y1={baseY} x2={x - groupGap / 2} y2={baseY + 4} stroke="#E2E8F0" strokeWidth={1} />
            )}
          </g>
        )
      })}
      <line x1={0} y1={baseY} x2={totalW} y2={baseY} stroke="#E2E8F0" strokeWidth={1} />
    </svg>
  )
}
