import client from './client'

export interface GapFinding {
  level: 'high' | 'med' | 'low'
  title: string
  detail: string
}

export interface GapStandardRef {
  id: number
  standard_no?: string
  standard_code: string
  name: string
}

export interface GapEquipmentAlert {
  id: number
  name: string
  next_due_date: string
  days_to_expiry: number
}

export interface GapNcrItem {
  id: number
  ncr_number: string
  part_name: string
  issue_summary: string
  severity: string
  due_date: string | null
  days_overdue: number | null
}

export interface GapAnalysisReport {
  generated_at: string
  standards: {
    total: number
    self_count: number
    outsource_count: number
    pending_count: number
    coverage_pct: number
    pending_items: GapStandardRef[]
  }
  equipment: {
    capability_pct: number
    uncovered_total: number
    uncovered_items: GapStandardRef[]
    cal_expired: GapEquipmentAlert[]
    cal_alert: GapEquipmentAlert[]
  }
  sop: {
    total: number
    approved: number
    review: number
    draft: number
    approved_pct: number
  }
  ncr: {
    total: number
    managed: number
    overdue_count: number
    overdue_items: GapNcrItem[]
  }
  findings: GapFinding[]
}

export interface QuarterKpi {
  quarter: string
  label: string
  start: string
  end: string
  ncr_new: number
  ncr_closed: number
  schedule_completed: number
  schedule_pass_rate: number | null
  dv_completed: number
  pv_completed: number
  calibration_count: number
  sop_approved: number
}

export interface QuarterlyKpiReport {
  year: number
  quarters: QuarterKpi[]
}

export const reportApi = {
  gapAnalysis: () => client.get<GapAnalysisReport>('/reports/gap-analysis').then((r) => r.data),

  quarterlyKpi: (year?: number) =>
    client.get<QuarterlyKpiReport>('/reports/quarterly-kpi', { params: { year } }).then((r) => r.data),
}
