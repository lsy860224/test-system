import React from 'react'

interface Props {
  label: string
  color?: string
}

const STATUS_COLORS: Record<string, string> = {
  // 규격 / 일정
  '대기':    '#718096',
  '진행중':  '#3182CE',
  '진행 중': '#3182CE',
  '완료':    '#38A169',
  '보류':    '#D69E2E',
  '취소':    '#718096',
  '지연':    '#E53E3E',
  '계획':    '#718096',
  '준비중':  '#D69E2E',
  // NCR severity
  'Critical': '#E53E3E',
  'High':     '#D69E2E',
  'Medium':   '#3182CE',
  'Low':      '#38A169',
  // NCR status
  '초기분석': '#718096',
  '8D진행':  '#3182CE',
  '검토중':  '#D69E2E',
  // company type
  '완성차':       '#2B2F82',
  '1차협력사':    '#1565C0',
  '납품사_협력사': '#29ABE2',
  // source type (자체/외주 share colors with status; 검토중 kept from NCR status above)
  '자체': '#38A169',
  '외주': '#D69E2E',
  // result
  '합격':   '#38A169',
  '불합격': '#E53E3E',
  // project phase
  'RFQ':    '#718096',
  '개발':   '#3182CE',
  'DV':     '#D69E2E',
  'PV':     '#E53E3E',
  '양산준비':'#38A169',
  '양산':   '#2B2F82',
}

export default function Badge({ label, color }: Props) {
  const bg = color ?? STATUS_COLORS[label] ?? '#718096'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      color: '#fff',
      background: bg,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
