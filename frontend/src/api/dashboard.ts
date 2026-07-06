import client from './client'

export interface DashboardSummary {
  year: number
  standards: {
    total: number
    self_count: number
    outsource_count: number
    pending_count: number
    confirmed_count: number
    coverage_pct: number
  }
  ncr: {
    total: number
    managed: number
    overdue: number
    completed: number
  }
  projects: {
    active: number
  }
  schedules: {
    expected: number
    planned: number
    in_progress: number
    completed: number
  }
  equipment: {
    total: number
    by_status: Record<string, number>
    cal_alert_count: number
    cal_expired_count: number
    capability_covered: number
    capability_pct: number
  }
  sop: {
    total: number
    approved: number
    review: number
    draft: number
  }
  vendors: {
    total: number
    kolas: number
  }
  ncr_trend: Array<{ month: string; label: string; new: number; closed: number }>
}

export const dashboardApi = {
  summary: (year?: number) =>
    client.get<DashboardSummary>('/dashboard/summary', { params: year ? { year } : {} }).then((r) => r.data),
}
